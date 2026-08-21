# 表格级 API

组件本身的 props 与作用于整张表的 `options`。字段语义与 Vanilla 完全一致（自动透传），完整说明见 [Vanilla API · 表格级](/vanilla/api/table)。

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
| `cellType`              | `'text' \| 'number' \| 'rich-text' \| 'image' \| 'option' \| 'checkbox'` | —                                           | 表级内容类型兜底，见[单元格渲染](/vue/api/cell)、[渲染粒度示例](/vue/examples/cell/render-levels) |
| `textOverflow`          | `'ellipsis' \| 'tooltip'`                             | —                                           | 文本溢出处理，见 [Vanilla 说明](/vanilla/examples/basic/overflow) |
| `tooltip`               | `{ delay?: number }`                                             | `{ delay: 150 }`                            | tooltip 浮层配置；`delay` 为悬停延迟（ms），`0` 为立即弹 |
| `highlightHoverRow`     | `boolean`                                                        | —                                           | 悬停高亮行；跨行合并格（`rowspan > 1`）不参与 |
| `highlightSelectRow`    | `boolean`                                                        | —                                           | 选中高亮行；跨行合并格同样不参与 |
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
| `plugins`               | `VirtTablePlugin<any>[]`                                         | —                                           | 插件列表，如 `[vtContextMenu(fn)]`（见 [插件机制](/vanilla/api/plugins)） |
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
