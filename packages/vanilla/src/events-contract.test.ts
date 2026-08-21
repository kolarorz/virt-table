/**
 * 事件契约：**「点到外面就关掉」不许听 `mousedown`，必须听 `pointerdown`**。
 *
 * ---- 为什么 ----
 *
 * `vtCellSelection` 的拖选起手在 `pointerdown` 里调 `preventDefault()`（不然浏览器会顺手
 * 选中表格里的文字）。而 pointerdown 的**默认行为里就包含「派发兼容 mouse 事件」**，
 * 于是装了框选的表格里，**表体内根本不存在 `mousedown`**。
 *
 * CDP 实测（点一个单元格 / 点表格外面，document 上收到的次数）：
 *
 * | 点哪 | pointerdown | mousedown | click |
 * | --- | --- | --- | --- |
 * | 表格内的单元格 | 1 | **0** | 1 |
 * | 表格外面 | 1 | 1 | 1 |
 *
 * 这条曾经同时咬了 6 处（都是「点外面关掉」）：编辑浮层、右键菜单、列筛选下拉、列设置
 * 面板、内置组件的自绘浮层（`_popup.ts`），以及核心里三个 `highlightSelect*` 落当前行列
 * 的那个监听。用户看到的现象是：**在单元格里输入后点别的单元格，浮层/菜单关不掉**。
 *
 * `preventDefault()` 不等于 `stopPropagation()`，所以 pointerdown 照常冒泡到 document ——
 * 换事件名就够，不需要动框选那边的 preventDefault（那是它的正当职责）。
 *
 * ---- 不受这条约束的 mousedown ----
 *
 * 元素级的 mousedown 照旧可用（浮层内部的选项、按钮、拖拽把手…）：那些元素不在表体里，
 * 或者本来就靠 `stopPropagation` 自己吞事件。这里只管**document / tbody 级**的那几个。
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('.', import.meta.url));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
      continue;
    }
    if (!name.endsWith('.ts')) continue;
    if (name.includes('.test.') || name.includes('.test-d.')) continue;
    out.push(full);
  }
  return out;
}

const files = sourceFiles(SRC).map((f) => ({
  path: f.slice(SRC.length),
  text: readFileSync(f, 'utf8'),
}));

describe('事件契约：点外面关掉只能听 pointerdown', () => {
  it('源码里不存在 document 级的 mousedown 监听', () => {
    const offenders = files
      .filter((f) => /document\.addEventListener\(\s*['"]mousedown['"]/.test(f.text))
      .map((f) => f.path);
    expect(offenders, '这些文件在 document 上听 mousedown —— 装了框选后表体内收不到').toEqual([]);
  });

  it('源码里不存在 tbody 级的 mousedown 监听', () => {
    const offenders = files
      .filter((f) => /tbodyEl\.addEventListener\(\s*['"]mousedown['"]/.test(f.text))
      .map((f) => f.path);
    expect(offenders, '这些文件在 tbody 上听 mousedown —— 框选的 preventDefault 会吃掉它').toEqual([]);
  });

  /**
   * 反向守一遍：确认这些「点外面关掉」的地方**真的**都还在听 pointerdown。
   * 只测不存在 mousedown 的话，有人把整个监听删掉也能过。
   */
  it('四处浮层/面板都在 document 上听 pointerdown', () => {
    /*
     * 原先这里还有一条 `plugins/column-panel.ts`。那个插件并进了 `vtFieldConfig`，而它的浮层
     * **不再自己听** —— 走 `internal/panel-popup.ts` → `components/_popup.ts`（清单里最后一条）。
     * 少一条不是少一道守卫：那批面板的「点外面关掉」现在只有一个实现。
     */
    const expected = [
      'plugins/cell-editor.ts',
      'plugins/context-menu.ts',
      'plugins/column-filter.ts',
      'components/_popup.ts',
    ];
    for (const rel of expected) {
      const file = files.find((f) => f.path === rel);
      expect(file, `找不到 ${rel}`).toBeTruthy();
      expect(
        /document\.addEventListener\(\s*['"]pointerdown['"]/.test(file!.text),
        `${rel} 应该在 document 上听 pointerdown`,
      ).toBe(true);
    }
  });
});
