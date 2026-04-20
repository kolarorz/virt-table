import { createDemo } from '../common.js';

function rangesOverlap(r1s, c1s, r1e, c1e, r2s, c2s, r2e, c2e) {
  return r1s <= r2e && r1e >= r2s && c1s <= c2e && c1e >= c2s;
}

/**
 * Expand a selection rectangle so it fully covers all overlapping merged cells.
 * Iterates until stable — expanding for one merge may reveal overlap with another.
 */
function expandSelectionWithMerges(
  startRow,
  startCol,
  endRow,
  endCol,
  existingMerges,
) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of existingMerges) {
      const mr2 = m.rowIndex + m.rowspan - 1;
      const mc2 = m.colIndex + m.colspan - 1;
      if (
        rangesOverlap(
          m.rowIndex,
          m.colIndex,
          mr2,
          mc2,
          startRow,
          startCol,
          endRow,
          endCol,
        )
      ) {
        if (m.rowIndex < startRow) {
          startRow = m.rowIndex;
          changed = true;
        }
        if (mr2 > endRow) {
          endRow = mr2;
          changed = true;
        }
        if (m.colIndex < startCol) {
          startCol = m.colIndex;
          changed = true;
        }
        if (mc2 > endCol) {
          endCol = mc2;
          changed = true;
        }
      }
    }
  }
  return { startRow, startCol, endRow, endCol };
}

export function bootstrapTableSpreadsheet(root) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const colCount = 26;
  const rowCount = 5000;

  const columns = [
    { key: '__index', title: '', width: 50, type: 'index', fixed: 'left' },
    ...Array.from({ length: colCount }, (_, i) => ({
      key: chars[i],
      title: chars[i],
      width: 120,
      resizable: true,
    })),
  ];

  const list = Array.from({ length: rowCount }, (_, r) => {
    const row = { id: r };
    for (let c = 0; c < colCount; c++) {
      row[chars[c]] = '';
    }
    return row;
  });
  list[0].A =
    'virt-table 是一个高性能纯JS虚拟表格组件，支持合并单元格、虚拟滚动、固定列';

  let merges = [];
  let tableRef = null;
  let setStatusFn = null;

  const result = createDemo(root, {
    title: '电子表格',
    columns,
    containerWidth: 1000,
    containerHeight: 800,
    useMerges: true,
    mergesData: [{ rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 6 }],
    tableOptions: {
      list,
      border: true,
      enableCellSelection: true,
      enableSearch: true,
      contextMenu: (ctx) => {
        if (!tableRef) return null;
        const sel = ctx.selection;
        if (!sel) return null;

        const leftFixed = tableRef.leftFixedCount;
        const rawStartCol = Math.max(sel.startCol, leftFixed) - leftFixed;
        const rawEndCol = sel.endCol - leftFixed;
        if (rawEndCol < 0 || rawStartCol > rawEndCol) return null;

        const expanded = expandSelectionWithMerges(
          sel.startRow,
          rawStartCol,
          sel.endRow,
          rawEndCol,
          merges,
        );

        const rowspan = expanded.endRow - expanded.startRow + 1;
        const colspan = expanded.endCol - expanded.startCol + 1;
        const items = [];

        const overlapping = merges.filter((m) =>
          rangesOverlap(
            m.rowIndex,
            m.colIndex,
            m.rowIndex + m.rowspan - 1,
            m.colIndex + m.colspan - 1,
            expanded.startRow,
            expanded.startCol,
            expanded.endRow,
            expanded.endCol,
          ),
        );

        if (rowspan > 1 || colspan > 1) {
          items.push({
            label: `合并单元格 (${rowspan} × ${colspan})`,
            action: () => {
              merges = merges.filter((m) => !overlapping.includes(m));
              merges.push({
                rowIndex: expanded.startRow,
                colIndex: expanded.startCol,
                rowspan,
                colspan,
              });
              tableRef.setMerges([...merges]);
              tableRef.clearCellSelection();
              setStatusFn(
                `已合并: 行 ${expanded.startRow}~${expanded.endRow}, ` +
                  `列 ${chars[expanded.startCol]}~${chars[expanded.endCol]}`,
              );
            },
          });
        }

        if (overlapping.length > 0) {
          items.push({
            label: `取消合并 (${overlapping.length} 个)`,
            action: () => {
              const removeSet = new Set(overlapping);
              merges = merges.filter((m) => !removeSet.has(m));
              tableRef.setMerges([...merges]);
              tableRef.clearCellSelection();
              setStatusFn(`已取消 ${overlapping.length} 个合并区域`);
            },
          });
        }

        if (merges.length > 0) {
          items.push({
            label: '清除所有合并',
            divider: items.length > 0,
            action: () => {
              merges = [];
              tableRef.setMerges([]);
              tableRef.clearCellSelection();
              setStatusFn('已清除所有合并');
            },
          });
        }

        return items.length > 0 ? items : null;
      },
    },
    statusExtra: `（${rowCount} 行 × ${colCount} 列，支持选区 + 搜索 + 右键合并）`,
  });

  tableRef = result.table;
  setStatusFn = result.setStatus;

  return result.cleanup;
}
