import { createDemo, makeColumns } from '../common.js';

export function bootstrapTableResize(root) {
  return createDemo(root, {
    title: '列宽拖拽表格',
    columns: makeColumns({ resizable: true }).slice(0, 10),
    statusExtra: '（拖拽表头右侧边缘调整列宽）',
    tableOptions: { border: true },
  }).cleanup;
}
