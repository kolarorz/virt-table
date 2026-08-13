import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  vtRowDrag,
} from '@virt-table/vanilla/plugins';

interface Row { id: number; name: string; city: string; score: number }

export function bootstrapTableRowDrag(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'drag', title: '', width: 50, type: 'drag', fixed: 'left' },
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 200 },
    { key: 'city', title: '城市', width: 200 },
    { key: 'score', title: '分数', width: 120 },
  ];

  const list: Row[] = Array.from({ length: 300 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    city: faker.location.city(),
    score: faker.number.int({ min: 0, max: 100 }),
  }));

  root.innerHTML = `
    <div class="demo-hint">拖拽行首的 <b>⣿ 手柄</b> 调整行顺序（拖到视口边缘会自动滚动）。仅扁平数据、未排序/筛选时生效。</div>
    <div style="width:660px;height:480px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    plugins: [vtRowDrag()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    onRowOrderChange: (_list, from, to) => console.log(`行 ${from} → ${to}`),
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
