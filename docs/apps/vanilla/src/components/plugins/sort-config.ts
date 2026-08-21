import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtSortConfig } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/sort-config.css';

interface Row {
  id: number;
  name: string;
  dept: string;
  salary: number;
  score: number;
}

const DEPTS = ['研发', '设计', '销售'];

export function bootstrapTableSortConfig(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'name', title: '姓名', width: 150, sortable: true },
    { key: 'dept', title: '部门', width: 110, sortable: true },
    { key: 'salary', title: '月薪', width: 110, align: 'right', sortable: true },
    { key: 'score', title: '绩效', width: 100, align: 'right', sortable: true },
    // 这一列明确不参与排序 —— 面板的候选里也不会有它
    { key: 'id', title: 'ID', width: 70, sortable: false },
  ];

  const list: Row[] = Array.from({ length: 400 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: DEPTS[i % DEPTS.length]!,
    salary: faker.number.int({ min: 8000, max: 60000 }),
    score: faker.number.int({ min: 60, max: 100 }),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="sort">排序</button>
      <span class="demo-note" id="hint">面板里排的序与点列头是同一份状态：列头的箭头会跟着亮</span>
    </div>
    <div style="width:800px;height:420px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;
  const hint = root.querySelector('#hint') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    /*
     * **多列排序**：不开这个的话面板只给一条规则并说明原因 ——
     * `setState` 在单列模式下会把多余的规则静默截断，界面上先说清比让人白配一条好。
     */
    sortMode: 'multiple',
    onSortChange: (sort) => {
      hint.textContent = sort.length
        ? `${sort.length} 条规则：${sort.map((s) => `${s.colKey} ${s.order}`).join('，')}`
        : '面板里排的序与点列头是同一份状态：列头的箭头会跟着亮';
    },
    // 没装 vtToolbar：面板由下面那颗按钮唤出
    plugins: [vtSortConfig()],
  });

  (root.querySelector('#sort') as HTMLButtonElement).onclick = (e) =>
    table.toggleSortConfig(e.currentTarget as HTMLElement);

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
