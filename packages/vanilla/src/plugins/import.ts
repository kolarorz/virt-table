/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { VirtTableColumn } from '../index';
import type { ToolbarService } from './toolbar';
import { inferColumns } from '../infer-columns';
import {
  canInflate,
  parseCsv,
  readXlsx,
  rowsToObjects,
  type ImportedSheet,
  type RowsToObjectsOptions,
  type SheetValue,
} from '../sheet-import';
import { TOOLBAR_ORDER } from '../internal/toolbar-order';

/**
 * 导入：CSV / TSV / xlsx 文件 → 表格的行（可选：连列一起推断出来）。
 *
 * ```ts
 * new VirtTable(el, { columns, plugins: [vtImport()] });
 *
 * // 走文件选择器（装了 vtToolbar 时工具栏上会有一颗「导入」）
 * await table.importFile();
 * // 已经拿到 File / ArrayBuffer 了
 * await table.importFile(file, { autoColumns: true });
 * ```
 *
 * 解析本身在 `@virt-table/vanilla/sheet-import`（零 DOM，能在服务端跑）；这个插件只做三件事：
 * **拿文件、把结果落进表格、把「导了几行几列」报出来**。
 *
 * ## 它是免费的，付费的是「向导」
 *
 * vxe-table 免费给了导入，所以免费版缺它是唯一一处会被拿去比较时掉分的地方。
 * 这一版做的是**基础导入**：一行 API 把文件变成行。付费的
 * [导入向导](/enterprise/) 才是「列映射 → 类型推断 → 校验报错定位到某一格 → 提交」
 * 那一整套 UI。
 *
 * ## 默认**不换列**
 *
 * `autoColumns` 默认关：绝大多数场景是「往一张已经定义好的表里灌数据」，文件的表头
 * 只是用来对齐字段。开了它才会 `inferColumns()` 出一套列并 `setColumns()` ——
 * 那是「事前不知道 schema」的场景（用户随手上传一个表）。
 *
 * ## 一次只落一张 sheet
 *
 * xlsx 可能有多张。默认取**第一张**，`sheet` 选项可以按名字或下标挑。
 * 要看有哪些 sheet 就先 `readSheets(file)`（只解析、不落表），选完再 `importFile`。
 * 「把多张 sheet 同时塞进一张表」没有合理语义 —— 列都不一样。
 */

export interface ImportPluginOptions<T extends Record<string, any> = any> {
  /**
   * 装了 `vtToolbar` 时要不要放「导入」那颗按钮，默认 `true`。
   *
   * `false` = 只提供 API，入口自己放（页面上一个上传区、右键菜单里一项都行）。
   */
  toolbar?: boolean;
  /** 文件选择器的 `accept`，默认 `.csv,.tsv,.txt,.xlsx,.xlsm` */
  accept?: string;
  /** 默认的导入选项，`importFile(file, opts)` 时可逐次覆盖 */
  defaults?: ImportOptions<T>;
  /** 导入完成后触发。拿到的是**已经落进表格的**那批行 */
  onImported?: (result: ImportResult<T>) => void;
  /** 解析失败 / 文件读不出内容时触发。不给则只 `console.warn` */
  onError?: (error: Error) => void;
  /** 工具栏那颗按钮的文字，默认「导入」 */
  toolbarText?: string;
}

export interface ImportOptions<T extends Record<string, any> = any>
  extends RowsToObjectsOptions {
  /** xlsx 多 sheet 时取哪一张：名字或 0 基下标。默认第一张 */
  sheet?: string | number;
  /** CSV 分隔符。不给则从首行嗅（逗号 / 分号 / 制表符 / 竖线） */
  delimiter?: string;
  /**
   * 按文件里的表头**推断并替换列**，默认 `false`。
   *
   * 关着时只换行（`setList`），列保持原样 —— 那是「往已定义好的表里灌数据」。
   */
  autoColumns?: boolean;
  /**
   * 落进表格前过一道。返回新数组即可改写 / 过滤 / 补默认值；返回 `false` 取消这次导入。
   *
   * 这是「基础导入」里唯一的校验入口 —— 逐格定位错误、把错误标回单元格是付费向导的事。
   */
  transform?: (rows: T[], ctx: { sheet: ImportedSheet; keys: string[] }) => T[] | false;
  /** 追加而不是替换（`appendRows` 而不是 `setList`），默认 `false` */
  append?: boolean;
}

export interface ImportResult<T extends Record<string, any> = any> {
  /** 落进表格的行 */
  rows: T[];
  /** 表头推出来的列 key，顺序即列序 */
  keys: string[];
  /** 取的是哪张 sheet（CSV 时是 `'csv'`） */
  sheetName: string;
  /** 文件里一共有哪些 sheet（CSV 时只有一项） */
  sheetNames: string[];
  /** 用了什么分隔符（仅 CSV） */
  delimiter?: string;
}

/** 什么都能喂：`File`、`Blob`、`ArrayBuffer`、`Uint8Array`、或者一段 CSV 文本 */
export type ImportSource = File | Blob | ArrayBuffer | Uint8Array | string;

const CSV_EXT = /\.(csv|tsv|txt)$/i;
const XLSX_EXT = /\.(xlsx|xlsm)$/i;
/** zip 的本地文件头签名 `PK\x03\x04` —— xlsx 就是 zip，靠它认格式比靠扩展名可靠 */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

const IMPORT_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 20V10M8.5 13.5 12 10l3.5 3.5M5 6h14"/></svg>';

async function toBytes(src: ImportSource): Promise<Uint8Array> {
  if (typeof src === 'string') return new TextEncoder().encode(src);
  if (src instanceof Uint8Array) return src;
  if (src instanceof ArrayBuffer) return new Uint8Array(src);
  return new Uint8Array(await src.arrayBuffer());
}

/**
 * 认格式：**先看字节头**，再看扩展名。
 *
 * 靠扩展名判断在真实上传里不可靠 —— 用户会把 xlsx 改名成 `.txt`，也会把 CSV 存成
 * `.xls`。zip 的魔数是四个确定的字节，认它比认名字准。
 */
function looksLikeZip(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return ZIP_MAGIC.every((b, i) => bytes[i] === b);
}

export function vtImport<T extends Record<string, any> = any>(
  options: ImportPluginOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtImport',
    setup(ctx: PluginContext<T>) {
      const accept = options.accept ?? '.csv,.tsv,.txt,.xlsx,.xlsm';
      let generatedKey = 0;

      const fail = (message: string): never => {
        const err = new Error(message);
        if (options.onError) options.onError(err);
        else console.warn(`[VirtTable] vtImport: ${message}`);
        throw err;
      };

      /** 弹文件选择器，拿一个 File。用户取消时 resolve(null) */
      const pickFile = (): Promise<File | null> =>
        new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = accept;
          /*
           * 挂进 DOM 再 click：Safari 与部分 WebView 对**游离**的 input 不弹选择器。
           * `display:none` 是可以的（不同于 iframe 打印那条），选择器不需要它可见。
           */
          input.style.display = 'none';
          document.body.appendChild(input);
          /*
           * 用户按「取消」时**不会**触发任何事件（`cancel` 事件还很新且不普遍），
           * 所以靠 window 的 focus 回来 + 一帧延迟兜底 —— 否则那个 Promise 永远悬着，
           * 而调用方 `await` 在那儿，界面上就是「点了导入没反应」。
           */
          let settled = false;
          const done = (f: File | null): void => {
            if (settled) return;
            settled = true;
            input.remove();
            window.removeEventListener('focus', onFocus);
            resolve(f);
          };
          const onFocus = (): void => {
            setTimeout(() => done(input.files?.[0] ?? null), 300);
          };
          input.addEventListener('change', () => done(input.files?.[0] ?? null));
          window.addEventListener('focus', onFocus);
          input.click();
        });

      /** 解析成 sheet 列表，**不落表** */
      const readSheets = async (
        src: ImportSource,
        opts: ImportOptions<T> = {},
      ): Promise<{ sheets: ImportedSheet[]; delimiter?: string }> => {
        const bytes = await toBytes(src);
        const name = typeof src === 'object' && 'name' in src ? String(src.name) : '';

        if (looksLikeZip(bytes) || (XLSX_EXT.test(name) && !CSV_EXT.test(name))) {
          if (!canInflate()) {
            /*
             * 没有 `DecompressionStream` 时**只读得懂不压缩的条目**，而 Excel 一律压缩 ——
             * 所以这里直接说清楚，而不是让它读出一张空表（那会被当成「文件坏了」）。
             */
            fail(
              '当前环境没有 DecompressionStream，读不了压缩过的 xlsx。' +
                '请改用 CSV，或在支持它的浏览器里打开（Chrome 103+ / Firefox 113+ / Safari 16.4+）。',
            );
          }
          const sheets = await readXlsx(bytes);
          if (sheets.length === 0) fail('这个 xlsx 里没读出任何 sheet');
          return { sheets };
        }

        const text = new TextDecoder().decode(bytes);
        const delimiter = opts.delimiter ?? options.defaults?.delimiter;
        const rows = parseCsv(text, {
          ...(delimiter ? { delimiter } : {}),
          // CSV 全是文本，纯数字的格转成 number —— 否则排序会按字符串比，10 排在 2 前面
          coerceNumbers: true,
        });
        if (rows.length === 0) fail('这个文件里没读出任何行');
        return {
          sheets: [{ name: 'csv', rows: rows as SheetValue[][] }],
          delimiter: delimiter ?? undefined,
        };
      };

      /** 挑一张 sheet */
      const pickSheet = (sheets: ImportedSheet[], want: string | number | undefined): ImportedSheet => {
        if (typeof want === 'number') return sheets[want] ?? sheets[0];
        if (typeof want === 'string') {
          return sheets.find((s) => s.name === want) ?? sheets[0];
        }
        return sheets[0];
      };

      const api = {
        /**
         * 只解析、不落表。用来先问「这个文件里有哪些 sheet」，让用户挑完再导。
         * 不传 `src` 就弹文件选择器；用户取消时返回 `null`。
         */
        readSheets: async (
          src?: ImportSource,
          opts: ImportOptions<T> = {},
        ): Promise<ImportedSheet[] | null> => {
          const file = src === undefined ? await pickFile() : src;
          if (file === null) return null;
          return (await readSheets(file, opts)).sheets;
        },

        /**
         * 导入并落进表格。不传 `src` 就弹文件选择器；用户取消时返回 `null`。
         *
         * 落表走两条公开路：`autoColumns` 时先 `setColumns()`，然后
         * `setList()`（或 `append` 时 `appendRows()`）。
         */
        importFile: async (
          src?: ImportSource,
          opts: ImportOptions<T> = {},
        ): Promise<ImportResult<T> | null> => {
          /*
           * `src === undefined` 才去弹选择器，`null` 才算「用户取消」。
           * 别写成 `src ?? pickFile()` + `if (!file)`：空字符串（一个空 CSV）是**假值**，
           * 那样写会把它当成取消而静默返回 `null` —— 界面上就是「导了个空文件没反应」，
           * 而正确行为是报「这个文件里没读出任何行」。
           */
          const file = src === undefined ? await pickFile() : src;
          if (file === null) return null;
          const merged: ImportOptions<T> = { ...options.defaults, ...opts };

          const { sheets, delimiter } = await readSheets(file, merged);
          const sheet = pickSheet(sheets, merged.sheet);
          const { keys, rows } = rowsToObjects(sheet.rows, merged);

          let data = rows as unknown as T[];
          if (merged.transform) {
            const next = merged.transform(data, { sheet, keys });
            if (next === false) return null;
            data = next;
          }

          // 所有校验先完成，再改列/落表。与核心一样以 String(key) 判断身份。
          const itemKey = ctx.getOptions().itemKey;
          const used = new Set(merged.append ? ctx.table.getSourceRowKeys() : []);
          const missing = (value: unknown): boolean => value === null || value === undefined || value === '';
          const visit = (rows: T[], fn: (row: T) => void): void => {
            for (const row of rows) {
              fn(row);
              if (Array.isArray(row.children)) visit(row.children, fn);
            }
          };
          visit(data, (row) => {
            if (missing(row[itemKey])) return;
            const key = String(row[itemKey]);
            if (used.has(key)) fail(`主键 ${itemKey} 重复：${key}，已取消整次导入`);
            used.add(key);
          });
          // 先保留所有显式主键，生成值不会撞上本批后面的业务主键。
          const fillKeys = (rows: T[]): T[] => rows.map((row) => {
            const next = { ...row };
            if (missing(next[itemKey])) {
              let key: string;
              do key = `__vt_import_${++generatedKey}`;
              while (used.has(key));
              used.add(key);
              (next as Record<string, unknown>)[itemKey] = key;
            }
            if (Array.isArray(row.children)) (next as Record<string, unknown>).children = fillKeys(row.children);
            return next;
          });
          data = fillKeys(data);

          if (merged.autoColumns && data.length > 0) {
            /*
             * 列**先**换，行**后**落：反过来的话首帧会拿旧列渲染一遍新数据
             * （与 `vtAIStream` 的 `autoColumns` 同一条，见那个插件里的注释）。
             */
            const cols = inferColumns(data as Array<Record<string, unknown>>, {
              itemKey: ctx.getOptions().itemKey,
            }) as VirtTableColumn<T>[];
            if (cols.length > 0) ctx.table.setColumns(cols);
          }

          if (merged.append) ctx.table.appendRows(data);
          else ctx.table.setList(data);

          const result: ImportResult<T> = {
            rows: data,
            keys,
            sheetName: sheet.name,
            sheetNames: sheets.map((s) => s.name),
            ...(delimiter ? { delimiter } : {}),
          };
          options.onImported?.(result);
          return result;
        },
      };

      /*
       * 装了 `vtToolbar` 就放一颗「导入」。**动作型**（点一下弹文件选择器），
       * 不是面板型 —— 「选哪张 sheet / 要不要换列」这类选择属于付费向导，
       * 基础导入的语义就是一颗按钮一件事。
       *
       * 在 `onMounted` 里 inject：工具栏在自己的 `setup` 里 provide，而插件的安装顺序
       * 不该由使用方数组里谁写在前面决定。
       */
      let offToolbar: (() => void) | null = null;
      ctx.on('onMounted', () => {
        if (options.toolbar === false) return;
        const toolbar = ctx.inject<ToolbarService>('toolbar');
        offToolbar =
          toolbar?.register({
            key: 'import',
            label: () => options.toolbarText ?? '导入',
            order: TOOLBAR_ORDER.import,
            icon: IMPORT_ICON_SVG,
            onClick: () => {
              // 失败已经经过 onError / console.warn，这里不再重复报
              void api.importFile().catch(() => undefined);
            },
          }) ?? null;
      });

      return { api, destroy: () => offToolbar?.() };
    },
  };
}
