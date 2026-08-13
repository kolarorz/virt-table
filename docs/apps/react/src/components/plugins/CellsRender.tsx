import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef,
  vtCellEditor,
} from '@virt-table/react';

const selectOptions = [
  { value: 'opt1', label: '选项 1' },
  { value: 'opt2', label: '选项 2' },
  { value: 'opt3', label: '选项 3' },
  { value: 'opt4', label: '选项 4' },
];

const editStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  outline: 'none',
  padding: '0 12px',
  fontSize: 14,
  boxSizing: 'border-box',
};

const columns: ReactTableColumn[] = [
  {
    key: 'input',
    title: 'Input',
    width: 200,
    renderEditor: ({ value, row, column: col }) => (
      <input
        type="text"
        defaultValue={(value as string) ?? ''}
        style={editStyle}
        onInput={(e) => {
          (row as Record<string, unknown>)[col.key] = (e.target as HTMLInputElement).value;
        }}
        ref={(el) => el?.focus()}
      />
    ),
  },
  {
    key: 'number',
    title: 'Number',
    width: 160,
    renderEditor: ({ value, row, column: col }) => (
      <input
        type="number"
        defaultValue={(value as string) ?? ''}
        style={editStyle}
        onInput={(e) => {
          (row as Record<string, unknown>)[col.key] = (e.target as HTMLInputElement).value;
        }}
        ref={(el) => el?.focus()}
      />
    ),
  },
  {
    key: 'select',
    title: 'Select',
    width: 180,
    render: ({ value }) => {
      const opt = selectOptions.find((o) => o.value === value);
      return opt ? opt.label : '请选择';
    },
    renderEditor: ({ value, row, column: col }) => (
      <select
        defaultValue={(value as string) ?? ''}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          padding: '0 8px',
          fontSize: 14,
          boxSizing: 'border-box',
          background: '#fff',
        }}
        onChange={(e) => {
          (row as Record<string, unknown>)[col.key] = (e.target as HTMLSelectElement).value;
        }}
        ref={(el) => el?.focus()}
      >
        <option value="" disabled>
          请选择
        </option>
        {selectOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
  },
  {
    key: 'date',
    title: 'Date',
    width: 180,
    renderEditor: ({ value, row, column: col }) => (
      <input
        type="date"
        defaultValue={(value as string) ?? ''}
        style={editStyle}
        onChange={(e) => {
          (row as Record<string, unknown>)[col.key] = (e.target as HTMLInputElement).value;
        }}
        ref={(el) => el?.focus()}
      />
    ),
  },
  {
    key: 'checkbox',
    title: 'Checkbox',
    width: 120,
    render: ({ value }) => (value ? '✅ Yes' : '❌ No'),
    renderEditor: ({ value, row, column: col }) => (
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          height: '100%',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        <input
          type="checkbox"
          defaultChecked={!!value}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
          onChange={(e) => {
            (row as Record<string, unknown>)[col.key] = (e.target as HTMLInputElement).checked;
          }}
        />
        <span>{value ? 'Yes' : 'No'}</span>
      </label>
    ),
  },
  { key: 'readonly', title: 'Readonly', width: 200 },
];

const rowCount = 10000;
const list = Array.from({ length: rowCount }, (_, i) => ({
  id: i,
  input: `Row ${i}`,
  number: String(Math.floor(Math.random() * 1000)),
  select: selectOptions[i % selectOptions.length]!.value,
  date: '2025-01-01',
  checkbox: i % 3 === 0,
  readonly: `只读 ${i}`,
}));

export default function CellsRenderTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const status = `单元格编辑：${rowCount} 行（点击单元格进入编辑）`;
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 单元格编辑</h3>
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
      <div style={{ width: 800, height: 600 }} className="demo-container">
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
