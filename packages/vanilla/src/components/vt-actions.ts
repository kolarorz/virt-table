import type { VirtTableColumn } from '../index';
import { createPopup } from './_popup';
import {
  type BaseColumnOptions,
  type Dynamic,
  type VtSemanticType,
  makeCellWrap,
  pickColumnProps,
  resolveDynamic,
  semanticColor,
  stopCellInterference,
} from './shared';

/** 二次确认配置 */
export interface VtActionConfirm {
  /** 提示文案 */
  text: string;
  /** 确定按钮文案，默认「确认」 */
  okText?: string;
  /** 取消按钮文案，默认「取消」 */
  cancelText?: string;
}

export interface VtActionItem<T = any> {
  /** 按钮文案，可按行动态给 */
  text: Dynamic<string, T>;
  /** 点击回调。配了 `confirm` 时只有点「确定」才会走到这里 */
  onClick: (row: T, rowIndex: number) => void;
  /** 语义色，默认 `primary`（删除一类动作配 `danger`） */
  variant?: VtSemanticType;
  /** 禁用（仍然渲染，置灰不可点） */
  disabled?: Dynamic<boolean, T>;
  /** 隐藏（整个按钮不渲染，连位置都不占） */
  hidden?: Dynamic<boolean, T>;
  /** 二次确认：点击后先弹气泡，确定了才执行 `onClick` */
  confirm?: string | VtActionConfirm;
}

export interface VtActionsOptions<T = any>
  extends Omit<BaseColumnOptions<T>, 'clearable' | 'placeholder' | 'onChange'> {
  items: VtActionItem<T>[];
}

const normalizeConfirm = (c: string | VtActionConfirm): VtActionConfirm =>
  typeof c === 'string' ? { text: c } : c;

/**
 * 操作列：一格里排几个链接式按钮。
 *
 * ```ts
 * VtActions({
 *   key: 'actions', title: '操作', width: 180, fixed: 'right', align: 'center',
 *   items: [
 *     { text: '编辑', onClick: (row) => openDialog(row) },
 *     { text: '禁用', hidden: (row) => !row.enabled, onClick: (row) => disable(row) },
 *     { text: '删除', variant: 'danger', confirm: '删除后不可恢复，确定吗？',
 *       onClick: (row) => remove(row) },
 *   ],
 * })
 * ```
 *
 * `key` 是列的身份，操作列没有对应数据字段，随便给个不与真实字段冲突的名字（如
 * `'actions'`）即可 —— `render` 完全不读 `value`。
 *
 * `text` / `disabled` / `hidden` 都能写成 `(row, rowIndex) => …`：操作列的可用性几乎
 * 总是跟着行状态走（草稿才能编辑、已停用的不能再停用），做成常量就得让使用方回退到
 * 手写 `render`，那这个组件就没意义了。
 *
 * **确认气泡不接表格的 i18n**：单元格组件是纯工厂函数，拿不到 `VirtTable` 实例，也就读不到
 * `options.locale`。默认文案是中文（与默认语言包 `zhCN` 一致），要别的语言就在
 * `confirm` 对象里传 `okText` / `cancelText`。
 */
export function VtActions<T = any>(opts: VtActionsOptions<T>): VirtTableColumn<T> {
  return {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: ({ row, rowIndex }) => {
      const wrap = makeCellWrap('actions');

      for (const item of opts.items) {
        if (resolveDynamic(item.hidden, row, rowIndex)) continue;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vt-comp-action';
        btn.textContent = resolveDynamic(item.text, row, rowIndex);
        const color = semanticColor(item.variant);
        if (color) btn.style.setProperty('--vt-comp-action-color', color);

        const disabled = !!opts.disabled || !!resolveDynamic(item.disabled, row, rowIndex);
        if (disabled) {
          btn.disabled = true;
        } else if (item.confirm) {
          const cfg = normalizeConfirm(item.confirm);
          btn.addEventListener('click', () => {
            openConfirm(btn, cfg, () => item.onClick(row, rowIndex));
          });
        } else {
          btn.addEventListener('click', () => item.onClick(row, rowIndex));
        }

        wrap.appendChild(btn);
      }

      // 整个按钮组吃掉指针事件：否则 vtCellSelection 会把点击当框选起点，
      // vtCellEditor 会试图进入编辑态（操作列通常没有 renderEditor，但仍会顶掉别处的编辑）
      stopCellInterference(wrap);
      return wrap;
    },
  };
}

/** 二次确认气泡。外壳与按钮全部复用共享面板皮肤 */
function openConfirm(anchor: HTMLElement, cfg: VtActionConfirm, onOk: () => void): void {
  const popup = createPopup({
    anchor,
    className: 'vt-comp-confirm',
    minWidth: 0,
    onClose: () => popup.destroy(),
  });

  const text = document.createElement('div');
  text.className = 'vt-comp-confirm-text';
  text.textContent = cfg.text;

  const actions = document.createElement('div');
  actions.className = 'vt-filter-actions';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'vt-filter-btn';
  cancel.textContent = cfg.cancelText ?? '取消';
  cancel.addEventListener('click', () => popup.destroy());

  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'vt-filter-btn vt-filter-btn--primary';
  ok.textContent = cfg.okText ?? '确认';
  ok.addEventListener('click', () => {
    popup.destroy();
    onOk();
  });

  actions.append(cancel, ok);
  popup.el.append(text, actions);
  // 内容是后填的，填完才知道真实高度 → 重新定位一次
  popup.update();
  requestAnimationFrame(() => ok.focus());
}
