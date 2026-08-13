import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const depts = ['工程部', '设计部', '市场部', '财务部'];
const teamNames = ['Alpha', 'Beta', 'Gamma'];

const groupRows = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  name: faker.person.fullName(),
  department: depts[i % depts.length],
  team: teamNames[i % teamNames.length],
  score: Math.floor(Math.random() * 100),
}));

const columns: ReactTableColumn[] = [
  { key: 'name', title: '姓名', width: 180 },
  { key: 'department', title: '部门', width: 120 },
  { key: 'team', title: '小组', width: 120 },
  { key: 'score', title: '分数', width: 100 },
];

export default function GroupTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('分组：200 行');
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 分组</h3>
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
            list: groupRows,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 4,
            groupConfig: [{ field: 'department' }, { field: 'team' }],
            defaultExpandAll: true,
            border: true,
          }}
        />
      </div>
    </div>
  );
}
