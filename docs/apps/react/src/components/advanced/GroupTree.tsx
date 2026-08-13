import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const depts = ['工程部', '设计部', '市场部'];
const teamNames = ['Alpha', 'Beta'];

let uid = 0;

const flatRows: Record<string, unknown>[] = [];
for (const dept of depts) {
  for (const team of teamNames) {
    const managerCount = 1 + Math.floor(Math.random() * 2);
    for (let m = 0; m < managerCount; m++) {
      const membersCount = 2 + Math.floor(Math.random() * 4);
      flatRows.push({
        id: uid++,
        name: faker.person.fullName(),
        role: '主管',
        department: dept,
        team: `${dept}-${team}`,
        score: Math.floor(Math.random() * 100),
        children: Array.from({ length: membersCount }, () => ({
          id: uid++,
          name: faker.person.fullName(),
          role: faker.person.jobTitle(),
          department: dept,
          team: `${dept}-${team}`,
          score: Math.floor(Math.random() * 100),
        })),
      });
    }
  }
}

const columns: ReactTableColumn[] = [
  { key: 'name', title: '名称', width: 280, type: 'tree' as const },
  { key: 'role', title: '角色', width: 160 },
  { key: 'department', title: '部门', width: 120 },
  { key: 'team', title: '小组', width: 160 },
  { key: 'score', title: '分数', width: 100 },
];

export default function GroupTreeTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('分组 + 树形');
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 分组 + 树形</h3>
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
            list: flatRows,
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
