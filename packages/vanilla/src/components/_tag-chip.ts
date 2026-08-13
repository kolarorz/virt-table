/**
 * 标签胶囊工厂（`VtTag` 与 `VtSelect({ display: 'tag' })` 共用）。
 *
 * 单独成文件是为了**依赖方向干净**：两个使用方都是「单元格组件」，谁 import 谁都别扭
 * （下拉选择 import 标签列？），所以基元下沉一层。
 *
 * 外观直接复用核心 `renderCellContent('option', …)`，也就是 `cellType: 'option'` 那个胶囊：
 * 颜色走 `--vt-cell-option-color` 自定义属性、底色由它 `color-mix` 派生。这里不另写一套 ——
 * 否则「表格内置的标签」与「单元格组件的标签」会长得不一样，换主题要改两处。
 */
import { renderCellContent } from '../cell-type';
import {
  type Dynamic,
  type VtOption,
  type VtSemanticType,
  buildOptionMap,
  resolveDynamic,
  semanticColor,
} from './shared';

/** 标签候选项 / 字典项：比通用 `VtOption` 多一个语义色 */
export interface VtTagOption extends VtOption {
  /** 语义色（`color` 优先级更高） */
  variant?: VtSemanticType;
}

/** 列级配色（可按行动态给） */
export interface TagChipOptions<T> {
  options?: VtTagOption[];
  /**
   * 统一语义色，或按行动态给（`options` 里的 `variant` 优先）。
   *
   * ⚠️ 叫 `variant` 而不是 el-plus 那样的 `type`：`type` 在列上已经是**功能列**
   * （`checkbox` / `index` / `tree` …），而组件 options 是从 `VirtTableColumn` 派生的 ——
   * 复用这个名字会直接顶掉功能列字段。
   */
  variant?: Dynamic<VtSemanticType | undefined, T>;
  /** 统一自定义色，或按行动态给（优先级最高） */
  color?: Dynamic<string | undefined, T>;
}

/**
 * 造一个「值 → 彩色胶囊」的渲染器。
 *
 * 配色优先级只有这一处实现：
 * `options[].color` > `options[].variant` > 列级 `color` > 列级 `variant` > 默认主色。
 * 于是「纯展示的标签列」和「选出来的标签」必然长得一样、跟主题也只跟一次。
 */
export function createTagChip<T>(
  opts: TagChipOptions<T>,
): (raw: string | number, row: T, rowIndex: number) => HTMLElement {
  const optionMap = opts.options ? buildOptionMap(opts.options) : null;
  return (raw, row, rowIndex) => {
    const hit = optionMap?.get(raw) as VtTagOption | undefined;
    const label = hit?.label ?? String(raw);
    const color =
      hit?.color ??
      semanticColor(hit?.variant) ??
      resolveDynamic(opts.color, row, rowIndex) ??
      semanticColor(resolveDynamic(opts.variant, row, rowIndex));
    const result = renderCellContent('option', { label, color });
    if (result?.kind === 'node') return result.node;
    // label 为空时 option 分支返回空文本，这里兜一个空胶囊，保证调用方总拿到元素
    const span = document.createElement('span');
    span.className = 'vt-cell-option';
    span.textContent = label;
    return span;
  };
}
