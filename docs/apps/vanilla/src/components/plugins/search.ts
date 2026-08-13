import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';
import { vtSearch } from '@virt-table/vanilla/plugins';

export function bootstrapTableSearch(root: HTMLElement): () => void {
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

  root.innerHTML = '<div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>';
  const container = root.querySelector('#tableContainer') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    plugins: [vtSearch()],
    border: true,
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
