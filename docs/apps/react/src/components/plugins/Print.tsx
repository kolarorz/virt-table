import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtExport,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
  score: number;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 220 },
  { key: 'city', title: '城市', width: 220 },
  { key: 'score', title: '分数', width: 120 },
];

const list: Row[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  city: faker.location.city(),
  score: faker.number.int({ min: 0, max: 100 }),
}));

export default function PrintTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  // 打印与导出同属 vtExport
  const plugins = React.useMemo(() => [vtExport()], []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 打印</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={() => tableRef.current?.print({ title: '人员清单' })}
        >
          打印表格
        </button>
        <span className="demo-note">会打开新窗口输出全表（内联样式）</span>
      </div>
      <div style={{ width: 660, height: 460 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 6, border: true, plugins }}
        />
      </div>
    </div>
  );
}
