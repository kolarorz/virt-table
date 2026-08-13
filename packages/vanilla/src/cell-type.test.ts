// @vitest-environment happy-dom
/**
 * 内容类型渲染（`col.cellType`）。
 *
 * 重点守两件事：
 *   1. **只有 rich-text 走 HTML**。旧实现统一拼字符串 + `escapeHtml` 兜底，转义责任散落在
 *      每个分支里，漏一处就是 XSS；现在返回判别式结果，text 类只可能进 textContent。
 *   2. 样式走类 + `--vt-*` 变量，不再是内联硬编码色值（换主题不跟随、也没法覆盖）。
 */
import { describe, it, expect } from 'vitest';
import { renderCellContent, cellContentText } from './cell-type';

describe('renderCellContent', () => {
  it('text / number 只产出纯文本，不给 HTML 解析的机会', () => {
    expect(renderCellContent('text', '<img onerror=alert(1)>')).toEqual({
      kind: 'text',
      text: '<img onerror=alert(1)>',
    });
    expect(renderCellContent('number', 42)).toEqual({ kind: 'text', text: '42' });
    expect(renderCellContent('text', null)).toEqual({ kind: 'text', text: '' });
  });

  it('rich-text 是唯一按 HTML 插入的类型', () => {
    expect(renderCellContent('rich-text', '<b>x</b>')).toEqual({
      kind: 'html',
      html: '<b>x</b>',
    });
  });

  it('image 接受 URL 字符串或结构化取值，走 <img> 而不是拼字符串', () => {
    const a = renderCellContent('image', 'https://e.com/a.png');
    expect(a?.kind).toBe('node');
    const imgA = (a as any).node as HTMLImageElement;
    expect(imgA.tagName).toBe('IMG');
    expect(imgA.className).toBe('vt-cell-image');
    expect(imgA.getAttribute('src')).toBe('https://e.com/a.png');
    expect(imgA.loading).toBe('lazy');

    const b = renderCellContent('image', { url: 'x.png', alt: '图' });
    expect(((b as any).node as HTMLImageElement).alt).toBe('图');

    // 空 URL 不产出破图
    expect(renderCellContent('image', '')).toEqual({ kind: 'text', text: '' });
    expect(renderCellContent('image', null)).toEqual({ kind: 'text', text: '' });
  });

  it('option 的颜色写成自定义属性，底色由 CSS 派生', () => {
    const r = renderCellContent('option', { label: '进行中', color: '#ff8800' });
    const el = (r as any).node as HTMLElement;
    expect(el.className).toBe('vt-cell-option');
    expect(el.textContent).toBe('进行中');
    expect(el.style.getPropertyValue('--vt-cell-option-color')).toBe('#ff8800');
    // 不写死 background / color
    expect(el.style.background).toBe('');
    expect(el.style.color).toBe('');

    // 字符串形式：没有颜色就不设变量，用 CSS 默认（主色）
    const s = renderCellContent('option', '待处理');
    expect(((s as any).node as HTMLElement).style.getPropertyValue('--vt-cell-option-color')).toBe('');
    expect(renderCellContent('option', '')).toEqual({ kind: 'text', text: '' });
  });

  it('checkbox 渲染只读勾选框', () => {
    const r = renderCellContent('checkbox', true);
    const box = ((r as any).node as HTMLElement).querySelector('input')!;
    expect(box.type).toBe('checkbox');
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(true);
    const off = renderCellContent('checkbox', 0);
    expect(((off as any).node as HTMLElement).querySelector('input')!.checked).toBe(false);
  });

  it('未知类型返回 null，由调用方回落默认取值', () => {
    expect(renderCellContent('nope' as any, 'x')).toBeNull();
  });
});

describe('cellContentText（导出 / 复制 / tooltip 的纯文本）', () => {
  it.each([
    ['checkbox', true, 'TRUE'],
    ['checkbox', false, 'FALSE'],
    ['option', { label: '标签' }, '标签'],
    ['option', '字符串标签', '字符串标签'],
    ['image', { url: 'u.png', alt: '替代文字' }, '替代文字'],
    ['image', { url: 'u.png' }, 'u.png'],
    ['text', 123, '123'],
    ['text', null, ''],
  ] as const)('%s + %j → %s', (type, value, expected) => {
    expect(cellContentText(type as any, value)).toBe(expected);
  });
});
