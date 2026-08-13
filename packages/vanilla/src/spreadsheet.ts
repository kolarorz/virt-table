/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MergeCell, VirtTableColumn } from './index';
import { cellContentText, renderCellContent, type CellContentType } from './cell-type';
import type {
  ClipboardCopyContext,
  ClipboardPasteContext,
  ClipboardOptions,
} from './plugins/clipboard';

export type SpreadsheetCellType =
  | 'text'
  | 'number'
  | 'rich-text'
  | 'image'
  | 'option'
  | 'checkbox';

export interface SpreadsheetCellData {
  type: SpreadsheetCellType;
  value?: string | number | boolean | null;
  richTextHtml?: string;
  imageUrl?: string;
  imageAlt?: string;
  optionLabel?: string;
  optionColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  /** @deprecated Use align instead */
  textAlign?: string;
}

export interface SpreadsheetCellMap {
  [columnKey: string]: SpreadsheetCellData;
}

export interface SpreadsheetClipboardPayload {
  kind: 'virt-spreadsheet';
  version: 1;
  rowCount: number;
  colCount: number;
  cells: SpreadsheetCellData[][];
  merges: MergeCell[];
}

export interface SpreadsheetClipboardHelpers<T extends Record<string, any>> {
  columns: VirtTableColumn<T>[];
  getMerges: () => MergeCell[];
  setMerges: (merges: MergeCell[]) => void;
  createRow: (rowIndex: number) => T;
  mergeColumnOffset?: number;
  sheetCellField?: string;
  addColumns?: (count: number) => VirtTableColumn<T>[];
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function overlapRect(
  a: { sr: number; sc: number; er: number; ec: number },
  b: { sr: number; sc: number; er: number; ec: number },
): boolean {
  return a.sr <= b.er && a.er >= b.sr && a.sc <= b.ec && a.ec >= b.sc;
}

/**
 * 单元格纯文本（复制 / 导出用）。
 *
 * 内容类型这套东西现在住在核心的 `cell-type.ts`（`col.cellType`），这里只负责把
 * spreadsheet 自己的数据形状（`optionLabel` / `imageUrl` 这些扁平字段）映射成核心
 * 认识的取值，再交给核心 —— 两边的类型判断不再各写一份。
 */
export function getSpreadsheetCellDisplayText(cell: SpreadsheetCellData | undefined): string {
  if (!cell) return '';
  return cellContentText(cell.type as CellContentType, toCoreValue(cell));
}

/** spreadsheet 的扁平字段 → 核心 `cellType` 认识的取值 */
function toCoreValue(cell: SpreadsheetCellData): unknown {
  switch (cell.type) {
    case 'option':
      return { label: cell.optionLabel ?? cell.value, color: cell.optionColor };
    case 'image':
      return { url: cell.imageUrl ?? '', alt: cell.imageAlt };
    case 'rich-text':
      return cell.richTextHtml ?? cell.value;
    default:
      return cell.value;
  }
}

/**
 * 单元格 HTML（给 `col.render` 返回字符串用）。内容渲染复用核心的 `renderCellContent`。
 *
 * ⚠️ 图片 / 标签 / 布尔三类要建 DOM 才能取 `outerHTML`，所以在**没有 document 的环境**
 * （SSR、node 侧导出）会回落成纯文本 —— 保住这个函数「任何环境可调」的原契约。
 */
export function renderSpreadsheetCellHtml(cell: SpreadsheetCellData | undefined): string {
  if (!cell) return '';
  if (typeof document === 'undefined') {
    return cell.type === 'rich-text'
      ? String(cell.richTextHtml ?? cell.value ?? '')
      : escapeHtml(getSpreadsheetCellDisplayText(cell));
  }
  const result = renderCellContent(cell.type as CellContentType, toCoreValue(cell));
  if (!result) return escapeHtml(cell.value ?? '');
  if (result.kind === 'html') return result.html;
  if (result.kind === 'text') return escapeHtml(result.text);
  return result.node.outerHTML;
}

export function setSpreadsheetCellData<T extends Record<string, any>>(
  row: T,
  colKey: string,
  cell: SpreadsheetCellData,
  sheetCellField = '_sheetCells',
): void {
  const sheetCells = ((row as any)[sheetCellField] ??= {}) as SpreadsheetCellMap;
  sheetCells[colKey] = { ...cell };
  (row as any)[colKey] = getSpreadsheetCellDisplayText(cell);
}

export function getSpreadsheetCellData<T extends Record<string, any>>(
  row: T,
  colKey: string,
  sheetCellField = '_sheetCells',
): SpreadsheetCellData {
  const sheetCells = ((row as any)[sheetCellField] ?? {}) as SpreadsheetCellMap;
  const existing = sheetCells[colKey];
  if (existing) return { ...existing };
  return { type: 'text', value: (row as any)[colKey] ?? '' };
}

/**
 * 造出可直接交给 `vtClipboard` 的配置：`vtClipboard(createSpreadsheetClipboardHandlers({...}))`。
 *
 * `onCopy` 的返回类型收窄到 `SpreadsheetClipboardPayload`，便于调用方在包装
 * `onPaste` 时按类型判断 payload 来源。
 */
export function createSpreadsheetClipboardHandlers<T extends Record<string, any>>(
  helpers: SpreadsheetClipboardHelpers<T>,
): Required<Pick<ClipboardOptions<T>, 'mimeType' | 'onPaste'>> & {
  onCopy: (ctx: ClipboardCopyContext<T>) => { text: string; payload: SpreadsheetClipboardPayload };
} {
  const mime = 'application/x-virt-spreadsheet+json';
  const sheetCellField = helpers.sheetCellField ?? '_sheetCells';
  const mergeColumnOffset = helpers.mergeColumnOffset ?? 0;

  const clipboardCopy = (ctx: ClipboardCopyContext<T>) => {
    const cells: SpreadsheetCellData[][] = [];
    for (let r = 0; r < ctx.rows.length; r++) {
      const rowIndex = ctx.selection.startRow + r;
      const row = ctx.list[rowIndex];
      const line: SpreadsheetCellData[] = [];
      for (let c = 0; c < ctx.columnIndexes.length; c++) {
        const colIndex = ctx.columnIndexes[c]!;
        const colKey = helpers.columns[colIndex]?.key;
        if (!row || !colKey) {
          line.push({ type: 'text', value: '' });
          continue;
        }
        line.push(getSpreadsheetCellData(row, colKey, sheetCellField));
      }
      cells.push(line);
    }

    const selRect = {
      sr: ctx.selection.startRow,
      sc: ctx.selection.startCol - mergeColumnOffset,
      er: ctx.selection.endRow,
      ec: ctx.selection.endCol - mergeColumnOffset,
    };
    const merges = helpers
      .getMerges()
      .filter((m) =>
        overlapRect(
          selRect,
          {
            sr: m.rowIndex,
            sc: m.colIndex,
            er: m.rowIndex + m.rowspan - 1,
            ec: m.colIndex + m.colspan - 1,
          },
        ),
      )
      .map((m) => {
        const mr2 = m.rowIndex + m.rowspan - 1;
        const mc2 = m.colIndex + m.colspan - 1;
        const clippedStartRow = Math.max(m.rowIndex, selRect.sr);
        const clippedStartCol = Math.max(m.colIndex, selRect.sc);
        const clippedEndRow = Math.min(mr2, selRect.er);
        const clippedEndCol = Math.min(mc2, selRect.ec);
        return {
          rowIndex: clippedStartRow - selRect.sr,
          colIndex: clippedStartCol - selRect.sc,
          rowspan: clippedEndRow - clippedStartRow + 1,
          colspan: clippedEndCol - clippedStartCol + 1,
        } satisfies MergeCell;
      });

    const payload: SpreadsheetClipboardPayload = {
      kind: 'virt-spreadsheet',
      version: 1,
      rowCount: cells.length,
      colCount: cells[0]?.length ?? 0,
      cells,
      merges,
    };
    return {
      text: ctx.rows.map((line) => line.join('\t')).join('\n'),
      payload,
    };
  };

  const clipboardPaste = (ctx: ClipboardPasteContext<T>): boolean => {
    const payload = ctx.payload as SpreadsheetClipboardPayload | null;
    if (!payload || payload.kind !== 'virt-spreadsheet' || payload.version !== 1) {
      return false;
    }
    const startPos = ctx.columnIndexes.indexOf(ctx.selection.startCol);
    if (startPos < 0) return false;

    const neededColPos = startPos + payload.colCount;
    if (neededColPos > ctx.columnIndexes.length && helpers.addColumns) {
      const deficit = neededColPos - ctx.columnIndexes.length;
      const newCols = helpers.addColumns(deficit);
      const baseIdx = helpers.columns.length - newCols.length;
      for (let i = 0; i < newCols.length; i++) {
        ctx.columnIndexes.push(baseIdx + i);
      }
    }

    const next = [...ctx.list];
    const neededRows = ctx.selection.startRow + payload.cells.length;
    while (next.length < neededRows) {
      next.push(helpers.createRow(next.length));
    }

    for (let r = 0; r < payload.cells.length; r++) {
      const row = next[ctx.selection.startRow + r];
      if (!row) continue;
      for (let c = 0; c < payload.cells[r]!.length; c++) {
        const colPos = startPos + c;
        if (colPos >= ctx.columnIndexes.length) break;
        const colIdx = ctx.columnIndexes[colPos]!;
        const colKey = helpers.columns[colIdx]?.key;
        if (!colKey) continue;
        const cell = payload.cells[r]![c]!;
        setSpreadsheetCellData(row, colKey, cell, sheetCellField);
      }
    }

    const translatedMerges = payload.merges
      .map((m) => ({
        rowIndex: ctx.selection.startRow + m.rowIndex,
        colIndex: ctx.selection.startCol - mergeColumnOffset + m.colIndex,
        rowspan: m.rowspan,
        colspan: m.colspan,
      }))
      .filter((m) => m.rowspan > 0 && m.colspan > 0 && m.colIndex >= 0);
    if (translatedMerges.length > 0) {
      const existing = helpers.getMerges();
      helpers.setMerges([...existing, ...translatedMerges]);
    }

    ctx.setList(next);
    return true;
  };

  return { mimeType: mime, onCopy: clipboardCopy, onPaste: clipboardPaste };
}
