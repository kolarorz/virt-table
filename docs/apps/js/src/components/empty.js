import { createDemo, makeColumns, rows } from './common.js';

export function bootstrapTableEmpty(root) {
  let isEmpty = true;
  const { table, on, setStatus, cleanup } = createDemo(root, {
    title: '空态表格',
    columns: makeColumns().slice(0, 8),
    tableOptions: { list: [], emptyText: '暂无数据' },
    extraButtons:
      '<button class="virt-table-btn" id="btnToggleEmpty" style="background:#f59e0b;color:#fff;">切换空/有数据</button>',
  });

  on('btnToggleEmpty', () => {
    isEmpty = !isEmpty;
    table.setList(isEmpty ? [] : rows);
    setStatus(isEmpty ? '当前为空态' : `已加载 ${rows.length} 行数据`);
  });

  return cleanup;
}
