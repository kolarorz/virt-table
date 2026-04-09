import { createDemo, makeColumns } from './common.js';

export function bootstrapTableIndex(root) {
  const cols = [
    { key: '__index', title: '#', width: 60, type: 'index' },
    ...makeColumns().slice(0, 8),
  ];
  return createDemo(root, {
    title: '索引列表格',
    columns: cols,
    tableOptions: { border: true },
  }).cleanup;
}
