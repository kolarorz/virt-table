import { createDemo, makeColumns } from './common.js';

export function bootstrapTableBasic(root) {
  return createDemo(root, { title: '基础表格', columns: makeColumns() }).cleanup;
}
