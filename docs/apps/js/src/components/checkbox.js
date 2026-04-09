import { createDemo, makeColumns } from './common.js';

export function bootstrapTableCheckbox(root) {
  const cols = [
    { key: '__checkbox', title: '', width: 50, type: 'checkbox' },
    ...makeColumns().slice(0, 8),
  ];
  const { table, on, setStatus, cleanup } = createDemo(root, {
    title: '复选框表格',
    columns: cols,
    tableOptions: {
      onCheckChange: (checked, row) => {
        setStatus(
          `行 ${row.id} ${checked ? '选中' : '取消'}，共选中 ${table.getCheckedRows().length} 行`,
        );
      },
      onCheckAll: (checked) => {
        setStatus(
          checked ? `全选 ${table.getCheckedRows().length} 行` : '全部取消',
        );
      },
      border: true,
    },
    extraButtons:
      '<button class="virt-table-btn" id="btnClearCheck" style="background:#ef4444;color:#fff;">清空选中</button>',
  });

  on('btnClearCheck', () => {
    table.clearCheckedRows();
    setStatus('已清空所有选中');
  });

  return cleanup;
}
