import type { VirtTableColumn } from '../index';
import { createPopup } from './_popup';
import {
  type BaseColumnOptions,
  commitValue,
  makeAnchor,
  pickColumnProps,
} from './shared';

export interface VtCascaderOption {
  value: string | number;
  label: string;
  children?: VtCascaderOption[];
  disabled?: boolean;
}

export interface VtCascaderOptions<T = any> extends BaseColumnOptions<T> {
  options: VtCascaderOption[];
  /** 常态的层级分隔符，默认 `' / '` */
  separator?: string;
  /**
   * 值的存储形式：
   *   - `'path'`（默认）—— 存整条路径 `['zj', 'hz', 'xh']`，自解释、不需要反查
   *   - `'leaf'` —— 只存最后一级 `'xh'`，展示时按 `options` 反查路径
   */
  valueType?: 'path' | 'leaf';
  /** 允许选中非叶子节点（点父级也算选中），默认 false */
  checkStrictly?: boolean;
}

/**
 * 级联选择列：常态是 `浙江 / 杭州 / 西湖`，编辑态是多栏面板。
 *
 * ```ts
 * VtCascader({ key: 'area', title: '区域', width: 240, options: AREA_TREE })
 * // 行数据里只存叶子 id
 * VtCascader({ key: 'catId', title: '分类', width: 240, options: CAT_TREE,
 *              valueType: 'leaf', checkStrictly: true })
 * ```
 *
 * `valueType: 'leaf'` 的反查是一次 DFS，**在工厂里预建 `value → 路径` 的索引**（单元格组件
 * 只建一次），否则每个单元格每次渲染都要遍历整棵树 —— 虚拟滚动下这是每帧几十次。
 * 代价是 `options` 必须在建列时就定下来；运行时换树请重新 `setColumns()`。
 *
 * 选中叶子（或 `checkStrictly` 下点任意节点）立即写回并关闭面板；展开父级只改面板，
 * 不动数据。
 */
export function VtCascader<T = any>(opts: VtCascaderOptions<T>): VirtTableColumn<T> {
  const sep = opts.separator ?? ' / ';
  const byLeaf = opts.valueType === 'leaf';

  /** `叶子/节点 value → 从根到它的路径`。只在建列时算一次 */
  const pathIndex = new Map<string | number, VtCascaderOption[]>();
  (function index(nodes: VtCascaderOption[], prefix: VtCascaderOption[]): void {
    for (const node of nodes) {
      const path = [...prefix, node];
      pathIndex.set(node.value, path);
      if (node.children?.length) index(node.children, path);
    }
  })(opts.options, []);

  /** 行值 → 节点路径 */
  const resolvePath = (value: unknown): VtCascaderOption[] => {
    if (byLeaf) {
      if (value == null || value === '') return [];
      return pathIndex.get(value as string | number) ?? [];
    }
    if (!Array.isArray(value) || value.length === 0) return [];
    // 存的就是路径：逐层按 value 找节点，遇到对不上的层就停（options 变过时不至于整列崩）
    const out: VtCascaderOption[] = [];
    let level = opts.options;
    for (const v of value as (string | number)[]) {
      const hit = level.find((o) => o.value === v);
      if (!hit) break;
      out.push(hit);
      level = hit.children ?? [];
    }
    return out;
  };

  const serialize = (path: VtCascaderOption[]): unknown =>
    byLeaf ? (path[path.length - 1]?.value ?? '') : path.map((n) => n.value);

  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: ({ value }) => {
      const path = resolvePath(value);
      if (path.length === 0) return opts.placeholder ?? '';
      return path.map((n) => n.label).join(sep);
    },
  };

  if (!opts.disabled) {
    col.renderEditor = (ctx) => {
      /** 面板里当前展开/选中的路径 */
      let path = resolvePath(ctx.value);

      // clearable → 锚点右侧一个「×」。清空写回的形状跟着 valueType 走
      // （`serialize([])`：path 是 `[]`、leaf 是 `''`），不用在这里再判一次
      const anchor = makeAnchor(
        opts.placeholder,
        opts.clearable
          ? () => {
              path = [];
              syncAnchor();
              commitValue(opts, ctx, serialize(path));
              paint();
            }
          : undefined,
      );

      const syncAnchor = (): void => {
        anchor.setText(path.length ? path.map((n) => n.label).join(sep) : '');
      };

      const popup = createPopup({
        anchor: anchor.el,
        // anchor 此刻还没挂进文档，宿主从编辑浮层去找（见 _popup.ts 的 owner）
        owner: ctx.el,
        // 几何基准取单元格盒子，不取锚点（锚点在 cover 的 2px 边框内侧，会错开 4px）
        geometry: ctx.el,
        className: 'vt-comp-cascader',
        minWidth: 0,
        onClose: () => popup.destroy(),
      });

      const paint = (): void => {
        popup.el.innerHTML = '';

        // 栏 0 是根，之后每一层来自 path 上带 children 的节点
        const levels: VtCascaderOption[][] = [opts.options];
        for (const node of path) {
          if (node.children?.length) levels.push(node.children);
          else break;
        }

        levels.forEach((nodes, depth) => {
          const colEl = document.createElement('div');
          colEl.className = 'vt-comp-cascader-col';

          for (const node of nodes) {
            const item = document.createElement('div');
            item.className = 'vt-filter-item';
            if (path[depth]?.value === node.value) item.classList.add('is-selected');

            const text = document.createElement('span');
            text.textContent = node.label;
            item.appendChild(text);

            const hasChildren = !!node.children?.length;
            if (hasChildren) {
              const arrow = document.createElement('span');
              arrow.className = 'vt-comp-cascader-arrow';
              arrow.textContent = '›';
              item.appendChild(arrow);
            }

            if (node.disabled) {
              item.setAttribute('aria-disabled', 'true');
            } else {
              item.addEventListener('click', () => {
                path = [...path.slice(0, depth), node];
                if (hasChildren && !opts.checkStrictly) {
                  // 只展开下一栏，不写回 —— 父级不是一个合法选择
                  paint();
                  return;
                }
                syncAnchor();
                commitValue(opts, ctx, serialize(path));
                if (hasChildren) paint();
                else popup.destroy();
              });
            }

            colEl.appendChild(item);
          }

          popup.el.appendChild(colEl);
        });

        popup.update();
      };

      syncAnchor();
      paint();
      return anchor.el;
    };
  }

  return col;
}
