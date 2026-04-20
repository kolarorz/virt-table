import { createDemo, ROW_COUNT, faker } from '../common.js';

export function bootstrapTableAlign(root) {
  const aligns = ['left', 'center', 'right'];
  const vAligns = ['top', 'middle', 'bottom'];
  const cols = Array.from({ length: 9 }, (_, i) => ({
    key: `extra_${i}`,
    title: `${aligns[i % 3]} / ${vAligns[Math.floor(i / 3)]}`,
    width: 200,
    align: aligns[i % 3],
    verticalAlign: vAligns[Math.floor(i / 3)],
  }));

  const tallRows = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row = { id: i };
    for (let c = 0; c < 9; c++) {
      row[`extra_${c}`] = c === 0 ? faker.lorem.sentences(2) : `${i}-${c}`;
    }
    return row;
  });

  return createDemo(root, {
    title: '对齐方式表格',
    columns: cols,
    tableOptions: { list: tallRows, border: true },
    statusExtra:
      '（3×3 对齐组合：水平left/center/right × 垂直top/middle/bottom）',
  }).cleanup;
}
