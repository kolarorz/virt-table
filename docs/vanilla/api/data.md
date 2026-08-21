# 数据与远程

数据管线上的能力：分页、服务端取数与无限滚动、树形懒加载、筛选、合计行、固定行、单选行。
排序配在列上，见[列级 API · 列排序](./column#列排序)。

三个 manual 开关各自让表格跳过管线里对应的一段，`dataMode: 'server'` 是三者全开的快捷方式：

| 位置 | 字段 | 说明 |
| --- | --- | --- |
| option | `manualSorting` | 排序交给服务端：跳过本地排序，改为重新取数 |
| option | `manualFiltering` | 筛选交给服务端：列头筛选与高级筛选都不再本地过滤 |
| option | `manualPagination` | 分页 / 加载交给服务端 |
| option | `dataMode: 'client' \| 'server'` | 快捷方式，`'server'` 等价于以上三个全开 |

## 分页

传 `pagination` 即渲染分页条。**默认客户端分页**（表格自己切片），开 `manualPagination` 切成服务端模式。

| 位置 | 字段 / 方法 | 说明 |
| --- | --- | --- |
| option | `pagination?: { total?; page?; pageSize?; pageSizes? }` | 存在即渲染分页器（总数 + 每页条数 + 上/下页 + 页码 + 跳页）。默认 `page=1`、`pageSize=pageSizes[0] ?? 10`、`pageSizes=[10,20,50,100]`、`total=0` |
| option | `onPageChange?: (page, pageSize) => void` | 翻页 / 跳页 / 切换每页条数时触发（切换每页条数会重置到第 1 页）。**仅服务端模式需要** |
| 方法 | `setPage(page)` | 跳转（自动 clamp），页码变化时派发 `onPageChange` |
| 方法 | `setPageSize(pageSize)` | 设置每页条数，重置到第 1 页并派发 `onPageChange(1, pageSize)` |
| 方法 | `setTotal(total)` | 更新总条数，clamp 当前页并重绘，**不派发事件**；客户端模式下告警并跳过（`total` 是派生的） |
| 方法 | `getPagination()` | 读 `{ page, pageSize, total }` |

分页器文案走 `locale.pagination`（`total` / `prev` / `next` / `jumpTo` / `jumpUnit` / `pageSizeUnit`）。

| | 客户端（默认） | 服务端（`manualPagination`） |
| --- | --- | --- |
| 谁切数据 | 表格 | 使用方（`onPageChange` 里 `setList`） |
| `total` | 由**筛选后的行数**派生 | 使用方给 |
| 排序 / 筛选 | 作用于全量数据，再切当前页 | 交给服务端 |

两种模式的行为细节（筛选回第 1 页、树形按根行切片、合计行口径、与 `infinite` 互斥）见
[分页（客户端）](/vanilla/examples/advanced/pagination-client)与[分页（服务端）](/vanilla/examples/advanced/pagination)。
配了 `loadData` / `onLoadMore` 后翻页改由表格取数，无需再自行处理 `onPageChange`。

## 服务端数据 / 无限滚动

**库负责**「何时该取数、取数期间的状态与 UI、取回后怎么并进虚拟滚动」；**你负责**「怎么取数」。
所以没有内置缓存、重试策略、HTTP 包装 —— 要这些请用受控层接 TanStack Query / SWR。

一套内核，两个入口：

| 入口 | 适用 |
| --- | --- |
| `loadData(req) => Promise<DataResponse>` | 糖层，开箱即用 |
| `onLoadMore(ctx)` / `onLoadPrev(ctx)` | 受控层，自己发请求并 `ctx.done/fail` 交付；两者同时给时受控层优先 |

| 位置 | 字段 / 方法 | 默认 | 说明 |
| --- | --- | --- | --- |
| option | `infinite.pageSize` | `50` | 每批条数 |
| option | `infinite.distance` | `200` | 距底 / 距顶触发阈值（写入内核 `edgeThreshold`） |
| option | `infinite.autoLoadFirst` | 无初始 `list` 时 `true` | 首屏是否自动取第一批 |
| option | `infinite.manual` | `false` | 只显示「加载更多」按钮，不自动触发 |
| option | `infinite.direction` | `'down'` | `'down'` / `'up'` / `'both'`，`up` 走 `onLoadPrev` |
| option | `infinite.showNoMore` | `true` | 到底后显示「没有更多」 |
| option | `onLoad` / `onLoadError` / `onRemoteStateChange` | — | 取数成功 / 失败 / 状态变化回调 |
| 方法 | `reload()` / `refresh()` / `loadMore()` / `loadPrev()` / `retryLoad()` | — | 主动触发 |
| 方法 | `getRemoteState()` | — | 状态快照（`RemoteState`，见[类型定义](./types)） |
| 方法 | `appendRows()` / `prependRows()` / `setHasMore()` / `setCursor()` | — | 完全手动管理数据时使用 |

**`hasMore` 推导优先级**：显式 `hasMore` > 游标（`cursor === null` 即到底）> 总数
（`loadedCount >= total`）> 满页启发式（`rows.length >= pageSize`）。因此游标与页码不必二选一：
请求里 `page` / `offset` / `cursor` 同时下发，后端认哪个用哪个。

**`pagination` 与 `infinite` 互斥**：前者是页视图（replace），后者是累积流（append）。
同时给出时以 `pagination` 为准、忽略 `infinite` 并告警。

::: warning 三条限制
- **`merges` 与无限滚动不兼容**（合并基于扁平行索引，追加后索引语义漂移）；要合并请改用分页。
- 服务端模式下 `showSummary` 的本地聚合只覆盖**已加载数据**，全量口径请让服务端返回 `footerData`。导出 / 打印同理。
- 向上加载（prepend）在动态行高下的偏移补偿有测量误差，要精确请开 `fixedSize: true`。
:::

竞态与去重、加载态语义（遮罩 vs 状态条）、前插补偿的收敛过程见
[无限滚动](/vanilla/examples/advanced/infinite)与[服务端数据](/vanilla/examples/advanced/server-data)。

## 树形懒加载

配 `loadChildren` 即启用（配合 `type: 'tree'` 列）：首屏只给根节点，首次展开某节点时才取它的 `children`。

| 位置 | 字段 / 方法 | 说明 |
| --- | --- | --- |
| option | `loadChildren(row, ctx)` | 取子节点；`ctx` 含 `level` 与 `signal`，返回的行写进 `row.children` |
| option | `hasChildren(row)` | 未加载时是否给展开箭头（默认读 `row.hasChildren`） |
| option | `onChildrenLoaded` / `onChildrenLoadError` | 成功 / 失败回调 |
| 方法 | `loadChildrenFor(rowKey)` | 主动取某节点子节点（等价于用户首次展开） |
| 方法 | `resetLazyNode(rowKey, clearChildren = true)` | 清缓存，下次展开重新取数（刷新子树） |

`defaultExpandAll` / `expandAll()` **只作用于已加载的节点**。取数期间忽略点击、失败回到折叠态可重试
等约定见[树形懒加载](/vanilla/examples/advanced/lazy-tree)。

## 列头筛选

| 位置 | 字段 / 方法 | 说明 |
| --- | --- | --- |
| column | `filters?: Array<{ label; value; checked? }>` | 枚举勾选项 |
| column | `filterType?: 'enum' \| 'text' \| 'number-range' \| 'date-range'` | 筛选类型，默认 `enum`；`number-range` / `date-range` 的值为 `{ min, max }` / `{ start, end }` |
| column | `filterMultiple?: boolean` | 是否允许多选 |
| column | `filterMethod?: (value, row) => boolean` | 自定义筛选逻辑 |
| option | `onFilterChange?: (filters) => void` | 筛选变化回调 |
| 方法 | `setColumnFilter(colKey, values)` / `clearAllFilters()` / `getActiveFilters()` | 编程式筛选 |

见[列筛选](/vanilla/examples/plugins/filter)与[富筛选类型](/vanilla/examples/plugins/rich-filter)。

## 高级筛选（筛选管理器）

两种筛选入口可同时使用，**状态独立、最终 AND 组合**。高级筛选是一棵可任意嵌套的 AND/OR 条件树。

```ts
type FilterModel = FilterGroup | null;

interface FilterGroup {
  kind: 'group';
  logic: 'and' | 'or';
  children: Array<FilterGroup | FilterCondition>;
}

interface FilterCondition {
  kind: 'condition';
  colKey: string;
  operator: FilterOperator;
  value?: unknown;   // 单值；in/notIn 用数组；between 用 value + value2
  value2?: unknown;
}

type FilterValueKind = 'text' | 'number' | 'date' | 'enum' | 'boolean';
type FilterOperator =
  | 'eq' | 'neq' | 'contains' | 'notContains' | 'startsWith' | 'endsWith'
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'notIn'
  | 'isEmpty' | 'isNotEmpty';
```

| 位置 | 字段 / 方法 | 说明 |
| --- | --- | --- |
| column | `filterValueKind?: FilterValueKind` | 显式指定值域类别（默认由 `filterType` / `filters` 推断） |
| column | `filterOperators?: FilterOperator[]` | 收窄该列在管理器里的候选算子 |
| option | `filterModel?: FilterModel` | 初始条件树 |
| option | `onFilterModelChange?: (model) => void` | 条件树变化回调 |
| 方法 | `setFilterModel(model)` | 应用条件树（传 `null` 清空） |
| 方法 | `getFilterModel()` | 读取条件树（深拷贝） |
| 方法 | `clearFilterModel()` | 仅清空高级筛选，不影响表头筛选 |
| 方法 | `hasActiveFilters()` | 表头筛选或高级筛选任一生效 |

各值域可用算子：

| 值域             | 算子                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| `text`           | `contains` `notContains` `eq` `neq` `startsWith` `endsWith` `isEmpty` `isNotEmpty` |
| `number` `date`  | `eq` `neq` `gt` `gte` `lt` `lte` `between` `isEmpty` `isNotEmpty`       |
| `enum`           | `in` `notIn` `eq` `neq` `isEmpty` `isNotEmpty`                          |
| `boolean`        | `eq` `neq`                                                              |

求值约定（`filterMethod` 只参与 `in` / `notIn`、`isEmpty` 不含 `0` / `false`、半成品条件视为通过…）
见[高级筛选](/vanilla/examples/advanced/filter-builder)。

### VtFilterBuilder（条件构建器）

可视化条件构建器，挂在**表格之外**由使用方指定的容器里，按需引入
（`@virt-table/vanilla/components`）。

| 构造选项 | 说明 |
| --- | --- |
| `el` | 挂载容器（元素或选择器） |
| `table` | 传入则自动取可见列，并在应用时调 `table.setFilterModel()` |
| `columns` | 不关联表格时手动提供列 |
| `model` | 初始条件树 |
| `autoApply` | `true` 则每次改动即时生效（默认需点「应用筛选」） |
| `showFooter` | 底部操作栏 |
| `theme` | 不传则跟随 `.dark` / `[data-theme='dark']` 祖先 |
| `texts` | 文案覆盖（默认中文；关联 `table` 时缺省取表格 `locale`） |
| `onChange` / `onApply` | 条件变化（含编辑中的半成品）/ 已应用到表格 |

| 方法                    | 说明                               |
| ----------------------- | ---------------------------------- |
| `getModel()`            | 当前条件树（无生效条件时为 `null`） |
| `setModel(model)`       | 受控写入（不自动应用到表格）        |
| `setColumns(columns)`   | 更新可筛选列                        |
| `refresh()`             | 重新读取列并重绘（列显隐变化后调用） |
| `apply()` / `clear()`   | 应用 / 清空                         |
| `setTheme(theme)`       | 切换明暗                            |
| `destroy()`             | 卸载（清空容器）                    |

样式在 `@virt-table/vanilla/components/vt-filter-builder.css`（`.vt-fb*`，需与 `core.css` 一起引；
或直接引全量 `style.css`）。React / Vue 端对应 `<VirtFilterBuilderReact />`（`tableRef` + 受控 `value`）
与 `<VirtFilterBuilderVue />`（`:table` + `v-model:model`）。

## 自动聚合合计行

| 位置   | 字段                                                          | 说明                       |
| ------ | ------------------------------------------------------------- | -------------------------- |
| option | `showSummary?: boolean`                                       | 显示合计行（占用表尾）     |
| option | `summaryText?: string`                                        | 合计行首列标签（默认「合计」） |
| column | `summary?: 'sum'\|'avg'\|'count'\|'max'\|'min'`               | 内置聚合                   |
| column | `summaryMethod?: (values, rows) => string \| number`         | 自定义聚合                 |

合计基于**筛选 / 排序后的叶子行**，自动随视图变化。分组表尾上的聚合语义见
[多级分组表尾](./group-header#多级分组表尾)，用法见[自动合计行](/vanilla/examples/advanced/summary)。

## 固定行（pinned rows）

| 位置   | 字段/方法                                | 说明                       |
| ------ | ---------------------------------------- | -------------------------- |
| option | `pinnedTop?: T[]`                        | 置顶固定行（冻结在表头下方） |
| option | `pinnedBottom?: T[]`                     | 置底固定行（冻结在表尾上方） |
| 方法   | `setPinnedRows(top?, bottom?)`           | 更新固定行                 |

固定行冻结的是**数据行**，固定表头冻结的是**列名**，两者互不替代 —— 对照见
[固定行 pinned](/vanilla/examples/advanced/pinned)。

## 单选行

| 位置   | 字段/方法                          | 说明                    |
| ------ | ---------------------------------- | ----------------------- |
| column | `type: 'radio'`                    | 单选列                  |
| option | `onRadioChange?: (row) => void`    | 单选变化回调            |
| 方法   | `getSelectedRadio()` / `setSelectedRadio(rowKey \| null)` | 单选行读写 |

用法见[功能列](/vanilla/examples/feature-columns/)。
