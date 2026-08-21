/**
 * `@virt-table-pro/formula` 的**桩**（同级目录没有 pro 仓库的产物时由 vite alias 顶上）。
 * 背景与取舍见本目录 README，写法与 `floating-image.ts` 那份同款。
 *
 * 两档都要：`vtFormula`（**单元格公式**，A1 记法）与 `vtFormulaColumn`（**计算列**，
 * 一列的值由同行其它列算出）。demo 两档各有一个，所以两档的类型都得在这儿。
 */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

export interface FormulaCellOptions {
  /** 参与公式的列 key，**顺序即列字母** A、B、C… 省略则取全部非功能列 */
  columns?: string[];
  /** 公式原文存在行数据的哪个字段上，默认 `_formulas` */
  formulaField?: string;
  /** 给公式格的 `<td>` 打 class（`vtp-formula-cell` / `vtp-formula-error`），默认 true */
  markCells?: boolean;
  /** 给参与列自动装公式编辑器，默认 true；列上已有 `renderEditor` 时不覆盖 */
  editor?: boolean;
  /** 点到公式格时把它引用的格/区域框出来（Excel 的 range finder），默认 true */
  highlightRefs?: boolean;
  /** 当前格变化（点表体）。`null` 表示点到了不参与公式的地方 */
  onActiveCellChange?: (ref: string | null) => void;
  /** 每轮重算之后触发，`changed` 是写回的格数 */
  onRecalculated?: (info: { changed: number; errors: number }) => void;
}

export function vtFormula<T extends Record<string, unknown> = Record<string, unknown>>(
  _options: FormulaCellOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtFormula',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtFormula');
    },
  };
}

/** 计算列的公式：表达式字符串，或一个直接算出值的函数 */
export type ColumnFormula<T extends Record<string, unknown> = Record<string, unknown>> =
  | string
  | ((row: T) => unknown);

export interface FormulaColumnOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  /** 列 key → 公式。key 必须是**已经存在的列**（或行数据里的字段） */
  columns: Record<string, ColumnFormula<T>>;
  /** 自定义函数（覆盖同名内置），名字大小写不敏感 */
  functions?: Record<string, (...args: never[]) => unknown>;
  /** 数据变化时自动重算，默认 true。关掉就只有手动 API 会算 */
  autoEvaluate?: boolean;
  /** 编译或求值出错时回调（每列每种错误只报一次，避免刷屏） */
  onError?: (info: { colKey: string; code: string; detail: string }) => void;
}

export function vtFormulaColumn<T extends Record<string, unknown> = Record<string, unknown>>(
  _options: FormulaColumnOptions<T>,
): VirtTablePlugin<T> {
  return {
    name: 'vtFormulaColumn',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtFormulaColumn');
    },
  };
}

/** 真包用 `declare module` 注入这些方法，这里照做一份 —— **全部可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    /** 取某格的公式原文（`'=I2-H2'`），不是公式格则 `null` */
    getCellFormula?(ref: string): string | null;
    /**
     * 写某格的**输入**并增量重算：以 `=` 开头当公式，否则当字面值
     * （删掉这一格的公式、直接写值）—— 与 Excel 里「把公式改成常数」一致。
     */
    setCellFormula?(ref: string, input: string): boolean;
    /** 取某格算完之后的值 */
    getCellValue?(ref: string): unknown;
    /** 把 `fromRef` 的公式按相对引用填到 `toRef`（单格或区域），返回填了几格 */
    fillFormula?(fromRef: string, toRef: string): number;
    /** 全量重算，返回写回的格数 */
    recalculate?(): number;
    /** 当前所有出错的格 */
    getSheetErrors?(): Array<{ id: string; code: string; detail: string }>;
    /** 谁引用了这一格（直接依赖者） */
    getCellDependents?(ref: string): string[];
    /** 这一格的公式引用了哪些格/区域，区域保持整体（`vtFormula`） */
    getCellReferences?(
      ref: string,
    ): Array<{ text: string; rect: { top: number; left: number; bottom: number; right: number } }>;
    /** 高亮某格引用的格/区域，传 null 清除；返回画出的框数（`vtFormula`） */
    highlightCellReferences?(ref: string | null): number;

    // ---- 以下是计算列那一档（`vtFormulaColumn`） ----
    /** 对一批行求值并写回，返回写回的格子数；不传则算当前数据 */
    evaluateFormulas?(rows?: Record<string, unknown>[]): number;
    /** 全量重算当前数据，必要时重跑管线 */
    recalculateFormulas?(): number;
    /** 运行时换某列的公式，传 null 撤掉 */
    setColumnFormula?(
      colKey: string,
      formula: string | ((row: Record<string, unknown>) => unknown) | null,
    ): boolean;
    /** 某列的公式原文；没有则 null */
    getColumnFormula?(colKey: string): string | null;
    /** 编译期错误：列 key → 错误码与原因 */
    getFormulaErrors?(): Record<string, { code: string; detail: string }>;
  }
}
