/**
 * 插件总入口：`@virt-table/vanilla/plugins`
 *
 * 这里只是个 barrel。**插件不再从主入口 `@virt-table/vanilla` 导出**——主入口
 * 里带着它们的话，插件代码与各自的 CSS 都会落进核心 chunk，tree-shaking 与
 * CSS 拆分都失效。想要更细的粒度可以直接引单个插件：
 *
 * ```ts
 * import { vtExport } from '@virt-table/vanilla/plugins';          // 走 barrel
 * import { vtExport } from '@virt-table/vanilla/plugins/export';   // 只引这一个
 * ```
 *
 * 两种写法在支持 `sideEffects` 的打包器下产物一致（本包已标 `sideEffects:
 * ["**\/*.css"]`）；子路径写法对不做 tree-shaking 的场景更保险。
 *
 * 带独立 CSS 的插件在自己的模块里 `import './x.css'`，构建时产出同名
 * `dist/plugins/x.css`，按需引入即可（都依赖 `core.css` 提供的 `--vt-*` 变量）。
 */
export {
  vtContextMenu,
  type ContextMenuProvider,
  type ContextMenuContext,
  type ContextMenuItem,
} from './context-menu';
export { vtExport, type ExportOptions } from './export';
export {
  vtClipboard,
  type ClipboardOptions,
  type ClipboardSelectionRange,
  type ClipboardCopyContext,
  type ClipboardCopyResult,
  type ClipboardPasteContext,
} from './clipboard';
export { vtSearch, type SearchOptions, type SearchMatch } from './search';
export { vtColumnPanel, type ColumnPanelOptions } from './column-panel';
export { vtCellSelection, type CellSelectionOptions } from './cell-selection';
export { vtKeyboardNav } from './keyboard-nav';
export { vtColumnFilter, type ColumnFilterOptions } from './column-filter';
export {
  vtColumnDrag,
  vtRowDrag,
  type ColumnDragOptions,
  type RowDragOptions,
} from './drag-sort';
export {
  vtCellEditor,
  type CellEditorOptions,
  type CellEditorService,
} from './cell-editor';
export {
  vtAIQuery,
  type AIQueryOptions,
  type AIQueryResolveInput,
  type AIQueryResult,
} from './ai-query';
export {
  vtAIStream,
  type AIStreamOptions,
  type AIStreamState,
  type AIStreamStatus,
  type AIStreamChunk,
  type AIStreamConsumeOptions,
} from './ai-stream';
export {
  vtAIColumn,
  type AIColumnOptions,
  type AIColumnCellState,
  type AIColumnCellStatus,
  type AIColumnComputeContext,
} from './ai-column';
// 列推断：agent / 模型产出的数据事前不知道 schema，这个从样本里把列算出来
export { inferColumns, humanizeKey, type InferColumnsOptions } from '../infer-columns';
// 自然语言查询的纯逻辑层：可脱离表格单独使用（例如在服务端预校验模型的产出）
export {
  buildAITableSchema,
  buildAIPromptContext,
  toAIToolJsonSchema,
  validateAIQuery,
  aiQueryToState,
  type AIQuery,
  type AIQueryIssue,
  type AIQueryValidation,
  type AITableSchema,
  type AITableColumnSchema,
  type AITableSchemaOptions,
} from '../ai-query';
