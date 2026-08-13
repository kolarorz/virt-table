import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  vtColumnFilter,
} from '@virt-table/vanilla/plugins';

interface Row { id: number; name: string; age: number; date: string; city: string }

export function bootstrapTableRichFilter(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名（关键字）', width: 200, filterType: 'text' },
    { key: 'age', title: '年龄（区间）', width: 180, filterType: 'number-range' },
    { key: 'date', title: '入职日期（区间）', width: 220, filterType: 'date-range' },
    { key: 'city', title: '城市', width: 160 },
  ];

  const list: Row[] = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    age: faker.number.int({ min: 18, max: 65 }),
    date: faker.date.between({ from: '2020-01-01', to: '2024-12-31' }).toISOString().slice(0, 10),
    city: faker.location.city(),
  }));

  root.innerHTML = `
    <div class="demo-hint">点击表头筛选图标：姓名支持<b>关键字</b>、年龄支持<b>数值区间</b>、日期支持<b>日期区间</b>。</div>
    <div style="width:840px;height:460px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    plugins: [vtColumnFilter()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    onFilterChange: (f) => console.log('筛选:', f),
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
