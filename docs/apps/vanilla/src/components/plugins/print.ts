import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtExport } from '@virt-table/vanilla/plugins';

interface Row { id: number; name: string; city: string; score: number }

export function bootstrapTablePrint(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 220 },
    { key: 'city', title: '城市', width: 220 },
    { key: 'score', title: '分数', width: 120 },
  ];

  const list: Row[] = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    city: faker.location.city(),
    score: faker.number.int({ min: 0, max: 100 }),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="print">打印表格</button>
      <span class="demo-note">会打开新窗口输出全表（内联样式）</span>
    </div>
    <div style="width:660px;height:460px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    plugins: [vtExport()],
  });

  (root.querySelector('#print') as HTMLButtonElement).onclick = () =>
    table.print({ title: '人员清单' });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
