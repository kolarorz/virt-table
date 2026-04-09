import { createDemo, makeColumns, ROW_COUNT, faker } from './common.js';

export function bootstrapTableOverflow(root) {
  const longRows = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row = { id: i };
    for (let c = 0; c < 8; c++) {
      row[`extra_${c}`] = faker.lorem.sentences(3);
    }
    return row;
  });
  return createDemo(root, {
    title: '溢出隐藏表格',
    columns: makeColumns().slice(0, 8),
    tableOptions: { list: longRows, textOverflow: 'ellipsis', border: true },
    statusExtra: '（文本超出隐藏，显示省略号）',
  }).cleanup;
}
