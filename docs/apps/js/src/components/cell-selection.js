import { createDemo, makeColumns } from './common.js';

export function bootstrapTableCellSelection(root) {
  const { table, setStatus, cleanup } = createDemo(root, {
    title: '单元格选区',
    columns: makeColumns().slice(0, 10),
    tableOptions: {
      enableCellSelection: true,
      border: true,
      onCellSelectionChange: (range) => {
        if (range) {
          setStatus(
            `选区: 行 ${range.startRow}-${range.endRow}, 列 ${range.startCol}-${range.endCol}`,
          );
        } else {
          setStatus('选区已清除');
        }
      },
    },
    statusExtra: '（按住左键拖动选择单元格区域）',
  });
  return cleanup;
}
