import { createDemo } from './common.js';

export function bootstrapTableHeaderMerge(root) {
  const colCount = 10;
  const columns = Array.from({ length: colCount }, (_, i) => ({
    key: `col_${i}`,
    title: `Col ${i}`,
    width: 150,
  }));

  const list = Array.from({ length: 200 }, (_, i) => {
    const row = { id: i };
    for (let c = 0; c < colCount; c++) {
      row[`col_${c}`] = `${i}-${c}`;
    }
    return row;
  });

  const headerData = [
    ['基本信息', '', '', '评分信息', '', '', '其他', '', '', ''],
    ['Col 0', 'Col 1', 'Col 2', 'Col 3', 'Col 4', 'Col 5', 'Col 6', 'Col 7', 'Col 8', 'Col 9'],
  ];
  const headerMerges = [
    { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 6, rowspan: 1, colspan: 4 },
  ];

  return createDemo(root, {
    title: '表头合并',
    columns,
    tableOptions: { list, headerData, headerMerges, border: true },
    statusExtra: '（两行表头 + 三个分组合并）',
  }).cleanup;
}
