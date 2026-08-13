import React from 'react';
import { VirtTableReact, type ReactTableColumn, vtColumnFilter } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  date: string;
  city: string;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名（关键字）', width: 200, filterType: 'text' },
  { key: 'age', title: '年龄（区间）', width: 180, filterType: 'number-range' },
  { key: 'date', title: '入职日期（区间）', width: 220, filterType: 'date-range' },
  { key: 'city', title: '城市', width: 160 },
];

const list: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 65 }),
  date: faker.date.between({ from: '2020-01-01', to: '2024-12-31' }).toISOString().slice(0, 10),
  city: faker.location.city(),
}));

export default function RichFilterTable() {
  const [status, setStatus] = React.useState('尚未筛选');
  const plugins = React.useMemo(() => [vtColumnFilter()], []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 富筛选类型</h3>
      <div className="demo-hint">
        点击表头筛选图标：姓名支持<b>关键字</b>、年龄支持<b>数值区间</b>、日期支持
        <b>日期区间</b>。
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 840, height: 460 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{
            plugins,
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            onFilterChange: (f) =>
              setStatus(Object.keys(f).length ? `筛选条件：${JSON.stringify(f)}` : '尚未筛选'),
          }}
        />
      </div>
    </div>
  );
}
