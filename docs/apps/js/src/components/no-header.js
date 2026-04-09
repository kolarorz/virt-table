import { createDemo, makeColumns } from './common.js';

export function bootstrapTableNoHeader(root) {
  return createDemo(root, {
    title: '无表头表格',
    columns: makeColumns().slice(0, 8),
    tableOptions: { showHeader: false },
  }).cleanup;
}
