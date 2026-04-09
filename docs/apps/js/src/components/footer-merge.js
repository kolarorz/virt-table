import { createDemo, faker } from './common.js';

export function bootstrapTableFooterMerge(root) {
  const colCount = 8;
  const columns = Array.from({ length: colCount }, (_, i) => ({
    key: `col_${i}`,
    title: i === 0 ? '名称' : i < 4 ? `Q${i}` : `指标 ${i - 3}`,
    width: i === 0 ? 180 : 140,
  }));

  const list = Array.from({ length: 100 }, (_, i) => {
    const row = { id: i, col_0: faker.person.fullName() };
    for (let c = 1; c < colCount; c++) {
      row[`col_${c}`] = String(Math.floor(Math.random() * 1000));
    }
    return row;
  });

  const footerData = [
    ['合计', '', '', '', '100', '200', '300', '400'],
    ['平均', '', '', '', '25', '50', '75', '100'],
  ];
  const footerMerges = [
    { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 4 },
    { rowIndex: 1, colIndex: 0, rowspan: 1, colspan: 4 },
  ];

  return createDemo(root, {
    title: '表尾合并',
    columns,
    tableOptions: { list, footerData, footerMerges, border: true },
    statusExtra: '（两行表尾 + 合计/平均跨列合并）',
  }).cleanup;
}
