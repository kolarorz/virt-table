/**
 * 自绘日历面板的基元：`VtDatePicker`（单日）与 `VtDateRangePicker`（区间）共用。
 *
 * 分两层，边界刻意划得很硬：
 *   - **纯函数层**（`toDay` … `formatRange`）—— 日期算术与格式化，无 DOM、无副作用。
 *     这是本次功能里唯一「算错了不报错、只是显示成另一个日期」的部分，所以由
 *     `_calendar.test.ts` 在默认 node 环境单独钉住。
 *   - **面板层**（`createCalendar`）—— DOM 与交互状态机。
 *
 * ## 为什么不引日期库
 *
 * 整个仓库零运行时依赖（只 link `@virt-list/core`）。需要的算术就是「加天数 / 月首末 /
 * 周首末 / 季首末」这几样，自己写比背一个 dayjs 便宜。
 *
 * ## 时区
 *
 * **全程本地构造 + 手写格式化，绝不碰 `toISOString()`** —— `new Date('2026-08-11')` 按 UTC
 * 解析、`toISOString()` 又按 UTC 切片，东八区两头一夹就会把日期整体退一天（demo 里原来
 * 就踩过：`new Date(2024, 0, 1).toISOString().slice(0, 10)` 得到 `'2023-12-31'`）。所以
 * 解析一律 `new Date(y, m - 1, d)`，格式化一律 `getFullYear/getMonth/getDate` 手拼。
 * `_calendar.test.ts` 里有一条断言直接扫本文件源码，确保 `toISOString` 不会被人加回来。
 *
 * ## 文案
 *
 * 全部由调用方注入（`VtCalendarTexts`），本模块**只 `import type`**、不 import
 * `locale.ts` 的运行时代码。两个理由：纯函数单测不必拉起整个 locale；将来
 * `plugins/column-filter.ts` 的 date-range 筛选输入（那侧有 `ctx.getLocale()`，能拿到运行时
 * locale）想复用这个面板时，不需要为文案来源打补丁。
 */
import type { VtCalendarTexts } from '../locale';

/* -------------------------------------------------------------------------- *
 * 纯函数层
 * -------------------------------------------------------------------------- */

/** `'YYYY-MM-DD'`。本模块内部只认这一种日期形状 —— 与两个组件写回行数据的形状一致 */
export type DayStr = string;

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** 本地 `Date` → `'YYYY-MM-DD'`（手拼，不用 `toISOString`：那个按 UTC 切，东八区退一天） */
export function toDay(d: Date): DayStr {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * `'YYYY-MM-DD'` → 本地 `Date`；不是合法日期就返回 `null`。
 *
 * 三道校验缺一不可：正则挡住形状不对的（`'2026-8-11'`）、本地构造避开 UTC 偏移、
 * **回读比对**挡住「形状对但日子不存在」的 —— `new Date(2026, 1, 31)` 不会报错，
 * 它会静默滚到 3 月 3 日。
 */
export function parseDay(s: unknown): Date | null {
  if (typeof s !== 'string') return null;
  const m = DAY_RE.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  // 回读：滚过月的话这三个值对不上
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/** 是不是一个合法的 `'YYYY-MM-DD'` */
export function isDay(s: unknown): s is DayStr {
  return parseDay(s) !== null;
}

/**
 * 比较两个**同格式定长**日期串。
 *
 * 直接字典序，不解析成 `Date` —— 这是热路径（画一次双月面板要对 84 个格子各判几次
 * 「在不在区间内」），`'2026-08-11' < '2026-08-12'` 在零填充的定长串上与日期序等价。
 * 传进来的必须是 `DayStr`（调用点都先过 `formatDay` / `isDay`）。
 */
export function compareDay(a: DayStr, b: DayStr): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 加减天数。跨月/跨年/闰年交给 `Date` 自己滚 */
export function addDays(s: DayStr, n: number): DayStr {
  const d = parseDay(s);
  if (!d) return s;
  d.setDate(d.getDate() + n);
  return toDay(d);
}

/** 年月加减，`month` 是 0-11。只算年月，不涉及「日」（那由调用方夹取） */
export function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const total = year * 12 + month + n;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** 某年某月有多少天（`month` 0-11）。下个月的第 0 天 = 这个月最后一天 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 同一天，但月份加减 n 个月；日超出目标月长度时夹到月末。
 * `'2026-01-31' + 1 月 = '2026-02-28'`（而不是滚到 3 月 3 日）
 */
export function addMonthsToDay(s: DayStr, n: number): DayStr {
  const d = parseDay(s);
  if (!d) return s;
  const { year, month } = addMonths(d.getFullYear(), d.getMonth(), n);
  const day = Math.min(d.getDate(), daysInMonth(year, month));
  return toDay(new Date(year, month, day));
}

/** 所在周的第一天。`firstDayOfWeek`：0=周日 … 6=周六 */
export function startOfWeek(s: DayStr, firstDayOfWeek: number): DayStr {
  const d = parseDay(s);
  if (!d) return s;
  // getDay() 恒以周日为 0，先算出「今天是本周第几天」再回退
  const offset = (d.getDay() - firstDayOfWeek + 7) % 7;
  return addDays(s, -offset);
}

/** 所在周的最后一天 */
export function endOfWeek(s: DayStr, firstDayOfWeek: number): DayStr {
  return addDays(startOfWeek(s, firstDayOfWeek), 6);
}

/** 所在月第一天 */
export function startOfMonth(s: DayStr): DayStr {
  const d = parseDay(s);
  return d ? toDay(new Date(d.getFullYear(), d.getMonth(), 1)) : s;
}

/** 所在月最后一天 */
export function endOfMonth(s: DayStr): DayStr {
  const d = parseDay(s);
  return d ? toDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)) : s;
}

/** 所在季度第一天 */
export function startOfQuarter(s: DayStr): DayStr {
  const d = parseDay(s);
  if (!d) return s;
  return toDay(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1));
}

/** 所在季度最后一天 */
export function endOfQuarter(s: DayStr): DayStr {
  const d = parseDay(s);
  if (!d) return s;
  return toDay(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0));
}

/** 今天。`now` 可注入，测试里用来钉死「今天」 */
export function todayDay(now?: Date): DayStr {
  return toDay(now ?? new Date());
}

/**
 * 把两个端点排成 `[早, 晚]`。
 *
 * **反向选择就是在这里被吃掉的** —— 用户先点 20 日再点 5 日，得到的仍是
 * `['…-05', '…-20']`，不需要在交互层判方向。
 */
export function normalizeRange(a: DayStr, b: DayStr): [DayStr, DayStr] {
  return compareDay(a, b) <= 0 ? [a, b] : [b, a];
}

/** 越出 `[min, max]` 的日子不可选。`min`/`max` 不合法（或没给）就当没有这一侧的限制 */
export function isDisabledDay(s: DayStr, min?: string, max?: string): boolean {
  if (isDay(min) && compareDay(s, min) < 0) return true;
  if (isDay(max) && compareDay(s, max) > 0) return true;
  return false;
}

/**
 * 区间与 `[min, max]` 求交；完全落在界外返回 `null`。
 *
 * 给快捷项用：「最近 30 天」碰上 `min = 今天-10` 时应用 `[min, 今天]`（快捷项表达的是
 * **意图**，min/max 是硬边界，取交集是唯一说得通的解释）；而「上个季度」整段都在 min
 * 之前时返回 `null`，那一颗按钮直接不出现 —— 宁可少一颗，也不要一排点不动的灰按钮。
 */
export function intersectRange(
  range: readonly [DayStr, DayStr],
  min?: string,
  max?: string,
): [DayStr, DayStr] | null {
  let [s, e] = normalizeRange(range[0], range[1]);
  if (isDay(min)) {
    if (compareDay(e, min) < 0) return null;
    if (compareDay(s, min) < 0) s = min;
  }
  if (isDay(max)) {
    if (compareDay(s, max) > 0) return null;
    if (compareDay(e, max) > 0) e = max;
  }
  return [s, e];
}

/** 月份网格里的一格 */
export interface DayCell {
  day: DayStr;
  /** 1..31，格子里显示的数字 */
  date: number;
  /** 上/下月的补位格（仍可点 —— 它是真实日期，屏蔽掉只会让人多翻一次月） */
  outside: boolean;
}

/** 一个月的网格 */
export interface MonthGrid {
  year: number;
  /** 0-11 */
  month: number;
  /** `fixedWeeks` 时恒为 6 行 × 7 列 */
  weeks: DayCell[][];
}

/**
 * 生成某个月的日期网格（含前后补位格）。
 *
 * `fixedWeeks`（默认 true）恒出 6 行：月份自然行数在 4~6 之间浮动，翻月时面板会跟着
 * 长高缩短，抖得很明显。固定 6 行换来的是恒定高度。
 */
export function buildMonthGrid(
  year: number,
  month: number,
  firstDayOfWeek: number,
  fixedWeeks = true,
): MonthGrid {
  const first = new Date(year, month, 1);
  // 网格第一格：从本月 1 日回退到它所在周的周首
  const lead = (first.getDay() - firstDayOfWeek + 7) % 7;
  const total = daysInMonth(year, month);
  const rows = fixedWeeks ? 6 : Math.ceil((lead + total) / 7);

  const weeks: DayCell[][] = [];
  const cursor = new Date(year, month, 1 - lead);
  for (let r = 0; r < rows; r++) {
    const week: DayCell[] = [];
    for (let c = 0; c < 7; c++) {
      week.push({
        day: toDay(cursor),
        date: cursor.getDate(),
        outside: cursor.getMonth() !== month,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return { year, month, weeks };
}

/**
 * 把星期名按周首日旋转。
 *
 * `names` 恒按「周日在前」存（与 `Date.getDay()` 的索引一致），所以改周首日不需要
 * 重排文案数组 —— 这是 `VtCalendarTexts.weekdays` 那条注释的由来。
 */
export function rotateWeekdays(names: readonly string[], firstDayOfWeek: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) out.push(names[(firstDayOfWeek + i) % 7] ?? '');
  return out;
}

/**
 * 单日值 → 展示文本。合法就原样返回，否则空串。
 *
 * **常态 `render` 与编辑态锚点回显共用它** —— 这是「点开单元格文字不许跳」那条硬约束
 * （AGENTS.md §7.14）的结构性保证：同一个函数出来的东西不可能不一致。
 */
export function formatDay(v: unknown): string {
  return isDay(v) ? (v as string) : '';
}

/**
 * 区间值 → 展示文本。与改造前 `VtDateRangePicker` 的 `render` 逐字等价，包括「只有一头
 * 有值」的老数据（那时显示 `'2026-08-01 ~ '`）。
 */
export function formatRange(v: unknown, sep: string): string {
  if (!Array.isArray(v)) return '';
  const a = formatDay(v[0]);
  const b = formatDay(v[1]);
  if (!a && !b) return '';
  return `${a}${sep}${b}`;
}

/* -------------------------------------------------------------------------- *
 * 快捷项
 * -------------------------------------------------------------------------- */

/** 面板底部的一颗快捷按钮 */
export interface VtDateShortcut {
  label: string;
  /** 由「今天」算出的区间。单日模式只取 `[0]` */
  value: (today: DayStr) => readonly [DayStr, DayStr];
  /** 在哪种模式下出现，默认 `'both'` */
  mode?: 'single' | 'range' | 'both';
}

/**
 * 快捷项配置。数组 = 整体替换；函数 = 拿到内置全集自己拼（追加、裁剪，或**同名覆盖**）。
 *
 * ```ts
 * shortcuts: []                                                   // 一颗都不要
 * shortcuts: [{ label: '上个季度', value: (t) => [...] }]           // 只要这一颗
 * shortcuts: (b) => [...b, { label: '上个季度', value: … }]         // 内置 + 追加
 * shortcuts: (b) => b.filter((s) => s.label !== '本季度')          // 内置里去掉一颗
 * ```
 */
export type VtDateShortcutsOption =
  | readonly VtDateShortcut[]
  | ((builtin: VtDateShortcut[]) => readonly VtDateShortcut[]);

/** 内置全集（7 颗）。「今天 / 昨天」两种模式都给，其余只在区间模式有意义 */
export function builtinShortcuts(
  texts: VtCalendarTexts,
  firstDayOfWeek: number,
): VtDateShortcut[] {
  return [
    { label: texts.today, value: (t) => [t, t] },
    { label: texts.yesterday, value: (t) => [addDays(t, -1), addDays(t, -1)] },
    { label: texts.thisWeek, mode: 'range', value: (t) => [startOfWeek(t, firstDayOfWeek), endOfWeek(t, firstDayOfWeek)] },
    { label: texts.thisMonth, mode: 'range', value: (t) => [startOfMonth(t), endOfMonth(t)] },
    { label: texts.thisQuarter, mode: 'range', value: (t) => [startOfQuarter(t), endOfQuarter(t)] },
    { label: texts.last7Days, mode: 'range', value: (t) => [addDays(t, -6), t] },
    { label: texts.last30Days, mode: 'range', value: (t) => [addDays(t, -29), t] },
  ];
}

/**
 * 把配置解析成面板真正要画的那一排按钮。四步，顺序固定：
 *
 *   1. 取内置全集；
 *   2. 应用使用方配置（数组替换 / 函数加工）；
 *   3. 按 `mode` 过滤 —— 单日模式下只剩「今天 / 昨天」，这就是快捷项在单日下的退化；
 *   4. 按 label 去重（**位置取首次出现、值取最后一次**）并按 min/max 过滤。
 *
 * 第 4 步那条去重规则是为了让 `(b) => [...b, { label: '今天', value: 我的 }]` 表达
 * 「**就地覆盖**今天」而不是「排两个今天」—— 追加与覆盖于是共用同一个入口，不必再开
 * 一个 `overrideShortcuts` 选项。
 */
export function resolveShortcuts(cfg: {
  mode: 'single' | 'range';
  texts: VtCalendarTexts;
  firstDayOfWeek: number;
  option?: VtDateShortcutsOption;
  today: DayStr;
  min?: string;
  max?: string;
}): VtDateShortcut[] {
  const builtin = builtinShortcuts(cfg.texts, cfg.firstDayOfWeek);
  const raw: readonly VtDateShortcut[] =
    typeof cfg.option === 'function'
      ? cfg.option(builtin)
      : Array.isArray(cfg.option)
        ? cfg.option
        : builtin;

  const fits = (s: VtDateShortcut): boolean => {
    const mode = s.mode ?? 'both';
    return mode === 'both' || mode === cfg.mode;
  };

  /** label → 在 out 里的下标。同名后来者覆盖值、不占新位置 */
  const seen = new Map<string, number>();
  const out: VtDateShortcut[] = [];
  for (const s of raw) {
    if (!fits(s)) continue;
    // 整段都在 min/max 之外的项直接丢掉（点不动的灰按钮不如不给）
    if (intersectRange(s.value(cfg.today), cfg.min, cfg.max) === null) continue;
    const at = seen.get(s.label);
    if (at === undefined) {
      seen.set(s.label, out.length);
      out.push(s);
    } else {
      out[at] = s;
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- *
 * 面板层
 * -------------------------------------------------------------------------- */

export type VtCalendarMode = 'single' | 'range';

export interface VtCalendarOptions {
  mode: VtCalendarMode;
  /** 当前值。单日模式传 `[d, d]`，空一律 `['', '']` */
  value: readonly [string, string];
  min?: string;
  max?: string;
  /** 0=周日 … 6=周六，默认 1（周一） */
  firstDayOfWeek?: number;
  /** 并排几个月，默认区间 2 / 单日 1。窄容器下 `relayout()` 会降级 */
  panels?: 1 | 2;
  /** 恒 6 行，默认 true（翻月不抖高） */
  fixedWeeks?: boolean;
  /** 文案全量注入（调用方负责先与默认包合并好） */
  texts: VtCalendarTexts;
  /** 已解析好的快捷项（mode 过滤 / 去重 / min-max 都由 `resolveShortcuts` 在外面做完） */
  shortcuts?: readonly VtDateShortcut[];
  /** 可注入的「今天」，测试用 */
  today?: DayStr;
  /** 选定完成。单日一下即完成（`[d, d]`），区间第二下完成。传出的区间已归一 */
  onPick: (range: [DayStr, DayStr], source: 'grid' | 'shortcut' | 'keyboard') => void;
}

export interface VtCalendarHandle {
  /** 面板根元素，调用方把它 append 进 `popup.el` */
  readonly el: HTMLElement;
  /** 外部改值后同步（清除 × 之后复位）。会把选择状态机拉回空闲态 */
  setValue(value: readonly [string, string]): void;
  /**
   * 键盘入口。**处理了返回 `true`**，调用方据此 `preventDefault() + stopPropagation()`
   * —— 不拦的话方向键会被 `vtKeyboardNav` 当成「换单元格」。
   */
  handleKey(e: KeyboardEvent): boolean;
  /** 重新量宽，必要时把双月降成单月（或还原）。返回是否重排过 */
  relayout(): boolean;
  destroy(): void;
}

/** 两个月之间的间距，与 §11 的 `.vt-comp-calendar-months { gap }` 保持一致 */
const MONTH_GAP = 12;
/** 面板与 `.vt-root` 左右边缘之间留的余量（`_popup` 自己还有 4px GAP） */
const EDGE_SLACK = 16;
/** 键盘跨越连续禁用格的步数上限（防 min/max 把整片区域锁死时死循环） */
const MAX_SKIP = 400;

/** 某年某月 1 号 */
const firstDayOf = (m: { year: number; month: number }): DayStr =>
  `${m.year}-${m.month < 9 ? '0' : ''}${m.month + 1}-01`;

/**
 * 造一个日历面板。单日与区间共用，差别只在 `mode`：
 *
 *   - `'single'` —— 点一下就 `onPick([d, d])`，不进拾取态；
 *   - `'range'` —— 点起点进拾取态（hover 预览），点终点 `onPick(归一后的区间)`。
 *
 * 渲染刻意分三层，不是为了好看而是两个具体问题：
 *   - `build()` 建整棵 DOM，只在翻月 / 降级 / `setValue` 时调；
 *   - `paint()` **只改 class**，hover 与键盘移动走这条 —— 每次遍历 ≤84 个格子。整棵重建
 *     会打断 hover（鼠标下的节点被换掉，`mouseover` 不再来）；
 *   - `foot()` 只改底部回显的文本。
 */
export function createCalendar(opts: VtCalendarOptions): VtCalendarHandle {
  const fdow = opts.firstDayOfWeek ?? 1;
  const fixedWeeks = opts.fixedWeeks ?? true;
  const today = opts.today ?? todayDay();
  const texts = opts.texts;
  const single = opts.mode === 'single';

  const el = document.createElement('div');
  el.className = `vt-comp-calendar vt-comp-calendar--${opts.mode}`;

  const headEl = document.createElement('div');
  headEl.className = 'vt-comp-calendar-head';
  const prevBtn = mkNavBtn('-1', '‹', texts.prevMonth);
  const titlesEl = document.createElement('div');
  titlesEl.className = 'vt-comp-calendar-titles';
  const nextBtn = mkNavBtn('1', '›', texts.nextMonth);
  headEl.append(prevBtn, titlesEl, nextBtn);

  const monthsEl = document.createElement('div');
  monthsEl.className = 'vt-comp-calendar-months';

  const footEl = document.createElement('div');
  // 底部条复用面板皮肤的按钮条（顶边框 + 浅底），只在 §11 里改排布
  footEl.className = 'vt-filter-actions vt-comp-calendar-foot';
  const valueEl = document.createElement('span');
  valueEl.className = 'vt-comp-calendar-value';

  el.append(headEl, monthsEl, footEl);

  /* ---- 状态 ---- */

  /** 已确定的选择（画选中/区间用）。null = 无值 */
  let sel: { start: DayStr; end: DayStr } | null = null;
  /** 区间拾取中的锚点。null ⇒ 空闲态；非 null ⇒ 拾取态 */
  let anchorDay: DayStr | null = null;
  /** hover 或键盘光标。恒非空，保证键盘一上手就有落点 */
  let cursor: DayStr = today;
  /** 左侧面板的年月（右侧恒为 +1） */
  let view = { year: 0, month: 0 };
  let panels: 1 | 2 = opts.panels ?? (single ? 1 : 2);
  let monthEls: HTMLElement[] = [];
  /**
   * 日期 → 所有画着它的格子。
   *
   * ⚠️ 必须是**数组**：双月并排时同一天会出现两个节点（左月末尾的补位格 = 右月开头的实
   * 格），只更新一个的话跨月区间的带子会在月交界处断一格。
   */
  const cellIndex = new Map<DayStr, HTMLElement[]>();

  function mkNavBtn(nav: string, glyph: string, label: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vt-filter-btn vt-comp-calendar-nav';
    b.dataset.nav = nav;
    b.textContent = glyph;
    b.title = label;
    b.setAttribute('aria-label', label);
    // 焦点全程留在锚点上：面板里的按钮都不参与 Tab 序，否则 Tab 会掉进面板里出不来
    b.tabIndex = -1;
    return b;
  }

  /** 解析外部传进来的值 */
  const readValue = (v: readonly [string, string]): { start: DayStr; end: DayStr } | null => {
    const a = formatDay(v[0]);
    const b = formatDay(v[1]);
    if (single) return a ? { start: a, end: a } : null;
    if (!a || !b) {
      // 半个值（老数据里存在）：当作只有那一头，画得出来但不算完整区间
      const one = a || b;
      return one ? { start: one, end: one } : null;
    }
    const [s, e] = normalizeRange(a, b);
    return { start: s, end: e };
  };

  /** 打开时该看哪个月：有值看值，没值看今天，最后夹进 [min, max] */
  const initialView = (): { year: number; month: number } => {
    const base = sel?.start ?? cursor;
    let d = parseDay(base) ?? parseDay(today)!;
    if (isDay(opts.min) && compareDay(toDay(d), opts.min) < 0) d = parseDay(opts.min)!;
    if (isDay(opts.max) && compareDay(toDay(d), opts.max) > 0) d = parseDay(opts.max)!;
    return { year: d.getFullYear(), month: d.getMonth() };
  };

  /** 可见的最后一个月（`panels - 1` 个月之后） */
  const lastView = (): { year: number; month: number } => addMonths(view.year, view.month, panels - 1);

  /* ---- 渲染 ---- */

  /** 建整棵网格 DOM。翻月、降级、setValue 走这里 */
  const build = (): void => {
    monthsEl.textContent = '';
    titlesEl.textContent = '';
    cellIndex.clear();
    monthEls = [];

    const weekdayNames = rotateWeekdays(texts.weekdays, fdow);

    for (let i = 0; i < panels; i++) {
      const { year, month } = addMonths(view.year, view.month, i);

      const title = document.createElement('span');
      title.className = 'vt-comp-calendar-title';
      title.textContent = texts.title(year, month, texts.months[month] ?? String(month + 1));
      titlesEl.appendChild(title);

      const monthEl = document.createElement('div');
      monthEl.className = 'vt-comp-calendar-month';

      const weekdaysEl = document.createElement('div');
      weekdaysEl.className = 'vt-comp-calendar-weekdays';
      weekdaysEl.setAttribute('aria-hidden', 'true');
      for (const name of weekdayNames) {
        const w = document.createElement('span');
        w.className = 'vt-comp-calendar-weekday';
        w.textContent = name;
        weekdaysEl.appendChild(w);
      }

      const gridEl = document.createElement('div');
      gridEl.className = 'vt-comp-calendar-grid';
      gridEl.setAttribute('role', 'grid');

      for (const week of buildMonthGrid(year, month, fdow, fixedWeeks).weeks) {
        for (const cell of week) {
          const c = document.createElement('span');
          c.className = 'vt-comp-calendar-cell';
          c.dataset.day = cell.day;
          c.textContent = String(cell.date);
          c.setAttribute('role', 'gridcell');
          if (cell.outside) c.classList.add('vt-comp-calendar-cell--outside');
          gridEl.appendChild(c);
          const bucket = cellIndex.get(cell.day);
          if (bucket) bucket.push(c);
          else cellIndex.set(cell.day, [c]);
        }
      }

      monthEl.append(weekdaysEl, gridEl);
      monthsEl.appendChild(monthEl);
      monthEls.push(monthEl);
    }

    // 翻到边界外没有意义：上/下一屏整段都在 min/max 之外时把按钮禁掉
    const prev = addMonths(view.year, view.month, -1);
    prevBtn.disabled =
      isDay(opts.min) && compareDay(endOfMonth(firstDayOf(prev)), opts.min) < 0;
    const next = addMonths(view.year, view.month, panels);
    nextBtn.disabled = isDay(opts.max) && compareDay(firstDayOf(next), opts.max) > 0;

    paint();
  };

  /** 只改 class。hover 与键盘移动每次都走这条 */
  const paint = (): void => {
    // 拾取中画预览区间，否则画已确定的选择
    const band: [DayStr, DayStr] | null = anchorDay
      ? normalizeRange(anchorDay, cursor)
      : sel
        ? [sel.start, sel.end]
        : null;

    for (const [day, nodes] of cellIndex) {
      const disabled = isDisabledDay(day, opts.min, opts.max);
      const isStart = band ? day === band[0] : false;
      const isEnd = band ? day === band[1] : false;
      const inBand =
        band !== null && compareDay(day, band[0]) >= 0 && compareDay(day, band[1]) <= 0;

      for (const node of nodes) {
        node.classList.toggle('vt-comp-calendar-cell--disabled', disabled);
        node.classList.toggle('vt-comp-calendar-cell--today', day === today);
        node.classList.toggle('vt-comp-calendar-cell--start', isStart);
        node.classList.toggle('vt-comp-calendar-cell--end', isEnd);
        // 端点自己不算「区间内」（它们有自己的实心底色，叠上去圆角会被方角盖掉）
        node.classList.toggle('vt-comp-calendar-cell--in-range', inBand && !isStart && !isEnd);
        node.classList.toggle('vt-comp-calendar-cell--cursor', day === cursor);
        if (disabled) node.setAttribute('aria-disabled', 'true');
        else node.removeAttribute('aria-disabled');
        node.setAttribute('aria-selected', inBand ? 'true' : 'false');
      }
    }

    foot();
  };

  /** 只改底部回显 */
  const foot = (): void => {
    if (anchorDay) {
      // 拾取中：显示已定的起点 + 「选择结束日期」，让人知道还差一下
      valueEl.textContent = `${anchorDay} → ${texts.pickEnd}`;
      return;
    }
    if (!sel) {
      valueEl.textContent = texts.pickStart;
      return;
    }
    valueEl.textContent = single ? sel.start : `${sel.start} ~ ${sel.end}`;
  };

  /** 重建底部快捷条（只在建面板时调一次 —— 快捷项列表不随交互变化） */
  const buildFoot = (): void => {
    footEl.textContent = '';
    (opts.shortcuts ?? []).forEach((sc, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vt-filter-btn vt-comp-calendar-shortcut';
      b.dataset.sc = String(i);
      b.textContent = sc.label;
      b.tabIndex = -1;
      footEl.appendChild(b);
    });
    footEl.appendChild(valueEl);
  };

  /* ---- 状态机 ---- */

  /** 点一下某天（鼠标或键盘） */
  const pick = (day: DayStr, source: 'grid' | 'keyboard'): void => {
    if (isDisabledDay(day, opts.min, opts.max)) return;
    cursor = day;

    if (single) {
      sel = { start: day, end: day };
      anchorDay = null;
      paint();
      opts.onPick([day, day], source);
      return;
    }

    if (anchorDay === null) {
      // 第一下：旧区间立刻消失 —— 留着老带子会让人看不出正在编辑什么
      anchorDay = day;
      sel = null;
      paint();
      return;
    }

    // 第二下：反向选择在 normalizeRange 里被吃掉；点回锚点本身则得到一天的区间（合法诉求）
    const [s, e] = normalizeRange(anchorDay, day);
    anchorDay = null;
    sel = { start: s, end: e };
    paint();
    opts.onPick([s, e], source);
  };

  /** 让光标所在月份可见，必要时翻页 */
  const ensureVisible = (day: DayStr): boolean => {
    const d = parseDay(day);
    if (!d) return false;
    const first = view;
    const last = lastView();
    const key = d.getFullYear() * 12 + d.getMonth();
    const lo = first.year * 12 + first.month;
    const hi = last.year * 12 + last.month;
    if (key >= lo && key <= hi) return false;
    // 落在左边就把它放在第一屏，落在右边就放在最后一屏
    view = key < lo ? { year: d.getFullYear(), month: d.getMonth() } : addMonths(d.getFullYear(), d.getMonth(), -(panels - 1));
    return true;
  };

  /** 移动光标，跨过禁用格；越出可见范围时翻月跟随 */
  const moveCursor = (next: DayStr, step: number): void => {
    let target = next;
    for (let i = 0; i < MAX_SKIP && isDisabledDay(target, opts.min, opts.max); i++) {
      target = addDays(target, step);
    }
    // 连走 MAX_SKIP 步还在禁区里（min/max 把方向锁死了）就原地不动
    if (isDisabledDay(target, opts.min, opts.max)) return;
    cursor = target;
    if (ensureVisible(cursor)) build();
    else paint();
  };

  const shiftView = (n: number): void => {
    view = addMonths(view.year, view.month, n);
    build();
  };

  /* ---- 事件（全部委托，翻月时不必解绑重绑 84 个格子） ---- */

  const onHeadDown = (e: MouseEvent): void => {
    const btn = (e.target as HTMLElement).closest('[data-nav]') as HTMLButtonElement | null;
    if (!btn || btn.disabled) return;
    // 早于 cell-editor 的 outside-click 判定，且 preventDefault 保住锚点焦点
    e.preventDefault();
    shiftView(Number(btn.dataset.nav));
  };

  const onMonthsDown = (e: MouseEvent): void => {
    const cell = (e.target as HTMLElement).closest('[data-day]') as HTMLElement | null;
    if (!cell) return;
    e.preventDefault();
    pick(cell.dataset.day!, 'grid');
  };

  const onMonthsOver = (e: MouseEvent): void => {
    // 只有拾取态才有预览可言，空闲态 hover 交给 CSS
    if (!anchorDay) return;
    const cell = (e.target as HTMLElement).closest('[data-day]') as HTMLElement | null;
    if (!cell) return;
    const day = cell.dataset.day!;
    // 禁用格不参与预览：否则带子会延伸进禁区
    if (isDisabledDay(day, opts.min, opts.max) || day === cursor) return;
    cursor = day;
    paint();
  };

  const onFootDown = (e: MouseEvent): void => {
    const btn = (e.target as HTMLElement).closest('[data-sc]') as HTMLElement | null;
    if (!btn) return;
    e.preventDefault();
    const sc = (opts.shortcuts ?? [])[Number(btn.dataset.sc)];
    if (!sc) return;
    const hit = intersectRange(sc.value(today), opts.min, opts.max);
    if (!hit) return;
    const [s, e2] = single ? ([hit[0], hit[0]] as [DayStr, DayStr]) : hit;
    anchorDay = null;
    sel = { start: s, end: e2 };
    cursor = s;
    if (ensureVisible(s)) build();
    else paint();
    opts.onPick([s, e2], 'shortcut');
  };

  headEl.addEventListener('mousedown', onHeadDown);
  monthsEl.addEventListener('mousedown', onMonthsDown);
  monthsEl.addEventListener('mouseover', onMonthsOver);
  footEl.addEventListener('mousedown', onFootDown);

  /* ---- 对外 ---- */

  const handleKey = (e: KeyboardEvent): boolean => {
    switch (e.key) {
      case 'ArrowLeft':
        moveCursor(addDays(cursor, -1), -1);
        return true;
      case 'ArrowRight':
        moveCursor(addDays(cursor, 1), 1);
        return true;
      case 'ArrowUp':
        moveCursor(addDays(cursor, -7), -1);
        return true;
      case 'ArrowDown':
        moveCursor(addDays(cursor, 7), 1);
        return true;
      case 'PageUp':
        moveCursor(addMonthsToDay(cursor, e.shiftKey ? -12 : -1), -1);
        return true;
      case 'PageDown':
        moveCursor(addMonthsToDay(cursor, e.shiftKey ? 12 : 1), 1);
        return true;
      case 'Home':
        moveCursor(startOfWeek(cursor, fdow), 1);
        return true;
      case 'End':
        moveCursor(endOfWeek(cursor, fdow), -1);
        return true;
      case 'Enter':
      case ' ':
        pick(cursor, 'keyboard');
        return true;
      default:
        // Esc 归 `_popup`（它在 document 上收 keydown → onClose），Tab 让焦点自然离开
        return false;
    }
  };

  const setPanels = (n: 1 | 2): boolean => {
    if (panels === n) return false;
    panels = n;
    build();
    return true;
  };

  const relayout = (): boolean => {
    const want = opts.panels ?? (single ? 1 : 2);
    if (want === 1) return setPanels(1);
    const root = el.closest('.vt-root') as HTMLElement | null;
    const avail = (root?.clientWidth ?? 0) - EDGE_SLACK;
    const monthW = monthEls[0]?.offsetWidth ?? 0;
    // 量不出（happy-dom 没有布局引擎，或还没挂进文档）→ 按配置来，不擅自降级
    if (avail <= 0 || monthW <= 0) return false;
    // 外壳开销（padding 等）从当前渲染反推，不写死 —— 密度档会改字号进而改这些尺寸
    const chrome = el.offsetWidth - monthW * panels - MONTH_GAP * (panels - 1);
    return setPanels(monthW * 2 + MONTH_GAP + chrome <= avail ? 2 : 1);
  };

  const setValue = (value: readonly [string, string]): void => {
    sel = readValue(value);
    anchorDay = null;
    cursor = sel?.start ?? today;
    view = initialView();
    build();
  };

  const destroy = (): void => {
    headEl.removeEventListener('mousedown', onHeadDown);
    monthsEl.removeEventListener('mousedown', onMonthsDown);
    monthsEl.removeEventListener('mouseover', onMonthsOver);
    footEl.removeEventListener('mousedown', onFootDown);
    cellIndex.clear();
    monthEls = [];
    el.remove();
  };

  sel = readValue(opts.value);
  cursor = sel?.start ?? today;
  view = initialView();
  buildFoot();
  build();

  return { el, setValue, handleKey, relayout, destroy };
}
