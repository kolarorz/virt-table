import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  vtColumnDrag,
} from '@virt-table/vanilla/plugins';

interface Row { id: number; name: string; age: number; city: string; job: string }

export function bootstrapTableColumnDrag(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80, fixed: 'left' },
    { key: 'name', title: '姓名', width: 180 },
    { key: 'age', title: '年龄', width: 120 },
    { key: 'city', title: '城市', width: 180 },
    { key: 'job', title: '职位', width: 200 },
  ];

  const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    age: faker.number.int({ min: 18, max: 60 }),
    city: faker.location.city(),
    job: faker.person.jobTitle(),
  }));

  root.innerHTML = `
    <div class="demo-hint">拖拽<b>表头</b>调整列顺序（固定列 ID 不建议拖动）。顺序变化见控制台。</div>
    <div style="width:760px;height:480px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    plugins: [vtColumnDrag()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    onColumnOrderChange: (cols) => console.log('列顺序:', cols.map((c) => c.key)),
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
