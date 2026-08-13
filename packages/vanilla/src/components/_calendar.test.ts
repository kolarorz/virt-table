/**
 * `_calendar.ts` 纯函数层的单测（无 DOM，跑默认 node 环境）。
 *
 * 单独一个文件而不是塞进 `components.dom.test.ts`，因为这批代码的失败模式很特殊：
 * **算错了不会报错，只会把日期显示成另一个日期**。日历的交互再对，`addDays` 少一天也是
 * 错的，而 DOM 测试只能验结构、验不出算术。
 *
 * 时区是这里的头号风险（`toISOString()` 按 UTC 切片，东八区整体退一天），所以除了逐个函数
 * 的用例，最后还有一条断言直接扫源码文本，防止有人把 `toISOString` 加回来。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { zhCN } from '../locale';
import {
  addDays,
  addMonths,
  addMonthsToDay,
  buildMonthGrid,
  builtinShortcuts,
  compareDay,
  daysInMonth,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  formatDay,
  formatRange,
  intersectRange,
  isDay,
  isDisabledDay,
  normalizeRange,
  parseDay,
  resolveShortcuts,
  rotateWeekdays,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  toDay,
  todayDay,
  type VtDateShortcut,
} from './_calendar';

describe('_calendar：日期解析与格式化', () => {
  it('toDay 按本地时间手拼，不受时区影响', () => {
    // 这就是 toISOString 会出错的那个例子：UTC 切片在东八区得到 '2023-12-31'
    expect(toDay(new Date(2024, 0, 1))).toBe('2024-01-01');
    expect(toDay(new Date(2026, 7, 11))).toBe('2026-08-11');
    // 月/日都要零填充（定长才能直接字典序比较）
    expect(toDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('parseDay 按本地构造，回读的日期与输入一致', () => {
    const d = parseDay('2026-08-11')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    // UTC 解析会让东八区拿到 10 号
    expect(d.getDate()).toBe(11);
  });

  it('parseDay 拒掉形状不对与日子不存在的输入', () => {
    for (const bad of ['2026-8-11', '2026/08/11', '20260811', '2026-08-1', 'abc', '', null, undefined, 20260811, ['2026-08-11']]) {
      expect(parseDay(bad), `${String(bad)} 应被拒`).toBeNull();
    }
    // 形状合法但日子不存在 —— Date 会静默滚到 3/3，靠回读比对挡住
    expect(parseDay('2026-02-31')).toBeNull();
    expect(parseDay('2026-13-01')).toBeNull();
    expect(parseDay('2026-00-10')).toBeNull();
    // 闰年 2/29 在闰年合法、在平年不合法
    expect(parseDay('2024-02-29')).not.toBeNull();
    expect(parseDay('2023-02-29')).toBeNull();
  });

  it('isDay 与 parseDay 同口径', () => {
    expect(isDay('2026-08-11')).toBe(true);
    expect(isDay('2026-02-31')).toBe(false);
  });

  it('compareDay 在定长零填充串上与日期序等价', () => {
    expect(compareDay('2026-08-11', '2026-08-12')).toBe(-1);
    expect(compareDay('2026-08-11', '2026-08-11')).toBe(0);
    expect(compareDay('2026-09-01', '2026-08-31')).toBe(1);
    // 跨年、以及「9 月 vs 10 月」这种位数会骗人的比较（零填充后不会）
    expect(compareDay('2025-12-31', '2026-01-01')).toBe(-1);
    expect(compareDay('2026-09-30', '2026-10-01')).toBe(-1);
  });
});

describe('_calendar：日期算术', () => {
  it('addDays 跨月、跨年、闰年', () => {
    expect(addDays('2026-08-11', 1)).toBe('2026-08-12');
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // 闰年
    expect(addDays('2023-02-28', 1)).toBe('2023-03-01'); // 平年
    expect(addDays('2026-08-11', 0)).toBe('2026-08-11');
    expect(addDays('2026-08-11', -29)).toBe('2026-07-13'); // 「最近 30 天」用到
  });

  it('addMonths 处理年借位（month 是 0-11）', () => {
    expect(addMonths(2026, 7, 1)).toEqual({ year: 2026, month: 8 });
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(addMonths(2026, 0, -13)).toEqual({ year: 2024, month: 11 });
    expect(addMonths(2026, 7, 12)).toEqual({ year: 2027, month: 7 });
  });

  it('addMonthsToDay 把超长的日夹到月末，而不是滚到下个月', () => {
    expect(addMonthsToDay('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDay('2024-01-31', 1)).toBe('2024-02-29'); // 闰年
    expect(addMonthsToDay('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonthsToDay('2026-08-11', 1)).toBe('2026-09-11');
    expect(addMonthsToDay('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('daysInMonth 含闰年二月', () => {
    expect(daysInMonth(2026, 0)).toBe(31);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 3)).toBe(30);
  });

  it('startOfWeek / endOfWeek 在周一起与周日起下各自正确', () => {
    // 2026-08-11 是周二
    expect(parseDay('2026-08-11')!.getDay()).toBe(2);
    expect(startOfWeek('2026-08-11', 1)).toBe('2026-08-10'); // 周一起 → 周一
    expect(endOfWeek('2026-08-11', 1)).toBe('2026-08-16'); // → 周日
    expect(startOfWeek('2026-08-11', 0)).toBe('2026-08-09'); // 周日起 → 周日
    expect(endOfWeek('2026-08-11', 0)).toBe('2026-08-15'); // → 周六

    // 周日这天的归属最容易错：周一起时它属于「上一周」
    expect(parseDay('2026-08-16')!.getDay()).toBe(0);
    expect(startOfWeek('2026-08-16', 1)).toBe('2026-08-10');
    expect(startOfWeek('2026-08-16', 0)).toBe('2026-08-16');
  });

  it('startOfMonth / endOfMonth', () => {
    expect(startOfMonth('2026-08-11')).toBe('2026-08-01');
    expect(endOfMonth('2026-08-11')).toBe('2026-08-31');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29');
  });

  it('startOfQuarter / endOfQuarter 四个季度', () => {
    expect(startOfQuarter('2026-02-10')).toBe('2026-01-01');
    expect(endOfQuarter('2026-02-10')).toBe('2026-03-31');
    expect(startOfQuarter('2026-05-20')).toBe('2026-04-01');
    expect(endOfQuarter('2026-05-20')).toBe('2026-06-30');
    expect(startOfQuarter('2026-08-11')).toBe('2026-07-01');
    expect(endOfQuarter('2026-08-11')).toBe('2026-09-30');
    expect(startOfQuarter('2026-12-31')).toBe('2026-10-01');
    expect(endOfQuarter('2026-12-31')).toBe('2026-12-31');
  });

  it('todayDay 可注入 now（测试要能钉死「今天」）', () => {
    expect(todayDay(new Date(2026, 7, 11))).toBe('2026-08-11');
  });
});

describe('_calendar：区间归一与边界', () => {
  it('normalizeRange 吃掉反向选择', () => {
    expect(normalizeRange('2026-08-05', '2026-08-20')).toEqual(['2026-08-05', '2026-08-20']);
    // 先点 20 再点 5
    expect(normalizeRange('2026-08-20', '2026-08-05')).toEqual(['2026-08-05', '2026-08-20']);
    // 同一天两次 → 一天的区间，合法
    expect(normalizeRange('2026-08-05', '2026-08-05')).toEqual(['2026-08-05', '2026-08-05']);
  });

  it('isDisabledDay 只在给了合法 min/max 时生效', () => {
    expect(isDisabledDay('2026-08-11', '2026-08-12')).toBe(true);
    expect(isDisabledDay('2026-08-11', '2026-08-11')).toBe(false); // 边界含在内
    expect(isDisabledDay('2026-08-11', undefined, '2026-08-10')).toBe(true);
    expect(isDisabledDay('2026-08-11', undefined, '2026-08-11')).toBe(false);
    expect(isDisabledDay('2026-08-11')).toBe(false);
    // min/max 自己不合法就当没给（不要因为一个错配置把整列锁死）
    expect(isDisabledDay('2026-08-11', 'oops')).toBe(false);
  });

  it('intersectRange：全在内 / 一头越界取交 / 无交集给 null', () => {
    expect(intersectRange(['2026-08-05', '2026-08-20'], '2026-08-01', '2026-08-31')).toEqual([
      '2026-08-05',
      '2026-08-20',
    ]);
    // 「最近 30 天」碰上 min 更晚 → 取交，而不是整颗丢掉
    expect(intersectRange(['2026-07-13', '2026-08-11'], '2026-08-01')).toEqual([
      '2026-08-01',
      '2026-08-11',
    ]);
    expect(intersectRange(['2026-08-05', '2026-09-20'], undefined, '2026-08-31')).toEqual([
      '2026-08-05',
      '2026-08-31',
    ]);
    // 整段在界外
    expect(intersectRange(['2026-01-01', '2026-01-31'], '2026-08-01')).toBeNull();
    expect(intersectRange(['2026-09-01', '2026-09-30'], undefined, '2026-08-31')).toBeNull();
    // 传进来的端点反着也照样能用（内部先归一）
    expect(intersectRange(['2026-08-20', '2026-08-05'])).toEqual(['2026-08-05', '2026-08-20']);
  });
});

describe('_calendar：月份网格', () => {
  it('2026-08 周一起：首格是 7/27，恒 6 行 42 格', () => {
    const g = buildMonthGrid(2026, 7, 1);
    expect(g.weeks).toHaveLength(6);
    expect(g.weeks.every((w) => w.length === 7)).toBe(true);
    // 2026-08-01 是周六 → 周一起的那一周从 7/27 开始
    expect(g.weeks[0]![0]!.day).toBe('2026-07-27');
    expect(g.weeks[0]![0]!.outside).toBe(true);
    expect(g.weeks[5]![6]!.day).toBe('2026-09-06');
    // 网格是连续的日期序列
    const flat = g.weeks.flat();
    expect(flat).toHaveLength(42);
    for (let i = 1; i < flat.length; i++) {
      expect(flat[i]!.day).toBe(addDays(flat[i - 1]!.day, 1));
    }
  });

  it('同一个月在周日起时首格不同', () => {
    const g = buildMonthGrid(2026, 7, 0);
    expect(g.weeks[0]![0]!.day).toBe('2026-07-26');
  });

  it('outside 标记只落在本月之外的格子上', () => {
    const g = buildMonthGrid(2026, 7, 1);
    const inside = g.weeks.flat().filter((c) => !c.outside);
    expect(inside).toHaveLength(31);
    expect(inside[0]!.day).toBe('2026-08-01');
    expect(inside[30]!.day).toBe('2026-08-31');
    expect(inside.every((c) => c.date === Number(c.day.slice(8)))).toBe(true);
  });

  it('fixedWeeks: false 时按需行数（2026-02 周日起正好 4 行）', () => {
    // 2026-02-01 是周日，28 天 → 恰好 4 整周
    expect(buildMonthGrid(2026, 1, 0, false).weeks).toHaveLength(4);
    expect(buildMonthGrid(2026, 1, 0, true).weeks).toHaveLength(6);
    // 需要 6 行的月份（2026-08 周日起：lead=6 + 31 天 = 37 → 6 行）
    expect(buildMonthGrid(2026, 7, 0, false).weeks).toHaveLength(6);
  });

  it('rotateWeekdays 旋转但不改文案数组本身的索引语义', () => {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    expect(rotateWeekdays(names, 0)).toEqual(['日', '一', '二', '三', '四', '五', '六']);
    expect(rotateWeekdays(names, 1)).toEqual(['一', '二', '三', '四', '五', '六', '日']);
    expect(rotateWeekdays(names, 6)).toEqual(['六', '日', '一', '二', '三', '四', '五']);
  });
});

describe('_calendar：展示格式化', () => {
  it('formatDay 合法原样、非法给空', () => {
    expect(formatDay('2026-08-11')).toBe('2026-08-11');
    expect(formatDay('2026-2-3')).toBe('');
    expect(formatDay(null)).toBe('');
    expect(formatDay(undefined)).toBe('');
    expect(formatDay(20260811)).toBe('');
  });

  it('formatRange 与改造前的 render 逐字等价（含只有一头有值的老数据）', () => {
    // 改造前：`${start || ''}${sep}${end || ''}`，两端都空则回落 placeholder
    const old = (v: unknown, sep: string): string => {
      if (!Array.isArray(v)) return '';
      const [s, e] = v as [string, string];
      if (!s && !e) return '';
      return `${s || ''}${sep}${e || ''}`;
    };
    const cases: unknown[] = [
      ['2026-08-01', '2026-08-31'],
      ['2026-08-01', ''],
      ['', '2026-08-31'],
      ['', ''],
      null,
      undefined,
      '2026-08-01',
    ];
    for (const c of cases) {
      expect(formatRange(c, ' ~ '), JSON.stringify(c)).toBe(old(c, ' ~ '));
    }
    expect(formatRange(['2026-08-01', '2026-08-31'], ' 至 ')).toBe('2026-08-01 至 2026-08-31');
  });
});

describe('_calendar：快捷项', () => {
  const T = '2026-08-11'; // 周二
  const texts = zhCN.calendar;

  it('内置 7 颗，值都按「今天」算', () => {
    const all = builtinShortcuts(texts, 1);
    expect(all).toHaveLength(7);
    const byLabel = new Map(all.map((s) => [s.label, s.value(T)]));
    expect(byLabel.get('今天')).toEqual([T, T]);
    expect(byLabel.get('昨天')).toEqual(['2026-08-10', '2026-08-10']);
    expect(byLabel.get('本周')).toEqual(['2026-08-10', '2026-08-16']);
    expect(byLabel.get('本月')).toEqual(['2026-08-01', '2026-08-31']);
    expect(byLabel.get('本季度')).toEqual(['2026-07-01', '2026-09-30']);
    expect(byLabel.get('最近 7 天')).toEqual(['2026-08-05', T]);
    expect(byLabel.get('最近 30 天')).toEqual(['2026-07-13', T]);
  });

  it('区间模式给全 7 颗，顺序与内置一致', () => {
    const out = resolveShortcuts({ mode: 'range', texts, firstDayOfWeek: 1, today: T });
    expect(out.map((s) => s.label)).toEqual([
      '今天',
      '昨天',
      '本周',
      '本月',
      '本季度',
      '最近 7 天',
      '最近 30 天',
    ]);
  });

  it('单日模式退化成只剩「今天 / 昨天」', () => {
    const out = resolveShortcuts({ mode: 'single', texts, firstDayOfWeek: 1, today: T });
    expect(out.map((s) => s.label)).toEqual(['今天', '昨天']);
  });

  it('数组形式整体替换；空数组就是一颗都不要', () => {
    const mine: VtDateShortcut[] = [{ label: '上个季度', value: (t) => [startOfQuarter(t), t] }];
    expect(
      resolveShortcuts({ mode: 'range', texts, firstDayOfWeek: 1, today: T, option: mine }).map(
        (s) => s.label,
      ),
    ).toEqual(['上个季度']);
    expect(
      resolveShortcuts({ mode: 'range', texts, firstDayOfWeek: 1, today: T, option: [] }),
    ).toEqual([]);
  });

  it('函数形式可追加与裁剪', () => {
    const added = resolveShortcuts({
      mode: 'range',
      texts,
      firstDayOfWeek: 1,
      today: T,
      option: (b) => [...b, { label: '上个季度', value: (t) => [startOfQuarter(t), t] }],
    });
    expect(added).toHaveLength(8);
    expect(added[7]!.label).toBe('上个季度');

    const trimmed = resolveShortcuts({
      mode: 'range',
      texts,
      firstDayOfWeek: 1,
      today: T,
      option: (b) => b.filter((s) => s.label !== '本季度'),
    });
    expect(trimmed.map((s) => s.label)).not.toContain('本季度');
    expect(trimmed).toHaveLength(6);
  });

  it('同 label 是就地覆盖：位置取首次、值取最后一次（不是排两颗）', () => {
    const out = resolveShortcuts({
      mode: 'range',
      texts,
      firstDayOfWeek: 1,
      today: T,
      option: (b) => [...b, { label: '今天', value: () => ['2000-01-01', '2000-01-02'] as const }],
    });
    expect(out).toHaveLength(7);
    expect(out[0]!.label).toBe('今天'); // 位置还在第一颗
    expect(out[0]!.value(T)).toEqual(['2000-01-01', '2000-01-02']); // 值被换掉
  });

  it('min/max：整段越界的项被丢掉，部分越界的留着（面板里再取交）', () => {
    // min 定在今天 → 「昨天」整段在界外、「本月」「最近 30 天」只是一头越界
    const out = resolveShortcuts({
      mode: 'range',
      texts,
      firstDayOfWeek: 1,
      today: T,
      min: T,
    });
    const labels = out.map((s) => s.label);
    expect(labels).not.toContain('昨天');
    expect(labels).toContain('今天');
    expect(labels).toContain('最近 30 天');
    expect(labels).toContain('本月');
  });

  it('mode 标注为 single 的自定义项不会漏进区间模式', () => {
    const opt: VtDateShortcut[] = [
      { label: '仅单日', mode: 'single', value: (t) => [t, t] },
      { label: '仅区间', mode: 'range', value: (t) => [t, t] },
      { label: '都要', value: (t) => [t, t] },
    ];
    const r = resolveShortcuts({ mode: 'range', texts, firstDayOfWeek: 1, today: T, option: opt });
    expect(r.map((s) => s.label)).toEqual(['仅区间', '都要']);
    const s = resolveShortcuts({ mode: 'single', texts, firstDayOfWeek: 1, today: T, option: opt });
    expect(s.map((x) => x.label)).toEqual(['仅单日', '都要']);
  });
});

describe('_calendar：时区回归网', () => {
  /**
   * `toISOString()` 按 UTC 切片，东八区会把日期整体退一天（`new Date(2024, 0, 1)` 得到
   * `'2023-12-31'`）。上面每个函数的用例都覆盖了正确行为，但换一种实现方式重新引入这个
   * bug 时，那些用例在 UTC 机器上仍然是绿的 —— 所以直接扫源码，钉住实现手法本身。
   */
  it('源码里不出现 toISOString / Date.parse / new Date(字符串)', () => {
    const src = readFileSync(fileURLToPath(new URL('./_calendar.ts', import.meta.url)), 'utf8');
    // 去掉注释，免得说明文字里的字样被当成实现
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/toISOString/);
    expect(code).not.toMatch(/Date\.parse/);
    // new Date('...') / new Date(变量) 都不许：字符串走 UTC，数字时间戳没必要
    expect(code).not.toMatch(/new Date\(\s*['"`]/);
  });
});
