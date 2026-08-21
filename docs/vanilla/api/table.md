# 表格级 API

作用于**整张表**的配置：数据源、几何、外观兜底、主题、文案、以及可持久化的视图状态。
列级与单元格级配置会覆盖这里的同名项（优先级：单元格级 > 列级 > 表级）。

用法与边界在示例页：[暗夜模式 / 主题定制](/vanilla/examples/basic/theme)、
[国际化 i18n](/vanilla/examples/advanced/i18n)、[状态持久化](/vanilla/examples/advanced/state-persist)、
[无障碍 ARIA](/vanilla/examples/advanced/aria)。

## VirtTableOptions

全局表格配置项。继承自 `@virt-list/core` 的 `VirtListOptions`（不含 `horizontal`）。

| 属性                    | 类型                                                                                              | 默认值                                      | 说明                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| `list`                  | `T[]`                                                                                             | —                                           | **必填**。数据源数组                                        |
| `columns`               | `VirtTableColumn<T>[]`                                                                            | —                                           | **必填**。列配置（列树：节点带 `children` 即为分组表头）      |
| `itemKey`               | `string`                                                                                          | —                                           | **必填**。行唯一标识字段名                                  |
| `estimatedSize`           | `number`                                                                                          | —                                           | **必填**。行预估高度（px），用于初始布局与未测量行的占位    |
| `itemGap`               | `number`                                                                                          | `0`                                         | 行间距（px）                                                |
| `fixedSize`             | `boolean`                                                                                         | `false`                                     | 固定行高模式，跳过 ResizeObserver 测量                      |
| `buffer`                | `number`                                                                                          | `0`                                         | 上下渲染缓冲行数（同时作用于 `bufferTop` / `bufferBottom`） |
| `bufferTop`             | `number`                                                                                          | `buffer`                                    | 向上方向单独设置的缓冲行数                                  |
| `bufferBottom`          | `number`                                                                                          | `buffer`                                    | 向下方向单独设置的缓冲行数                                  |
| `edgeThreshold`         | `number`                                                                                          | `0`                                         | 触发 `toTop` / `toBottom` 事件的阈值距离（px）。旧名 `scrollDistance`，内核 0.0.4 起更名 |
| `start`                 | `number`                                                                                          | `0`                                         | 初始化后自动滚动到的行索引                                  |
| `offset`                | `number`                                                                                          | `0`                                         | 初始化后自动滚动到的偏移量                                  |
| `renderControl`         | `(begin: number, end: number) => { begin: number; end: number }`                                  | —                                           | 自定义渲染区间控制，覆盖默认 buffer 逻辑                    |
| `colBuffer`             | `number`                                                                                          | `0`                                         | 横向列虚拟滚动的缓冲列数                                    |
| `scrollbarAutoHide`     | `number`                                                                                          | `1200`                                      | 自绘滚动条停止滚动后淡出的延迟（ms）；`0` 表示常驻          |
| `scrollbarMinThumbSize` | `number`                                                                                          | `20`                                        | 自绘滚动条滑块的最小长度（px）                              |
| `merges`                | `MergeCell[]`                                                                                     | —                                           | 表体合并单元格配置                                          |
| `headerData`            | `string[][]`                                                                                      | —                                           | 手写多行表头数据，配合 `headerMerges` 使用（与列 `children` 互斥） |
| `headerMerges`          | `MergeCell[]`                                                                                     | —                                           | 表头合并单元格配置                                          |
| `footerData`            | `string[][]`                                                                                      | —                                           | 表尾数据                                                    |
| `footerMerges`          | `MergeCell[]`                                                                                     | —                                           | 表尾合并单元格配置                                          |
| `border`                | `boolean`                                                                                         | `false`                                     | 是否显示边框                                                |
| `stripe`                | `boolean`                                                                                         | `false`                                     | 是否显示斑马纹（跨行合并格不带斑马纹，见 [斑马纹](/vanilla/examples/basic/stripe)） |
| `showHeader`            | `boolean`                                                                                         | `true`                                      | 是否显示表头                                                |
| `showFooter`            | `boolean`                                                                                         | `true`                                      | 是否显示表尾（有 `footerData` 时生效）                      |
| `emptyText`             | `string`                                                                                          | `'暂无数据'`                                | 空数据提示文案                                              |
| `locale`                | `DeepPartial<VirtTableLocale>`                                                                    | `zhCN`                                       | 国际化文案覆盖（深合并；内置 `zhCN`/`enUS`，见[国际化 i18n](#国际化-i18n)） |
| `align`                 | `'left' \| 'center' \| 'right'`                                                                   | —                                           | 全局单元格水平对齐                                          |
| `vAlign`                | `'top' \| 'middle' \| 'bottom'`                                                                   | —                                           | 全局单元格垂直对齐                                          |
| `headerAlign`           | `'left' \| 'center' \| 'right'`                                                                   | —                                           | 全局表头水平对齐                                            |
| `headerVAlign`          | `'top' \| 'middle' \| 'bottom'`                                                                   | —                                           | 全局表头垂直对齐                                            |
| `footerAlign`           | `'left' \| 'center' \| 'right'`                                                                   | —                                           | 全局表尾水平对齐                                            |
| `footerVAlign`          | `'top' \| 'middle' \| 'bottom'`                                                                   | —                                           | 全局表尾垂直对齐                                            |
| `cellType`              | `'text' \| 'number' \| 'rich-text' \| 'image' \| 'option' \| 'checkbox'`                          | —                                           | **表级内容类型兜底**：没配 `render` / `cellType` 的列按它渲染（内容层最低一级，见[单元格渲染](./cell)） |
| `textOverflow`          | `'ellipsis' \| 'tooltip'`                                                              | —                                           | 文本溢出处理：`ellipsis` 仅省略号 / `tooltip` 省略号 + 内置浮层（见[溢出文本 tooltip](./cell#溢出文本-tooltip)） |
| `tooltip`               | `{ delay?: number }`                                                                              | `{ delay: 150 }`                            | `textOverflow: 'tooltip'` 的浮层配置；`delay` 为悬停延迟（ms），`0` 为立即弹 |
| `highlightHoverRow`     | `boolean`                                                                                         | —                                           | 鼠标悬停高亮整行；跨行合并格（`rowspan > 1`）不参与，它属于整段而不是某一行 |
| `highlightSelectRow`    | `boolean`                                                                                         | —                                           | 点击选中高亮整行；跨行合并格同样不参与（同 `highlightHoverRow`） |
| `highlightSelectCol`    | `boolean`                                                                                         | —                                           | 点击选中高亮整列                                            |
| `highlightSelectCell`   | `boolean`                                                                                         | —                                           | 点击选中高亮单元格（拖拽手柄列 `type:'drag'` 除外）         |
| `clearActiveCellOnOutside` | `boolean`                                                                                      | `true`                                       | 点到**单元格以外**时收起激活态与当前行列高亮。「以外」= 表头、表体空白、别的组件（甘特时间轴 pane 在表格根节点之外）、页面别处；**不含**另一个单元格、编辑浮层与各类弹层、右键中键。关掉则回到「只被点另一格替换」，那时也该关掉 `vtCellSelection` 的 `clearOnOutside` |
| `headerClass`           | `string`                                                                                          | —                                           | 表头行 CSS 类名                                             |
| `headerStyle`           | `string`                                                                                          | —                                           | 表头行内联样式                                              |
| `rowClass`              | `string \| ((row: T, index: number) => string)`                                                   | —                                           | 数据行 CSS 类名                                             |
| `rowStyle`              | `string \| ((row: T, index: number) => string)`                                                   | —                                           | 数据行内联样式                                              |
| `cellClass`             | `string \| ((column: VirtTableColumn<T>, row: T) => string)`                                      | —                                           | 单元格 CSS 类名                                             |
| `cellStyle`             | `string \| ((column: VirtTableColumn<T>, row: T) => string)`                                      | —                                           | 单元格内联样式                                              |
| `defaultExpandAll`      | `boolean`                                                                                         | `false`                                     | 是否默认展开所有展开行/树节点                               |
| `groupConfig`           | `{ field: string; sort?: 'asc' \| 'desc' }[]`                                                     | —                                           | 分组配置，按字段层级分组                                    |
| `onCellSelectionChange` | `(range: { startRow: number; startCol: number; endRow: number; endCol: number } \| null) => void` | —                                           | 框选区域变化回调                                            |
| `plugins`               | `VirtTablePlugin<T>[]`                                                                            | —                                           | 插件列表（见[插件机制](./plugins)）                                  |
| `onFilterChange`        | `(filters: Record<string, unknown[]>) => void`                                                    | —                                           | 列筛选变化回调                                              |
| `filterModel`           | `FilterModel`                                                                                     | —                                           | 高级筛选条件树（AND/OR，见[高级筛选](./data#高级筛选-筛选管理器)）                    |
| `onFilterModelChange`   | `(model: FilterModel) => void`                                                                    | —                                           | 高级筛选条件树变化回调                                      |
| `onCheckChange`         | `(checked: boolean, row: T) => void`                                                              | —                                           | 单行勾选变化回调                                            |
| `onCheckAll`            | `(checked: boolean) => void`                                                                      | —                                           | 全选/取消全选回调                                           |
| `onExpandChange`        | `(row: T, expandedKeys: string[]) => void`                                                        | —                                           | 展开行状态变化回调                                          |
| `onTreeToggle`          | `(row: T, expanded: boolean) => void`                                                             | —                                           | 树形节点展开/折叠回调                                       |
| `onGroupToggle`         | `(row: T, expanded: boolean) => void`                                                             | —                                           | 分组行展开/折叠回调                                         |
| `onRowRemoved`          | `(tr: HTMLTableRowElement) => void`                                                               | —                                           | 行 DOM 被回收时回调，用于清理自定义挂载                     |
| `dataMode`              | `'client' \| 'server'`                                                                            | `'client'`                                  | 快捷方式：`'server'` 等价于 `manualSorting`/`manualFiltering`/`manualPagination` 全开 |
| `manualSorting`         | `boolean`                                                                                         | —                                           | 排序交给服务端（跳过本地排序，改为重新取数）                |
| `manualFiltering`       | `boolean`                                                                                         | —                                           | 筛选交给服务端（跳过本地筛选，改为重新取数）                |
| `manualPagination`      | `boolean`                                                                                         | —                                           | 分页/加载交给服务端                                         |
| `loadData`              | `(req: DataRequest) => Promise<DataResponse<T>> \| DataResponse<T>`                               | —                                           | 取数糖层：给了它就由表格编排请求（见[服务端数据 / 无限滚动](./data#服务端数据-无限滚动)）|
| `onLoadMore`            | `(ctx: LoadMoreContext<T>) => void \| Promise<void>`                                              | —                                           | 受控层取数（优先于 `loadData`），用 `ctx.done/fail` 交付      |
| `onLoadPrev`            | `(ctx: LoadMoreContext<T>) => void \| Promise<void>`                                              | —                                           | 受控层向上加载（需 `infinite.direction` 含 `'up'`）           |
| `infinite`              | `{ enabled?; pageSize?; distance?; autoLoadFirst?; manual?; direction?; showNoMore? }`            | —                                           | 无限滚动配置（存在即启用）                                  |
| `onLoad`                | `(res: DataResponse<T>, req: DataRequest) => void`                                                | —                                           | 每批数据取回后触发（含首屏与追加）                          |
| `onLoadError`           | `(err: unknown, req: DataRequest) => void`                                                        | —                                           | 取数失败回调（已加载数据不受影响）                          |
| `onRemoteStateChange`   | `(state: RemoteState) => void`                                                                    | —                                           | 远程状态变化（loading/hasMore/total/page 等）               |
| `loadChildren`          | `(row: T, ctx: { level: number; signal: AbortSignal }) => Promise<T[]> \| T[]`                     | —                                           | 树形子节点懒加载：首次展开时取子节点（见[树形懒加载](./data#树形懒加载)）      |
| `hasChildren`           | `(row: T) => boolean`                                                                             | 读 `row.hasChildren`                        | 未加载时是否显示展开箭头                                    |
| `onChildrenLoaded`      | `(row: T, children: T[]) => void`                                                                 | —                                           | 子节点取回后触发                                            |
| `onChildrenLoadError`   | `(row: T, err: unknown) => void`                                                                  | —                                           | 子节点取数失败（节点回到折叠态，可再点重试）                 |

## 加载态

| 位置   | 字段/方法                       | 说明                     |
| ------ | ------------------------------- | ------------------------ |
| option | `loading?: boolean`             | 加载遮罩                 |
| option | `loadingText?: string`          | 遮罩文案（默认「加载中...」） |
| 方法   | `setLoading(loading: boolean)`  | 切换加载态               |

## 主题

| 位置 | 字段 / 方法 | 说明 |
| --- | --- | --- |
| option | `theme?: 'light' \| 'dark'` | 显式指定主题 |
| 方法 | `setTheme('light' \| 'dark')` | 显式切换主题 |
| CSS 变量 | `--vt-*`（声明在 `.vt-root` 上） | 颜色 / 圆角 / 间距 / 字号 / 阴影 / 动效时长全部可覆盖 |
| 密度类 | `.vt-compact`（30px）/ `.vt-loose`（50px） | 换密度必须同步改 `estimatedSize` |

暗色生效条件、派生色推导、完整变量清单与行高等式见[暗夜模式 / 主题定制](/vanilla/examples/basic/theme)。

## 国际化 i18n

| 位置 | 字段 / 方法 | 说明 |
| --- | --- | --- |
| option | `locale?: DeepPartial<VirtTableLocale>` | 覆盖内置文案，与 `zhCN` **深合并**（默认 `zhCN`） |
| 方法 | `setLocale(locale)` | 运行时切换 / 覆盖文案，即时刷新已渲染 DOM |
| 方法 | `getLocale()` | 返回当前生效的完整 `VirtTableLocale` |
| 导出 | `zhCN` / `enUS` | 内置语言包（三端均从各自入口 re-export） |
| 导出 | `mergeLocale(base, override?)` | 深合并两个 locale |

**优先级**：单项 option `emptyText` / `loadingText` / `summaryText` **高于** `locale` 对应项。
覆盖范围与几处不跟随运行时切换的例外见[国际化 i18n](/vanilla/examples/advanced/i18n)。

## 状态持久化

| 方法 | 返回 | 说明 |
| --- | --- | --- |
| `getState()` | `VirtTableState` | 完整快照（无高级筛选时 `filterModel` 为 `null`，不省略字段） |
| `setState(state \| null)` | `boolean` | 只应用**出现的字段**；`version` 不匹配整体忽略并返回 `false` |

```ts
interface VirtTableState {
  version: number;                                  // 结构版本，当前为 1
  columns?: Array<{ key: string; width?: number; hidden?: boolean }>;  // 数组顺序即列序
  sort?: SortSpec[];                                // 多列排序时数组顺序有意义
  columnFilters?: Record<string, unknown[]>;        // 列 key → 勾选值
  filterModel?: FilterModel;                        // 高级筛选条件树
  pagination?: { page?: number; pageSize?: number }; // 不含 total —— 它是派生的
}
```

存哪些、还原的 8 条边界（列宽是逻辑宽度、分组内列序、版本作废、隐藏列的筛选仍生效…）见
[状态持久化](/vanilla/examples/advanced/state-persist)。与 `getRemoteState()` 无关 —— 那是
服务端取数状态机的运行时状态，不该持久化。

## 无障碍（ARIA）

自动挂上的角色与属性：

| 位置 | 属性 |
| --- | --- |
| 根元素 | `role="grid"` + `aria-rowcount` / `aria-colcount`；加载态 `aria-busy` |
| 表头单元格 | `role="columnheader"` + `aria-sort` |
| 行 | `role="row"` + `aria-rowindex`（真实数据索引，不是 DOM 下标） |
| 单元格 | `role="gridcell"` |

见[无障碍 ARIA](/vanilla/examples/advanced/aria)。
