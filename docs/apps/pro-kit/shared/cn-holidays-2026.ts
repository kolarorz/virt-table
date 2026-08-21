/**
 * **2026 年中国的放假安排**，用来给甘特 demo 的「导入」按钮当真实数据。
 *
 * 依据：国务院办公厅《关于 2026 年部分节假日安排的通知》（国办发明电〔2025〕7 号，
 * 2025-11-04 发布，中国政府网 `gov.cn/zhengce/zhengceku/202511/content_7047091.htm`）。
 * 每一条都照通知原文抄，写在下面的注释里，**不是推算的** —— 农历节日的公历日期与调休
 * 补班每年不同，推算一版就等于埋一版会出错的数据。
 *
 * ## 为什么这份表住在 playground 而不是插件里
 *
 * 调休安排**每年由政府单独发布**，而且各国各地区都不一样。插件内置一份就是内置一份
 * 会过期的错数据 —— 所以 `vtGantt` 把它做成入参（`holidays` / `isNonWorking`），
 * 真实项目从自己的日历服务取。这份文件就是「使用方该长什么样」的示例。
 *
 * ## 两份数据，两个入口
 *
 * | 数据 | 插件入口 | 语义 |
 * | --- | --- | --- |
 * | `CN_2026_HOLIDAYS` | `holidays` + `skipHolidays` | 放假的日子 → 不计入工期 |
 * | `CN_2026_WORKDAYS` | `isNonWorking` | **补班日**（周六上班）→ 照常计入工期 |
 *
 * 少了第二份，2/14、2/28、5/9、9/20、10/10 这五个「周六上班」会被当成周末扣掉 ——
 * 那正是国内项目排期最容易算错的地方。
 */

export interface CnHoliday {
  date: string;
  label: string;
}

/**
 * 放假的日子（含调休连休出来的那几天）。
 *
 * 通知原文：
 * - 元旦：1 月 1 日（周四）至 3 日（周六）放假调休，共 3 天。1 月 4 日（周日）上班。
 * - 春节：2 月 15 日（农历腊月二十八、周日）至 23 日（农历正月初七、周一）放假调休，共 9 天。
 *   2 月 14 日（周六）、2 月 28 日（周六）上班。
 * - 清明节：4 月 4 日（周六）至 6 日（周一）放假，共 3 天。
 * - 劳动节：5 月 1 日（周五）至 5 日（周二）放假调休，共 5 天。5 月 9 日（周六）上班。
 * - 端午节：6 月 19 日（周五）至 21 日（周日）放假，共 3 天。
 * - 中秋节：9 月 25 日（周五）至 27 日（周日）放假，共 3 天。
 * - 国庆节：10 月 1 日（周四）至 7 日（周三）放假调休，共 7 天。9 月 20 日（周日）、
 *   10 月 10 日（周六）上班。
 *
 * 名字带上节日本身（「春节」而不是「法定节假日」）：它会出现在表头那一格的 `title` 上，
 * 于是「这一列为什么画着斜线」当场有答案。
 */
export const CN_2026_HOLIDAYS: CnHoliday[] = [
  ...range('2026-01-01', 3, '元旦'),
  ...range('2026-02-15', 9, '春节'),
  ...range('2026-04-04', 3, '清明节'),
  ...range('2026-05-01', 5, '劳动节'),
  ...range('2026-06-19', 3, '端午节'),
  ...range('2026-09-25', 3, '中秋节'),
  ...range('2026-10-01', 7, '国庆节'),
];

/** 补班日：这几个周末要上班，所以**不算**非工作日 */
export const CN_2026_WORKDAYS = [
  '2026-01-04', // 元旦调休
  '2026-02-14', // 春节调休
  '2026-02-28', // 春节调休
  '2026-05-09', // 劳动节调休
  '2026-09-20', // 国庆调休
  '2026-10-10', // 国庆调休
];

const WORKDAY_SET = new Set(CN_2026_WORKDAYS);

/**
 * 给 `vtGantt` 的 `isNonWorking`：周末算非工作日，**但补班的那几个周六除外**。
 *
 * 只管 2026 年 —— 别的年份的补班表这里没有，那时按默认的「周六周日」处理比按 2026 年的
 * 补班表瞎猜要好（多算一天工期是错，把别年的某个周六当成上班日更错）。
 */
export function cnIsNonWorking(d: Date): boolean {
  const day = d.getDay();
  if (day !== 0 && day !== 6) return false;
  return !WORKDAY_SET.has(iso(d));
}

/** 从某天起连续 n 天 */
function range(start: string, days: number, label: string): CnHoliday[] {
  const out: CnHoliday[] = [];
  const d = new Date(`${start}T00:00:00`);
  for (let i = 0; i < days; i++) {
    out.push({ date: iso(d), label });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** 离给定时间最近的那个未来假期（导入之后跳过去给人看，否则那些日子可能在屏幕外） */
export function nextCnHoliday(from = Date.now()): string {
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  const key = iso(day);
  // 清单是非空常量，`[0]` 一定在；`noUncheckedIndexedAccess` 下要显式兜一下
  return CN_2026_HOLIDAYS.find((h) => h.date >= key)?.date ?? CN_2026_HOLIDAYS[0]?.date ?? key;
}
