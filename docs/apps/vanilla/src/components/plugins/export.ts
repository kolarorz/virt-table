import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  vtExport,
  vtCellSelection,
} from '@virt-table/vanilla/plugins';

interface Row { id: number; name: string; email: string; city: string; score: number }

export function bootstrapTableExport(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 180 },
    { key: 'email', title: '邮箱', width: 240 },
    { key: 'city', title: '城市', width: 160 },
    { key: 'score', title: '分数', width: 120 },
  ];

  const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    city: faker.location.city(),
    score: faker.number.int({ min: 0, max: 100 }),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="csvAll">导出 CSV（全表）</button>
      <button class="virt-table-btn" id="xlsAll">导出 Excel（全表）</button>
      <button class="virt-table-btn" id="csvSel">导出 CSV（当前选区）</button>
      <span class="demo-note">框选若干单元格后可只导出选区</span>
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
    plugins: [vtCellSelection(), vtExport()],
  });

  const q = (id: string) => root.querySelector(id) as HTMLButtonElement;
  q('#csvAll').onclick = () => table.exportCsv({ filename: '全表.csv' });
  q('#xlsAll').onclick = () => table.exportExcel({ filename: '全表.xls' });
  q('#csvSel').onclick = () => table.exportCsv({ filename: '选区.csv', scope: 'selection' });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
