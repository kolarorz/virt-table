import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';

const COL_COUNT = 8;
const ROW_COUNT = 1000;

export function bootstrapTableEmpty(root: HTMLElement): () => void {
  const columns = Array.from({ length: COL_COUNT }, (_, i) => ({
    key: `col_${i}`,
    title: `列 ${i}`,
    width: 200,
  }));

  const list = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < COL_COUNT; c++) {
      row[`col_${c}`] = faker.lorem.words(6);
    }
    return row;
  });

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-warning" id="btnToggleEmpty">切换空/有数据</button>
    </div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;
  const container = root.querySelector('#tableContainer') as HTMLElement;

  const table = new VirtTable(container, {
    list: [],
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    emptyText: '暂无数据',
  });

  let isEmpty = true;
  const btnToggle = root.querySelector('#btnToggleEmpty') as HTMLButtonElement;
  const onToggle = () => {
    isEmpty = !isEmpty;
    table.setList(isEmpty ? [] : list);
  };
  btnToggle.addEventListener('click', onToggle);

  return () => {
    btnToggle.removeEventListener('click', onToggle);
    table.destroy();
    root.innerHTML = '';
  };
}
