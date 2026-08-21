import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtFilterConfig } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/filter-config.css';

interface Row {
  id: number;
  name: string;
  dept: string;
  city: string;
  salary: number;
}

const DEPTS = ['研发', '设计', '销售', '客服'];

export function bootstrapTableFilterConfig(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 70 },
    { key: 'name', title: '姓名', width: 140 },
    { key: 'dept', title: '部门', width: 110 },
    { key: 'city', title: '城市', width: 130 },
    { key: 'salary', title: '月薪', width: 110, align: 'right' },
  ];

  const list: Row[] = Array.from({ length: 600 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: DEPTS[i % DEPTS.length]!,
    city: faker.location.city(),
    salary: faker.number.int({ min: 8000, max: 60000 }),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="filter">高级筛选</button>
      <span class="demo-note" id="hint"></span>
    </div>
    <div style="width:820px;height:420px;" class="demo-container" id="c"></div>`;
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
     * 条件树落地后核心会重算数据管线 —— 这个回调只用来更新上面那句提示。
     * 面板本身不需要它：它写的是 `setState({ filterModel })`，与列头筛选、状态持久化是同一份状态。
     */
    onFilterModelChange: (model) => {
      hint.textContent = model
        ? '高级筛选已生效（与列头筛选独立，最终取 AND）'
        : '暂无高级筛选';
    },
    // 没装 vtToolbar：面板由下面那颗按钮唤出
    plugins: [vtFilterConfig()],
  });

  hint.textContent = `共 ${list.length} 行，点上面那颗按钮配条件`;
  (root.querySelector('#filter') as HTMLButtonElement).onclick = (e) =>
    table.toggleFilterConfig(e.currentTarget as HTMLElement);

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
