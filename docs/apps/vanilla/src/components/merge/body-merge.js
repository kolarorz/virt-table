import { createDemo, makeColumns } from '../common.js';
import { merges } from '../merges-data.js';

export function bootstrapTableMerge(root) {
  return createDemo(root, {
    title: '表身合并',
    columns: makeColumns(),
    useMerges: true,
    mergesData: merges,
    tableOptions: {
      highlightSelectRow: true,
      highlightSelectCol: true,
      highlightSelectCell: true,
      border: true,
      showHeader: false,
    },
  }).cleanup;
}
