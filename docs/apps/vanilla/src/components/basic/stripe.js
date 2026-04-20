import { createDemo, makeColumns } from '../common.js';

export function bootstrapTableStripe(root) {
  return createDemo(root, {
    title: '斑马纹表格',
    columns: makeColumns().slice(0, 8),
    tableOptions: { stripe: true },
  }).cleanup;
}
