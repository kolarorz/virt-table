import React from 'react';
import { VirtTableReact, type ReactTableColumn, vtRowDrag } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
  score: number;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'drag', title: '', width: 50, type: 'drag', fixed: 'left' },
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 200 },
  { key: 'city', title: '城市', width: 200 },
  { key: 'score', title: '分数', width: 120 },
];

const list: Row[] = Array.from({ length: 300 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  city: faker.location.city(),
  score: faker.number.int({ min: 0, max: 100 }),
}));

export default function RowDragTable() {
  const [status, setStatus] = React.useState('尚未拖动');
  const plugins = React.useMemo(() => [vtRowDrag()], []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 行拖拽排序</h3>
      <div className="demo-hint">
        拖拽行首的 <b>⣿ 手柄</b>{' '}
        调整行顺序（拖到视口边缘会自动滚动）。仅扁平数据、未排序/筛选时生效。
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 660, height: 480 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{
            plugins,
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            onRowOrderChange: (_list, from, to) => setStatus(`行 ${from} → ${to}`),
          }}
        />
      </div>
    </div>
  );
}
