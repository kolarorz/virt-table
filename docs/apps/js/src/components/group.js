import { createDemo, faker } from './common.js';

export function bootstrapTableGroup(root) {
  const depts = ['工程部', '设计部', '市场部', '财务部'];
  const teamNames = ['Alpha', 'Beta', 'Gamma'];
  const groupRows = Array.from({ length: 200 }, (_, i) => ({
    id: i,
    name: faker.person.fullName(),
    department: depts[i % depts.length],
    team: teamNames[i % teamNames.length],
    score: Math.floor(Math.random() * 100),
  }));

  const cols = [
    { key: 'name', title: '姓名', width: 180 },
    { key: 'department', title: '部门', width: 120 },
    { key: 'team', title: '小组', width: 120 },
    { key: 'score', title: '分数', width: 100 },
  ];

  const { table, on, setStatus, cleanup } = createDemo(root, {
    title: '分组',
    columns: cols,
    tableOptions: {
      list: groupRows,
      groupConfig: [{ field: 'department' }, { field: 'team' }],
      defaultExpandAll: true,
      border: true,
    },
    extraButtons:
      '<button class="virt-table-btn" id="btnExpandAll" style="background:#10b981;color:#fff;">全部展开</button><button class="virt-table-btn" id="btnCollapseAll" style="background:#6b7280;color:#fff;">全部收起</button>',
  });

  on('btnExpandAll', () => {
    table.expandAll();
    setStatus('全部展开');
  });
  on('btnCollapseAll', () => {
    table.collapseAll();
    setStatus('全部收起');
  });

  return cleanup;
}
