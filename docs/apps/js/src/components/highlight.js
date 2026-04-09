import { createDemo, makeColumns } from './common.js';

export function bootstrapTableHighlight(root) {
  return createDemo(root, {
    title: '高亮表格',
    columns: makeColumns().slice(0, 10),
    tableOptions: {
      highlightHoverRow: true,
      highlightSelectRow: true,
      highlightSelectCol: true,
      highlightSelectCell: true,
      border: true,
    },
    statusExtra: '（hover高亮行 + 点击选中行/列/单元格）',
  }).cleanup;
}
