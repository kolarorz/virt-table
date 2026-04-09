import { createDemo, makeColumns } from './common.js';
import { merges } from './merges-data.js';

export function bootstrapTableFixed(root) {
  return createDemo(root, {
    title: '冻结列',
    columns: makeColumns({ fixed: true }),
    useMerges: true,
    mergesData: merges,
    statusExtra: '（左1列固定 + 右1列固定 + 合并单元格）',
  }).cleanup;
}
