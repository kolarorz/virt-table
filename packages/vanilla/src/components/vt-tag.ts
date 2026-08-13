import type { VirtTableColumn } from '../index';
import { type TagChipOptions, type VtTagOption, createTagChip } from './_tag-chip';
import { type BaseColumnOptions, pickColumnProps } from './shared';

export type { VtTagOption, TagChipOptions };

export interface VtTagOptions<T = any> extends BaseColumnOptions<T>, TagChipOptions<T> {
  /**
   * 值 → 文案 + 配色的**字典**（不是候选集）。不给就把原始值直接当标签文本
   * （适合状态字段本身就是中文的情况）。
   */
  options?: VtTagOption[];
}

/**
 * 标签列（**纯展示**）：把行里的值画成彩色胶囊。
 *
 * ```ts
 * // 值本身就是文案
 * VtTag({ key: 'level', title: '级别', width: 120 })
 * // 给一份「值 → 文案 + 配色」的字典
 * VtTag({ key: 'status', title: '状态', width: 120, options: [
 *   { value: 'active',  label: '活跃', variant: 'success' },
 *   { value: 'pending', label: '待审', variant: 'warning' },
 * ]})
 * // 按行动态上色
 * VtTag({ key: 'level', title: '级别', color: (row) => row.level > 3 ? '#a855f7' : undefined })
 * ```
 *
 * **它不参与选择**，因此不提供 `renderEditor`。要「从候选集里选，选中的画成胶囊」用
 * `VtSelect({ display: 'tag' })`（多值再加 `multiple: true`）—— 这是一次架构决定：
 * **「长什么样」是参数，不该是组件名**。
 *
 * | 要做的事 | 怎么写 |
 * | --- | --- |
 * | 只读的标签列 | `VtTag({ key, options? })` |
 * | 可选的标签列（单值） | `VtSelect({ key, options, display: 'tag' })` |
 * | 可选的标签列（多值） | `VtSelect({ key, options, display: 'tag', multiple: true })` |
 *
 * 之前这里有过 `editable`（内部走同一个枚举选择内核），于是「单值彩色标签」是
 * `VtTag({ editable: true })`、「多值彩色标签」是 `VtMultiSelect` —— **元数不该换组件名**，
 * 而且同一件事有了两种拼法。现在选择只有一个入口，`VtTag` 回到它真正独有的那一半职责：
 * 没有候选集、值本身就是内容、配色可以按行算。胶囊外观与 `VtSelect` 共用
 * `createTagChip`，所以两者必然长得一样。
 */
export function VtTag<T = any>(opts: VtTagOptions<T>): VirtTableColumn<T> {
  const chip = createTagChip<T>(opts);

  return {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: ({ value, row, rowIndex }) => {
      if (value == null || value === '') return opts.placeholder ?? '';
      return chip(value as string | number, row, rowIndex);
    },
  };
}
