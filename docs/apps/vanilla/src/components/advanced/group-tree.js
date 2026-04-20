import { createDemo, faker } from '../common.js';

export function bootstrapTableGroupTree(root) {
  const depts = ['工程部', '设计部', '市场部'];
  const teamNames = ['Alpha', 'Beta'];
  let uid = 0;

  const flatRows = [];
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

  const cols = [
    { key: 'name', title: '名称', width: 280, type: 'tree' },
    { key: 'role', title: '角色', width: 160 },
    { key: 'department', title: '部门', width: 120 },
    { key: 'team', title: '小组', width: 160 },
    { key: 'score', title: '分数', width: 100 },
  ];

  const { table, on, setStatus, cleanup } = createDemo(root, {
    title: '分组 + 树形',
    columns: cols,
    tableOptions: {
      list: flatRows,
      groupConfig: [{ field: 'department' }, { field: 'team' }],
      defaultExpandAll: true,
      border: true,
    },
    extraButtons:
      '<button class="virt-table-btn" id="btnExpandAll" style="background:#10b981;color:#fff;">全部展开</button>' +
      '<button class="virt-table-btn" id="btnCollapseAll" style="background:#6b7280;color:#fff;">全部收起</button>',
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
