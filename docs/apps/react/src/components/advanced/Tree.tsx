import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
const teams = ['前端组', '后端组', '测试组'];

let uid = 0;

const treeData = departments.map((dept, di) => ({
  id: uid++,
  name: dept,
  role: '部门',
  count: '',
  children: teams.map((team, ti) => ({
    id: uid++,
    name: `${dept}-${team}`,
    role: '小组',
    count: '',
    children: Array.from({ length: 3 + ((di * 3 + ti) * 2) % 5 }, () => ({
      id: uid++,
      name: faker.person.fullName(),
      role: faker.person.jobTitle(),
      count: String(Math.floor(Math.random() * 100)),
    })),
  })),
}));

const columns: ReactTableColumn[] = [
  { key: 'name', title: '名称', width: 280, type: 'tree' as const },
  { key: 'role', title: '角色', width: 200 },
  { key: 'count', title: '数量', width: 120 },
];

export default function TreeTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('树形结构：5 部门');
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 树形结构</h3>
      <div className="virt-table-controls">
        <button type="button" onClick={() => { tableRef.current?.expandAll(); setStatus('全部展开'); }}>全部展开</button>
        <button type="button" onClick={() => { tableRef.current?.collapseAll(); setStatus('全部收起'); }}>全部收起</button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: treeData,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 4,
            border: true,
            defaultExpandAll: false,
          }}
        />
      </div>
    </div>
  );
}
