import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

/** 序号 / 勾选 / 单选 三种 `col.type` 同表并存（勾选与单选各占一列，状态互不干扰） */
interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
  dept: string;
}

const ROW_COUNT = 1000;

const columns: ReactTableColumn<Row>[] = [
  { key: '__index', title: '#', width: 60, type: 'index' as const, align: 'center' as const },
  { key: '__checkbox', title: '', width: 50, type: 'checkbox' as const, align: 'center' as const },
  { key: '__radio', title: '当前', width: 60, type: 'radio' as const, align: 'center' as const },
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 160 },
  { key: 'city', title: '城市', width: 160 },
  { key: 'dept', title: '部门', width: 200 },
];

const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  city: faker.location.city(),
  dept: faker.commerce.department(),
}));

export default function FeatureColumnsTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState(
    `序号 / 勾选 / 单选 三种功能列同表：${ROW_COUNT} 行`,
  );

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 功能列</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          onClick={() => {
            const rows = (tableRef.current?.getCheckedRows() ?? []) as Row[];
            setStatus(
              rows.length
                ? `勾选了 ${rows.length} 行：${rows.map((r) => r.id).join(', ')}`
                : '没有勾选任何行',
            );
          }}
        >
          获取勾选行
        </button>
        <button
          type="button"
          onClick={() => {
            tableRef.current?.clearCheckedRows();
            setStatus('已清空勾选');
          }}
        >
          清空勾选
        </button>
        <button
          type="button"
          onClick={() => {
            const r = tableRef.current?.getSelectedRadio() as Row | null | undefined;
            setStatus(r ? `当前行：${r.name}（id=${r.id}）` : '没有当前行');
          }}
        >
          获取当前行
        </button>
        <button
          type="button"
          onClick={() => {
            tableRef.current?.setSelectedRadio(null);
            setStatus('已清除当前行');
          }}
        >
          清除当前行
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
            estimatedSize: 40,
            buffer: 4,
            border: true,
            onCheckChange: (checked, row) => {
              const count = (tableRef.current?.getCheckedRows() ?? []).length;
              setStatus(
                `勾选：行 ${(row as Row).id} ${checked ? '选中' : '取消'}，共 ${count} 行`,
              );
            },
            onCheckAll: (checked) => {
              const count = (tableRef.current?.getCheckedRows() ?? []).length;
              setStatus(checked ? `全选 ${count} 行` : '取消全选');
            },
            onRadioChange: (row) => {
              const r = row as Row;
              setStatus(`单选：当前行 ${r.name}（id=${r.id}）`);
            },
          }}
        />
      </div>
    </div>
  );
}
