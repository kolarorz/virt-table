# 类型定义

React 端特有的类型：列类型、组件 props、ref 暴露的方法。其余类型从 `@virt-table/vanilla` 原样透传。

```ts
import type React from 'react';
import type {
  VirtTableOptions,
  VirtTableColumn,
  MergeCell,
  CellRenderContext,
  CellEditContext,
  HeaderRenderContext,
  ExpandRenderContext,
  VirtTable,
} from '@virt-table/vanilla';

interface ReactTableColumn<T = Record<string, unknown>> extends Omit<
  VirtTableColumn<T>,
  'render' | 'renderHeader' | 'renderEditor' | 'renderExpandRow'
> {
  render?: (
    ctx: CellRenderContext<T>,
  ) => React.ReactNode | string | HTMLElement;
  renderHeader?: (
    ctx: HeaderRenderContext<T>,
  ) => React.ReactNode | string | HTMLElement;
  renderEditor?: (
    ctx: CellEditContext<T>,
  ) => React.ReactNode | HTMLElement | null | void;
  renderExpandRow?: (
    ctx: ExpandRenderContext<T>,
  ) => React.ReactNode | string | HTMLElement;
}

interface VirtTableProps {
  columns: ReactTableColumn<any>[];
  options: Omit<VirtTableOptions<Record<string, unknown>>, 'columns'>;
  style?: React.CSSProperties;
  className?: string;
}

interface VirtTableRef {
  getTable: () => VirtTable<Record<string, unknown>> | null;
  scrollToIndex: (index: number) => void;
  scrollIntoView: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToOffset: (offset: number) => void;
  scrollToCell: (row: number, col: number) => void;
  reset: () => void;
  setList: (list: Record<string, unknown>[]) => void;
  setColumns: (columns: ReactTableColumn[]) => void;
  setMerges: (merges: MergeCell[]) => void;
  getMerges: () => MergeCell[] | undefined;
  getEffectiveMerges: (rowBegin?: number, rowEnd?: number) => MergeCell[] | undefined;
  setHeaderMerges: (merges: MergeCell[], headerData?: string[][]) => void;
  setFooterData: (data: string[][], merges?: MergeCell[]) => void;
  forceUpdate: () => void;
  getCheckedRows: () => Record<string, unknown>[] | undefined;
  getCheckedKeys: () => string[] | undefined;
  setActiveCell: (rowKey: string | null, colKey: string | null) => void;
  getActiveCell: () => { rowKey: string; colKey: string } | null | undefined;
  getState: () => VirtTableState | undefined;
  setState: (state: VirtTableState | null) => boolean | undefined;
  setCheckedRows: (keys: string[]) => void;
  clearCheckedRows: () => void;
  toggleExpand: (rowKey: string) => void;
  toggleFold: (rowKey: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setColumnFilter: (key: string, vals: unknown[]) => void;
  clearAllFilters: () => void;
  getActiveFilters: () => Record<string, unknown[]> | undefined;
  getCellSelection: () =>
    | {
        startRow: number;
        startCol: number;
        endRow: number;
        endCol: number;
      }
    | null
    | undefined;
  clearCellSelection: () => void;
  // ↓ 插件注入的方法（装载对应插件后自动出现在 ref 上）
  hideContextMenu: () => void;          // vtContextMenu
  exportCsv: (opts?: ExportOptions) => void;    // vtExport
  exportExcel: (opts?: ExportOptions) => void;  // vtExport
  print: (opts?: { title?: string }) => void;   // vtExport
  openSearch: () => void;               // vtSearch
  closeSearch: () => void;              // vtSearch
  search: (term: string) => void;       // vtSearch
  nextMatch: () => void;                // vtSearch
  prevMatch: () => void;                // vtSearch
  getSearchMatches: () => SearchMatch[];// vtSearch
  getCellSelection: () => CellSelectionRange | null;   // vtCellSelection
  setCellSelection: (range: CellSelectionRange | null) => void;  // vtCellSelection
  clearCellSelection: () => void;                      // vtCellSelection
  openCellEditor: (row: number, col: number) => void;  // vtCellEditor
  closeCellEditor: () => void;                         // vtCellEditor
  isCellEditing: () => boolean;                        // vtCellEditor
  openColumnFilter: (colKey: string) => void;          // vtColumnFilter
  closeColumnFilter: () => void;                       // vtColumnFilter
  toggleFieldConfig: (anchor?: HTMLElement) => void;  // vtFieldConfig
  openFieldConfig: (anchor?: HTMLElement) => void;    // vtFieldConfig
  closeFieldConfig: () => void;                       // vtFieldConfig
  isFieldConfigOpen: () => boolean;                   // vtFieldConfig
}
```

插件方法的类型来自 vanilla 的 `VirtTablePluginApi`（被 `VirtTableRef` 继承），封装里没有手写转发——ref 会把它们自动回落到插件 API。
