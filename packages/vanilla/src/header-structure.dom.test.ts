// @vitest-environment happy-dom
/**
 * 表头 / 表尾的**结构契约**：它们各自住在独立的 `<table>` 里，与 body table 平级。
 *
 * 为什么这个结构不能退回去：`<table>` 是整体的布局上下文，虚拟滚动每帧改 tbody
 * （padding 占位行高度 / 行内容 / rowSpan）就会让整个 table 失效，`<thead>` 内容没变
 * 也要重新 paint + 光栅化 —— 主线程忙时来不及提交，整条表头闪白。
 * CDP 实测（人为阻塞主线程 30ms/帧 + 快速滚动）：表头空白帧 **41% → 0%**，
 * 唯一变量就是「表头在不在 body table 里」。详见 AGENTS.md §7.10。
 *
 * happy-dom 没有布局引擎，所以这里只守 **DOM 结构与列宽同步**；位置、横向对齐、空白帧率
 * 那些要靠 CDP 实测（数字记在 AGENTS）。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function mount(options: Record<string, any>) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Record<string, any>>(box, {
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 4 }),
    ...options,
  } as VirtTableOptions<Record<string, any>>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const base = () => ({
  list: Array.from({ length: 20 }, (_, i) => ({ id: i, a: 'a' + i, b: 'b' + i })),
  columns: [
    { key: 'a', title: 'A', width: 100 },
    { key: 'b', title: 'B', width: 150 },
  ],
});

describe('表头 / 表尾住在独立 table 里', () => {
  it('thead 的父 table 不是 body table，且在 .vt-header 容器内', () => {
    const { box } = mount(base());
    const thead = box.querySelector('.vt-thead')!;
    const headerWrap = box.querySelector('.vt-header')!;
    const bodyTable = box.querySelector('.vt-tbody')!.parentElement!;

    expect(headerWrap).not.toBeNull();
    expect(headerWrap.contains(thead)).toBe(true);
    // 关键：thead 的宿主 table 与 body table 是两个不同的元素
    expect(thead.parentElement!.tagName).toBe('TABLE');
    expect(thead.parentElement).not.toBe(bodyTable);
    expect(bodyTable.querySelector('thead')).toBeNull();
  });

  it('tfoot 同理，且容器无条件存在（惰性插入的 4 处代码依赖它有父级）', () => {
    // 故意不给任何表尾内容
    const { box } = mount(base());
    const tfoot = box.querySelector('.vt-tfoot')!;
    const footerWrap = box.querySelector('.vt-footer')!;
    const bodyTable = box.querySelector('.vt-tbody')!.parentElement!;

    expect(footerWrap).not.toBeNull();
    expect(footerWrap.contains(tfoot)).toBe(true);
    expect(tfoot.parentElement).not.toBe(bodyTable);
    // 容器挂在 .vt-root 上，不在滚动容器内
    expect(box.querySelector('.vt-client')!.contains(tfoot)).toBe(false);
    expect(bodyTable.querySelector('tfoot')).toBeNull();
    // 有父级 → 那 4 处 `if (!this._tfootEl.parentElement) bodyTable.append(tfoot)` 不会触发
    expect(tfoot.parentElement).not.toBeNull();
  });

  it('置底固定行进 .vt-footer（曾经掉回 body table、滚出视口不可见）', () => {
    const { box } = mount({
      ...base(),
      pinnedTop: [{ id: 'pt', a: '顶', b: '顶' }],
      pinnedBottom: [{ id: 'pb', a: '底', b: '底' }],
    });
    const pt = box.querySelector('.vt-tr--pinned-top')!;
    const pb = box.querySelector('.vt-tr--pinned-bottom')!;
    expect(box.querySelector('.vt-header')!.contains(pt)).toBe(true);
    expect(box.querySelector('.vt-footer')!.contains(pb)).toBe(true);
  });

  /**
   * 表头与表尾都挂在 `.vt-root`（滚动容器外）用 absolute，文档流里各留一个等高占位块。
   *
   * 为什么不用 sticky：粘性余量由主线程每帧算出的布局决定，主线程跟不上时余量是旧值、
   * 元素被摆到半路。染色抓帧实测（阻塞主线程 30ms/帧 + 快速滚动，212 帧）：sticky 下
   * 表尾只有 **4%** 的帧贴底，**61% 跑到中间、8% 跑到顶部**；改 absolute 后 **99%** 贴底。
   */
  it('表头与表尾都挂 .vt-root（不在滚动容器内），占位改由账本槽位表达', () => {
    const { box, table } = mount(base());
    const client = box.querySelector('.vt-client')!;
    const root = box.querySelector('.vt-root')!;
    const hdr = box.querySelector('.vt-header') as HTMLElement;
    const ftr = box.querySelector('.vt-footer') as HTMLElement;

    // 真身都在 root 上，都不在滚动容器内（在里面就会跟着内容滚走）
    for (const el of [hdr, ftr]) {
      expect(root.contains(el)).toBe(true);
      expect(client.contains(el)).toBe(false);
    }

    /**
     * 文档流里**不再有**等高占位块（`.vt-header-spacer` / `.vt-footer-spacer`）。
     *
     * 它们的职责搬进了账本：两个 wrap 登记为 `stickyHeader` / `stickyFooter` 槽，
     * `getSlotSize()` 计入 → `getMaxOffset()` 自动为上下两段留空间，
     * 表体起点也直接从 `stickyHeaderSize` 算出（`_applyBodyOffset`）。详见 AGENTS §7.13。
     */
    expect(client.querySelector('.vt-header-spacer')).toBeNull();
    expect(client.querySelector('.vt-footer-spacer')).toBeNull();

    /**
     * 槽位标记必须写在**被 observe 的那个元素**（wrap）上。
     * 踩过：id 写在 `<thead>` 上而 observe 的是 wrap，core 的 ResizeObserver
     * 拿不到 id 直接跳过 → 表头高度在账本里恒为 0 → 新模型下末行被表尾盖住。
     */
    expect(hdr.dataset.id).toBe('stickyHeader');
    expect(ftr.dataset.id).toBe('stickyFooter');
    expect((box.querySelector('.vt-thead') as HTMLElement).dataset.id).toBeUndefined();

    // 滚动容器里现在只剩 body table 一个子节点承载内容
    const kids = [...client.children].map((c) => c.className.split(' ')[0]);
    expect(kids).toContain('vt-table');
    expect(kids).not.toContain('vt-skeleton');

    // 两个槽都被 observe 了（少一个就会少算滚动空间）
    expect(table.core.slotSize).toHaveProperty('stickyHeaderSize');
    expect(table.core.slotSize).toHaveProperty('stickyFooterSize');
  });

  /**
   * 用 `left` 而不是 `transform`：transform 会给后代建立包含块，固定列表头的
   * `position: sticky; left` 会失去参照、跟着整体被推走（实测横滚 500px 后偏差 −500px）。
   */
  it('横向滚动时表头与表尾都改 left 跟随（不能用 transform）', () => {
    const { box } = mount(base());
    const client = box.querySelector('.vt-client') as HTMLElement;
    const hdr = box.querySelector('.vt-header') as HTMLElement;
    const ftr = box.querySelector('.vt-footer') as HTMLElement;
    // 偏移落在**内层 table** 上：外层被钉在可视区内（right 让出滚动条宽度），不能动
    const hTable = hdr.querySelector('table') as HTMLElement;
    const fTable = ftr.querySelector('table') as HTMLElement;

    // happy-dom 不会自动派发 scroll，手动触发同步路径
    Object.defineProperty(client, 'scrollLeft', { value: 120, configurable: true });
    client.dispatchEvent(new Event('scroll'));
    expect(hTable.style.left).toBe('-120px');
    expect(fTable.style.left).toBe('-120px');
    // 外层不动，否则会连滚动条一起推走
    expect(hdr.style.left).toBe('');
    expect(ftr.style.left).toBe('');
    // 不能用 transform（会给后代建包含块，破坏固定列表头的 sticky）
    expect(hTable.style.transform).toBe('');
    expect(fTable.style.transform).toBe('');

    Object.defineProperty(client, 'scrollLeft', { value: 0, configurable: true });
    client.dispatchEvent(new Event('scroll'));
    expect(hTable.style.left).toBe('0px');
    expect(fTable.style.left).toBe('0px');
  });

  /**
   * 表头/表尾挂在 `.vt-root` 上、铺满整个宽度，不让出滚动条的话会盖住 `.vt-client` 的
   * 滚动条 —— 不只是视觉遮挡，`pointer-events` 也被吃掉，那两段里滚动条**拖不动**。
   */
  it('滚动条尺寸写成 CSS 变量，表头/表尾据此让出边界', () => {
    const { box } = mount(base());
    const root = box.querySelector('.vt-root') as HTMLElement;
    // happy-dom 没有布局，offsetWidth/clientWidth 都是 0 → 变量应为 0px 而非负值或 NaN
    expect(root.style.getPropertyValue('--vt-scrollbar-w')).toMatch(/^\d+px$/);
    expect(root.style.getPropertyValue('--vt-scrollbar-h')).toMatch(/^\d+px$/);
  });

  /**
   * 表头表尾铺满 root 宽度，必须让出滚动条 —— **两种滚动条要两条不同的措施**：
   * 经典（占位）滚动条靠 `right`/`bottom` 收窄边界；overlay 滚动条不占布局空间
   * （量出来恒为 0），收窄没用，只能靠 `pointer-events: none` 让指针穿透。
   * 事件由内部 `<tr>` 收回，所以排序/列宽拖拽仍正常（真机验过）。
   */
  it('容器 pointer-events: none 让指针穿透到滚动条，行上再收回来', () => {
    const { box } = mount(base());
    // CSS 不在 happy-dom 里生效（真实层级由 CDP 验：容器 none / tr 与单元格 auto），
    // 这里守的是选择器 `.vt-header > .vt-table > * > tr` 能命中的结构
    const hdrTable = box.querySelector('.vt-header > table')!;
    expect(hdrTable.querySelectorAll(':scope > * > tr').length).toBeGreaterThan(0);
    // 表尾这个 fixture 没有表尾内容 → tfoot 里没有 tr，属正常（容器仍在，高度 0）
    const ftrTable = box.querySelector('.vt-footer > table')!;
    expect(ftrTable).not.toBeNull();
    expect(ftrTable.querySelector('tfoot')).not.toBeNull();
  });

  it('三份 colgroup 列数与列宽完全一致（表头/表体/表尾各一份）', () => {
    const { box } = mount(base());
    const groups = [...box.querySelectorAll('colgroup')];
    expect(groups.length).toBe(3);
    const widths = groups.map((g) =>
      [...g.children].map((c) => (c as HTMLElement).style.width),
    );
    expect(widths[0]).toEqual(widths[1]);
    expect(widths[1]).toEqual(widths[2]);
    // 2 个数据列 + 1 个 0 宽的行高撑格列
    expect(widths[0]).toEqual(['100px', '150px', '0px']);
  });

  it('三个 table 的总宽一致，列宽变化后仍同步', () => {
    const { box, table } = mount(base());
    const tables = () =>
      [...box.querySelectorAll('table')].map((t) => (t as HTMLElement).style.width);
    expect(new Set(tables()).size).toBe(1);

    table.setColumns([
      { key: 'a', title: 'A', width: 200 },
      { key: 'b', title: 'B', width: 300 },
    ]);
    expect(new Set(tables()).size).toBe(1);
    expect(tables()[0]).toBe('500px');
    const groups = [...box.querySelectorAll('colgroup')].map((g) =>
      [...g.children].map((c) => (c as HTMLElement).style.width),
    );
    expect(groups[0]).toEqual(['200px', '300px', '0px']);
    expect(groups[1]).toEqual(groups[0]);
    expect(groups[2]).toEqual(groups[0]);
  });

  /**
   * 占位块高度必须跟随表头/表尾的真实高度，否则首行会被表头盖住、末行被表尾盖住。
   * happy-dom 没有布局（offsetHeight 恒 0），这里只断言写出的是合法值。
   */
  it('占位块高度由 _syncSectionSpacers 同步，不写出非法值', () => {
    const box = document.createElement('div');
    box.style.cssText = 'width:400px;height:400px';
    document.body.appendChild(box);
    // 不给 renderControl，让它按真实容器算；happy-dom 里 clientHeight 为 0 时应安全跳过
    const table = new VirtTable<Record<string, any>>(box, {
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      showSummary: true,
      list: [{ id: 1, a: 1 }],
      columns: [{ key: 'a', title: 'A', width: 100, summary: 'sum' }],
    } as VirtTableOptions<Record<string, any>>);
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });
    for (const cls of ['.vt-header-spacer', '.vt-footer-spacer']) {
      const sp = box.querySelector<HTMLElement>(cls);
      if (!sp) continue;
      expect(sp.style.height).toMatch(/^\d+px$/);
    }
  });

  it('showHeader: false 时不建表头容器，表尾容器照常存在', () => {
    const { box } = mount({ ...base(), showHeader: false });
    expect(box.querySelector('.vt-header')).toBeNull();
    expect(box.querySelector('.vt-footer')).not.toBeNull();
  });

  it('多级分组表头整棵树都在独立 table 里，rowSpan 保留', () => {
    const { box } = mount({
      list: [{ id: 1, x: 1, y: 2 }],
      columns: [
        {
          key: 'g',
          title: '组',
          width: 0,
          children: [
            { key: 'x', title: 'X', width: 100 },
            { key: 'y', title: 'Y', width: 100 },
          ],
        },
        { key: 'z', title: 'Z', width: 100 },
      ],
    });
    const headerWrap = box.querySelector('.vt-header')!;
    const rows = headerWrap.querySelectorAll('.vt-thead tr');
    expect(rows.length).toBe(2); // 列树深度 2
    // 叶子列 Z 没有子级 → 跨满两行
    const z = headerWrap.querySelector<HTMLTableCellElement>('th[data-col-key="z"]')!;
    expect(z.rowSpan).toBe(2);
    // 分组格横跨两个叶子
    const g = [...headerWrap.querySelectorAll<HTMLTableCellElement>('th')].find(
      (t) => t.colSpan === 2,
    );
    expect(g).toBeTruthy();
  });
});

/**
 * 分组表头标题的**对齐**。
 *
 * 分组格的标题住在一个 sticky 内层（`.vt-group-label`）里，所以横滚时它总留在可视区内。
 * 默认居中，但**左/右也必须支持**：一个跨两屏的「2026年8月」居中会飘在屏幕正中、与哪一列
 * 都对不上；吸左则一直贴在可视区左沿，像个「当前所在月份」的标签 —— 付费甘特的年月表头
 * 就是靠 `headerAlign: 'left'` 做的（`buildTimelineColumns`）。
 *
 * 这条一直是能用的，但**没有测试**：所以这里钉住，别哪天把 `textAlign` 写死成 center。
 */
describe('分组表头标题的对齐（左 / 中 / 右）', () => {
  const grouped = (headerAlign?: 'left' | 'center' | 'right') =>
    mount({
      ...base(),
      columns: [
        {
          key: 'g',
          title: '组',
          width: 200,
          ...(headerAlign ? { headerAlign } : {}),
          children: [
            { key: 'a', title: 'A', width: 100 },
            { key: 'b', title: 'B', width: 100 },
          ],
        },
      ],
    });

  const label = (box: HTMLElement): HTMLElement =>
    box.querySelector<HTMLElement>('.vt-thead th[data-group-key="g"] .vt-group-label')!;

  it('默认居中（跨多列时居中更易读）', () => {
    const { box } = grouped();
    expect(label(box).style.textAlign).toBe('center');
  });

  it("headerAlign: 'left' → 标题吸左（甘特的年月表头就靠这个）", () => {
    const { box } = grouped('left');
    expect(label(box).style.textAlign).toBe('left');
  });

  it("headerAlign: 'right' 同样生效", () => {
    const { box } = grouped('right');
    expect(label(box).style.textAlign).toBe('right');
  });

  it('对齐写在 sticky 内层上，不是写在 th 上（写 th 上横滚时不跟随）', () => {
    const { box } = grouped('left');
    const th = box.querySelector<HTMLElement>('.vt-thead th[data-group-key="g"]')!;
    expect(th.style.textAlign).toBe('');
    expect(label(box).parentElement).toBe(th);
  });
});
