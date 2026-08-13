import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtExport,
  vtCellSelection,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  city: string;
  score: number;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 180 },
  { key: 'email', title: '邮箱', width: 240 },
  { key: 'city', title: '城市', width: 160 },
  { key: 'score', title: '分数', width: 120 },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  city: faker.location.city(),
  score: faker.number.int({ min: 0, max: 100 }),
}));

export default function ExportTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  // scope: 'selection' 依赖框选，所以两个插件要一起装
  const plugins = React.useMemo(() => [vtCellSelection(), vtExport()], []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 导出 CSV / Excel</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={() => tableRef.current?.exportCsv({ filename: '全表.csv' })}
        >
          导出 CSV（全表）
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => tableRef.current?.exportExcel({ filename: '全表.xls' })}
        >
          导出 Excel（全表）
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => tableRef.current?.exportCsv({ filename: '选区.csv', scope: 'selection' })}
        >
          导出 CSV（当前选区）
        </button>
        <span className="demo-note">框选若干单元格后可只导出选区</span>
      </div>
      <div style={{ width: 760, height: 460 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 6, border: true, plugins }}
        />
      </div>
    </div>
  );
}
