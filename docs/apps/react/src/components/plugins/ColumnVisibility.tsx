import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtFieldConfig,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  city: string;
  job: string;
  email: string;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, hideable: false },
  { key: 'name', title: '姓名', width: 160 },
  { key: 'age', title: '年龄', width: 120 },
  { key: 'city', title: '城市', width: 160 },
  { key: 'job', title: '职位', width: 200 },
  { key: 'email', title: '邮箱', width: 240, hidden: true },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 60 }),
  city: faker.location.city(),
  job: faker.person.jobTitle(),
  email: faker.internet.email(),
}));

export default function ColumnVisibilityTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const plugins = React.useMemo(() => [vtFieldConfig()], []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 字段配置</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          // 面板要贴着触发按钮定位，所以把按钮本身作为 anchor 传进去
          onClick={(e) => tableRef.current?.toggleFieldConfig(e.currentTarget)}
        >
          字段配置
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => tableRef.current?.setColumnVisible('job', false)}
        >
          隐藏「职位」
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => tableRef.current?.setColumnVisible('email', true)}
        >
          显示「邮箱」
        </button>
        <span className="demo-note">ID 列不可隐藏；邮箱列默认隐藏</span>
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
