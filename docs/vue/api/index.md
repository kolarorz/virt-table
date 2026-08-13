# Vue API

## 组件 Props

| 属性      | 类型                                | 必填 | 说明                                             |
| --------- | ----------------------------------- | ---- | ------------------------------------------------ |
| `columns` | `VueTableColumn[]`                  | 是   | 列配置                                           |
| `options` | `Omit<VirtTableOptions, 'columns'>` | 是   | 表格全局配置（不含 `columns`，由 prop 单独传入） |

组件会自动监听 `options.list` 变化并调用 `setList` 更新数据（提供 `loadData` / `onLoadMore` 时例外——那种情况下数据由表格远程累积，见「服务端数据 / 无限滚动」）。

## VirtTableOptions

全局表格配置项。Vue 组件通过 `options` prop 传入（`columns` 单独通过 `columns` prop 传入）。配置项与 Vanilla 版一致。

| 属性                    | 类型                                                             | 默认值                                      | 说明                           |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------- | ------------------------------ |
| `list`                  | `T[]`                                                            | —                                           | **必填**。数据源数组           |
| `itemKey`               | `string`                                                         | `'id'`                                      | 行唯一标识字段名               |
| `estimatedSize`           | `number`                                                         | —                                           | **必填**。行预估高度（px）     |
| `itemGap`               | `number`                                                         | `0`                                         | 行间距（px）                   |
| `fixedSize`             | `boolean`                                                        | `false`                                     | 固定行高模式                   |
| `buffer`                | `number`                                                         | `0`                                         | 上下渲染缓冲行数               |
| `bufferTop`             | `number`                                                         | `buffer`                                    | 向上缓冲行数                   |
| `bufferBottom`          | `number`                                                         | `buffer`                                    | 向下缓冲行数                   |
| `edgeThreshold`         | `number`                                                         | `0`                                         | 触发 toTop/toBottom 的阈值距离（旧名 `scrollDistance`） |
| `start`                 | `number`                                                         | `0`                                         | 初始化滚动到的行索引           |
| `offset`                | `number`                                                         | `0`                                         | 初始化滚动到的偏移量           |
| `renderControl`         | `(begin: number, end: number) => { begin: number; end: number }` | —                                           | 自定义渲染区间                 |
| `colBuffer`             | `number`                                                         | `0`                                         | 横向列缓冲数                   |
| `merges`                | `MergeCell[]`                                                    | —                                           | 表体合并单元格                 |
| `headerData`            | `string[][]`                                                     | —                                           | 手写多行表头数据（与列 `children` 互斥） |
| `headerMerges`          | `MergeCell[]`                                                    | —                                           | 表头合并单元格                 |
| `footerData`            | `string[][]`                                                     | —                                           | 表尾数据                       |
| `footerMerges`          | `MergeCell[]`                                                    | —                                           | 表尾合并单元格                 |
| `border`                | `boolean`                                                        | `false`                                     | 显示边框                       |
| `stripe`                | `boolean`                                                        | `false`                                     | 斑马纹                         |
| `showHeader`            | `boolean`                                                        | `true`                                      | 显示表头                       |
| `showFooter`            | `boolean`                                                        | `true`                                      | 显示表尾                       |
| `emptyText`             | `string`                                                         | `'暂无数据'`                                | 空数据提示                     |
| `align`                 | `'left' \| 'center' \| 'right'`                                  | —                                           | 全局水平对齐                   |
| `vAlign`                | `'top' \| 'middle' \| 'bottom'`                                  | —                                           | 全局垂直对齐                   |
| `headerAlign`           | `'left' \| 'center' \| 'right'`                                  | —                                           | 表头水平对齐                   |
| `headerVAlign`          | `'top' \| 'middle' \| 'bottom'`                                  | —                                           | 表头垂直对齐                   |
| `footerAlign`           | `'left' \| 'center' \| 'right'`                                  | —                                           | 表尾水平对齐                   |
| `footerVAlign`          | `'top' \| 'middle' \| 'bottom'`                                  | —                                           | 表尾垂直对齐                   |
| `cellType`              | `'text' \| 'number' \| 'rich-text' \| 'image' \| 'option' \| 'checkbox'` | —                                           | 表级内容类型兜底，见[单元格渲染](/vue/guide/cell-render) |
| `textOverflow`          | `'ellipsis' \| 'tooltip'`                             | —                                           | 文本溢出处理，见 [Vanilla 说明](/vanilla/api/#溢出文本-tooltip) |
| `tooltip`               | `{ delay?: number }`                                             | `{ delay: 150 }`                            | tooltip 浮层配置；`delay` 为悬停延迟（ms），`0` 为立即弹 |
| `highlightHoverRow`     | `boolean`                                                        | —                                           | 悬停高亮行                     |
| `highlightSelectRow`    | `boolean`                                                        | —                                           | 选中高亮行                     |
| `highlightSelectCol`    | `boolean`                                                        | —                                           | 选中高亮列                     |
| `highlightSelectCell`   | `boolean`                                                        | —                                           | 选中高亮单元格                 |
| `headerClass`           | `string`                                                         | —                                           | 表头 CSS 类名                  |
| `headerStyle`           | `string`                                                         | —                                           | 表头内联样式                   |
| `rowClass`              | `string \| ((row, index) => string)`                             | —                                           | 行 CSS 类名                    |
| `rowStyle`              | `string \| ((row, index) => string)`                             | —                                           | 行内联样式                     |
| `cellClass`             | `string \| ((column, row) => string)`                            | —                                           | 单元格 CSS 类名                |
| `cellStyle`             | `string \| ((column, row) => string)`                            | —                                           | 单元格内联样式                 |
| `defaultExpandAll`      | `boolean`                                                        | `false`                                     | 默认展开所有节点               |
| `groupConfig`           | `{ field: string; sort?: 'asc' \| 'desc' }[]`                    | —                                           | 分组配置                       |
| `onCellSelectionChange` | `(range) => void`                                                | —                                           | 框选变化回调                   |
| `plugins`               | `VirtTablePlugin<any>[]`                                         | —                                           | 插件列表，如 `[vtContextMenu(fn)]`（见 [插件机制](/vanilla/api/#插件机制)） |
| `onFilterChange`        | `(filters) => void`                                              | —                                           | 筛选变化                       |
| `onCheckChange`         | `(checked, row) => void`                                         | —                                           | 单行勾选变化                   |
| `onCheckAll`            | `(checked) => void`                                              | —                                           | 全选变化                       |
| `onExpandChange`        | `(row, expandedKeys) => void`                                    | —                                           | 展开行变化                     |
| `onTreeToggle`          | `(row, expanded) => void`                                        | —                                           | 树节点切换                     |
| `onGroupToggle`         | `(row, expanded) => void`                                        | —                                           | 分组切换                       |
| `onRowRemoved`          | `(tr) => void`                                                   | —                                           | 行 DOM 回收回调                |
| `dataMode`              | `'client' \| 'server'`                                           | `'client'`                                  | 快捷方式：`'server'` 等价三个 manual 全开 |
| `manualSorting`         | `boolean`                                                        | —                                           | 排序交给服务端                 |
| `manualFiltering`       | `boolean`                                                        | —                                           | 筛选交给服务端                 |
| `manualPagination`      | `boolean`                                                        | —                                           | 分页/加载交给服务端            |
| `loadData`              | `(req: DataRequest) => Promise<DataResponse<T>>`                 | —                                           | 取数糖层（见「服务端数据 / 无限滚动」） |
| `onLoadMore`            | `(ctx: LoadMoreContext<T>) => void \| Promise<void>`             | —                                           | 受控层取数（优先于 `loadData`）  |
| `onLoadPrev`            | `(ctx: LoadMoreContext<T>) => void \| Promise<void>`             | —                                           | 受控层向上加载                 |
| `infinite`              | `{ enabled?; pageSize?; distance?; autoLoadFirst?; manual?; direction?; showNoMore? }` | —             | 无限滚动配置（存在即启用）     |
| `onLoad`                | `(res, req) => void`                                             | —                                           | 每批取回后触发                 |
| `onLoadError`           | `(err, req) => void`                                             | —                                           | 取数失败                       |
| `onRemoteStateChange`   | `(state: RemoteState) => void`                                   | —                                           | 远程状态变化                   |
| `loadChildren`          | `(row, ctx) => Promise<T[]> \| T[]`                               | —                                           | 树形子节点懒加载               |
| `hasChildren`           | `(row) => boolean`                                               | 读 `row.hasChildren`                        | 未加载时是否显示展开箭头       |
| `onChildrenLoaded`      | `(row, children) => void`                                        | —                                           | 子节点取回后触发               |
| `onChildrenLoadError`   | `(row, err) => void`                                             | —                                           | 子节点取数失败                 |

## VueTableColumn

列配置项，继承 `VirtTableColumn` 除渲染函数外的所有属性。渲染函数支持返回 Vue `VNode`。

| 属性             | 类型                                            | 默认值 | 说明                 |
| ---------------- | ----------------------------------------------- | ------ | -------------------- |
| `key`            | `string`                                        | —      | **必填**。列标识     |
| `title`          | `string`                                        | —      | **必填**。列标题     |
| `width`          | `number`                                        | —      | **必填**。列宽（px） |
| `children`       | `VueTableColumn[]`               | —      | 子列 —— 配置即成为多级分组表头的分组节点 |
| `footerValue`    | `string \| number`      | —      | 多级分组表尾：该节点表尾格的静态内容 |
| `renderFooter`   | `(ctx: FooterRenderContext<T>) => …` | —      | 多级分组表尾：该节点表尾格的自定义渲染 |
| `fixed`          | `'left' \| 'right'`                             | —      | 固定列               |
| `type`           | `'index' \| 'checkbox' \| 'expand' \| 'tree'`   | —      | 特殊列类型           |
| `align`          | `'left' \| 'center' \| 'right'`                 | —      | 水平对齐             |
| `vAlign`         | `'top' \| 'middle' \| 'bottom'`                 | —      | 垂直对齐             |
| `headerAlign`    | `'left' \| 'center' \| 'right'`                 | —      | 表头水平对齐         |
| `headerVAlign`   | `'top' \| 'middle' \| 'bottom'`                 | —      | 表头垂直对齐         |
| `footerAlign`    | `'left' \| 'center' \| 'right'`                 | —      | 表尾水平对齐         |
| `footerVAlign`   | `'top' \| 'middle' \| 'bottom'`                 | —      | 表尾垂直对齐         |
| `cellType`       | `'text' \| 'number' \| 'rich-text' \| 'image' \| 'option' \| 'checkbox'` | —      | 内容类型，见[单元格渲染](/vue/guide/cell-render) |
| `textOverflow`   | `'ellipsis' \| 'tooltip'`            | —      | 文本溢出             |
| `resizable`      | `boolean`                                       | —      | 可调整列宽           |
| `minWidth`       | `number`                                        | —      | 最小列宽             |
| `maxWidth`       | `number`                                        | —      | 最大列宽             |
| `render`         | `(ctx) => VNode \| string \| HTMLElement`       | —      | 自定义单元格渲染     |
| `renderHeader`   | `(ctx) => VNode \| string \| HTMLElement`       | —      | 自定义表头渲染       |
| `renderEditor`     | `(ctx) => VNode \| HTMLElement \| null \| void` | —      | 自定义编辑渲染       |
| `editorChrome`   | `boolean`                                      | `true` | 编辑浮层是否替这一列画外观（边框 / focus 环）。用 Element Plus 等第三方组件时设 `false`，否则会叠两层边框、激活前后高度也对不上；整表统一可用 `vtCellEditor({ chrome: false })` |
| `renderExpandRow`   | `(ctx) => VNode \| string \| HTMLElement`       | —      | 自定义展开内容       |
| `filters`        | `Array<{ label, value, checked? }>`             | —      | 列筛选选项           |
| `filterMultiple` | `boolean`                                       | —      | 多选筛选             |
| `filterMethod`   | `(value, row) => boolean`                       | —      | 自定义筛选           |

### 自定义渲染示例

```vue
<script setup lang="ts">
import { h } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';

const columns: VueTableColumn[] = [
  {
    key: 'status',
    title: '状态',
    width: 120,
    render: ({ value }) =>
      h(
        'span',
        { style: { color: value === 'active' ? 'green' : 'red' } },
        String(value),
      ),
  },
];
</script>
```

## MergeCell

合并单元格配置。

| 属性       | 类型     | 说明       |
| ---------- | -------- | ---------- |
| `rowIndex` | `number` | 起始行索引 |
| `colIndex` | `number` | 起始列索引 |
| `rowspan`  | `number` | 合并行数   |
| `colspan`  | `number` | 合并列数   |

## 实例方法

通过 `ref` 访问组件暴露的方法（组件卸载前调用）。

| 方法                 | 参数                                           | 返回值                                                        | 说明                              |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------- | --------------------------------- |
| `getTable`           | —                                              | `VirtTable \| null`                                           | 获取底层 Vanilla 实例             |
| `scrollToIndex`      | `index: number`                                | `void`                                                        | 滚动到指定行                      |
| `scrollIntoView`     | `index: number`                                | `void`                                                        | 将行滚入可视区域                  |
| `scrollToTop`        | —                                              | `void`                                                        | 滚动到顶部                        |
| `scrollToBottom`     | —                                              | `void`                                                        | 滚动到底部                        |
| `scrollToOffset`     | `offset: number`                               | `void`                                                        | 滚动到像素偏移                    |
| `scrollToCell`       | `row: number, col: number`                     | `void`                                                        | 滚动到单元格                      |
| `reset`              | —                                              | `void`                                                        | 重置虚拟滚动                      |
| `setList`            | `list: Record<string, unknown>[]`              | `void`                                                        | 更新数据                          |
| `setColumns`         | `columns: VueTableColumn[]`                    | `void`                                                        | 更新列（支持 VNode 渲染）         |
| `setMerges`          | `merges: MergeCell[]`                          | `void`                                                        | 更新表体合并                      |
| `getMerges`          | —                                              | `MergeCell[]`                                                 | 静态合并配置（不含自动合并）      |
| `getEffectiveMerges` | `rowBegin?, rowEnd?`                           | `MergeCell[]`                                                 | 实际生效的合并块（含自动合并真实段） |
| `setHeaderMerges`    | `merges: MergeCell[], headerData?: string[][]` | `void`                                                        | 更新表头合并                      |
| `setFooterData`      | `data: string[][], merges?: MergeCell[]`       | `void`                                                        | 更新表尾                          |
| `forceUpdate`        | —                                              | `void`                                                        | 强制重渲染（含编辑态 VNode 刷新） |
| `getCheckedRows`     | —                                              | `Record<string, unknown>[] \| undefined`                      | 勾选行数据（按当前 `list` 过滤）  |
| `getCheckedKeys`     | —                                              | `string[] \| undefined`                                       | 全部已勾选 key（含不在当前页的） |
| `getState`           | —                                              | `VirtTableState \| undefined`                                  | 导出可持久化视图状态 |
| `setState`           | `state: VirtTableState \| null`                | `boolean \| undefined`                                        | 应用状态（只应用出现的字段） |
| `setCheckedRows`     | `keys: string[]`                               | `void`                                                        | 设置勾选                          |
| `clearCheckedRows`   | —                                              | `void`                                                        | 清除勾选                          |
| `setActiveCell`      | `rowKey: string \| null, colKey: string \| null` | `void`                                                      | 标记激活态（当前单元格描边），`null` 清除 |
| `getActiveCell`      | —                                              | `{ rowKey, colKey } \| null \| undefined`                     | 当前激活的单元格                  |
| `toggleExpand`       | `rowKey: string`                               | `void`                                                        | 切换展开行                        |
| `toggleFold`         | `rowKey: string`                               | `void`                                                        | 切换树/分组折叠                   |
| `expandAll`          | —                                              | `void`                                                        | 全部展开                          |
| `collapseAll`        | —                                              | `void`                                                        | 全部折叠                          |
| `setColumnFilter`    | `key: string, vals: unknown[]`                 | `void`                                                        | 设置列筛选                        |
| `clearAllFilters`    | —                                              | `void`                                                        | 清除筛选                          |
| `getActiveFilters`   | —                                              | `Record<string, unknown[]> \| undefined`                      | 获取当前筛选                      |
| `getCellSelection`   | —                                              | `{ startRow, startCol, endRow, endCol } \| null \| undefined` | 获取框选区域                      |
| `clearCellSelection` | —                                              | `void`                                                        | 清除框选                          |
| `getLeafColumns`     | —                                              | `VueTableColumn[] \| undefined`                                | 全量叶子列（含隐藏）              |
| `getHeaderDepth`     | —                                              | `number \| undefined`                                         | 表头行数（= 列树深度）            |
| `hideContextMenu`    | —                                              | `void`                                                        | 隐藏右键菜单（`vtContextMenu` 插件注入，ref 自动透传）|
| `reload`             | —                                              | `void`                                                        | 清空并重新取第一批                |
| `refresh`            | —                                              | `void`                                                        | 重拉已加载区间，保留滚动位置      |
| `loadMore`           | —                                              | `void`                                                        | 手动加载下一批                    |
| `loadPrev`           | —                                              | `void`                                                        | 手动加载更早一批                  |
| `retryLoad`          | —                                              | `void`                                                        | 重试上次失败的请求                |
| `getRemoteState`     | —                                              | `RemoteState \| null \| undefined`                            | 远程状态快照                      |
| `setLoadData`        | `loadData`                                     | `void`                                                        | 运行时替换取数实现                |
| `appendRows`         | `rows`                                         | `void`                                                        | 手动追加数据                      |
| `prependRows`        | `rows`                                         | `void`                                                        | 手动前插数据（含滚动补偿）        |
| `setHasMore`         | `hasMore: boolean, dir?: 'down' \| 'up'`       | `void`                                                        | 手动控制触发闸门                  |
| `setCursor`          | `cursor: string \| null, dir?: 'down' \| 'up'` | `void`                                                        | 手动推进游标                      |
| `loadChildrenFor`    | `rowKey: string`                               | `void`                                                        | 主动取某树节点的子节点                      |
| `resetLazyNode`      | `rowKey: string, clearChildren?: boolean`      | `void`                                                        | 清缓存，下次展开重取                        |

## 类型定义

```ts
import type { VNode } from 'vue';
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

interface VueTableColumn<T = Record<string, unknown>> extends Omit<
  VirtTableColumn<T>,
  'render' | 'renderHeader' | 'renderEditor' | 'renderExpandRow'
> {
  render?: (ctx: CellRenderContext<T>) => VNode | string | HTMLElement;
  renderHeader?: (ctx: HeaderRenderContext<T>) => VNode | string | HTMLElement;
  renderEditor?: (ctx: CellEditContext<T>) => VNode | HTMLElement | null | void;
  renderExpandRow?: (ctx: ExpandRenderContext<T>) => VNode | string | HTMLElement;
}

// 组件 Props
interface VirtTableVueProps {
  columns: VueTableColumn<any>[];
  options: Omit<VirtTableOptions<Record<string, unknown>>, 'columns'>;
}

// ref 暴露的方法
interface VirtTableVueExposed {
  getTable: () => VirtTable<Record<string, unknown>> | null;
  scrollToIndex: (index: number) => void;
  scrollIntoView: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToOffset: (offset: number) => void;
  scrollToCell: (row: number, col: number) => void;
  reset: () => void;
  setList: (list: Record<string, unknown>[]) => void;
  setColumns: (columns: VueTableColumn[]) => void;
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
  toggleColumnPanel: (anchor?: HTMLElement) => void;  // vtColumnPanel
  openColumnPanel: (anchor?: HTMLElement) => void;    // vtColumnPanel
  closeColumnPanel: () => void;                       // vtColumnPanel
  isColumnPanelOpen: () => boolean;                   // vtColumnPanel
}
```

插件方法的类型来自 vanilla 的 `VirtTablePluginApi`（被 `VirtTableRef` 继承），封装里没有手写转发——ref 会把它们自动回落到插件 API。

## 多级分组表头

给列配置 `children` 即可得到多级分组表头：带 `children` 的节点是**分组节点**（自身不承载数据，只在表头占一格并横跨其全部叶子后代），叶子才是真正的数据列。表头与表体一起做横向虚拟化。

```ts
const columns: VueTableColumn[] = [
  // fixed 写在分组上，会强制下发给所有后代
  { key: 'g_base', title: '基础信息', width: 0, fixed: 'left', children: [
    { key: 'index', title: '#', width: 56, type: 'index' },
    { key: 'name', title: '门店', width: 140, sortable: true },
  ]},
  { key: 'y2024', title: '2024 年', width: 0, children: [
    { key: 'q1_rev', title: 'Q1 营收', width: 110, align: 'right' },
    { key: 'q2_rev', title: 'Q2 营收', width: 110, align: 'right' },
  ]},
];
```

## 多级分组表尾

表尾与表头**同序**（最外层分组在上、叶子小计在下），网格与表头逐行一致，因此复用同一份表头网格与同一套横向虚拟化裁剪规则——列很多时表尾也只渲染视口内的列。

**启用条件**：列树里有分组节点，并且表尾有内容来源——开了 `showSummary`，或任一节点配了 `footerValue` / `renderFooter`。否则退回 `footerData` / `footerMerges` 的扁平表尾（两者互斥）。

**每格内容优先级**：`renderFooter` > `footerValue` > `summary`/`summaryMethod` 自动聚合 > 合计标签（仅整表首列的叶子格）> 空。

**分组格聚合语义**：把该格覆盖的**全部叶子列 × 全部行**的原始值摊平成一维 `values`，再交给 `summaryMethod`（优先）或内置 `summary`。因此 `count` 在分组格上统计的是摊平后的单元格数而非行数。聚合始终基于当前视图（筛选/排序后），数据变化自动重算。

```ts
{ key: 'y2024', title: '2024 年', width: 0,
  summary: 'sum',                      // 分组：聚合旗下全部叶子列
  children: [
    { key: 'q1_rev', title: 'Q1 营收', width: 110, summary: 'sum' },
    { key: 'q1_rate', title: 'Q1 毛利率', width: 110, footerValue: '—' },
  ]}
```

### 约束

数据相关配置（`render` / `sortable` / `filters` / `type` …）写在**叶子列**上；分组节点只需要 `title` 或 `renderHeader`（`ctx.isGroup` 可判断是否分组）。与 `headerData` / `headerMerges` 互斥。详见 [Vanilla API · 多级分组表头](/vanilla/api/#多级分组表头)。

## 服务端数据 / 无限滚动

配置项与 Vanilla 一致，写在 `options` 里即可；完整语义（竞态处理、`hasMore` 推导、限制）见 [Vanilla API · 服务端数据 / 无限滚动](/vanilla/api/#服务端数据-无限滚动)。

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { VirtTableVue, type DataRequest, type DataResponse, type RemoteState } from '@virt-table/vue';

interface Row extends Record<string, unknown> { id: number; name: string }

const tableRef = ref<InstanceType<typeof VirtTableVue> | null>(null);
const remote = ref<RemoteState | null>(null);

const columns = [
  { key: 'id', title: 'ID', width: 80, sortable: true },
  { key: 'name', title: '姓名', width: 220 },
];

const options = reactive({
  list: [] as Row[],
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  border: true,
  dataMode: 'server' as const,
  infinite: { pageSize: 50 },
  async loadData(req: DataRequest): Promise<DataResponse<Row>> {
    const res = await fetch(`/api/rows?offset=${req.offset}&limit=${req.pageSize}`, { signal: req.signal });
    const { rows, total } = await res.json();
    return { rows, total };
  },
  onRemoteStateChange: (st: RemoteState) => { remote.value = st; },
});
</script>

<template>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  <button @click="tableRef?.reload()">重新加载</button>
</template>
```

::: tip 取数回调无需保持引用稳定
组件内部把 `loadData` / `onLoadMore` / `onLoadPrev` / `onLoad` / `onLoadError` / `onRemoteStateChange` 包了一层读 `props.options` 的转发函数，因此**父组件整体替换 `options` 对象也不会重建表格或重复取数**，同时拿到的始终是最新实现。
:::

::: tip 远程模式下 `options.list` 只作为初始值
组件平时会监听 `options.list` 变化并 `setList`（整批替换）。但**一旦提供了 `loadData` / `onLoadMore`，这个同步就会跳过**——否则父组件重建 `options`（含新的 `list: []` 字面量）会把表格刚累积的数据清空。远程模式下数据归表格管，要改数据用 `reload()` / `appendRows()`。
:::

完整 `VirtTableOptions`、`VirtTableColumn`、`MergeCell` 及上下文类型定义见 [Vanilla API](/vanilla/api/)。
