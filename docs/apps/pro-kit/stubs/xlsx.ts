/**
 * `@virt-table-pro/xlsx` 的**桩**（同级目录没有 pro 仓库的产物时由 vite alias 顶上）。
 * 背景与取舍见本目录 README，写法与 `undo.ts` 那份同款。
 *
 * 真包出的是 zip + OOXML：多级分组表头、合并单元格、列宽对齐、数字与日期的真类型、
 * 冻结窗格、多 sheet、合计行可写成活 `SUBTOTAL`；PDF 那一档做的是排版（分页 +
 * 每页重复表头），文件由浏览器的「另存为 PDF」出。
 */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

/** 表头 / 合计行配色与日期格式 */
export interface SheetTheme {
  headerFill?: string;
  headerColor?: string;
  footerFill?: string;
  dateNumFmt?: string;
  dateTimeNumFmt?: string;
}

/** PDF / 打印的排版设置 */
export interface PrintDocOptions {
  title?: string;
  landscape?: boolean;
  paper?: 'A4' | 'A3' | 'letter' | 'legal';
  margin?: string;
  fitWidth?: boolean;
  pageNumbers?: boolean;
  footNote?: string;
}

export interface XlsxOptions {
  /** sheet 名，默认 `'Sheet1'` */
  sheetName?: string;
  /** 下载文件名，默认 `<sheetName>.xlsx` */
  filename?: string;
  /** 表头底色、边框、列宽、对齐，默认 true */
  withStyles?: boolean;
  /** 冻结窗格。`rows: 1` 的语义是「冻住表头」，分组表头下会自动冻满 */
  freeze?: { rows?: number; cols?: number };
  /** 只导当前选区（需装核心的 vtCellSelection） */
  selectionOnly?: boolean;
  includeHeader?: boolean;
  includeFooter?: boolean;
  /** 折叠的分组 / 树节点里的行也导出，默认 true */
  includeCollapsed?: boolean;
  /** 还原合并单元格，默认 true */
  merges?: boolean;
  autoFilter?: boolean;
  /** 列 key → Excel 数字格式串 */
  numberFormats?: Record<string, string>;
  /** 合计行写成活 SUBTOTAL 公式 */
  liveSummary?: boolean;
  compress?: boolean;
  creator?: string;
  theme?: SheetTheme;
  pdf?: PrintDocOptions;
  /** 装了核心 vtToolbar 时放一颗「导出」按钮，默认 true */
  toolbar?: boolean;
  toolbarTexts?: { button?: string; xlsx?: string; selection?: string; pdf?: string };
}

/** 一张额外 sheet 的描述 */
export interface XlsxSheetSpec {
  name: string;
  rows?: Record<string, unknown>[];
  columns?: string[];
  freeze?: { rows?: number; cols?: number };
  merges?: boolean;
}

export interface ExportXlsxOptions extends Omit<XlsxOptions, 'toolbar' | 'toolbarTexts' | 'pdf'> {
  sheets?: XlsxSheetSpec[];
}

export interface ExportPdfOptions extends PrintDocOptions {
  selectionOnly?: boolean;
  includeHeader?: boolean;
  includeFooter?: boolean;
  includeCollapsed?: boolean;
  /** 不打印，只返回排好的 HTML（交给服务端出 PDF 字节） */
  htmlOnly?: boolean;
}

export function vtXlsx<T extends Record<string, unknown> = Record<string, unknown>>(
  _options: XlsxOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtXlsx',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtXlsx');
    },
  };
}

/** 真包用 `declare module` 注入这两个方法，这里照做一份 —— **可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    /** 导出为真 xlsx（zip + OOXML） */
    exportXlsx?(opts?: ExportXlsxOptions): Promise<void>;
    /** 排版并唤起打印 / 另存为 PDF；`htmlOnly` 时返回 HTML */
    exportPdf?(opts?: ExportPdfOptions): Promise<string | void>;
  }
}
