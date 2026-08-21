/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext, CellSelectionService } from '../plugin';
import type { ToolbarService } from './toolbar';
import type { VirtTableColumn } from '../index';
import { toCsvString, toExcelHtml, rowsToHtmlTable } from '../export';
import { TOOLBAR_ORDER } from '../internal/toolbar-order';

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
/** 插件级选项（与调用 `exportCsv(opts)` 时传的 `ExportOptions` 不是一回事） */
export interface ExportPluginOptions {
  /**
   * 装了 `vtToolbar` 时要不要放「导出」那颗按钮，默认 `true`。
   *
   * `false` = 只提供 `exportCsv()` / `exportExcel()` / `print()`，入口自己放
   * （右键菜单里挂一项、页面上放个按钮都行）。
   */
  toolbar?: boolean;
}

export function vtExport<T extends Record<string, any> = any>(
  options: ExportPluginOptions = {},
): VirtTablePlugin<T> {
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

      /**
       * 装了 `vtToolbar` 就往工具栏放一颗「导出」。
       *
       * **面板型**（一个三行的小菜单：CSV / Excel / 打印），因为这个插件本来就有三个动作 ——
       * 摆三颗按钮会占掉工具栏一小半，而它们明显是同一件事的三种格式。每一行点完就关
       * （`p.close()`）：导出是一次性动作，浮层留着没有意义。
       *
       * 在 `onMounted` 里 `inject`：工具栏在自己的 `setup` 里 `provide`，而插件的安装顺序
       * 不该由使用方数组里谁写在前面决定。拿不到（没装工具栏）就什么都不做，API 照旧。
       */
      let offToolbar: (() => void) | null = null;
      ctx.on('onMounted', () => {
        const toolbar = options.toolbar === false ? null : ctx.inject<ToolbarService>('toolbar');
        offToolbar =
          toolbar?.register({
            key: 'export',
            label: ctx.getLocale().toolbar.export,
            order: TOOLBAR_ORDER.export,
            icon:
              '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
              'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M12 4v10M8.5 10.5 12 14l3.5-3.5M5 18h14"/></svg>',
            panel: (p) => {
              const t = ctx.getLocale().toolbar;
              p.ui.title(t.export);
              for (const [label, run] of [
                [t.exportCsv, () => api.exportCsv()],
                [t.exportExcel, () => api.exportExcel()],
                [t.print, () => api.print()],
              ] as Array<[string, () => void]>) {
                const btn = document.createElement('button');
                btn.type = 'button';
                // 复用共享的面板条目样式（与列头筛选下拉里的选项同款）
                btn.className = 'vt-filter-item';
                btn.textContent = label;
                btn.addEventListener('click', () => {
                  p.close();
                  run();
                });
                p.el.appendChild(btn);
              }
              p.resize();
            },
          }) ?? null;
      });

      const api = {
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
      };

      return { api, destroy: () => offToolbar?.() };
    },
  };
}
