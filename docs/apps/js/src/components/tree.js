import { createDemo, faker } from './common.js';

export function bootstrapTableTree(root) {
  const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
  const teams = ['前端组', '后端组', '测试组'];
  let uid = 0;
  const treeData = departments.map((dept) => ({
    id: uid++,
    name: dept,
    role: '部门',
    count: '',
    children: teams.map((team) => ({
      id: uid++,
      name: `${dept}-${team}`,
      role: '小组',
      count: '',
      children: Array.from(
        { length: 3 + Math.floor(Math.random() * 5) },
        () => ({
          id: uid++,
          name: faker.person.fullName(),
          role: faker.person.jobTitle(),
          count: String(Math.floor(Math.random() * 100)),
        }),
      ),
    })),
  }));

  const cols = [
    { key: 'name', title: '名称', width: 280, type: 'tree' },
    { key: 'role', title: '角色', width: 200 },
    { key: 'count', title: '数量', width: 120 },
  ];

  const { table, on, setStatus, cleanup } = createDemo(root, {
    title: '树形结构',
    columns: cols,
    tableOptions: { list: treeData, defaultExpandAll: false },
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
