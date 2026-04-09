import { createDemo } from './common.js';

export function bootstrapTableSpreadsheet(root) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const colCount = 26;
  const rowCount = 5000;

  const columns = [
    { key: '__index', title: '', width: 50, type: 'index', fixed: 'left' },
    ...Array.from({ length: colCount }, (_, i) => ({
      key: chars[i],
      title: chars[i],
      width: 120,
      resizable: true,
    })),
  ];

  const list = Array.from({ length: rowCount }, (_, r) => {
    const row = { id: r };
    for (let c = 0; c < colCount; c++) {
      row[chars[c]] = '';
    }
    return row;
  });
  list[0].A = 'virt-table 是一个高性能纯JS虚拟表格组件，支持合并单元格、虚拟滚动、固定列';

  return createDemo(root, {
    title: '电子表格',
    columns,
    tableOptions: {
      list,
      border: true,
      enableCellSelection: true,
      enableSearch: true,
      highlightSelectRow: true,
      highlightSelectCol: true,
    },
    statusExtra: `（${rowCount} 行 × ${colCount} 列，支持选区 + 搜索）`,
  }).cleanup;
}
