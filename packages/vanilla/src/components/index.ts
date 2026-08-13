/**
 * 内置**单元格组件**入口：`@virt-table/vanilla/components`
 *
 * 一组工厂函数，交付的东西是**一格该长什么样 + 怎么改值**：
 *
 * - **常态** `render` —— 没进入编辑时这一格的样子。注意「常态」不等于「只读」：
 *   `VtSwitch` / `VtCheckbox` / `VtRate` / `VtActions` 的交互与写回**全都发生在常态里**
 *   （所以这批组件刻意不提供 `renderEditor`）。这也是这个词不叫「展示态」的原因。
 * - **编辑态** `renderEditor` —— 由 `vtCellEditor` 打开的编辑会话，浮层盖在单元格上方。
 *
 * 调用工厂得到一个配好这两者的 `VirtTableColumn`，所以最常见的用法是「一列的每一格都
 * 这样」；配 `asCell()` 也能只装在**单个格子**上。核心表格自身不用它们，所以不从主入口
 * 导出 —— 否则这些代码与 `VtFilterBuilder` 那 400 多行 CSS 会一起进核心样式表。
 *
 * > 名字上曾经叫「列组件」。改称单元格组件是因为「列」是**用法**不是**身份**：同一个
 * > 工厂装在列上还是装在一格上，交付的都是那一格的内容与编辑器。
 *
 * ```ts
 * import { VtSwitch, VtTag, VtActions, asCell } from '@virt-table/vanilla/components';
 * import '@virt-table/vanilla/components/index.css';
 *
 * const table = new VirtTable(el, {
 *   columns: [
 *     VtTag({ key: 'status', title: '状态', width: 120, options: STATUS }),
 *     VtSwitch({ key: 'enabled', title: '启用', width: 100 }),
 *     VtActions({ key: 'ops', title: '操作', width: 160, items: [...] }),
 *   ],
 *   plugins: [vtCellEditor()],   // 编辑态组件需要它；纯展示/直接可点的组件不需要
 * })
 *
 * // 单元格级：只有这一格用下拉，同列其他格照列上的配置走
 * table.setCellRender('42', 'status', asCell(VtSelect, { options: STATUS }));
 * ```
 *
 * 它们**不是优先级链上的一档**：装在哪一级，就以那一级的身份参与内容层解析
 * （单元格级 > 列级，见 `VirtTable` 的 `_resolveCellContent`）。所以不存在
 * 「组件和 render 谁赢」这个问题 —— 组件就是 render（外加一个配套的 renderEditor）。
 *
 * **枚举选择那一家是同一个内核的四个预设**（真轴只有两个：单值/多值 × 展示形态）：
 *
 * | | 纯文本 | 彩色胶囊 | 头像胶囊 |
 * | --- | --- | --- | --- |
 * | 单值 | `VtSelect` | `VtSelect({ display: 'tag' })` | `VtPerson` |
 * | 多值 | `VtSelect({ multiple })` | `VtSelect({ display: 'tag', multiple })` | `VtPerson({ multiple })` |
 *
 * **元数与样式都是参数，不是组件名** —— 所以「从候选集里选」只有 `VtSelect` 一个入口
 * （人员是例外：头像 + 悬停名片是一整套展示与交互，不只是样式）。面板、搜索、键盘、
 * 清除 ×、`+N` 折叠来自 `_enum.ts` 的 `createEnumEditor`；胶囊外观与纯展示的 `VtTag`
 * 共用 `createTagChip`。理由与走过的弯路见 `_enum.ts` 的头注。
 *
 * 两类组件，交互模型刻意不同：
 *
 * | 类别 | 组件 | 怎么改值 |
 * | --- | --- | --- |
 * | **编辑态** | `VtInput` `VtNumberInput` `VtSelect` `VtDatePicker` `VtDateRangePicker` `VtTimePicker` `VtTextarea` `VtAutocomplete` `VtCascader` `VtPerson`（配 `options`） | 走 `renderEditor`，**需要装 `vtCellEditor` 插件** |
 *
 * `VtDatePicker` 与 `VtDateRangePicker` 共用一套**自绘日历面板**（区间版双月并排：点起点 →
 * hover 预览 → 点终点即写回；单日版是同一套面板的单月单选）。外观走 `--vt-*` 所以跟随暗色
 * 主题，值的形状与改造前一致。`native: true` 切回浏览器原生控件。`VtTimePicker` 仍是原生
 * `input[type=time]`。
 * | **直接可点** | `VtCheckbox` `VtSwitch` `VtRate` `VtActions` | 常态本身可交互，点一下就写回，不需要插件 |
 * | 纯展示 | `VtTag` `VtProgress` `VtLink` `VtPerson`（不配 `options`） | 不改值 |
 *
 * `VtTag` 只在「纯展示」那一栏：它没有候选集，值本身就是内容。要「从候选集里选、选中的
 * 画成胶囊」用 `VtSelect({ display: 'tag' })`。
 *
 * 「直接可点」那一类不提供 `renderEditor`：给了的话，装了 `vtCellEditor` 的人点开关会先
 * 得到一个盖住开关的编辑浮层，要点第二下才生效。它们内部用 `stopCellInterference`
 * 拦掉冒泡，所以与框选/编辑插件共存也不会互相触发。
 */
export { VtInput, type VtInputOptions } from './vt-input';
export { VtNumberInput, type VtNumberInputOptions } from './vt-number-input';
export { VtSelect, type VtSelectOptions, type VtSelectOption } from './vt-select';
export {
  VtDatePicker,
  type VtDatePickerOptions,
  type VtDatePickerPanelOptions,
  type VtDatePickerNativeOptions,
} from './vt-date-picker';
export {
  VtDateRangePicker,
  type VtDateRangePickerOptions,
  type VtDateRangePickerPanelOptions,
  type VtDateRangePickerNativeOptions,
} from './vt-date-range-picker';
/**
 * 日历面板的公共类型：`shortcuts` 与 `texts` 两个选项要用到。面板本体
 * （`createCalendar` 与那批日期纯函数）是内部件，不出口 —— 与 `_popup` / `_enum` 一致。
 */
export type { VtDateShortcut, VtDateShortcutsOption } from './_calendar';
export type { VtCalendarTexts } from '../locale';
export { VtTimePicker, type VtTimePickerOptions } from './vt-time-picker';
export { VtTextarea, type VtTextareaOptions } from './vt-textarea';

export { VtCheckbox, type VtCheckboxOptions } from './vt-checkbox';
export { VtSwitch, type VtSwitchOptions } from './vt-switch';
export { VtTag, type VtTagOptions, type VtTagOption, type TagChipOptions } from './vt-tag';

export {
  VtActions,
  type VtActionsOptions,
  type VtActionItem,
  type VtActionConfirm,
} from './vt-actions';
export {
  VtProgress,
  type VtProgressOptions,
  type VtProgressThreshold,
} from './vt-progress';
export { VtRate, type VtRateOptions } from './vt-rate';
export {
  VtLink,
  type VtLinkOptions,
  type VtLinkReadonlyOptions,
  type VtLinkEditableOptions,
  type VtLinkValue,
} from './vt-link';

export { VtPerson, type VtPersonOptions, type VtPersonOption } from './vt-person';
export { VtAutocomplete, type VtAutocompleteOptions } from './vt-autocomplete';
export {
  VtCascader,
  type VtCascaderOptions,
  type VtCascaderOption,
} from './vt-cascader';

export {
  VtFilterBuilder,
  type VtFilterBuilderOptions,
  type VtFilterBuilderTexts,
} from './vt-filter-builder';

/**
 * 把组件装到**单个格子**上（配 `table.setCellRender()`）。列级用法直接调工厂即可，
 * 不需要它。
 */
export { asCell, type CellOnlyOptions } from './shared';

/** 组件间共享的公共类型（单元格组件的 options 都继承 `BaseColumnOptions`） */
export type {
  BaseColumnOptions,
  BoolValueOptions,
  Dynamic,
  VtOption,
  VtSemanticType,
} from './shared';
