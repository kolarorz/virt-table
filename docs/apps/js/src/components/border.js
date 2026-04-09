import { createDemo, makeColumns } from './common.js';

export function bootstrapTableBorder(root) {
  return createDemo(root, {
    title: '边框表格',
    columns: makeColumns().slice(0, 8),
    tableOptions: { border: true },
  }).cleanup;
}
