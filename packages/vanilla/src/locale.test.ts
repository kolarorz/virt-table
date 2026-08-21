import { describe, it, expect } from 'vitest';
import { zhCN, enUS, mergeLocale, type VirtTableLocale } from './locale';

/** 递归收集对象的键路径（数组顺序无关，用于比对两个语言包结构一致） */
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const k of Object.keys(obj).sort()) {
    const path = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...keyPaths(v as Record<string, unknown>, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

describe('locale', () => {
  it('zhCN 与 enUS 键集完全一致', () => {
    expect(keyPaths(zhCN as unknown as Record<string, unknown>)).toEqual(
      keyPaths(enUS as unknown as Record<string, unknown>),
    );
  });

  it('mergeLocale 无 override 时原样返回 base', () => {
    expect(mergeLocale(zhCN)).toBe(zhCN);
  });

  it('mergeLocale 顶层标量覆盖，其余保留', () => {
    const merged = mergeLocale(zhCN, { empty: 'NOTHING' });
    expect(merged.empty).toBe('NOTHING');
    expect(merged.loading).toBe(zhCN.loading);
  });

  it('mergeLocale 嵌套对象逐层浅合并（只覆盖指定项）', () => {
    const merged = mergeLocale(zhCN, { filter: { reset: 'RST' } });
    expect(merged.filter.reset).toBe('RST');
    expect(merged.filter.confirm).toBe(zhCN.filter.confirm);
    expect(merged.filter.keyword).toBe(zhCN.filter.keyword);
  });

  it('mergeLocale 覆盖单个算子标签，其余算子保留', () => {
    const merged = mergeLocale(zhCN, { operators: { eq: 'IS' } });
    expect(merged.operators.eq).toBe('IS');
    expect(merged.operators.contains).toBe(zhCN.operators.contains);
  });

  /**
   * 与上面 `calendar` 那条同源（见 `mergeLocale` 的 ⚠️）：`imageViewer` 是新加的子块，
   * 忘了在 `mergeLocale` 里补一行浅合并的话，这里覆盖一个 `close` 会把整块替换掉 ——
   * 表现是查看器工具栏的 title 变 `undefined`，而「键集一致」那条抓不到它。
   */
  it('mergeLocale 覆盖查看器单条文案，同块其余保留', () => {
    const merged = mergeLocale(zhCN, { imageViewer: { close: 'X' } });
    expect(merged.imageViewer.close).toBe('X');
    expect(merged.imageViewer.zoomIn).toBe(zhCN.imageViewer.zoomIn);
    expect(merged.imageViewer.counter(2, 5)).toBe('2 / 5');
  });

  it('mergeLocale 函数型文案整体替换', () => {
    const merged = mergeLocale(zhCN, { sortTip: (t) => `S:${t}` });
    expect(merged.sortTip('名称')).toBe('S:名称');
  });

  it('mergeLocale 覆盖无限滚动状态条单项文案', () => {
    const merged = mergeLocale(zhCN, { infinite: { noMore: '到底啦' } });
    expect(merged.infinite.noMore).toBe('到底啦');
    expect(merged.infinite.loadMore).toBe(zhCN.infinite.loadMore);
    expect(merged.infinite.retry).toBe(zhCN.infinite.retry);
  });

  it('传入完整 enUS 时得到纯英文包', () => {
    const merged: VirtTableLocale = mergeLocale(zhCN, enUS);
    expect(merged.empty).toBe('No data');
    expect(merged.filterBuilder.and).toBe('AND');
    expect(merged.operators.between).toBe('Between');
    expect(merged.calendar.today).toBe('Today');
  });

  /**
   * `mergeLocale` 每个子块都要在实现里单独写一行浅合并，漏了的话局部覆盖会把整块替换掉。
   * 上面那条「键集完全一致」抓不到这个 —— 它比的是两个语言包的结构，不是合并行为。
   * 日历这块尤其要钉：`months` 是 12 个一套的数组，被整块抹掉的表现是面板月份标题变
   * `undefined`，而不是报错。
   */
  it('mergeLocale 覆盖单个日历文案，months / weekdays 不被抹掉', () => {
    const merged = mergeLocale(zhCN, { calendar: { today: 'TD' } });
    expect(merged.calendar.today).toBe('TD');
    expect(merged.calendar.months).toEqual(zhCN.calendar.months);
    expect(merged.calendar.weekdays).toHaveLength(7);
    expect(merged.calendar.thisQuarter).toBe(zhCN.calendar.thisQuarter);
  });

  /**
   * 工具栏那一块（`vtToolbar` 的内置项文案）。与上面每个子块同一条要求：
   * `mergeLocale` 里漏加一行的表现是「覆盖一个词把整块 26 条抹成 undefined」，
   * 而键集一致那条用例抓不到它。
   */
  it('mergeLocale 覆盖单条工具栏文案，同块其余保留', () => {
    const merged = mergeLocale(zhCN, { toolbar: { sort: 'Sort by' } });
    expect(merged.toolbar.sort).toBe('Sort by');
    expect(merged.toolbar.columns).toBe(zhCN.toolbar.columns);
    expect(merged.toolbar.groupLevel(2)).toBe(zhCN.toolbar.groupLevel(2));
  });

  it('日历的 months / weekdays 是整体替换（12 个一套，没有只覆盖三月的语义）', () => {
    const mine = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    const merged = mergeLocale(zhCN, { calendar: { months: mine } });
    expect(merged.calendar.months).toEqual(mine);
    expect(merged.calendar.today).toBe(zhCN.calendar.today);
  });

  it('两个语言包的 months / weekdays 长度都对（键集一致抓不到数组长度）', () => {
    for (const pack of [zhCN, enUS]) {
      expect(pack.calendar.months).toHaveLength(12);
      expect(pack.calendar.weekdays).toHaveLength(7);
    }
  });
});
