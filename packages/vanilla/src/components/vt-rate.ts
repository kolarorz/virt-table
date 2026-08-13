import type { VirtTableColumn } from '../index';
import {
  type BaseColumnOptions,
  commitValue,
  makeCellWrap,
  pickColumnProps,
  stopCellInterference,
} from './shared';

export interface VtRateOptions<T = any> extends Omit<BaseColumnOptions<T>, 'clearable'> {
  /** 星数，默认 5 */
  count?: number;
  /** 允许半星（展示与点选都支持），默认 false */
  allowHalf?: boolean;
  /** 在星星右侧显示分值，默认 false */
  showText?: boolean;
  /** 文字格式化，默认直接显示分值 */
  format?: (value: number, row: T) => string;
  /** 星色，默认 `--vt-color-warning` */
  color?: string;
}

/*
 * 16×16 视口的实心五角星，十个角都做了小圆角（外角 r≈0.65、内角 r≈0.45），
 * 和表格里按钮 / 标签的圆角量级一致。常量字符串，不含任何外部输入。
 */
const STAR_SVG =
  '<svg class="vt-comp-rate-icon" viewBox="0 0 16 16" aria-hidden="true">' +
  '<path d="M8.27 2.26L9.77 5.57Q9.95 5.98 10.4 6.03L14.01 6.43Q14.66 6.51 14.18 6.94' +
  'L11.49 9.39Q11.16 9.7 11.25 10.14L11.98 13.69Q12.11 14.33 11.55 14.01L8.39 12.22' +
  'Q8 11.99 7.61 12.22L4.45 14.01Q3.89 14.33 4.02 13.69L4.75 10.14Q4.84 9.7 4.51 9.39' +
  'L1.82 6.94Q1.34 6.51 1.99 6.43L5.6 6.03Q6.05 5.98 6.23 5.57L7.73 2.26Q8 1.67 8.27 2.26Z"/></svg>';

/**
 * 星级列。默认可点选（`disabled: true` 变只读回显）。
 *
 * ```ts
 * VtRate({ key: 'score', title: '评分', width: 140 })
 * VtRate({ key: 'score', title: '评分', width: 180, allowHalf: true, showText: true })
 * VtRate({ key: 'score', title: '评分', width: 140, disabled: true })   // 只读
 * ```
 *
 * 与 `VtCheckbox` / `VtSwitch` 同一套交互模型：**不给 `renderEditor`，点一下直接写回**，
 * 并且 `stopCellInterference` 拦掉冒泡（理由见 `vt-checkbox.ts` 的注释）。
 *
 * 半星靠「底层空心星 + 上层按百分比裁剪的实心星」画（`.vt-comp-rate-fill` 的宽度），
 * 所以只需要一份图标；点选时按点击位置落在星的左半还是右半决定 `.5`。
 */
export function VtRate<T = any>(opts: VtRateOptions<T>): VirtTableColumn<T> {
  const count = opts.count ?? 5;
  const editable = !opts.disabled;

  return {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: (ctx) => {
      const raw = Number(ctx.value);
      const score = Number.isNaN(raw) ? 0 : Math.min(count, Math.max(0, raw));

      const wrap = makeCellWrap('rate');
      if (editable) wrap.classList.add('vt-comp-rate--editable');
      if (opts.color) wrap.style.setProperty('--vt-comp-rate-color', opts.color);
      wrap.setAttribute('role', 'img');
      wrap.setAttribute('aria-label', `${score} / ${count}`);

      const fills: HTMLElement[] = [];

      for (let i = 0; i < count; i++) {
        const star = document.createElement('span');
        star.className = 'vt-comp-rate-star';
        star.innerHTML = STAR_SVG;

        const fill = document.createElement('span');
        fill.className = 'vt-comp-rate-fill';
        fill.innerHTML = STAR_SVG;
        star.appendChild(fill);
        fills.push(fill);

        if (editable) {
          star.addEventListener('click', (e) => {
            const rect = star.getBoundingClientRect();
            const half = opts.allowHalf && e.clientX - rect.left < rect.width / 2;
            const next = i + (half ? 0.5 : 1);
            paint(fills, next);
            wrap.setAttribute('aria-label', `${next} / ${count}`);
            if (textEl) textEl.textContent = formatText(next, ctx.row);
            commitValue(opts, ctx, next);
          });
        }

        wrap.appendChild(star);
      }

      paint(fills, score);

      let textEl: HTMLElement | null = null;
      if (opts.showText) {
        textEl = document.createElement('span');
        textEl.className = 'vt-comp-rate-text';
        textEl.textContent = formatText(score, ctx.row);
        wrap.appendChild(textEl);
      }

      if (editable) stopCellInterference(wrap);
      return wrap;
    },
  };

  function formatText(v: number, row: T): string {
    return opts.format ? opts.format(v, row) : String(v);
  }
}

/** 按分值刷每颗星的填充宽度（满星 100%、半星 50%、空星 0） */
function paint(fills: HTMLElement[], score: number): void {
  fills.forEach((fill, i) => {
    const ratio = Math.min(1, Math.max(0, score - i));
    fill.style.width = `${ratio * 100}%`;
  });
}
