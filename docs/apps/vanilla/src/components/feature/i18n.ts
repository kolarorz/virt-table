import { faker } from '@faker-js/faker';
import {
  VirtTable,
  zhCN,
  enUS,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  vtSearch,
  vtColumnFilter,
} from '@virt-table/vanilla/plugins';

interface Row { id: number; name: string; dept: string; qty: number; price: number }

/**
 * 国际化示例：点「中文 / English」切换语言，
 * 空数据文案、合计行标签、表头排序提示、列头筛选下拉、全文搜索框
 * 均随 `table.setLocale()` 即时切换。
 */
export function bootstrapTableI18n(root: HTMLElement): () => void {
  const depts = ['工程部', '设计部', '市场部', '财务部'];
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80, sortable: true },
    { key: 'name', title: '姓名', width: 200, sortable: true },
    {
      key: 'dept',
      title: '部门',
      width: 160,
      filters: depts.map((d) => ({ label: d, value: d })),
      filterMultiple: true,
    },
    { key: 'qty', title: '数量', width: 140, align: 'right', summary: 'sum' },
    { key: 'price', title: '单价', width: 140, align: 'right', summary: 'avg' },
  ];

  const genList = (n: number): Row[] =>
    Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: faker.person.fullName(),
      dept: depts[i % depts.length],
      qty: faker.number.int({ min: 1, max: 20 }),
      price: faker.number.int({ min: 5, max: 500 }),
    }));

  let list = genList(500);

  root.innerHTML = `
    <div class="demo-hint">点下方按钮切换语言：空数据文案、合计行、排序提示、列头筛选下拉、搜索框（按 Ctrl/Cmd+F 打开）一并切换。</div>
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="btnZh">中文</button>
      <button class="virt-table-btn" id="btnEn">English</button>
      <button class="virt-table-btn" id="btnEmpty">切换空数据</button>
    </div>
    <div style="width:760px;height:460px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    showSummary: true,
    plugins: [vtColumnFilter(), vtSearch()],
    // locale 缺省即 zhCN；这里显式写出以示意
    locale: zhCN,
  });

  const q = (id: string) => root.querySelector(id) as HTMLButtonElement;
  const setActive = (active: 'zh' | 'en') => {
    q('#btnZh').classList.toggle('virt-table-btn-primary', active === 'zh');
    q('#btnEn').classList.toggle('virt-table-btn-primary', active === 'en');
  };
  q('#btnZh').onclick = () => {
    table.setLocale(zhCN);
    setActive('zh');
  };
  q('#btnEn').onclick = () => {
    table.setLocale(enUS);
    setActive('en');
  };
  let empty = false;
  q('#btnEmpty').onclick = () => {
    empty = !empty;
    list = empty ? [] : genList(500);
    table.setList(list);
  };

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
