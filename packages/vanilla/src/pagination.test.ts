import { describe, it, expect } from 'vitest';
import { pageCount, clampPage, buildPagerItems } from './pagination';

describe('pageCount', () => {
  it('整除', () => expect(pageCount(100, 10)).toBe(10));
  it('向上取整', () => expect(pageCount(101, 10)).toBe(11));
  it('total=0 至少 1 页', () => expect(pageCount(0, 10)).toBe(1));
  it('total<0 归零后至少 1 页', () => expect(pageCount(-5, 10)).toBe(1));
  it('pageSize<=0 返回 1', () => {
    expect(pageCount(100, 0)).toBe(1);
    expect(pageCount(100, -10)).toBe(1);
  });
  it('不足一页仍为 1 页', () => expect(pageCount(3, 10)).toBe(1));
});

describe('clampPage', () => {
  it('区间内原样', () => expect(clampPage(3, 100, 10)).toBe(3));
  it('超上界夹到末页', () => expect(clampPage(999, 100, 10)).toBe(10));
  it('小于 1 夹到 1', () => expect(clampPage(0, 100, 10)).toBe(1));
  it('负数夹到 1', () => expect(clampPage(-3, 100, 10)).toBe(1));
  it('非有限值回落到 1', () => {
    expect(clampPage(NaN, 100, 10)).toBe(1);
    expect(clampPage(Infinity, 100, 10)).toBe(1);
    expect(clampPage(-Infinity, 100, 10)).toBe(1);
  });
  it('小数向下取整', () => expect(clampPage(3.9, 100, 10)).toBe(3));
  it('total=0 时只有第 1 页', () => expect(clampPage(5, 0, 10)).toBe(1));
});

describe('buildPagerItems', () => {
  it('少页(<=7)全部展示', () => {
    expect(buildPagerItems(1, 1)).toEqual([1]);
    expect(buildPagerItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPagerItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('多页当前居中，两侧省略号', () => {
    expect(buildPagerItems(5, 20)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 20]);
  });
  it('靠近首页时左侧不折叠', () => {
    expect(buildPagerItems(1, 20)).toEqual([1, 2, 'ellipsis', 20]);
    expect(buildPagerItems(2, 20)).toEqual([1, 2, 3, 'ellipsis', 20]);
  });
  it('靠近末页时右侧不折叠', () => {
    expect(buildPagerItems(20, 20)).toEqual([1, 'ellipsis', 19, 20]);
    expect(buildPagerItems(19, 20)).toEqual([1, 'ellipsis', 18, 19, 20]);
  });
  it('页码越界自动夹取', () => {
    expect(buildPagerItems(0, 20)).toEqual([1, 2, 'ellipsis', 20]);
    expect(buildPagerItems(999, 20)).toEqual([1, 'ellipsis', 19, 20]);
  });
  it('count<=0 视为 1 页', () => expect(buildPagerItems(1, 0)).toEqual([1]));
});
