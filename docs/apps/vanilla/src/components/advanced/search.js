import { createDemo, makeColumns } from '../common.js';

export function bootstrapTableSearch(root) {
  return createDemo(root, {
    title: '表格搜索',
    columns: makeColumns().slice(0, 10),
    tableOptions: {
      enableSearch: true,
      border: true,
    },
    statusExtra: '（点击表格区域后按 Cmd/Ctrl+F 打开搜索）',
  }).cleanup;
}
