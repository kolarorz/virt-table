/**
 * 日期编辑态的胶水层：`VtDatePicker` 与 `VtDateRangePicker` 的 `renderEditor` 都是它。
 *
 * 单独一个文件而不是塞进 `_calendar.ts`，是为了守住那边的**零运行时 import**：
 * `shared.ts` 第 2 行 `import './components.css'`，一旦 `_calendar.ts` 引它，
 * `_calendar.test.ts`（跑默认 node 环境，为的是纯日期算术不必拉起 DOM）就会连带去加载
 * 样式表。于是分工是：`_calendar.ts` 管日期与面板，本文件管「锚点 + 浮层 + 写回」这套
 * 与表格咬合的部分，两个组件只剩下选项解析与值编解码。
 *
 * 结构照 `vt-cascader.ts` 那份模板（锚点 + 单个 popup + 面板重画），三条硬约束在这里落地：
 *   - `createPopup` 必须传 `owner: ctx.el` 与 `geometry: ctx.el`（AGENTS.md §7.14 有 CDP 实测：
 *     此刻锚点还没挂进文档，`closest('.vt-client')` 恒 null，浮层会掉到 body 上，`--vt-*` 全失效）；
 *   - 写回顺序**先 `syncAnchor()` 再 `commit()`**；
 *   - 面板吃掉的按键要 `preventDefault() + stopPropagation()`，否则 `vtKeyboardNav` 把方向键
 *     当成「换单元格」。
 */
import { createPopup, type PopupHandle } from './_popup';
import {
  createCalendar,
  resolveShortcuts,
  todayDay,
  type DayStr,
  type VtCalendarHandle,
  type VtCalendarMode,
  type VtDateShortcutsOption,
} from './_calendar';
import type { VtCalendarTexts } from '../locale';
import { makeAnchor } from './shared';

export interface DateEditorConfig {
  mode: VtCalendarMode;
  /** 已与默认包合并好的全量文案 */
  texts: VtCalendarTexts;
  min?: string;
  max?: string;
  firstDayOfWeek?: number;
  panels?: 1 | 2;
  shortcuts?: VtDateShortcutsOption;
  placeholder?: string;
  clearable?: boolean;
  /** 行值 → 面板要的 `[start, end]`（单日给 `[d, d]`） */
  read: (value: unknown) => readonly [string, string];
  /** 面板产出的区间 → 写回行数据的值。**值形状由组件决定**，面板不管 */
  write: (range: [DayStr, DayStr]) => unknown;
  /** 清空时写回的值（沿用各组件既有的空形状：`''` 或 `['', '']`） */
  emptyValue: unknown;
  /** 锚点回显。必须与常态 `render` 用同一个函数 —— 点开单元格文字不许跳 */
  display: (value: unknown) => string;
  /** 写回（组件侧包成 `commitValue(opts, ctx, v)`） */
  commit: (value: unknown) => void;
}

/** `renderEditor` 需要的那部分上下文 */
export interface DateEditorCtx {
  value: unknown;
  /** 编辑浮层 `.vt-cell-cover`：既是找宿主（`.vt-client`）的起点，也是浮层的几何基准 */
  el: HTMLElement;
}

export function createDateEditor(ctx: DateEditorCtx, cfg: DateEditorConfig): HTMLElement {
  const today = todayDay();
  const fdow = cfg.firstDayOfWeek ?? 1;
  /** 当前值。面板产出后先更到这里，再同步锚点、再写回 */
  let value: unknown = ctx.value;

  const anchor = makeAnchor(
    cfg.placeholder,
    cfg.clearable
      ? () => {
          value = cfg.emptyValue;
          syncAnchor();
          cfg.commit(value);
          // 面板保持打开（清空之后往往紧接着重选），只把选择状态复位
          cal?.setValue(['', '']);
        }
      : undefined,
  );

  function syncAnchor(): void {
    anchor.setText(cfg.display(value));
  }

  let popup: PopupHandle | null = null;
  let cal: VtCalendarHandle | null = null;

  const close = (): void => {
    cal?.destroy();
    cal = null;
    popup?.destroy();
    popup = null;
  };

  const open = (): void => {
    if (popup) return;
    popup = createPopup({
      anchor: anchor.el,
      // anchor 此刻还没挂进文档，宿主从编辑浮层去找（见 _popup.ts 的 owner）
      owner: ctx.el,
      // 几何基准取单元格盒子，不取锚点（锚点在 cover 的 2px 边框内侧，会错开 4px）
      geometry: ctx.el,
      className: 'vt-comp-calendar-popup',
      // 不跟单元格同宽：宽列会把日历横向拉成一片空白
      minWidth: 0,
      onClose: close,
    });

    cal = createCalendar({
      mode: cfg.mode,
      value: cfg.read(value),
      min: cfg.min,
      max: cfg.max,
      firstDayOfWeek: fdow,
      panels: cfg.panels,
      texts: cfg.texts,
      today,
      shortcuts: resolveShortcuts({
        mode: cfg.mode,
        texts: cfg.texts,
        firstDayOfWeek: fdow,
        option: cfg.shortcuts,
        today,
        min: cfg.min,
        max: cfg.max,
      }),
      onPick: (range) => {
        value = cfg.write(range);
        // 顺序要紧：先刷回显再写回（AGENTS.md §7.14）
        syncAnchor();
        cfg.commit(value);
        // 选完即关。那一格的重绘由 cell-editor 离开编辑态时负责，这里不碰表格
        close();
        anchor.el.focus();
      },
    });

    popup.el.appendChild(cal.el);
    popup.update();
    // 双月放不下就降成单月；宽度变了要重新定位一次
    if (cal.relayout()) popup.update();
  };

  anchor.el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (popup) close();
    else open();
  });

  anchor.el.addEventListener('keydown', (e) => {
    // 面板认领的键（方向、翻月、Enter）在这里被拦住，不然 vtKeyboardNav 会当成换单元格。
    // Esc 面板不认，留给 _popup 的 document 级监听去关。
    if (cal?.handleKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!popup && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      open();
    }
  });

  syncAnchor();
  // 点开单元格就直接展开面板 —— 少一次点击，与 _enum.ts 的下拉一致。**同步**创建：
  // 此刻锚点还没进文档，`_popup` 会先 visibility: hidden，等锚定循环量到位置再显形
  open();
  // focus 必须等元素进了文档才有效
  requestAnimationFrame(() => anchor.el.focus());

  return anchor.el;
}
