import type { VirtTableColumn } from '../index';
import { buildChips, createEnumEditor, enumCodec, renderChipCell } from './_enum';
import { type VtTagOption, createTagChip } from './_tag-chip';
import {
  type BaseColumnOptions,
  type Dynamic,
  type VtSemanticType,
  buildOptionMap,
  clearableOn,
  pickColumnProps,
} from './shared';

/** 候选项。带 `variant` 是为了 `display: 'tag'` 时逐项配色 */
export interface VtSelectOption extends VtTagOption {}

interface VtSelectBase<T> extends BaseColumnOptions<T> {
  options: VtSelectOption[];
  /** 多值。值的形状由 `valueType` 决定 */
  multiple?: boolean;
  /**
   * `multiple` 时值的存储形式：
   *   - `'array'`（默认）—— 行数据里存 `['a', 'b']`
   *   - `'string'` —— 存 `'a,b'`，用 `separator` 拆/拼
   *
   * 单值恒为标量（清空写 `''`）。
   */
  valueType?: 'array' | 'string';
  /** `valueType: 'string'` 时的分隔符，默认 `','` */
  separator?: string;
  /**
   * 面板顶部给搜索框，默认 false。
   *
   * 默认关是因为枚举列常常只有 3~8 项，多一行搜索框是噪音；候选多（几十项）时再打开。
   */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** 搜不到时的提示文案，默认「无匹配项」 */
  emptyText?: string;
  /** `multiple` 时面板底部是否给「清空 / 全选」，默认 true */
  showActions?: boolean;
}

/**
 * 选中值画成什么样。
 *
 * **判别联合**而不是几个可选字段并列：`display: 'text'` 时传 `variant` / `maxCount`
 * 会直接编译报错 —— 那些只对胶囊有意义（文本模式按「、」拼，没有「折叠成 +N」这回事）。
 */
export type VtSelectOptions<T = any> = VtSelectBase<T> &
  (
    | {
        /** 纯文本（默认）：常态是候选项的 `label`，多值用「、」拼 */
        display?: 'text';
      }
    | {
        /** 彩色胶囊：与 `VtTag` 共用同一个胶囊工厂，所以外观必然一致 */
        display: 'tag';
        /** 统一语义色，或按行动态给（`options` 里的 `variant` 优先） */
        variant?: Dynamic<VtSemanticType | undefined, T>;
        /** 统一自定义色，或按行动态给（优先级最高） */
        color?: Dynamic<string | undefined, T>;
        /** `multiple` 时最多画几个胶囊，超出折叠成 `+N`。默认 3；给 0 表示不折叠 */
        maxCount?: number;
      }
  );

/**
 * 下拉选择列 —— **「从候选集里选」的唯一入口**。
 *
 * ```ts
 * // 单值 + 文本
 * VtSelect({ key: 'status', title: '状态', width: 160, options: STATUS, clearable: true })
 * // 单值 + 彩色胶囊（原来的 VtTag({ editable: true })）
 * VtSelect({ key: 'status', title: '状态', width: 160, options: STATUS, display: 'tag' })
 * // 多值 + 彩色胶囊（原来的 VtMultiSelect）
 * VtSelect({ key: 'tags', title: '标签', width: 260, options: TAGS,
 *            display: 'tag', multiple: true, maxCount: 2 })
 * // 多值 + 文本，且存成逗号分隔字符串
 * VtSelect({ key: 'roles', title: '角色', width: 220, options: ROLES,
 *            multiple: true, valueType: 'string' })
 * ```
 *
 * **两根轴都是参数，不是组件名**：元数（`multiple`）× 展示形态（`display`）。
 * 这是一次架构决定 —— 之前「单值彩色标签」叫 `VtTag({ editable })`、「多值彩色标签」叫
 * `VtMultiSelect`，等于让元数和样式各自换了个组件名，同一件事出现多种拼法。
 * 纯展示的标签列仍然是 `VtTag`（没有候选集，值本身就是内容）；人员列仍然是 `VtPerson`
 * （头像 + 名片是一整套展示与交互，不只是样式）。
 *
 * 面板、搜索、`↑↓`/`Enter`、清除 `×`、`+N` 折叠全部来自 `_enum.ts` 的 `createEnumEditor`
 * （`VtPerson` 也用它），所以这些能力在几个预设上行为一致。
 *
 * `clearable` **默认开**：锚点上一个 `×`，并且激活这一格后按 `Delete` / `Backspace` 也清空
 * （单值写回 `''`，多值写回 `[]` / `''`）。不许清空的列传 `clearable: false`，理由见
 * `shared.ts` 的 `clearableOn`。
 *
 * **不是原生 `<select>`** —— 原生下拉列表由操作系统渲染，`--vt-*` 一个都吃不到，不跟暗色
 * 主题也不跟圆角/字号，摆在自绘面板旁边明显是两套东西。
 */
export function VtSelect<T = any>(opts: VtSelectOptions<T>): VirtTableColumn<T> {
  const codec = enumCodec(opts);
  /** 胶囊模式的那批选项要先窄化才能读（判别联合） */
  const tag = opts.display === 'tag' ? opts : null;
  const chip = tag ? createTagChip<T>({ ...tag, options: opts.options }) : null;
  const optionMap = buildOptionMap(opts.options);
  const label = (v: string | number): string => optionMap.get(v)?.label ?? String(v);

  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: ({ value, row, rowIndex }) => {
      const picked = codec.parse(value);
      if (picked.length === 0) return opts.placeholder ?? '';

      if (!chip) return picked.map(label).join('、');

      // 单值就一个胶囊，不套 `.vt-comp-cell` 外层（不需要 chip 序列的横向排布）
      if (!opts.multiple) return chip(picked[0]!, row, rowIndex);

      return (
        renderChipCell(picked, {
          modifier: 'tags',
          maxCount: tag!.maxCount,
          chip: (v) => chip(v, row, rowIndex),
        }) ?? (opts.placeholder ?? '')
      );
    },
  };

  if (!opts.disabled) {
    col.renderEditor = (ctx) =>
      createEnumEditor<T, VtSelectOption>(opts, ctx, {
        options: opts.options,
        multiple: !!opts.multiple,
        searchable: !!opts.searchable,
        searchPlaceholder: opts.searchPlaceholder,
        emptyText: opts.emptyText,
        showActions: opts.showActions,
        // 锚点没有「删空」的手段，所以 × 默认给（`clearable: false` 关掉），见 `clearableOn`
        clearable: clearableOn(opts),
        codec,
        // 胶囊模式下：候选项与锚点回显都用同一枚胶囊 —— 点开单元格不该换一种长相
        renderItem: chip ? (option) => chip(option.value, ctx.row, ctx.rowIndex) : undefined,
        renderAnchor: chip
          ? (items) =>
              items.length === 0
                ? ''
                : buildChips(items, {
                    // 单值就一个，不需要折叠计数
                    maxCount: opts.multiple ? tag!.maxCount : 0,
                    chip: (o) => chip(o.value, ctx.row, ctx.rowIndex),
                  })
          : undefined,
      });
  }

  return col;
}
