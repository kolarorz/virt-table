import { describe, it, expect } from 'vitest';
import { placeTooltip, type CellBox, type Size } from './tooltip';

/** GAP=8 / EDGE=4 / ARROW_INSET=10（与实现保持同步） */
const BOX: Size = { width: 600, height: 400 };
const TIP: Size = { width: 200, height: 30 };

/** 一个位于表体中部的单元格：left 200、宽 100 → 中心 250 */
const mid = (over: Partial<CellBox> = {}): CellBox => ({
  top: 200,
  left: 200,
  width: 100,
  height: 40,
  ...over,
});

describe('placeTooltip', () => {
  it('空间充足时放在单元格上方并水平居中', () => {
    const p = placeTooltip(mid(), TIP, BOX);
    expect(p.below).toBe(false);
    // 200 - 8(GAP) - 30(高) = 162
    expect(p.top).toBe(162);
    // 中心 250 - 100(半宽) = 150
    expect(p.left).toBe(150);
    // 箭头回到单元格中心，即浮层内的正中
    expect(p.arrowX).toBe(100);
  });

  it('上方装不下时翻到下方', () => {
    const p = placeTooltip(mid({ top: 0 }), TIP, BOX);
    expect(p.below).toBe(true);
    // 0 + 40(行高) + 8(GAP) = 48
    expect(p.top).toBe(48);
  });

  it('上方剩余空间刚好不够（差 1px）也翻到下方', () => {
    // 需要 GAP+高+EDGE = 8+30+4 = 42
    expect(placeTooltip(mid({ top: 42 }), TIP, BOX).below).toBe(false);
    expect(placeTooltip(mid({ top: 41 }), TIP, BOX).below).toBe(true);
  });

  it('贴左边时夹到 EDGE，箭头仍指向单元格中心', () => {
    // 单元格中心 30，居中会得到 left = -70
    const p = placeTooltip(mid({ left: 0, width: 60 }), TIP, BOX);
    expect(p.left).toBe(4);
    expect(p.arrowX).toBe(26); // 30 - 4
  });

  it('贴右边时夹到 EDGE，箭头仍指向单元格中心', () => {
    // 单元格 540..600，中心 570；右侧上限 600-200-4 = 396
    const p = placeTooltip(mid({ left: 540, width: 60 }), TIP, BOX);
    expect(p.left).toBe(396);
    expect(p.arrowX).toBe(174); // 570 - 396
  });

  it('箭头偏移被 ARROW_INSET 夹住，不会压到圆角上', () => {
    // 单元格中心 2，夹取后 left=4 → 原始箭头 -2
    const near = placeTooltip(mid({ left: 0, width: 4 }), TIP, BOX);
    expect(near.arrowX).toBe(10);
    // 单元格中心 598，夹取后 left=396 → 原始箭头 202，超过 tip.width-10=190
    const far = placeTooltip(mid({ left: 596, width: 4 }), TIP, BOX);
    expect(far.arrowX).toBe(190);
  });

  it('上下都装不下时选空间较大的一侧', () => {
    const tall: Size = { width: 200, height: 90 };
    const shortBox: Size = { width: 600, height: 120 };
    // 单元格 70..110：上方 70 > 下方 10 → 仍放上方
    expect(placeTooltip(mid({ top: 70 }), tall, shortBox).below).toBe(false);
    // 单元格 10..50：上方 10 < 下方 70 → 放下方
    expect(placeTooltip(mid({ top: 10 }), tall, shortBox).below).toBe(true);
  });

  it('装不下时纵向也夹在客户区内，不越出上下沿', () => {
    const tall: Size = { width: 200, height: 90 };
    const shortBox: Size = { width: 600, height: 120 };
    const up = placeTooltip(mid({ top: 70 }), tall, shortBox);
    expect(up.top).toBeGreaterThanOrEqual(4);
    const down = placeTooltip(mid({ top: 10 }), tall, shortBox);
    expect(down.top + tall.height).toBeLessThanOrEqual(shortBox.height - 4);
  });

  it('浮层比客户区还高时退化为贴上沿，不产生负坐标', () => {
    const huge: Size = { width: 200, height: 500 };
    const p = placeTooltip(mid(), huge, BOX);
    expect(p.top).toBe(4);
    expect(p.left).toBeGreaterThanOrEqual(4);
  });

  it('浮层比客户区还宽时贴左沿', () => {
    const wide: Size = { width: 800, height: 30 };
    const p = placeTooltip(mid(), wide, BOX);
    expect(p.left).toBe(4);
  });
});
