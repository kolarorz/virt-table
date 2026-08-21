import type { VirtTableColumn } from '../index';
import {
  type BaseColumnOptions,
  type Dynamic,
  type VtSemanticType,
  commitValue,
  makeCellWrap,
  pickColumnProps,
  resolveDynamic,
  semanticColor,
} from './shared';

/** 色阶：命中第一条 `value <= lte` 的规则 */
export interface VtProgressThreshold {
  /** 上界（含） */
  lte: number;
  variant?: VtSemanticType;
  /** 自定义色，优先于 `variant` */
  color?: string;
}

export interface VtProgressOptions<T = any>
  extends Omit<BaseColumnOptions<T>, 'clearable'> {
  /** 满值，默认 100 */
  max?: number;
  /**
   * 是否可编辑，默认 false（只读展示）。
   *
   * 开启后编辑态是**滑块 + 数字输入框**：拖着调是进度这种连续比例最顺手的方式，也与只读态
   * 的条形观感一致（拖到哪就是哪）；但「把它改成正好 65」用滑块几乎调不准，所以右侧那格
   * 文字在编辑态换成可键入的数字框（`max: 100` 时它就是百分比，见 `showText`）。
   */
  editable?: boolean;
  /** 滑块步长与数字框的 `step`，默认 `max / 100`（即百分点） */
  step?: number;
  /**
   * 是否显示右侧那格数字，默认 true。
   *
   * 只读态是 `format` 的文字；`editable` 的编辑态是数字输入框（键入的是**原值**，`0 ~ max`
   * —— 默认 `max: 100` 下就是百分比，此时框后面跟一个 `%`）。关掉则编辑态只剩滑块。
   */
  showText?: boolean;
  /**
   * 只读态右侧文字的格式化，默认 `${percent}%`。
   *
   * **只作用于只读态** —— `editable` 的编辑态那一格是数字输入框（一个能被 `format` 改成
   * 任意文案的输入框没法再当输入框用）。
   */
  format?: (value: number, percent: number, row: T) => string;
  /** 统一颜色，或按行动态给（优先于 `thresholds`） */
  color?: Dynamic<string | undefined, T>;
  /** 语义色 */
  variant?: Dynamic<VtSemanticType | undefined, T>;
  /**
   * 按百分比取色。规则按数组顺序求值，命中第一条 `percent <= lte` 的。
   * 例：`[{ lte: 30, variant: 'danger' }, { lte: 70, variant: 'warning' }]`
   * —— 30 以下红、70 以下黄、其余用默认主色。
   */
  thresholds?: VtProgressThreshold[];
}

/**
 * 进度条列（只读展示）。
 *
 * ```ts
 * VtProgress({ key: 'progress', title: '进度', width: 200 })
 * VtProgress({ key: 'score', title: '得分', width: 200, max: 5,
 *              format: (v) => `${v} / 5`,
 *              thresholds: [{ lte: 40, variant: 'danger' }, { lte: 80, variant: 'warning' }] })
 * ```
 *
 * 值非数字（`null` / 空串 / 文本）时按 0 画，文字位显示原始值 —— 直接画成空条会让
 * 「真的是 0」和「这行没数据」看起来一样。
 */
export function VtProgress<T = any>(opts: VtProgressOptions<T>): VirtTableColumn<T> {
  const max = opts.max ?? 100;
  const showText = opts.showText !== false;

  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: ({ value, row, rowIndex }) => {
      const raw = Number(value);
      const valid = value !== null && value !== undefined && value !== '' && !Number.isNaN(raw);
      const num = valid ? raw : 0;
      const percent = max > 0 ? Math.min(100, Math.max(0, (num / max) * 100)) : 0;

      const wrap = makeCellWrap('progress', true);

      const track = document.createElement('span');
      track.className = 'vt-comp-progress-track';
      const bar = document.createElement('span');
      bar.className = 'vt-comp-progress-bar';
      bar.style.width = `${percent}%`;

      const color =
        resolveDynamic(opts.color, row, rowIndex) ??
        semanticColor(resolveDynamic(opts.variant, row, rowIndex)) ??
        pickThresholdColor(opts.thresholds, percent);
      if (color) bar.style.setProperty('--vt-comp-progress-color', color);

      track.appendChild(bar);
      wrap.appendChild(track);

      if (showText) {
        const text = document.createElement('span');
        text.className = 'vt-comp-progress-text';
        if (!valid) {
          text.textContent = value == null || value === '' ? '-' : String(value);
        } else {
          text.textContent = opts.format
            ? opts.format(num, percent, row)
            : `${Math.round(percent)}%`;
        }
        wrap.appendChild(text);
      }

      return wrap;
    },
  };

  /**
   * 编辑态：滑块 + 数字输入框。
   *
   * 两个都要，因为它们解决的是两件事：滑块负责「大概拖到七成」（连续比例最自然的手感，
   * 也与只读态的条形一致），数字框负责「就要 65」——用户反馈的正是后者，滑块在 200px 的
   * 单元格里一个像素约等于半个百分点，根本点不准整数。两者共享同一个值：拖滑块刷新数字框，
   * 键入数字反推滑块位置。
   *
   * 边拖边（边打字边）`commitValue`，而不是松手/失焦才提交：使用方常常要在 `onChange` 里
   * 联动别的视图（比如甘特条的进度段），过程中就跟着动才对得上「同一份数据」的直觉。
   *
   * 数字框在**只读态那格文字的同一个位置**（同 `min-width`），所以点开单元格右侧的数字
   * 不跳位置 —— 与 `.vt-comp-progress-text` 那条注释同一个约束。
   */
  if (opts.editable) {
    const step = opts.step ?? max / 100;
    /** 夹进 `0 ~ max`；非数字按 0 */
    const clamp = (n: number): number => (Number.isNaN(n) ? 0 : Math.min(max, Math.max(0, n)));

    col.renderEditor = (ctx) => {
      const { value } = ctx;
      const wrap = document.createElement('div');
      wrap.className = 'vt-comp-progress-editor';

      const range = document.createElement('input');
      range.type = 'range';
      range.className = 'vt-comp-progress-range';
      range.min = '0';
      range.max = String(max);
      range.step = String(step);
      range.value = String(clamp(Number(value)));

      /** 右侧那格数字。`showText: false` 的列编辑态就只剩滑块 */
      let num: HTMLInputElement | null = null;
      if (showText) {
        num = document.createElement('input');
        num.type = 'number';
        num.className = 'vt-comp-input vt-comp-progress-input';
        num.min = '0';
        num.max = String(max);
        num.step = String(step);
        num.value = range.value;
      }

      /** 值 → 控件（写回之外的所有同步都走它，两个控件永远显示同一个数） */
      const paint = (n: number, from: 'range' | 'number'): void => {
        if (from !== 'range') range.value = String(n);
        // 不回写正在打字的那个框：把 `6` 规范成 `6` 没问题，但光标会跳到末尾
        if (num && from !== 'number') num.value = String(n);
      };

      range.addEventListener('input', () => {
        const n = clamp(Number(range.value));
        paint(n, 'range');
        commitValue(opts, ctx, n);
      });

      num?.addEventListener('input', () => {
        // 空框（用户刚全选删掉，准备重新键入）不写回：那一刻的 `Number('')` 是 0，
        // 提交它等于「删到空就先把进度归零」，条会闪一下再跳回去
        if (num!.value === '') return;
        const n = clamp(Number(num!.value));
        paint(n, 'number');
        commitValue(opts, ctx, n);
      });
      // 离开时把越界/半成品文本规范回真实值（`150` → `100`、`''` → 当前值）
      num?.addEventListener('change', () => {
        const n = num!.value === '' ? clamp(Number(range.value)) : clamp(Number(num!.value));
        num!.value = String(n);
        paint(n, 'range');
        commitValue(opts, ctx, n);
      });

      /**
       * 焦点给数字框而不是滑块：点开一格最常做的就是键入一个准确值（选中全文，直接打字
       * 覆盖）。滑块照旧可拖，键盘用户 `Tab` 一下就到它，而数字框自己的 `↑↓` 也按 `step` 调。
       */
      requestAnimationFrame(() => {
        // `select()` 在部分实现里不带聚焦，所以两步都要
        (num ?? range).focus();
        num?.select();
      });

      wrap.append(range);
      if (num) {
        wrap.appendChild(num);
        // `%` 只在原值本身就是百分比（`max: 100`，也是默认）时才写 —— max: 5 的得分列
        // 后面跟个 `%` 是错的
        if (max === 100) {
          const unit = document.createElement('span');
          unit.className = 'vt-comp-progress-unit';
          unit.textContent = '%';
          wrap.appendChild(unit);
        }
      }
      return wrap;
    };
  }

  return col;
}

function pickThresholdColor(
  thresholds: VtProgressThreshold[] | undefined,
  percent: number,
): string | undefined {
  if (!thresholds) return undefined;
  for (const t of thresholds) {
    if (percent <= t.lte) return t.color ?? semanticColor(t.variant);
  }
  return undefined;
}
