import {
  VirtTable,
  type CellRenderConfig,
} from '@virt-table/vanilla';
import {
  vtCellEditor,
} from '@virt-table/vanilla/plugins';
import { VtSelect, asCell } from '@virt-table/vanilla/components';

const statusOptions = [
  { value: 'active', label: '活跃', color: '#22c55e' },
  { value: 'inactive', label: '停用', color: '#ef4444' },
  { value: 'pending', label: '待审', color: '#f59e0b' },
];

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function makeInputEditor(row: Record<string, any>, colKey: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = row[colKey] ?? '';
  input.style.cssText = 'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
  input.addEventListener('input', () => { row[colKey] = input.value; });
  requestAnimationFrame(() => input.focus());
  return input;
}

function makeNumberEditor(row: Record<string, any>, colKey: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.value = row[colKey] ?? '';
  input.style.cssText = 'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
  input.addEventListener('input', () => { row[colKey] = input.value; });
  requestAnimationFrame(() => input.focus());
  return input;
}

function makeSelectEditor(
  row: Record<string, any>,
  colKey: string,
  options: { value: string; label: string }[],
): HTMLSelectElement {
  const select = document.createElement('select');
  select.style.cssText = 'width:100%;height:100%;border:none;outline:none;padding:0 8px;font-size:14px;box-sizing:border-box;background:#fff;';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === row[colKey]) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener('change', () => { row[colKey] = select.value; });
  requestAnimationFrame(() => select.focus());
  return select;
}

function makeCheckboxEditor(row: Record<string, any>, colKey: string): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.style.cssText = 'display:flex;align-items:center;gap:8px;padding:0 12px;height:100%;cursor:pointer;font-size:14px;';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !!row[colKey];
  cb.style.cssText = 'width:16px;height:16px;cursor:pointer;';
  const span = document.createElement('span');
  span.textContent = row[colKey] ? 'Yes' : 'No';
  cb.addEventListener('change', () => {
    row[colKey] = cb.checked;
    span.textContent = cb.checked ? 'Yes' : 'No';
  });
  wrap.appendChild(cb);
  wrap.appendChild(span);
  return wrap;
}

/**
 * 状态徽章复用核心的 `.vt-cell-option`（`cellType: 'option'` 用的同一个类）：
 * 不再手写色值与尺寸，底色由 `--vt-cell-option-color` 经 color-mix 派生、跟随主题，
 * 高度也跟着 `--vt-line-height` 走，不会把行撑高。
 */
function renderStatusBadge(value: unknown): string {
  const opt = statusOptions.find((o) => o.value === value);
  if (!opt) return escapeHtml(value);
  return `<span class="vt-cell-option" style="--vt-cell-option-color:${opt.color}">${escapeHtml(opt.label)}</span>`;
}

function renderProgress(value: unknown): string {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return `<div style="display:flex;align-items:center;gap:8px;padding:0 8px;">
    <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
    </div>
    <span style="font-size:12px;color:#666;min-width:36px;text-align:right;">${pct}%</span>
  </div>`;
}

/** 生成一个纯色方块当头像（避免 demo 依赖外部图片） */
function avatarUrl(i: number): string {
  const hue = (i * 47) % 360;
  return (
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">` +
        `<rect width="48" height="48" rx="8" fill="hsl(${hue} 62% 55%)"/></svg>`,
    )
  );
}

const tagPalette = [
  { label: 'A 类', color: '#2563eb' },
  { label: 'B 类', color: '#7c3aed' },
  { label: 'C 类', color: '#059669' },
];

export function bootstrapTableCellTypeRender(root: HTMLElement): () => void {
  const columns = [
    // 功能列：独占单元格。但**单元格级**配置能穿透它（见下面 i % 7 的那批）
    { key: 'sel', title: '', width: 46, type: 'checkbox' as const },
    { key: 'name', title: '姓名', width: 150 },
    { key: 'score', title: '分数', width: 150 },
    { key: 'status', title: '状态', width: 150 },
    { key: 'progress', title: '进度', width: 200 },
    { key: 'remark', title: '备注', width: 200 },
    // 列级内容类型：值即内容，不用写 render
    { key: 'avatar', title: '头像', width: 80, cellType: 'image' as const, align: 'center' as const },
    // 列级 render 作为基线，好让下面「单元格级 cellType」的胜出看得见
    {
      key: 'tag',
      title: '分类',
      width: 120,
      render: ({ value }: any) => `[${escapeHtml(value?.label)}]`,
    },
  ];

  const rowCount = 5000;
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

  const list = Array.from({ length: rowCount }, (_, i) => {
    // 数据保持干净：渲染配置不再塞进行对象（见下方 setCellRenders）
    return {
      id: i,
      name: names[i % names.length],
      score: Math.floor(Math.random() * 100),
      status: statusOptions[i % statusOptions.length].value,
      progress: Math.floor(Math.random() * 101),
      remark: `备注 ${i}`,
      avatar: avatarUrl(i),
      tag: tagPalette[i % tagPalette.length],
    };
  });

  /**
   * 单元格级渲染：用 `setCellRenders()` 批量登记，配置存在表格实例里。
   * 以前的写法是往每行数据挂 `_cellRenders`（仍然兼容），但那会让函数进到数据对象里，
   * `JSON.stringify` / 深拷贝 / 数据 diff 都会被污染，React / Vue 端也拿不到 VNode 包装。
   */
  const cellRenderEntries: Array<{
    rowKey: string;
    colKey: string;
    config: CellRenderConfig<any>;
  }> = [];
  for (let i = 0; i < rowCount; i++) {
    const rowKey = String(i);
    const rowRef = () => list[i] as Record<string, any>;

    if (i % 5 === 0) {
      cellRenderEntries.push({
        rowKey, colKey: 'name',
        config: {
          render: ({ value }: any) => `<b style="color:#1890ff;">${escapeHtml(value)}</b>`,
          renderEditor: ({ column }: any) => makeInputEditor(rowRef(), column.key),
        },
      });
    }
    if (i % 3 === 0) {
      cellRenderEntries.push({
        rowKey, colKey: 'score',
        config: {
          render: ({ value }: any) => {
            const n = Number(value);
            const color = n >= 80 ? '#22c55e' : n >= 60 ? '#f59e0b' : '#ef4444';
            return `<span style="font-weight:bold;color:${color};">${n}</span>`;
          },
          renderEditor: ({ column }: any) => makeNumberEditor(rowRef(), column.key),
        },
      });
    }
    if (i % 4 === 0) {
      cellRenderEntries.push({
        rowKey, colKey: 'status',
        config: {
          render: ({ value }: any) => renderStatusBadge(value),
          renderEditor: ({ column }: any) => makeSelectEditor(rowRef(), column.key, statusOptions),
        },
      });
    }
    if (i % 2 === 0) {
      cellRenderEntries.push({
        rowKey, colKey: 'progress',
        config: { render: ({ value }: any) => renderProgress(value) },
      });
    }
    if (i % 6 === 0) {
      cellRenderEntries.push({
        rowKey, colKey: 'remark',
        config: {
          render: ({ value }: any) => `<em style="color:#999;">${escapeHtml(value)}</em>`,
          renderEditor: ({ column }: any) => makeInputEditor(rowRef(), column.key),
        },
      });
    }

    /**
     * 单元格级 `cellType`：**粒度优先于具体度** —— 它赢过「分类」列上的那个 `render`。
     * 这一格画成内置的 option 胶囊（值是 `{ label, color }`），同列其他格仍是 `[A 类]`。
     * 反过来若让列级 render 赢，这里配了 cellType 却毫无反应，没法解释。
     */
    if (i % 3 === 1) {
      cellRenderEntries.push({ rowKey, colKey: 'tag', config: { cellType: 'option' } });
    }

    /**
     * 单元格级装**单元格组件**：`asCell()` 整对写入 render + renderEditor，
     * 所以这一格的常态与编辑态必然是同一个控件（手写配置很容易只给一半）。
     * 不用编造 key/title/width —— 真正的列键来自 setCellRender 的 colKey。
     */
    if (i % 4 === 2) {
      cellRenderEntries.push({
        rowKey, colKey: 'status',
        config: asCell(VtSelect, { options: statusOptions, display: 'tag' }),
      });
    }

    /**
     * **穿透功能列**：勾选列里这一行不给勾选框，改画一把锁。
     * 列级做不到（会被忽略并告警）—— 这是「就这一行不一样」唯一的官方出口。
     * ⚠️ 只改 UI 不改选择态：表头全选照样会选中这些行。
     */
    if (i % 7 === 0) {
      cellRenderEntries.push({
        rowKey, colKey: 'sel',
        config: { render: () => '<span title="已锁定，不可单独勾选">🔒</span>' },
      });
    }
  }

  root.innerHTML = `
  <div class="virt-table-controls">
    <button class="virt-table-btn virt-table-btn-primary" id="btnTop">滚动到顶部</button>
    <button class="virt-table-btn virt-table-btn-primary" id="btnBottom">滚动到底部</button>
    <button class="virt-table-btn virt-table-btn-warning" id="btnRandom">随机滚动</button>
  </div>
  <div id="status" class="status-text"></div>
  <div style="width:1040px;height:600px;" class="demo-container" id="virtTableContainer"></div>
`;

  const container = root.querySelector('#virtTableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;
  const listeners: (() => void)[] = [];

  const table = new VirtTable(container, {
    plugins: [vtCellEditor()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    textOverflow: 'ellipsis',
  });

  // 一次登记，只刷新一次（逐个 setCellRender 会每次重绘）
  table.setCellRenders(cellRenderEntries);

  status.innerHTML =
    `${rowCount} 行 · 共 ${cellRenderEntries.length} 条单元格级配置（<code>setCellRenders()</code>）。` +
    `内容层四种来源都在场：<b>表级</b>无（这里没配 <code>options.cellType</code>）、` +
    `<b>列级</b> cellType（头像=image）与 render（分类=<code>[A 类]</code>）、` +
    `<b>单元格级</b> render（姓名/分数/状态/进度/备注）与 cellType（每 3 行的分类格画成胶囊，` +
    `<i>赢过列级 render</i>）。第 4n+2 行的「状态」格用 <code>asCell(VtSelect)</code> 装了单元格组件（点它弹面板）；` +
    `每 7 行的勾选格<b>穿透功能列</b>画成 🔒（注意：只改 UI，表头全选仍会选中这些行）。`;

  const on = (id: string, handler: () => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnTop', () => table.scrollToTop());
  on('btnBottom', () => table.scrollToBottom());
  on('btnRandom', () => {
    const idx = Math.floor(Math.random() * rowCount);
    table.scrollToIndex(idx);
  });

  return () => {
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
