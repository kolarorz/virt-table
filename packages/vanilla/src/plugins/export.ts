/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext, CellSelectionService } from '../plugin';
import type { VirtTableColumn } from '../index';
import { toCsvString, toExcelHtml, rowsToHtmlTable } from '../export';

export interface ExportOptions {
  /** 文件名（含扩展名） */
  filename?: string;
  /** 导出范围：all(全表，默认) | selection(当前框选区域) */
  scope?: 'all' | 'selection';
  /** 是否包含表头（默认 true） */
  includeHeader?: boolean;
  /** CSV 分隔符（默认 ,） */
  delimiter?: string;
}

/** 打印时的内联样式：新窗口拿不到宿主页面的 CSS，只能内联 */
const PRINT_STYLE =
  'body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
  'margin:24px;color:#1f2937;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
  'h3{margin:0 0 14px;font-size:16px;font-weight:600}' +
  'table{border-collapse:collapse;width:100%;font-size:12.5px;font-variant-numeric:tabular-nums}' +
  'th,td{border:1px solid #d5dae2;padding:7px 10px;text-align:left;vertical-align:middle}' +
  'thead th{background:#f8fafc;color:#384250;font-weight:600;border-bottom-color:#b9c0cb}' +
  'tbody tr:nth-child(even) td{background:#fafbfc}';

/** 特殊列不参与导出（没有可读的业务值） */
const NON_EXPORTABLE_TYPES = new Set(['index', 'checkbox', 'expand', 'tree', 'radio', 'drag']);

/**
 * 导出与打印插件。纯命令式，无 UI、无事件监听。
 *
 * ```ts
 * new VirtTable(el, { columns, plugins: [vtExport()] })
 * table.exportCsv({ filename: 'data.csv' })
 * table.exportExcel({ scope: 'selection' })   // 需同时装载 vtCellSelection
 * table.print({ title: '报表' })
 * ```
 *
 * 暴露 API：`exportCsv()` / `exportExcel()` / `print()`
 */
export function vtExport<T extends Record<string, any> = any>(): VirtTablePlugin<T> {
  return {
    name: 'vtExport',
    setup(ctx: PluginContext<T>) {
      // 可选依赖：没装 vtCellSelection 时 scope:'selection' 退化为空结果并告警
      const selection = ctx.inject<CellSelectionService>('cellSelection');

      const exportColumns = (): VirtTableColumn<T>[] =>
        ctx.getColumns().filter((c) => !(c.type && NON_EXPORTABLE_TYPES.has(c.type)));

      const cellToString = (col: VirtTableColumn<T>, row: T): string => {
        if (col.exportValue) return String(col.exportValue(row));
        const v = row[col.key];
        return v === null || v === undefined ? '' : String(v);
      };

      const buildRows = (opts: ExportOptions): { header: string[]; rows: string[][] } => {
        if (opts.scope === 'selection') {
          if (!selection) {
            console.warn(
              "[VirtTable] vtExport: scope:'selection' 需要同时装载 vtCellSelection 插件。",
            );
            return { header: [], rows: [] };
          }
          const built = selection.buildSelectionRows();
          if (!built) return { header: [], rows: [] };
          const columns = ctx.getColumns();
          const header = built.columnIndexes.map((i: number) => columns[i]?.title ?? '');
          return { header, rows: built.rows };
        }
        const cols = exportColumns();
        const header = cols.map((c) => c.title ?? c.key);
        const rows: string[][] = [];
        for (const row of ctx.getList()) {
          const rt = (row as any)._rowType;
          if (rt === 'group' || rt === 'expand') continue; // 跳过合成行
          rows.push(cols.map((c) => cellToString(c, row)));
        }
        return { header, rows };
      };

      const download = (content: string, filename: string, mime: string): void => {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      return {
        api: {
          exportCsv: (opts: ExportOptions = {}) => {
            const { header, rows } = buildRows(opts);
            const data =
              opts.includeHeader === false || header.length === 0 ? rows : [header, ...rows];
            const csv = toCsvString(data, opts.delimiter ?? ',');
            download(csv, opts.filename ?? 'export.csv', 'text/csv;charset=utf-8;');
          },

          exportExcel: (opts: ExportOptions = {}) => {
            const { header, rows } = buildRows(opts);
            const html = toExcelHtml(
              opts.includeHeader === false ? [] : header,
              rows,
              opts.filename ?? 'Sheet',
            );
            download(html, opts.filename ?? 'export.xls', 'application/vnd.ms-excel');
          },

          /** 打印全表（新窗口 + 内联样式） */
          print: (opts: { title?: string } = {}) => {
            const { header, rows } = buildRows({ scope: 'all' });
            const table = rowsToHtmlTable(header, rows);
            const win = window.open('', '_blank');
            if (!win) return;
            const title = opts.title ?? ctx.getLocale().print;
            win.document.write(
              `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
                `<style>${PRINT_STYLE}</style></head><body>` +
                (opts.title ? `<h3>${title}</h3>` : '') +
                table +
                '</body></html>',
            );
            win.document.close();
            win.focus();
            win.print();
          },
        },
      };
    },
  };
}
