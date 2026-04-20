import { createDemo, makeColumns, ROW_COUNT, faker } from '../common.js';

export function bootstrapTableWrap(root) {
  const longRows = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row = { id: i };
    for (let c = 0; c < 8; c++) {
      row[`extra_${c}`] = faker.lorem.sentences(3);
    }
    return row;
  });
  return createDemo(root, {
    title: '自动换行表格',
    columns: makeColumns().slice(0, 8),
    tableOptions: { list: longRows, border: true },
    statusExtra: '（默认自动换行，高度自适应）',
  }).cleanup;
}
