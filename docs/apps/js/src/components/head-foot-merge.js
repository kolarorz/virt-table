import { createDemo } from './common.js';

export function bootstrapTableHeadFootMerge(root) {
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
    ['个人信息', '', '', '成绩', '', '', '备注', '', '', ''],
    ['姓名', '年龄', '性别', '语文', '数学', '英语', '评语1', '评语2', '评语3', '总评'],
  ];
  const headerMerges = [
    { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 6, rowspan: 1, colspan: 4 },
  ];

  const footerData = [['', '', '', '合计', '', '', '', '', '', '总计']];
  const footerMerges = [
    { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 6 },
  ];

  return createDemo(root, {
    title: '表头 + 表尾合并',
    columns,
    tableOptions: {
      list,
      headerData,
      headerMerges,
      footerData,
      footerMerges,
      border: true,
    },
    statusExtra: '（分组表头 + 汇总表尾）',
  }).cleanup;
}
