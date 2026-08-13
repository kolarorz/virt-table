import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';

export function bootstrapTableTree(root: HTMLElement): () => void {
  const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
  const teams = ['前端组', '后端组', '测试组'];
  let uid = 0;

  const treeData: Record<string, any>[] = departments.map((dept) => ({
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

  const columns = [
    { key: 'name', title: '名称', width: 280, type: 'tree' as const },
    { key: 'role', title: '角色', width: 200 },
    { key: 'count', title: '数量', width: 120 },
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
    list: treeData,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    defaultExpandAll: false,
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
