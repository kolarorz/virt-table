import React from 'react';
import { VirtTableReact, type ReactTableColumn, vtColumnDrag } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  city: string;
  job: string;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, fixed: 'left' },
  { key: 'name', title: '姓名', width: 180 },
  { key: 'age', title: '年龄', width: 120 },
  { key: 'city', title: '城市', width: 180 },
  { key: 'job', title: '职位', width: 200 },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 60 }),
  city: faker.location.city(),
  job: faker.person.jobTitle(),
}));

const initialOrder = '当前列顺序：' + columns.map((c) => c.key).join(' → ');

export default function ColumnDragTable() {
  const [status, setStatus] = React.useState(initialOrder);
  const plugins = React.useMemo(() => [vtColumnDrag()], []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 列拖拽排序</h3>
      <div className="demo-hint">
        拖拽<b>表头</b>调整列顺序（固定列 ID 不建议拖动）。
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 760, height: 480 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{
            plugins,
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            onColumnOrderChange: (cols) =>
              setStatus('当前列顺序：' + cols.map((c) => c.key).join(' → ')),
          }}
        />
      </div>
    </div>
  );
}
