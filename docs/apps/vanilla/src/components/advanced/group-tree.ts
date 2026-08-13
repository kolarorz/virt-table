import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';

export function bootstrapTableGroupTree(root: HTMLElement): () => void {
  const depts = ['工程部', '设计部', '市场部'];
  const teamNames = ['Alpha', 'Beta'];
  let uid = 0;

  const flatRows: Record<string, any>[] = [];
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

  const columns = [
    { key: 'name', title: '名称', width: 280, type: 'tree' as const },
    { key: 'role', title: '角色', width: 160 },
    { key: 'department', title: '部门', width: 120 },
    { key: 'team', title: '小组', width: 160 },
    { key: 'score', title: '分数', width: 100 },
  ];

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="btnExpandAll">全部展开</button>
      <button class="virt-table-btn" id="btnCollapseAll">全部收起</button>
    </div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const listeners: (() => void)[] = [];

  const table = new VirtTable(container, {
    list: flatRows,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    groupConfig: [{ field: 'department' }, { field: 'team' }],
    defaultExpandAll: true,
    border: true,
  });

  const on = (id: string, handler: () => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnExpandAll', () => table.expandAll());
  on('btnCollapseAll', () => table.collapseAll());

  return () => {
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
