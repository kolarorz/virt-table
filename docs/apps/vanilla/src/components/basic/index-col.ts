import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

const COL_COUNT = 8;
const ROW_COUNT = 1000;

export function bootstrapTableIndex(root: HTMLElement): () => void {
  const columns: VirtTableColumn[] = [
    { key: '__index', title: '#', width: 60, type: 'index' as const, align: 'center' },
    ...Array.from({ length: COL_COUNT }, (_, i) => ({
      key: `col_${i}`,
      title: `列 ${i}`,
      width: 200,
    })),
  ];

  const list = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < COL_COUNT; c++) {
      row[`col_${c}`] = faker.lorem.words(6);
    }
    return row;
  });

  root.innerHTML = '<div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>';
  const container = root.querySelector('#tableContainer') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
