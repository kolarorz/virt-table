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

export function bootstrapTableMerge(root: HTMLElement): () => void {
  const columns: VirtTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
    key: `extra_${i}`,
    title: `列 ${i}`,
    width: 200,
  }));

  const list = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < COL_COUNT; c++) {
      row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
    }
    return row;
  });

  root.innerHTML = `
  <div class="virt-table-controls">
    <button class="virt-table-btn virt-table-btn-primary" id="btnToggleMerge">切换合并单元格</button>
  </div>
  <div id="status" class="status-text"></div>
  <div style="width:800px;height:600px;" class="demo-container" id="virtTableContainer"></div>
`;

  const container = root.querySelector('#virtTableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;
  const listeners: (() => void)[] = [];
  let mergeEnabled = true;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    merges,
    highlightSelectRow: true,
    highlightSelectCol: true,
    highlightSelectCell: true,
    border: true,
    showHeader: false,
  });

  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const on = (id: string, handler: () => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnToggleMerge', () => {
    mergeEnabled = !mergeEnabled;
    table.setMerges(mergeEnabled ? merges : []);
    setStatus(mergeEnabled ? '合并单元格已启用' : '合并单元格已关闭');
  });

  setStatus(`表身合并：${ROW_COUNT} 行 × ${COL_COUNT} 列`);

  return () => {
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
