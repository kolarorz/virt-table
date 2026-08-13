import { faker } from '@faker-js/faker';
import { VirtTable, type MergeCell, type VirtTableColumn } from '@virt-table/vanilla';

const COL_COUNT = 30;
const ROW_COUNT = 1000;

const merges: MergeCell[] = [
  { rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 2 },
  { rowIndex: 3, colIndex: 1, rowspan: 3, colspan: 2 },
  { rowIndex: 8, colIndex: 0, rowspan: 2, colspan: 3 },
  { rowIndex: 12, colIndex: 2, rowspan: 4, colspan: 2 },
  { rowIndex: 20, colIndex: 0, rowspan: 5, colspan: 1 },
];

export function bootstrapTableFixed(root: HTMLElement): () => void {
  const columns: VirtTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => {
    const col: VirtTableColumn = { key: `col_${i}`, title: `列 ${i}`, width: 200 };
    if (i < 1) col.fixed = 'left';
    if (i >= COL_COUNT - 1) col.fixed = 'right';
    return col;
  });

  const list = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < COL_COUNT; c++) {
      row[`col_${c}`] = faker.lorem.words(6);
    }
    return row;
  });

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="btnToggleMerge">切换合并单元格</button>
    </div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  let mergeEnabled = true;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    merges,
  });

  const btnToggle = root.querySelector('#btnToggleMerge') as HTMLElement;
  const onToggle = () => {
    mergeEnabled = !mergeEnabled;
    table.setMerges(mergeEnabled ? merges : []);
  };
  btnToggle.addEventListener('click', onToggle);

  return () => {
    btnToggle.removeEventListener('click', onToggle);
    table.destroy();
    root.innerHTML = '';
  };
}
