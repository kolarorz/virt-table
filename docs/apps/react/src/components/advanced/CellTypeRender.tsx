import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef,
  vtCellEditor,
} from '@virt-table/react';
const statusOptions = [
  { value: 'active', label: '活跃', color: '#22c55e', bg: '#f0f9eb' },
  { value: 'inactive', label: '停用', color: '#ef4444', bg: '#fef2f2' },
  { value: 'pending', label: '待审', color: '#f59e0b', bg: '#fdf6ec' },
];

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function makeInputEditor(row: Record<string, unknown>, colKey: string) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = (row[colKey] as string) ?? '';
  input.style.cssText =
    'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
  input.addEventListener('input', () => {
    row[colKey] = input.value;
  });
  requestAnimationFrame(() => input.focus());
  return input;
}

function makeNumberEditor(row: Record<string, unknown>, colKey: string) {
  const input = document.createElement('input');
  input.type = 'number';
  input.value = (row[colKey] as string) ?? '';
  input.style.cssText =
    'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
  input.addEventListener('input', () => {
    row[colKey] = input.value;
  });
  requestAnimationFrame(() => input.focus());
  return input;
}

function makeSelectEditor(row: Record<string, unknown>, colKey: string, options: typeof statusOptions) {
  const select = document.createElement('select');
  select.style.cssText =
    'width:100%;height:100%;border:none;outline:none;padding:0 8px;font-size:14px;box-sizing:border-box;background:#fff;';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === row[colKey]) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener('change', () => {
    row[colKey] = select.value;
  });
  requestAnimationFrame(() => select.focus());
  return select;
}

function renderStatusBadge(value: unknown) {
  const opt = statusOptions.find((o) => o.value === value);
  if (!opt) return escapeHtml(value);
  return `<span style="display:inline-flex;align-items:center;padding:0 8px;border-radius:12px;background:${opt.bg};color:${opt.color};font-size:12px;line-height:22px;">${escapeHtml(opt.label)}</span>`;
}

function renderProgress(value: unknown) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return `<div style="display:flex;align-items:center;gap:8px;padding:0 8px;">
    <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
    </div>
    <span style="font-size:12px;color:#666;min-width:36px;text-align:right;">${pct}%</span>
  </div>`;
}

const columns: ReactTableColumn[] = [
  { key: 'name', title: '姓名', width: 150 },
  { key: 'score', title: '分数', width: 150 },
  { key: 'status', title: '状态', width: 150 },
  { key: 'progress', title: '进度', width: 200 },
  { key: 'remark', title: '备注', width: 200 },
];

const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
const rowCount = 5000;

type RowType = {
  id: number;
  name: string;
  score: number;
  status: string;
  progress: number;
  remark: string;
  _cellRenders: Record<string, { render: (ctx: { value: unknown }) => string; renderEditor?: (ctx: { row: unknown; column: { key: string } }) => HTMLElement }>;
};

const list: RowType[] = Array.from({ length: rowCount }, (_, i) => {
  const row: RowType = {
    id: i,
    name: names[i % names.length]!,
    score: Math.floor(Math.random() * 100),
    status: statusOptions[i % statusOptions.length]!.value,
    progress: Math.floor(Math.random() * 101),
    remark: `备注 ${i}`,
    _cellRenders: {},
  };

  if (i % 5 === 0) {
    row._cellRenders.name = {
      render: ({ value }) => `<b style="color:#1890ff;">${escapeHtml(value)}</b>`,
      renderEditor: ({ row: r, column: col }) => makeInputEditor(r as unknown as Record<string, unknown>, col.key),
    };
  }

  if (i % 3 === 0) {
    row._cellRenders.score = {
      render: ({ value }) => {
        const n = Number(value);
        const color = n >= 80 ? '#22c55e' : n >= 60 ? '#f59e0b' : '#ef4444';
        return `<span style="font-weight:bold;color:${color};">${n}</span>`;
      },
      renderEditor: ({ row: r, column: col }) => makeNumberEditor(r as unknown as Record<string, unknown>, col.key),
    };
  }

  if (i % 4 === 0) {
    row._cellRenders.status = {
      render: ({ value }) => renderStatusBadge(value),
      renderEditor: ({ row: r, column: col }) => makeSelectEditor(r as unknown as Record<string, unknown>, col.key, statusOptions),
    };
  }

  if (i % 2 === 0) {
    row._cellRenders.progress = {
      render: ({ value }) => renderProgress(value),
    };
  }

  if (i % 6 === 0) {
    row._cellRenders.remark = {
      render: ({ value }) => `<em style="color:#999;">${escapeHtml(value)}</em>`,
      renderEditor: ({ row: r, column: col }) => makeInputEditor(r as unknown as Record<string, unknown>, col.key),
    };
  }

  return row;
});

export default function CellTypeRenderTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const status = `单元格独立渲染：${rowCount} 行（_cellRenders）`;
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 每行每列不同渲染</h3>
      <div className="virt-table-controls">
        <button type="button" onClick={() => tableRef.current?.scrollToTop()}>滚动到顶部</button>
        <button type="button" onClick={() => tableRef.current?.scrollToBottom()}>滚动到底部</button>
        <button
          type="button"
          onClick={() => {
            const idx = Math.floor(Math.random() * rowCount);
            tableRef.current?.scrollToIndex(idx);
          }}
        >
          随机滚动
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 850, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            plugins: [vtCellEditor()],
            estimatedSize: 40,
            buffer: 4,
            border: true,
            textOverflow: 'ellipsis',
          }}
        />
      </div>
    </div>
  );
}
