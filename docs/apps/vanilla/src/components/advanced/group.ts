import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';

export function bootstrapTableGroup(root: HTMLElement): () => void {
  const depts = ['工程部', '设计部', '市场部', '财务部'];
  const teamNames = ['Alpha', 'Beta', 'Gamma'];

  const groupRows = Array.from({ length: 200 }, (_, i) => ({
    id: i,
    name: faker.person.fullName(),
    department: depts[i % depts.length],
    team: teamNames[i % teamNames.length],
    score: Math.floor(Math.random() * 100),
  }));

  const columns = [
    { key: 'name', title: '姓名', width: 180 },
    { key: 'department', title: '部门', width: 120 },
    { key: 'team', title: '小组', width: 120 },
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
    list: groupRows,
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
