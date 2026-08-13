import type { VirtTableColumn } from '../index';
import {
  type BaseColumnOptions,
  type Dynamic,
  type VtSemanticType,
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
  extends Omit<BaseColumnOptions<T>, 'clearable' | 'onChange'> {
  /** 满值，默认 100 */
  max?: number;
  /** 是否显示右侧文字，默认 true */
  showText?: boolean;
  /** 文字格式化，默认 `${percent}%` */
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

  return {
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
