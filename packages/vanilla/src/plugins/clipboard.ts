/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  VirtTablePlugin,
  PluginContext,
  CellSelectionRange,
  CellSelectionService,
} from '../plugin';

export type ClipboardSelectionRange = CellSelectionRange;

export interface ClipboardCopyContext<T = any> {
  selection: ClipboardSelectionRange;
  rows: string[][];
  columnIndexes: number[];
  list: T[];
}

export interface ClipboardCopyResult {
  text: string;
  payload?: unknown;
}

export interface ClipboardPasteContext<T = any> {
  selection: ClipboardSelectionRange;
  text: string;
  rows: string[][];
  payload: unknown | null;
  columnIndexes: number[];
  list: T[];
  setList: (list: T[]) => void;
}

export interface ClipboardOptions<T = any> {
  /** 自定义剪贴板 MIME 类型（用于携带结构化 payload） */
  mimeType?: string;
  /** 自定义复制：返回 `{ text, payload }` 覆盖默认 TSV */
  onCopy?: (ctx: ClipboardCopyContext<T>) => ClipboardCopyResult | null | void;
  /** 自定义粘贴：返回 `true` 表示已自行处理，阻止默认写回 */
  onPaste?: (ctx: ClipboardPasteContext<T>) => boolean | void;
}

const DEFAULT_MIME = 'application/x-virt-table-clipboard+json';

/**
 * 焦点在输入控件/搜索框/编辑浮层/组件浮层里时，剪贴板事件归它们，表格不接管。
 *
 * `[data-vt-popup]` 那条是给可交互浮层用的（`VtPerson` 的悬停名片能划选里面的邮箱/电话）：
 * 不放行的话，「表格里有选区」+「在名片里划选文字」同时成立时，Cmd+C 拿到的是选区的
 * TSV 而不是用户选中的那行字。与 `cell-editor.ts` 的 outside-click 放行同一个属性、同一个理由。
 */
function isEditingTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  return !!(
    target.closest('input, textarea, [contenteditable="true"]') ||
    target.closest('.vt-search-box') ||
    target.closest('.vt-cell-cover') ||
    target.closest('[data-vt-popup]')
  );
}

function rowsToText(rows: string[][]): string {
  return rows.map((line) => line.join('\t')).join('\n');
}

function parseRows(raw: string): string[][] {
  if (!raw) return [];
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.map((line) => line.split('\t'));
}

/**
 * 剪贴板插件：把当前框选区域复制成 TSV，并支持粘贴写回。
 *
 * ```ts
 * new VirtTable(el, {
 *   columns,
 *   // 复制/粘贴都以框选区域为单位，所以 requires vtCellSelection
 *   plugins: [vtCellSelection(), vtClipboard({ onPaste: (ctx) => { … } })],
 * })
 * ```
 *
 * 无框选区域时不做任何事。粘贴行数超出现有数据时会自动补空行。
 */
export function vtClipboard<T extends Record<string, any> = any>(
  options: ClipboardOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtClipboard',
    requires: ['vtCellSelection'],
    setup(ctx: PluginContext<T>) {
      const selection = ctx.inject<CellSelectionService>('cellSelection')!;
      const mimeType = options.mimeType || DEFAULT_MIME;
      const rootEl = ctx.rootEl;

      const onCopy = (e: ClipboardEvent): void => {
        if (isEditingTarget(e.target as HTMLElement | null)) return;

        const selectionData = selection.buildSelectionRows();
        if (!selectionData) return;

        const custom =
          options.onCopy?.({
            selection: selectionData.selection,
            rows: selectionData.rows,
            columnIndexes: selectionData.columnIndexes,
            list: ctx.getList(),
          }) ?? null;

        const text = custom?.text ?? rowsToText(selectionData.rows);
        if (!text) return;

        e.preventDefault();
        e.clipboardData?.setData('text/plain', text);
        if (custom?.payload !== undefined) {
          try {
            e.clipboardData?.setData(mimeType, JSON.stringify(custom.payload));
          } catch {
            // payload 序列化失败就只留纯文本，不影响复制本身
          }
        }
      };

      const onPaste = (e: ClipboardEvent): void => {
        if (isEditingTarget(e.target as HTMLElement | null)) return;

        const sel = selection.getSelection();
        if (!sel) return;
        const selectable = ctx.table.getSelectableColumnIndexes();
        const startSelectablePos = selectable.indexOf(sel.startCol);
        if (startSelectablePos < 0) return;

        const raw = e.clipboardData?.getData('text/plain') ?? '';
        const rows = parseRows(raw);

        let payload: unknown | null = null;
        const rawPayload = e.clipboardData?.getData(mimeType);
        if (rawPayload) {
          try {
            payload = JSON.parse(rawPayload);
          } catch {
            payload = null;
          }
        }

        const columns = ctx.getColumns();
        const list = [...ctx.getList()];

        // ---- 自定义粘贴优先 ----
        if (options.onPaste) {
          const handled = options.onPaste({
            selection: sel,
            text: raw,
            rows,
            payload,
            columnIndexes: selectable,
            list,
            setList: (nextList: T[]) => ctx.table.setList(nextList),
          });
          if (handled === true) {
            e.preventDefault();
            // 选区按粘贴尺寸铺开：payload 里带的 rowCount/colCount 优先（结构化粘贴可能与文本行列数不同）
            let pasteRowCount = rows.length;
            let pasteColCount = rows[0]?.length ?? 0;
            if (payload && typeof payload === 'object' && 'rowCount' in (payload as object)) {
              const p = payload as { rowCount?: number; colCount?: number };
              if (p.rowCount) pasteRowCount = p.rowCount;
              if (p.colCount) pasteColCount = p.colCount;
            }
            if (pasteRowCount > 0 && pasteColCount > 0) {
              const endColPos = Math.min(
                startSelectablePos + pasteColCount - 1,
                selectable.length - 1,
              );
              selection.setSelection({
                startRow: sel.startRow,
                startCol: sel.startCol,
                endRow: sel.startRow + pasteRowCount - 1,
                endCol: selectable[endColPos] ?? sel.startCol,
              });
            }
            ctx.table.forceUpdate();
            return;
          }
        }

        if (rows.length === 0) return;

        // ---- 默认粘贴：按选区左上角为起点写回，不足的行自动补 ----
        let changed = false;
        const requiredRows = sel.startRow + rows.length;
        while (list.length < requiredRows) {
          const appended = {} as Record<string, unknown>;
          for (const col of columns) appended[col.key] = '';
          const itemKey = ctx.getOptions().itemKey || 'id';
          appended[itemKey] = `__vt_clip_${Date.now()}_${list.length}`;
          list.push(appended as T);
          changed = true;
        }

        for (let r = 0; r < rows.length; r++) {
          const rowData = rows[r];
          const targetRow = list[sel.startRow + r] as Record<string, unknown> | undefined;
          if (!targetRow) continue;
          for (let c = 0; c < rowData.length; c++) {
            const selectablePos = startSelectablePos + c;
            if (selectablePos >= selectable.length) break;
            const colKey = columns[selectable[selectablePos]!]?.key;
            if (!colKey) continue;
            targetRow[colKey] = rowData[c] ?? '';
            changed = true;
          }
        }

        if (!changed) return;
        e.preventDefault();
        ctx.table.setList(list as T[]);

        const endColPos = Math.min(
          startSelectablePos + (rows[0]?.length ?? 1) - 1,
          selectable.length - 1,
        );
        selection.setSelection({
          startRow: sel.startRow,
          startCol: sel.startCol,
          endRow: sel.startRow + rows.length - 1,
          endCol: selectable[endColPos] ?? sel.startCol,
        });
        ctx.table.forceUpdate();
      };

      // 剪贴板事件只在聚焦元素上触发，所以点表格时要把焦点收到根节点
      const focusRoot = (e: MouseEvent): void => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest('input, textarea, [contenteditable="true"]')) return;
        rootEl.focus();
      };

      rootEl.setAttribute('tabindex', '-1');
      rootEl.addEventListener('mousedown', focusRoot);
      rootEl.addEventListener('copy', onCopy);
      rootEl.addEventListener('paste', onPaste);

      return {
        destroy: () => {
          rootEl.removeEventListener('mousedown', focusRoot);
          rootEl.removeEventListener('copy', onCopy);
          rootEl.removeEventListener('paste', onPaste);
        },
      };
    },
  };
}
