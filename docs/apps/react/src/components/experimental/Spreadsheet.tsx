import React from 'react';
import {
  VirtTableReact,
  vtContextMenu,
  vtClipboard,
  vtSearch,
  type ReactTableColumn,
  type VirtTableRef,
  type ContextMenuContext,
  type ContextMenuItem,
  vtCellEditor,
  vtCellSelection,
} from '@virt-table/react';
import {
  type MergeCell,
  type SpreadsheetCellData,
  type SpreadsheetClipboardPayload,
  createSpreadsheetClipboardHandlers,
  renderSpreadsheetCellHtml,
  setSpreadsheetCellData,
} from '@virt-table/vanilla';

type SpreadsheetRow = Record<string, unknown> & {
  id: number | string;
  _sheetCells?: Record<string, SpreadsheetCellData>;
};

// ─── Feishu types ───

interface FeishuRichTextSegment {
  text: string;
  style?: {
    font_size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    underline?: boolean;
    strikethrough?: boolean;
  };
}

interface FeishuCellStyle {
  align?: 'LEFT' | 'CENTER' | 'RIGHT';
  valign?: 'TOP' | 'MIDDLE' | 'BOTTOM';
  bg_color?: string;
  bold?: boolean;
  italic?: boolean;
  font_size?: number;
  color?: string;
}

interface FeishuCell {
  value?: string | number | boolean | null;
  rich_text?: FeishuRichTextSegment[];
  style?: FeishuCellStyle;
}

interface FeishuMergeInfo {
  start_row: number;
  start_col: number;
  end_row: number;
  end_col: number;
}

interface FeishuSheet {
  sheet_id: string;
  title: string;
  row_count: number;
  col_count: number;
  col_widths?: Record<string, number>;
  merge_info_list?: FeishuMergeInfo[];
  cells: Record<string, Record<string, FeishuCell>>;
}

// ─── helpers ───

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function colIndexToKey(i: number): string {
  let name = '';
  let n = i;
  while (n >= 0) {
    name = CHARS[n % 26] + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function richTextToHtml(segments: FeishuRichTextSegment[]): string {
  return segments.map((seg) => {
    const parts: string[] = [];
    const s = seg.style;
    if (s?.font_size) parts.push(`font-size:${s.font_size}px`);
    if (s?.bold) parts.push('font-weight:700');
    if (s?.italic) parts.push('font-style:italic');
    if (s?.color) parts.push(`color:${s.color}`);
    const deco: string[] = [];
    if (s?.underline) deco.push('underline');
    if (s?.strikethrough) deco.push('line-through');
    if (deco.length) parts.push(`text-decoration:${deco.join(' ')}`);
    const style = parts.length ? ` style="${parts.join(';')}"` : '';
    return `<span${style}>${escapeHtml(seg.text)}</span>`;
  }).join('');
}

function feishuCellToSpreadsheetCell(cell: FeishuCell): SpreadsheetCellData {
  let result: SpreadsheetCellData;
  if (cell.rich_text?.length) {
    result = {
      type: 'rich-text',
      value: cell.value != null ? String(cell.value) : cell.rich_text.map((s) => s.text).join(''),
      richTextHtml: richTextToHtml(cell.rich_text),
    };
  } else {
    const v = cell.value;
    if (v == null) {
      result = { type: 'text', value: '' };
    } else {
      const s = cell.style;
      if (s && (s.bold || s.italic || s.font_size || s.color)) {
        const parts: string[] = [];
        if (s.bold) parts.push('font-weight:700');
        if (s.italic) parts.push('font-style:italic');
        if (s.font_size) parts.push(`font-size:${s.font_size}px`);
        if (s.color) parts.push(`color:${s.color}`);
        result = {
          type: 'rich-text',
          value: String(v),
          richTextHtml: `<span style="${parts.join(';')}">${escapeHtml(String(v))}</span>`,
        };
      } else {
        result = { type: 'text', value: String(v) };
      }
    }
  }
  const s = cell.style;
  if (s?.bg_color) result.bgColor = s.bg_color;
  if (s?.align) result.textAlign = s.align.toLowerCase();
  if (s?.valign) result.vAlign = s.valign.toLowerCase() as SpreadsheetCellData['vAlign'];
  return result;
}

function rangesOverlap(r1s: number, c1s: number, r1e: number, c1e: number, r2s: number, c2s: number, r2e: number, c2e: number) {
  return r1s <= r2e && r1e >= r2s && c1s <= c2e && c1e >= c2s;
}

function expandSelectionWithMerges(startRow: number, startCol: number, endRow: number, endCol: number, existingMerges: MergeCell[]) {
  let sr = startRow; let sc = startCol; let er = endRow; let ec = endCol;
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of existingMerges) {
      const mr2 = m.rowIndex + m.rowspan - 1;
      const mc2 = m.colIndex + m.colspan - 1;
      if (rangesOverlap(m.rowIndex, m.colIndex, mr2, mc2, sr, sc, er, ec)) {
        if (m.rowIndex < sr) { sr = m.rowIndex; changed = true; }
        if (mr2 > er) { er = mr2; changed = true; }
        if (m.colIndex < sc) { sc = m.colIndex; changed = true; }
        if (mc2 > ec) { ec = mc2; changed = true; }
      }
    }
  }
  return { startRow: sr, startCol: sc, endRow: er, endCol: ec };
}

// ─── data ───

const FEISHU_SHEET: FeishuSheet = {
  sheet_id: 'sheet_1',
  title: '数据总表',
  row_count: 500,
  col_count: 26,
  col_widths: { '0': 160, '1': 80, '2': 200, '3': 120, '4': 120, '5': 180, '6': 100, '7': 120, '8': 100 },
  merge_info_list: [
    { start_row: 0, start_col: 0, end_row: 0, end_col: 8 },
    { start_row: 2, start_col: 0, end_row: 4, end_col: 0 },
    { start_row: 5, start_col: 0, end_row: 7, end_col: 0 },
    { start_row: 8, start_col: 0, end_row: 9, end_col: 0 },
    { start_row: 11, start_col: 1, end_row: 11, end_col: 8 },
  ],
  cells: {
    '0': {
      '0': {
        value: '2026年Q2 项目排期台账',
        rich_text: [
          { text: '2026年Q2', style: { font_size: 16, bold: true, color: '#1F2937' } },
          { text: ' 项目排期台账', style: { font_size: 14, color: '#2563EB' } },
        ],
        style: { align: 'CENTER', valign: 'MIDDLE', bg_color: '#F3F4F6' },
      },
    },
    '1': {
      '0': { value: '需求模块', style: { bold: true, bg_color: '#EFF6FF', align: 'CENTER' } },
      '1': { value: '优先级', style: { bold: true, bg_color: '#EFF6FF', align: 'CENTER' } },
      '2': { value: '任务分解', style: { bold: true, bg_color: '#EFF6FF' } },
      '3': { value: '产研负责人', style: { bold: true, bg_color: '#EFF6FF' } },
      '4': { value: '研发负责人', style: { bold: true, bg_color: '#EFF6FF' } },
      '5': { value: '需求/技术文档', style: { bold: true, bg_color: '#EFF6FF' } },
      '6': { value: '是否验收', style: { bold: true, bg_color: '#EFF6FF', align: 'CENTER' } },
      '7': { value: '截止时间', style: { bold: true, bg_color: '#EFF6FF' } },
      '8': { value: '进度', style: { bold: true, bg_color: '#EFF6FF', align: 'CENTER' } },
    },
    '2': {
      '0': { value: '北单专项 1', style: { bold: true, bg_color: '#F0F9FF' } },
      '1': { value: 'P0', rich_text: [{ text: 'P0', style: { bold: true, color: '#DC2626' } }], style: { align: 'CENTER', bg_color: '#FEF2F2' } },
      '2': { value: '渠道改造 V2.0', rich_text: [{ text: '渠道改造', style: { bold: true, color: '#059669' } }, { text: ' V2.0', style: { color: '#6B7280' } }] },
      '3': { value: '李炎杰' },
      '4': { value: '余兴达' },
      '5': { value: '需求评审通过，接口文档已同步', rich_text: [{ text: '需求评审通过', style: { color: '#059669' } }, { text: '，接口文档已同步', style: { color: '#6B7280' } }] },
      '6': { value: '✓', style: { color: '#059669', align: 'CENTER' } },
      '7': { value: '2026-12-15' },
      '8': { value: '75%', style: { align: 'CENTER', color: '#059669' } },
    },
    '3': {
      '1': { value: 'P1', rich_text: [{ text: 'P1', style: { bold: true, color: '#D97706' } }], style: { align: 'CENTER', bg_color: '#FFFBEB' } },
      '2': { value: '能力校验模块' },
      '3': { value: '马小波' },
      '4': { value: '罗小龙' },
      '5': { value: '接口已联调', style: { color: '#6B7280' } },
      '6': { value: '✗', style: { color: '#DC2626', align: 'CENTER' } },
      '7': { value: '2026-12-20' },
      '8': { value: '40%', style: { align: 'CENTER', color: '#D97706' } },
    },
    '4': {
      '1': { value: 'P0', rich_text: [{ text: 'P0', style: { bold: true, color: '#DC2626' } }], style: { align: 'CENTER', bg_color: '#FEF2F2' } },
      '2': { value: '生产发布与灰度', rich_text: [{ text: '生产发布', style: { bold: true } }, { text: '与灰度', style: { color: '#9CA3AF', italic: true } }] },
      '3': { value: '曾伟杰' },
      '4': { value: '马国涛' },
      '5': { value: '发布窗口已确认' },
      '6': { value: '✓', style: { color: '#059669', align: 'CENTER' } },
      '7': { value: '2026-12-27' },
      '8': { value: '60%', style: { align: 'CENTER' } },
    },
    '5': {
      '0': { value: '北单专项 2', style: { bold: true, bg_color: '#F0FDF4' } },
      '1': { value: 'P0', rich_text: [{ text: 'P0', style: { bold: true, color: '#DC2626' } }], style: { align: 'CENTER', bg_color: '#FEF2F2' } },
      '2': { value: '主流程改造' },
      '3': { value: '曾伟杰' },
      '4': { value: '马国涛' },
      '5': { value: '流程图已确认，PRD 评审中', rich_text: [{ text: '流程图已确认', style: { color: '#059669' } }, { text: '，PRD 评审中', style: { color: '#D97706' } }] },
      '6': { value: '✓', style: { color: '#059669', align: 'CENTER' } },
      '7': { value: '2026-12-25' },
      '8': { value: '90%', style: { align: 'CENTER', color: '#059669', bold: true } },
    },
    '6': {
      '1': { value: 'P2', rich_text: [{ text: 'P2', style: { bold: true, color: '#2563EB' } }], style: { align: 'CENTER', bg_color: '#EFF6FF' } },
      '2': { value: '体验优化' },
      '3': { value: '万明悦' },
      '4': { value: '马国涛' },
      '5': { value: '交互稿已评审', style: { color: '#6B7280' } },
      '6': { value: '✗', style: { color: '#DC2626', align: 'CENTER' } },
      '7': { value: '2027-01-10' },
      '8': { value: '15%', style: { align: 'CENTER', color: '#DC2626' } },
    },
    '7': {
      '1': { value: 'P1', rich_text: [{ text: 'P1', style: { bold: true, color: '#D97706' } }], style: { align: 'CENTER', bg_color: '#FFFBEB' } },
      '2': { value: '压测与回归' },
      '3': { value: '贾小铭' },
      '4': { value: '余兴达' },
      '5': { value: '压测报告待同步', style: { color: '#D97706' } },
      '6': { value: '✗', style: { color: '#DC2626', align: 'CENTER' } },
      '7': { value: '2026-12-28' },
      '8': { value: '50%', style: { align: 'CENTER' } },
    },
    '8': {
      '0': { value: '北单专项 3', style: { bold: true, bg_color: '#FFF7ED' } },
      '1': { value: 'P0', rich_text: [{ text: 'P0', style: { bold: true, color: '#DC2626' } }], style: { align: 'CENTER', bg_color: '#FEF2F2' } },
      '2': { value: '新功能接入', rich_text: [{ text: '新功能接入', style: { bold: true, color: '#7C3AED' } }] },
      '3': { value: '曾伟杰' },
      '4': { value: '马国涛' },
      '5': { value: '方案评审完成，排期确认', rich_text: [{ text: '方案评审完成', style: { color: '#059669', bold: true } }, { text: '，排期确认', style: { color: '#6B7280' } }] },
      '6': { value: '✓', style: { color: '#059669', align: 'CENTER' } },
      '7': { value: '2026-12-30' },
      '8': { value: '85%', style: { align: 'CENTER', color: '#059669' } },
    },
    '9': {
      '1': { value: 'P1', rich_text: [{ text: 'P1', style: { bold: true, color: '#D97706' } }], style: { align: 'CENTER', bg_color: '#FFFBEB' } },
      '2': { value: '埋点验收' },
      '3': { value: '罗小龙' },
      '4': { value: '余兴达' },
      '5': { value: '埋点字典待确认', style: { color: '#D97706' } },
      '6': { value: '✗', style: { color: '#DC2626', align: 'CENTER' } },
      '7': { value: '2027-01-05' },
      '8': { value: '20%', style: { align: 'CENTER', color: '#DC2626' } },
    },
    '11': {
      '0': { value: '说明', rich_text: [{ text: '💡 说明', style: { bold: true, color: '#2563EB' } }] },
      '1': {
        value: '本表格数据基于飞书电子表格数据结构',
        rich_text: [
          { text: '本表格数据基于', style: { color: '#6B7280' } },
          { text: '飞书电子表格数据结构', style: { bold: true, color: '#2563EB' } },
          { text: '（稀疏 cells + rich_text + merge_info_list），', style: { color: '#6B7280' } },
          { text: '支持选区复制粘贴', style: { bold: true, color: '#059669' } },
          { text: '并保留单元格类型与合并信息。', style: { color: '#6B7280' } },
        ],
      },
    },
  },
};

function convertFeishuSheet(sheet: FeishuSheet) {
  const colCount = sheet.col_count;

  const columns: ReactTableColumn[] = [
    { key: '__index', title: '', width: 50, type: 'index', fixed: 'left', align: 'center' },
    ...Array.from({ length: colCount }, (_, i) => {
      const key = colIndexToKey(i);
      const w = sheet.col_widths?.[String(i)];
      return {
        key,
        title: key,
        width: w ?? 120,
        resizable: true,
        render: ({ row, column }: { row: Record<string, unknown>; column: { key: string } }) => {
          const cell = (row as SpreadsheetRow)._sheetCells?.[column.key];
          return cell ? renderSpreadsheetCellHtml(cell) : escapeHtml(String(row[column.key] ?? ''));
        },
      } satisfies ReactTableColumn;
    }),
  ];

  const list: SpreadsheetRow[] = Array.from({ length: sheet.row_count }, (_, r) => {
    const row: SpreadsheetRow = { id: r, _sheetCells: {} };
    for (let c = 0; c < colCount; c++) row[colIndexToKey(c)] = '';
    return row;
  });

  for (const [rowStr, cols] of Object.entries(sheet.cells)) {
    const r = Number(rowStr);
    const row = list[r];
    if (!row) continue;
    for (const [colStr, cell] of Object.entries(cols)) {
      const c = Number(colStr);
      const key = colIndexToKey(c);
      setSpreadsheetCellData(row, key, feishuCellToSpreadsheetCell(cell));
    }
  }

  const merges: MergeCell[] = (sheet.merge_info_list ?? []).map((m) => ({
    rowIndex: m.start_row,
    colIndex: m.start_col,
    rowspan: m.end_row - m.start_row + 1,
    colspan: m.end_col - m.start_col + 1,
  }));

  const cellStyle = (_col: ReactTableColumn, row: Record<string, unknown>) => {
    const cell = (row as SpreadsheetRow)._sheetCells?.[_col.key];
    if (!cell) return '';
    const parts: string[] = [];
    if (cell.bgColor) parts.push(`background-color:${cell.bgColor}`);
    if (cell.textAlign) parts.push(`text-align:${cell.textAlign}`);
    if (cell.vAlign) parts.push(`vertical-align:${cell.vAlign}`);
    return parts.join(';');
  };

  return { columns, list, merges, cellStyle, colCount };
}

// ─── undo/redo ───

interface CellSnapshot {
  rowIndex: number;
  colKey: string;
  displayValue: unknown;
  cellData: SpreadsheetCellData | null;
}

interface UndoEntry {
  label: string;
  cellsBefore: CellSnapshot[];
  cellsAfter: CellSnapshot[];
  mergesBefore: MergeCell[];
  mergesAfter: MergeCell[];
}

const tableData = convertFeishuSheet(FEISHU_SHEET);

export default function SpreadsheetTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const mergeStateRef = React.useRef<MergeCell[]>([...tableData.merges]);
  const undoStackRef = React.useRef<UndoEntry[]>([]);
  const redoStackRef = React.useRef<UndoEntry[]>([]);
  const [status, setStatus] = React.useState(
    `飞书数据结构电子表格：${FEISHU_SHEET.row_count} 行 × ${FEISHU_SHEET.col_count} 列（支持选区复制粘贴 + 撤销重做）`,
  );
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);

  function snapshotCell(row: SpreadsheetRow, colKey: string): CellSnapshot {
    return {
      rowIndex: row.id as number,
      colKey,
      displayValue: row[colKey],
      cellData: row._sheetCells?.[colKey] ? { ...row._sheetCells[colKey] } : null,
    };
  }

  function restoreCells(snapshots: CellSnapshot[]) {
    for (const snap of snapshots) {
      const row = tableData.list[snap.rowIndex];
      if (!row) continue;
      if (snap.cellData) {
        setSpreadsheetCellData(row, snap.colKey, snap.cellData);
      } else {
        row[snap.colKey] = snap.displayValue;
        if (row._sheetCells) delete row._sheetCells[snap.colKey];
      }
    }
  }

  function pushUndo(entry: UndoEntry) {
    undoStackRef.current.push(entry);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    forceRender();
  }

  function applyUndoRedo(entry: UndoEntry, direction: 'undo' | 'redo') {
    const cells = direction === 'undo' ? entry.cellsBefore : entry.cellsAfter;
    const m = direction === 'undo' ? entry.mergesBefore : entry.mergesAfter;
    restoreCells(cells);
    mergeStateRef.current = [...m];
    tableRef.current?.setMerges([...m]);
    const t = tableRef.current?.getTable() as { setList?: (l: SpreadsheetRow[]) => void; forceUpdate?: () => void } | null;
    t?.setList?.([...tableData.list]);
    t?.forceUpdate?.();
  }

  const undo = React.useCallback(() => {
    const entry = undoStackRef.current.pop();
    if (!entry) return;
    applyUndoRedo(entry, 'undo');
    redoStackRef.current.push(entry);
    setStatus(`撤销: ${entry.label}`);
    forceRender();
  }, []);

  const redo = React.useCallback(() => {
    const entry = redoStackRef.current.pop();
    if (!entry) return;
    applyUndoRedo(entry, 'redo');
    undoStackRef.current.push(entry);
    setStatus(`重做: ${entry.label}`);
    forceRender();
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const currentColCountRef = React.useRef(tableData.colCount);

  const makeRenderEditor = React.useCallback(() => {
    return ({ value, row, column }: any) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = String(value ?? '');
      input.style.cssText = 'width:100%;height:100%;box-sizing:border-box;border:2px solid #2563eb;outline:none;padding:0 6px;font-size:inherit;';
      const oldValue = String(value ?? '');
      const commit = () => {
        const newValue = input.value;
        if (newValue !== oldValue) {
          const colKey = column.key;
          const cellBefore = snapshotCell(row as SpreadsheetRow, colKey);
          setSpreadsheetCellData(row as SpreadsheetRow, colKey, { type: 'text', value: newValue });
          const cellAfter = snapshotCell(row as SpreadsheetRow, colKey);
          pushUndo({ label: '编辑', cellsBefore: [cellBefore], cellsAfter: [cellAfter], mergesBefore: [...mergeStateRef.current], mergesAfter: [...mergeStateRef.current] });
          const t = tableRef.current?.getTable() as { setList?: (l: SpreadsheetRow[]) => void; forceUpdate?: () => void } | null;
          t?.setList?.([...tableData.list]);
          t?.forceUpdate?.();
        }
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = oldValue; input.blur(); }
        e.stopPropagation();
      });
      setTimeout(() => input.focus(), 0);
      return input;
    };
  }, []);

  React.useEffect(() => {
    for (const col of tableData.columns) {
      if (col.key !== '__index' && !(col as any).renderEditor) {
        (col as any).renderEditor = makeRenderEditor();
      }
    }
  }, [makeRenderEditor]);

  const clipboardHooks = React.useMemo(() => {
    const hooks = createSpreadsheetClipboardHandlers<SpreadsheetRow>({
      columns: tableData.columns as any[],
      getMerges: () => mergeStateRef.current,
      setMerges: (next) => {
        mergeStateRef.current = next;
        tableRef.current?.setMerges([...mergeStateRef.current]);
      },
      createRow: (idx) => {
        const row: SpreadsheetRow = { id: idx, _sheetCells: {} };
        for (let c = 0; c < currentColCountRef.current; c++) row[colIndexToKey(c)] = '';
        return row;
      },
      mergeColumnOffset: 1,
      addColumns: (count: number) => {
        const newCols: ReactTableColumn[] = [];
        for (let i = 0; i < count; i++) {
          const colIdx = currentColCountRef.current + i;
          const key = colIndexToKey(colIdx);
          const col: ReactTableColumn = {
            key,
            title: key,
            width: 120,
            resizable: true,
            render: ({ row, column }: { row: Record<string, unknown>; column: { key: string } }) => {
              const cell = (row as SpreadsheetRow)._sheetCells?.[column.key];
              return cell ? renderSpreadsheetCellHtml(cell) : escapeHtml(String(row[column.key] ?? ''));
            },
          };
          (col as any).renderEditor = makeRenderEditor();
          newCols.push(col);
          tableData.columns.push(col);
          for (const row of tableData.list) {
            row[key] = '';
          }
        }
        currentColCountRef.current += count;
        const t = tableRef.current?.getTable() as { setColumns?: (c: any[]) => void } | null;
        t?.setColumns?.(tableData.columns as any[]);
        return newCols as any[];
      },
    });

    const originalPaste = hooks.onPaste;
    hooks.onPaste = (ctx: any): boolean => {
      const payload = ctx.payload as SpreadsheetClipboardPayload | null;
      if (!payload || payload.kind !== 'virt-spreadsheet') return false;

      const cellsBefore: CellSnapshot[] = [];
      const list = ctx.list;
      const selectable = ctx.columnIndexes;
      const startPos = selectable.indexOf(ctx.selection.startCol);
      if (startPos < 0) return false;

      for (let r = 0; r < payload.cells.length; r++) {
        const rowIdx = ctx.selection.startRow + r;
        const row = list[rowIdx];
        if (!row) continue;
        for (let c = 0; c < payload.cells[r]!.length; c++) {
          const colPos = startPos + c;
          if (colPos >= selectable.length) break;
          const colIdx = selectable[colPos]!;
          const colKey = (tableData.columns as any[])[colIdx]?.key;
          if (!colKey) continue;
          cellsBefore.push(snapshotCell(row, colKey));
        }
      }
      const mergesBefore = [...mergeStateRef.current];

      const ok = originalPaste(ctx);
      if (!ok) return false;

      const cellsAfter: CellSnapshot[] = [];
      for (let r = 0; r < payload.cells.length; r++) {
        const rowIdx = ctx.selection.startRow + r;
        const row = ctx.list[rowIdx];
        if (!row) continue;
        for (let c = 0; c < payload.cells[r]!.length; c++) {
          const colPos = startPos + c;
          if (colPos >= selectable.length) break;
          const colIdx = selectable[colPos]!;
          const colKey = (tableData.columns as any[])[colIdx]?.key;
          if (!colKey) continue;
          cellsAfter.push(snapshotCell(row, colKey));
        }
      }

      pushUndo({
        label: '粘贴',
        cellsBefore,
        cellsAfter,
        mergesBefore,
        mergesAfter: [...mergeStateRef.current],
      });
      return true;
    };

    return hooks;
  }, []);

  /** 右键菜单项：按当前选区给出「合并 / 取消合并」 */
  const contextMenuProvider = (ctx: ContextMenuContext<SpreadsheetRow>): ContextMenuItem[] | null => {
    const t = tableRef.current?.getTable() as { leftFixedCount: number; setMerges: (m: MergeCell[]) => void; clearCellSelection: () => void } | null | undefined;
    if (!t) return null;
    const sel = ctx.selection;
    if (!sel) return null;

    const leftFixed = t.leftFixedCount;
    const rawStartCol = Math.max(sel.startCol, leftFixed) - leftFixed;
    const rawEndCol = sel.endCol - leftFixed;
    if (rawEndCol < 0 || rawStartCol > rawEndCol) return null;

    const expanded = expandSelectionWithMerges(sel.startRow, rawStartCol, sel.endRow, rawEndCol, mergeStateRef.current);
    const rowspan = expanded.endRow - expanded.startRow + 1;
    const colspan = expanded.endCol - expanded.startCol + 1;
    const items: { label: string; divider?: boolean; action: () => void }[] = [];

    const overlapping = mergeStateRef.current.filter((m) =>
      rangesOverlap(m.rowIndex, m.colIndex, m.rowIndex + m.rowspan - 1, m.colIndex + m.colspan - 1,
        expanded.startRow, expanded.startCol, expanded.endRow, expanded.endCol));

    if (rowspan > 1 || colspan > 1) {
      items.push({
        label: `合并单元格 (${rowspan} × ${colspan})`,
        action: () => {
          const mergesBefore = [...mergeStateRef.current];
          const next = mergeStateRef.current.filter((m) => !overlapping.includes(m));
          next.push({ rowIndex: expanded.startRow, colIndex: expanded.startCol, rowspan, colspan });
          mergeStateRef.current = next;
          tableRef.current?.setMerges([...mergeStateRef.current]);
          tableRef.current?.clearCellSelection();
          pushUndo({ label: '合并单元格', cellsBefore: [], cellsAfter: [], mergesBefore, mergesAfter: [...mergeStateRef.current] });
          setStatus(`已合并: 行 ${expanded.startRow}~${expanded.endRow}, 列 ${CHARS[expanded.startCol]}~${CHARS[expanded.endCol]}`);
        },
      });
    }

    if (overlapping.length > 0) {
      items.push({
        label: `取消合并 (${overlapping.length} 个)`,
        action: () => {
          const mergesBefore = [...mergeStateRef.current];
          const removeSet = new Set(overlapping);
          mergeStateRef.current = mergeStateRef.current.filter((m) => !removeSet.has(m));
          tableRef.current?.setMerges([...mergeStateRef.current]);
          tableRef.current?.clearCellSelection();
          pushUndo({ label: '取消合并', cellsBefore: [], cellsAfter: [], mergesBefore, mergesAfter: [...mergeStateRef.current] });
          setStatus(`已取消 ${overlapping.length} 个合并区域`);
        },
      });
    }

    return items.length > 0 ? items : null;
  };

  const options = React.useMemo(
    () => ({
      list: tableData.list,
      itemKey: 'id',
      estimatedSize: 40,
      buffer: 4,
      border: true,
      cellStyle: tableData.cellStyle,
      merges: mergeStateRef.current,
      plugins: [vtCellSelection(), vtCellEditor(), vtCellSelection(), vtCellEditor({ trigger: 'dblclick' }), 
        vtContextMenu<SpreadsheetRow>(contextMenuProvider),
        vtClipboard<SpreadsheetRow>(clipboardHooks),
        vtSearch<SpreadsheetRow>(),
      ],
    }),
    [clipboardHooks],
  );

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 电子表格（飞书数据结构）</h3>
      <div className="virt-table-controls">
        <button type="button" onClick={() => { tableRef.current?.scrollToTop(); setStatus('已滚动到顶部'); }}>滚动到顶部</button>
        <button type="button" onClick={() => { tableRef.current?.scrollToBottom(); setStatus('已滚动到底部'); }}>滚动到底部</button>
        <button
          type="button"
          onClick={() => {
            const index = Math.floor(Math.random() * FEISHU_SHEET.row_count);
            tableRef.current?.scrollToIndex(index);
            setStatus(`随机滚动到第 ${index + 1} 行`);
          }}
        >
          随机滚动
        </button>
        <button type="button" onClick={() => { tableRef.current?.scrollToIndex(9); setStatus('已定位到第 10 行'); }}>定位到第 10 行</button>
        <button type="button" disabled={undoStackRef.current.length === 0} onClick={undo}>
          撤销 ({undoStackRef.current.length})
        </button>
        <button type="button" disabled={redoStackRef.current.length === 0} onClick={redo}>
          重做 ({redoStackRef.current.length})
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: '100%', height: 800 }} className="demo-container">
        <VirtTableReact ref={tableRef} columns={tableData.columns} options={options as any} />
      </div>
    </div>
  );
}
