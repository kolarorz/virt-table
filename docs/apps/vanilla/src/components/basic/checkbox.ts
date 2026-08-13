import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

const COL_COUNT = 8;
const ROW_COUNT = 1000;

export function bootstrapTableCheckbox(root: HTMLElement): () => void {
  const columns: VirtTableColumn[] = [
    { key: '__checkbox', title: '', width: 50, type: 'checkbox' as const, align: 'center' },
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

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-danger" id="btnClearCheck">清空选中</button>
    </div>
    <div id="status" class="status-text" style="margin-bottom:8px;"></div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;
  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    onCheckChange: (checked, row) => {
      setStatus(
        `行 ${row.id} ${checked ? '选中' : '取消'}，共选中 ${table.getCheckedRows().length} 行`,
      );
    },
    onCheckAll: (checked) => {
      setStatus(checked ? `全选 ${table.getCheckedRows().length} 行` : '全部取消');
    },
  });

  const btnClear = root.querySelector('#btnClearCheck') as HTMLElement;
  const onClear = () => {
    table.clearCheckedRows();
    setStatus('已清空所有选中');
  };
  btnClear.addEventListener('click', onClear);

  setStatus(`复选框表格：${ROW_COUNT} 行 × ${columns.length} 列`);

  return () => {
    btnClear.removeEventListener('click', onClear);
    table.destroy();
    root.innerHTML = '';
  };
}
