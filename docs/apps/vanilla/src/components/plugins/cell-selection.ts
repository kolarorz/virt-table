import { faker } from '@faker-js/faker';
import {
  VirtTable,
} from '@virt-table/vanilla';
import {
  vtCellSelection,
} from '@virt-table/vanilla/plugins';

export function bootstrapTableCellSelection(root: HTMLElement): () => void {
  const colCount = 10;
  const rowCount = 1000;

  const columns = Array.from({ length: colCount }, (_, i) => ({
    key: `extra_${i}`,
    title: `列 ${i}`,
    width: 200,
  }));

  const list = Array.from({ length: rowCount }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < colCount; c++) {
      row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
    }
    return row;
  });

  root.innerHTML = `
    <div id="status" class="status-text"></div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable(container, {
    plugins: [vtCellSelection()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    onCellSelectionChange: (range) => {
      if (range) {
        status.textContent = `选区: 行 ${range.startRow}-${range.endRow}, 列 ${range.startCol}-${range.endCol}`;
      } else {
        status.textContent = '选区已清除';
      }
    },
  });

  status.textContent = '单元格选区（按住左键拖动选择单元格区域）';

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
