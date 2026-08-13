# Vanilla JS API

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
| `locale`                | `DeepPartial<VirtTableLocale>`                                                                    | `zhCN`                                       | 国际化文案覆盖（深合并；内置 `zhCN`/`enUS`，见「国际化 i18n」） |
| `align`                 | `'left' \| 'center' \| 'right'`                                                                   | —                                           | 全局单元格水平对齐                                          |
| `vAlign`                | `'top' \| 'middle' \| 'bottom'`                                                                   | —                                           | 全局单元格垂直对齐                                          |
| `headerAlign`           | `'left' \| 'center' \| 'right'`                                                                   | —                                           | 全局表头水平对齐                                            |
| `headerVAlign`          | `'top' \| 'middle' \| 'bottom'`                                                                   | —                                           | 全局表头垂直对齐                                            |
| `footerAlign`           | `'left' \| 'center' \| 'right'`                                                                   | —                                           | 全局表尾水平对齐                                            |
| `footerVAlign`          | `'top' \| 'middle' \| 'bottom'`                                                                   | —                                           | 全局表尾垂直对齐                                            |
| `cellType`              | `'text' \| 'number' \| 'rich-text' \| 'image' \| 'option' \| 'checkbox'`                          | —                                           | **表级内容类型兜底**：没配 `render` / `cellType` 的列按它渲染（内容层最低一级，见「单元格渲染」） |
| `textOverflow`          | `'ellipsis' \| 'tooltip'`                                                              | —                                           | 文本溢出处理：`ellipsis` 仅省略号 / `tooltip` 省略号 + 内置浮层（见「溢出文本 tooltip」） |
| `tooltip`               | `{ delay?: number }`                                                                              | `{ delay: 150 }`                            | `textOverflow: 'tooltip'` 的浮层配置；`delay` 为悬停延迟（ms），`0` 为立即弹 |
| `highlightHoverRow`     | `boolean`                                                                                         | —                                           | 鼠标悬停高亮整行                                            |
| `highlightSelectRow`    | `boolean`                                                                                         | —                                           | 点击选中高亮整行                                            |
| `highlightSelectCol`    | `boolean`                                                                                         | —                                           | 点击选中高亮整列                                            |
| `highlightSelectCell`   | `boolean`                                                                                         | —                                           | 点击选中高亮单元格                                          |
| `headerClass`           | `string`                                                                                          | —                                           | 表头行 CSS 类名                                             |
| `headerStyle`           | `string`                                                                                          | —                                           | 表头行内联样式                                              |
| `rowClass`              | `string \| ((row: T, index: number) => string)`                                                   | —                                           | 数据行 CSS 类名                                             |
| `rowStyle`              | `string \| ((row: T, index: number) => string)`                                                   | —                                           | 数据行内联样式                                              |
| `cellClass`             | `string \| ((column: VirtTableColumn<T>, row: T) => string)`                                      | —                                           | 单元格 CSS 类名                                             |
| `cellStyle`             | `string \| ((column: VirtTableColumn<T>, row: T) => string)`                                      | —                                           | 单元格内联样式                                              |
| `defaultExpandAll`      | `boolean`                                                                                         | `false`                                     | 是否默认展开所有展开行/树节点                               |
| `groupConfig`           | `{ field: string; sort?: 'asc' \| 'desc' }[]`                                                     | —                                           | 分组配置，按字段层级分组                                    |
| `onCellSelectionChange` | `(range: { startRow: number; startCol: number; endRow: number; endCol: number } \| null) => void` | —                                           | 框选区域变化回调                                            |
| `plugins`               | `VirtTablePlugin<T>[]`                                                                            | —                                           | 插件列表（见「插件机制」）                                  |
| `onFilterChange`        | `(filters: Record<string, unknown[]>) => void`                                                    | —                                           | 列筛选变化回调                                              |
| `filterModel`           | `FilterModel`                                                                                     | —                                           | 高级筛选条件树（AND/OR，见「高级筛选」）                    |
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
| `loadData`              | `(req: DataRequest) => Promise<DataResponse<T>> \| DataResponse<T>`                               | —                                           | 取数糖层：给了它就由表格编排请求（见「服务端数据 / 无限滚动」）|
| `onLoadMore`            | `(ctx: LoadMoreContext<T>) => void \| Promise<void>`                                              | —                                           | 受控层取数（优先于 `loadData`），用 `ctx.done/fail` 交付      |
| `onLoadPrev`            | `(ctx: LoadMoreContext<T>) => void \| Promise<void>`                                              | —                                           | 受控层向上加载（需 `infinite.direction` 含 `'up'`）           |
| `infinite`              | `{ enabled?; pageSize?; distance?; autoLoadFirst?; manual?; direction?; showNoMore? }`            | —                                           | 无限滚动配置（存在即启用）                                  |
| `onLoad`                | `(res: DataResponse<T>, req: DataRequest) => void`                                                | —                                           | 每批数据取回后触发（含首屏与追加）                          |
| `onLoadError`           | `(err: unknown, req: DataRequest) => void`                                                        | —                                           | 取数失败回调（已加载数据不受影响）                          |
| `onRemoteStateChange`   | `(state: RemoteState) => void`                                                                    | —                                           | 远程状态变化（loading/hasMore/total/page 等）               |
| `loadChildren`          | `(row: T, ctx: { level: number; signal: AbortSignal }) => Promise<T[]> \| T[]`                     | —                                           | 树形子节点懒加载：首次展开时取子节点（见「树形懒加载」）      |
| `hasChildren`           | `(row: T) => boolean`                                                                             | 读 `row.hasChildren`                        | 未加载时是否显示展开箭头                                    |
| `onChildrenLoaded`      | `(row: T, children: T[]) => void`                                                                 | —                                           | 子节点取回后触发                                            |
| `onChildrenLoadError`   | `(row: T, err: unknown) => void`                                                                  | —                                           | 子节点取数失败（节点回到折叠态，可再点重试）                 |

## VirtTableColumn

列配置项。

| 属性             | 类型                                                          | 默认值 | 说明                                 |
| ---------------- | ------------------------------------------------------------- | ------ | ------------------------------------ |
| `key`            | `string`                                                      | —      | **必填**。列唯一标识，对应行数据字段 |
| `title`          | `string`                                                      | —      | **必填**。列标题                     |
| `width`          | `number`                                                      | —      | **必填**。列宽（px）；分组节点可填 `0`，宽度由可见子列求和 |
| `children`       | `VirtTableColumn<T>[]`                                        | —      | 子列 —— 配置它即成为**多级分组表头**的分组节点（见「多级分组表头」） |
| `fixed`          | `'left' \| 'right'`                                           | —      | 固定列位置；写在分组上会强制下发给全部后代 |
| `type`           | `'index' \| 'checkbox' \| 'radio' \| 'expand' \| 'drag' \| 'tree'` | —      | **功能列**类型，独占单元格（`tree` 例外，见下） |
| `cellType`       | `'text' \| 'number' \| 'rich-text' \| 'image' \| 'option' \| 'checkbox'` | —      | **内容类型**：把 `row[key]` 按内置样式渲染，见「单元格渲染」 |
| `align`          | `'left' \| 'center' \| 'right'`                               | —      | 单元格水平对齐，覆盖全局 `align`     |
| `vAlign`         | `'top' \| 'middle' \| 'bottom'`                               | —      | 单元格垂直对齐，覆盖全局 `vAlign`    |
| `headerAlign`    | `'left' \| 'center' \| 'right'`                               | —      | 表头水平对齐                         |
| `headerVAlign`   | `'top' \| 'middle' \| 'bottom'`                               | —      | 表头垂直对齐                         |
| `footerAlign`    | `'left' \| 'center' \| 'right'`                               | —      | 表尾水平对齐                         |
| `footerVAlign`   | `'top' \| 'middle' \| 'bottom'`                               | —      | 表尾垂直对齐                         |
| `footerValue`    | `string \| number`                                            | —      | 多级分组表尾：该节点表尾格的静态内容（分组/叶子皆可） |
| `renderFooter`   | `(ctx: FooterRenderContext<T>) => string \| HTMLElement`      | —      | 多级分组表尾：该节点表尾格的自定义渲染（返回字符串按 HTML 插入） |
| `textOverflow`   | `'ellipsis' \| 'tooltip'`                          | —      | 文本溢出处理，覆盖全局设置（`ellipsis` / `tooltip`） |
| `mergeKey`       | `boolean \| ((row, i) => unknown)`                 | —      | 相邻同键自动纵向合并（见「按值自动合并」）；仅非固定列生效 |
| `mergeMaxSpan`   | `number`                                           | —      | `mergeKey` 的单段最大跨度，超出则断开 |
| `resizable`      | `boolean`                                                     | —      | 是否允许拖拽调整列宽                 |
| `minWidth`       | `number`                                                      | —      | 列最小宽度（px），配合 `resizable`   |
| `maxWidth`       | `number`                                                      | —      | 列最大宽度（px），配合 `resizable`   |
| `render`         | `(ctx: CellRenderContext<T>) => string \| HTMLElement`        | —      | 自定义单元格渲染                     |
| `renderHeader`   | `(ctx: HeaderRenderContext<T>) => string \| HTMLElement`      | —      | 自定义表头渲染                       |
| `renderEditor`     | `(ctx: CellEditContext<T>) => HTMLElement \| null \| void`    | —      | 自定义单元格编辑渲染                 |
| `editorChrome`   | `boolean`                                                     | `true` | 编辑浮层是否替这一列画外观（边框 / focus 环）。第三方组件自带外观时设 `false`，见[编辑浮层的外观归属](#编辑浮层的外观归属) |
| `renderExpandRow`   | `(ctx: ExpandRenderContext<T>) => string \| HTMLElement`      | —      | 自定义展开行内容渲染                 |
| `filters`        | `Array<{ label: string; value: unknown; checked?: boolean }>` | —      | 列筛选选项                           |
| `filterMultiple` | `boolean`                                                     | —      | 是否允许多选筛选                     |
| `filterMethod`   | `(value: unknown, row: T) => boolean`                         | —      | 自定义筛选逻辑（高级筛选中仅 `in`/`notIn` 生效） |
| `filterValueKind`| `'text'\|'number'\|'date'\|'enum'\|'boolean'`                  | 推断   | 高级筛选值域类别                     |
| `filterOperators`| `FilterOperator[]`                                            | 全集   | 高级筛选可用算子白名单               |

### 功能列（`type`）

| `type`     | 说明                                                  |
| ---------- | ----------------------------------------------------- |
| `index`    | 序号列，自动显示行号                                  |
| `checkbox` | 勾选列，配合 `getCheckedRows` 等方法使用              |
| `radio`    | 单选列，配合 `getSelectedRow` 使用                    |
| `expand`   | 展开列，点击展开/折叠子内容，需配置 `renderExpandRow`    |
| `drag`     | 行拖拽手柄列，需装 `vtRowDrag` 插件                   |
| `tree`     | 树形列，显示展开/折叠图标，行数据需含 `children` 字段 |

功能列**独占单元格**：配在 `index` / `checkbox` / `radio` / `expand` / `drag` 上的
`render` / `renderEditor` / `cellType` 会被忽略，并在控制台告警（以前是静默吞掉）。
**单元格级配置例外，它可以穿透**（见下）。

`tree` 是唯一例外 —— 它只负责缩进与折叠箭头，内容照常走 `render` / `cellType` / 默认取值，
因此也能吃到 `textOverflow`。

## 单元格渲染

完整模型（四层 × 粒度）见[指南 · 单元格渲染](/vanilla/guide/cell-render)：**接管层**（合成行 /
功能列）决定这块地归不归内容层管，**内容层**决定画什么，**容器层**决定外面套什么，
**会话层**（编辑态）在打开编辑时盖在上面。

下面这张表是**内容层**的，它决定这一格的**常态**（没进入编辑时的样子）。排序规则只有一条：
**粒度越细越优先；同粒度内越具体越优先**（`render` 比 `cellType` 具体）。展开就是：

| 优先级 | 来源 | 配置方式 |
| --- | --- | --- |
| 1 | 单元格级 `render` | `table.setCellRender(rowKey, colKey, { render })`（或行数据 `_cellRenders`，兼容路径） |
| 2 | 单元格级 `cellType` | `table.setCellRender(rowKey, colKey, { cellType })` |
| 3 | 列级 `render` | `col.render` |
| 4 | 列级 `cellType` | `col.cellType` |
| 5 | 表级 `cellType` | `options.cellType` |
| 6 | 默认取值 | `String(row[col.key])` |

第 2 条高于第 3 条：**单元格级 `cellType` 赢过列级 `render`** —— 否则给某一格配了
`cellType` 却毫无反应，无从解释。表级只有 `cellType`，**刻意没有表级 `render`**（那等于
所有列画得一样，真实需求是 `cellClass` / `cellStyle`）。

`renderEditor` **不在这条链上**（它属于会话层），自己一条：单元格级 > 列级。这不是例外而是
结构使然 —— 编辑内容不在这一格的 DOM 里，`vtCellEditor` 把 `.vt-cell-cover` 挂在滚动容器上
盖住单元格。好处是能「只改这一格的常态、编辑照旧」；代价是能配出常态与编辑不匹配的组合，
所以装内置组件请用 [`asCell()`](#单元格组件)。

**所有内容来源共享同一套「容器能力」**：`textOverflow`（省略号 / tooltip）与 `mergeKey` 的
sticky 内层对它们一律生效。早期版本里这两个能力只在「没配 `render`」时才装配，配了
`render` 就静默失效 —— 现在不会了。

### 内容类型（`cellType`）

省掉手写 `render` 的常见样式。三个粒度（表级 / 列级 / 单元格级）语义完全相同：

| `cellType` | 期望的值 | 渲染成 |
| --- | --- | --- |
| `text` | 任意 | 纯文本（**不解析 HTML**） |
| `number` | 数字 | 纯文本；不做千分位/精度（那是格式化职责） |
| `rich-text` | HTML 字符串 | 按 HTML 插入，**自负安全** |
| `image` | URL 字符串 或 `{ url, alt }` | `<img class="vt-cell-image">`，高度锁在行高内 |
| `option` | 标签字符串 或 `{ label, color }` | 圆角标签，底色由 `color` 经 `color-mix` 派生 |
| `checkbox` | 布尔 | 只读勾选框 |

```ts
new VirtTable(el, {
  cellType: 'text',   // 表级兜底：没配 render / cellType 的列一律纯文本，不解析 HTML
  columns: [
    { key: 'avatar', title: '头像', width: 80, cellType: 'image', align: 'center' },
    { key: 'tag',    title: '分类', width: 100, cellType: 'option' },
    { key: 'done',   title: '完成', width: 80, cellType: 'checkbox', align: 'center' },
  ],
});
// 数据：avatar 给 URL，tag 给 { label, color }，done 给布尔
```

样式可通过 `--vt-cell-image-max-h`、`--vt-cell-option-color` 覆盖（见[主题定制](/vanilla/examples/basic/theme)）。

### 单元格级渲染（`setCellRender`）

同一列的不同行要用不同渲染时用它。配置存在**表格实例**里，不写进你的数据对象：

```ts
table.setCellRender('42', 'name', {
  render: ({ value }) => `<b>${value}</b>`,
  renderEditor: ({ row, column }) => makeInput(row, column.key),
});

// 也可以只指定内容类型，不手写 render
table.setCellRender('42', 'tag', { cellType: 'option' });

// 穿透功能列：勾选列里这一行不给勾选框（列级做不到，那会被忽略并告警）
table.setCellRender('42', 'sel', { render: () => '🔒' });

// 批量：整批写完只刷新一次
table.setCellRenders([
  { rowKey: '1', colKey: 'score', config: { render: ({ value }) => `${value} 分` } },
  { rowKey: '2', colKey: 'score', config: null },   // null = 清除该格配置
]);

table.clearCellRenders('42');   // 清一行
table.clearCellRenders();       // 全清
```

::: tip 为什么不推荐往行数据挂 `_cellRenders`
旧写法 `row._cellRenders = { name: { render } }` **仍然兼容**（优先级低于 `setCellRender`），
但把函数塞进数据对象会污染 `JSON.stringify` / 深拷贝 / 数据 diff；而且在 React / Vue 端
拿不到适配层的 VNode 包装，返回 JSX / VNode 会渲染失败。

React / Vue 用 `ref.current.setCellRender(...)`，`render` / `renderEditor` 可直接返回
JSX / VNode，挂载与行回收由适配层处理。

需要类型提示时让行类型继承 `VirtTableRowExtras`，它同时声明了 `_treeLevel` / `_groupLevel`
等内核写入的只读字段：

```ts
interface Row extends VirtTableRowExtras<Row> {
  id: number;
  name: string;
}
```
:::

### 编辑浮层的外观归属

`vtCellEditor` 默认按一个契约工作：**浮层画外观（边框 + focus 环），编辑器组件退化成纯内容层**。内置 `vt-*` 编辑器遵守它 —— `.vt-comp-input` 自己是 `border: none; background: transparent; height: 100%`，只负责填满浮层。

第三方组件库不可能知道这个约定，它自带一整套外观。两边都画就会出三个问题：

| 症状 | 原因 |
| --- | --- |
| 两层边框，且对不上 | 浮层的边框 + 组件自己的边框（Element Plus 用的是 `.el-input__wrapper` 的 inset box-shadow） |
| 激活前后高度不一致 | `.vt-cell-cover > *` 会把组件拉满单元格，而组件自己有固定 size（`el-input--small` 是 24px） |
| focus 环叠两层 | 浮层有 `--vt-focus-ring-color`，组件也有自己的 focus 态 |

所以这类列要把外观归属交回组件：

```ts
// 单列声明
{ key: 'name', title: '姓名', width: 160, editorChrome: false, renderEditor: (ctx) => … }

// 整表都用第三方组件时，插件选项更省事（列上的值优先）
plugins: [vtCellEditor({ chrome: false })]
```

裸模式下浮层退成纯定位层：去掉全部边框与 focus 环、不再强拉组件高度，组件保持自己的 size 并垂直居中。**背景保留** —— 浮层得盖住底下那一格的查看态，组件比单元格窄或矮时靠它兜底。

裸模式还会补上和 `.vt-td` 相同的水平内边距（`--vt-cell-padding-x`）：浮层的 rect 是**整个 td**（含 td 的内边距），不补的话激活瞬间内容会往左跳一个 padding。**这条只在裸模式生效** —— 默认路径的浮层样式完全没变，内置 `vt-*` 编辑器的宽度、`VtTextarea` 的 cover 浮层、`VtAutocomplete` 的建议列表都不受影响。

### 激活态

编辑态是**会话**，它会消失：单选下拉、日历都是「选完即关面板」，点到别处更是整个浮层收掉。
如果此时单元格上什么痕迹都不留，一表数据看下来就想不起「刚改的是哪一格」。

所以 `vtCellEditor` 点开一格时会同时把它标成**激活态** —— 核心那圈当前单元格描边
（`.vt-active-cell-overlay`），编辑浮层关掉后它还在：

```ts
plugins: [vtCellEditor()]                      // 默认就有激活态
plugins: [vtCellEditor({ activeCell: false })] // 关掉
```

四件事值得留意：

- **与 `highlightSelectCell` 是同一份状态、同一个浮层。** 那个选项只是「点击也算一次设置」的
  开关；两个都开不会叠出两层框。描边的跟随（滚动、排序、列窗口变化）由核心统一负责。
- **点到不能编辑的格子，描边也跟着走。** 只在有 `renderEditor` 的格子上标记的话，用户点一下
  旁边的只读格子，描边会赖在上一格不动 —— 看着像卡住了。
- **装了 `vtCellSelection` 时默认关。** 那张表已经有一圈会跟着点击与键盘移动的「当前单元格」
  （选区 overlay），再画一圈的结果是两个框都自称当前单元格，而且会分家 —— 选区移到 B2、
  编辑留下的描边还钉在 A1。要两者并存就显式传 `activeCell: true`。
- **裸模式（`chrome: false`）可以关掉。** 那种模式刻意把外观全交给第三方组件，再加一圈主色
  描边可能违背初衷（不过内置的 Element Plus / Ant Design 示例本来就开着 `highlightSelectCell`，
  说明这圈描边在裸模式下也常常是想要的）。

程序化入口是 [`setActiveCell(rowKey, colKey)`](#方法) / `getActiveCell()`，传 `null` 清除。

## 按值自动合并（`mergeKey`）

`merges` 之外的第二条合并入口：列上配 `mergeKey`，**相邻同键的行自动纵向合并**。

```ts
const columns = [
  { key: 'dept', title: '部门', width: 150, mergeKey: true, sortable: true },
  // 拼键：只有「大区 + 状态」都相同才合并
  { key: 'region', title: '大区', width: 150, mergeKey: (r) => `${r.region}/${r.status}` },
  // 条件合并：返回 undefined 表示该行不参与
  { key: 'amount', title: '金额', width: 120, mergeKey: (r) => (r.amount > 100 ? r.dept : undefined) },
];
```

两条入口分工明确，可以同时用：

| | 静态 `merges` | `mergeKey` |
| --- | --- | --- |
| 表达什么 | 任意几何（含 `colspan`、不连续的块、表头 / 表尾合并） | 相邻同键成段（只纵向） |
| 坐标维护 | 使用方自己算，数据顺序变了要重算 | 管线自动维护 |
| **排序** | **禁用排序**（合并按绝对行号，排序会错位） | **不影响排序**，排序后重新分段 |

### 行为与边界

- 键用 `!==` 比较，请返回原始值；按多字段合并就自己拼字符串（深比较会让分段从 O(n) 变成 O(n × 字段数)）。
- **结构边界自动断开**：分组行、树形层级变化处一定断段，父子行不会被并成一格。
- **只对非固定列生效**（固定列不在合并坐标系里，见「合并单元格的坐标系」），配错会 `console.warn` 并忽略。
- **行拖拽被禁用**（把一行拖出所属段没有语义），`canReorderRows()` 会返回 `false`。
- **动态行高下也可用**。实测（2000 行、合并列放长文本）：不合并时每行 518px，开了合并后 5 行共担、每行 104px —— 合并本身是省高度的，且同一行往返测量一致、滚动无漂移。代价是合并块在窗口边缘被裁短时那几行会变高（5 行的组裁成 4 行 → 每行 104→~130），滚过去又变回来；这与动态行高本身的高度漂移是同一类现象。要绝对稳定的行高就配 `fixedSize: true`（跳过测量）。

### 与选区 / 导出的联动

- **框选会按合并块扩张成完整矩形**。查的是段的**真实起止**而不是渲染窗口的裁剪结果 —— 选区可以远超窗口（例如一个 5 万行的段，选中其中一格会把选区扩成 0–49999），用裁剪结果会把选区截在窗口边界上。
- **`getMerges()` 只返回静态配置**（`options.merges` / `setMerges()` 那份），不含自动合并 —— 后者是派生状态、跨度随数据变。
- **`getEffectiveMerges(rowBegin?, rowEnd?)` 返回实际生效的合并块**（静态 + 自动合并的真实段），给导出、自定义复制这类需要还原合并结构的场景用。不传区间覆盖整份显示列表；自动合并的段数与行数同阶，百万行会产出十万级数组，按需传区间。
- `vtClipboard` / `vtExport` **本来就不读合并信息**（逐行取值），对静态 `merges` 与自动合并一视同仁。要让导出还原合并结构，自己用 `getEffectiveMerges()` 构造。

### 长段会「重锚」

滚进一个很长的段中间时，合并格起点会被抬到**可视区顶部**。为了让文字不抖，长段的内容会套一层 sticky 内层**钉在可见数据区上缘**（像粘性小标题），段尾进入视口时被平滑推出 —— 而不是在格子里垂直居中：那样会因为「裁剪按整行取整、滚动按像素」而每行回跳一整行高（实测锯齿 32px）。短段与静态 `merges` 不受影响，仍是格内居中。

这是虚拟滚动下的唯一正确做法：段的真实起点可能在窗口外几万行处，要在那儿渲染 primary 单元格就得把这几万行全部 materialize —— 实测 `rowspan=50000` 时会渲染 5 万个 `<tr>`，虚拟滚动直接失效。AG Grid 的 Cell Span 同样如此。不想要这个观感就用 `mergeMaxSpan` 把段切碎。

### 性能

分段索引（`Int32Array` 存段起点）在数据管线末端一列一趟 O(n) 扫描建好，每帧再按渲染窗口裁剪出至多「窗口行数」个合并块交给现有管线。实测：

| | 结果 |
| --- | --- |
| 建索引（100 万行 / 1 列） | 3.3ms，781KB |
| 10 万行 2 列，滚动帧耗时 | 中位 8.3ms / p95 9.2ms —— 与不开自动合并**完全一致** |
| 10 万行 2 列，初始化 | 3.5ms → 7.9ms |
| 段长 9.3 万行时渲染的 `<tr>` | 25（与不开自动合并一致） |

### 不提供逐格 `spanMethod`

el-table / vxe 那种「每个单元格调一次回调返回 `[rowspan, colspan]`」的形式**不做**，因为它们不虚拟化。在虚拟滚动下两条路都不成立：全量求值是 O(行 × 列) 次回调（50 万行 × 10 列 = 500 万次，秒级）；只对窗口求值则拿不到窗口外的段起点，结果是错的。

绝大多数 `spanMethod` 的真实用法就是「按某个值成段」，用 `mergeKey` 表达即可。需要任意几何请用静态 `merges` / `setMerges()`。

从 el-table / vxe 迁移的话，有个纯函数把逐格回调求值成静态 `merges`——代价显式摊在调用点上，而不是藏在 option 后面：

```ts
import { buildMergesFromSpan } from '@virt-table/vanilla';

table.setMerges(buildMergesFromSpan(list, centerColumns, ({ rowIndex, columnIndex }) => {
  if (columnIndex === 0) return rowIndex % 2 === 0 ? [2, 1] : [0, 0];
}));
```

`centerColumns` 只传非固定列；回调次数正好 `行数 × 列数`；数据变了要自己重算。细节见 [按值自动合并示例](/vanilla/examples/merge/auto-merge#从-el-table-vxe-的-spanmethod-迁移)。

## MergeCell

合并单元格配置，用于表体、表头（`headerMerges`）、表尾（`footerMerges`）。

| 属性       | 类型     | 说明                            |
| ---------- | -------- | ------------------------------- |
| `rowIndex` | `number` | 合并区域起始行索引（从 0 开始） |
| `colIndex` | `number` | 合并区域起始列索引（从 0 开始） |
| `rowspan`  | `number` | 合并行数                        |
| `colspan`  | `number` | 合并列数                        |

## 实例方法

| 方法                 | 参数                                           | 返回值                                           | 说明                                |
| -------------------- | ---------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| `scrollToIndex`      | `index: number`                                | `void`                                           | 滚动到指定行索引                    |
| `scrollIntoView`     | `index: number`                                | `void`                                           | 将指定行滚动到可视区域              |
| `scrollToTop`        | —                                              | `void`                                           | 滚动到顶部                          |
| `scrollToBottom`     | —                                              | `void`                                           | 滚动到底部                          |
| `scrollToOffset`     | `offset: number`                               | `void`                                           | 滚动到指定像素偏移                  |
| `getOffset`          | —                                              | `number`                                         | 当前纵向偏移量（取代 `clientEl.scrollTop`，后者恒为 `0`） |
| `scrollByY`          | `dy: number`                                   | `void`                                           | 纵向相对滚动，按「用户发起」记账（会触发 `toBottom` 与自动续拉） |
| `scrollToCell`       | `row: number, col: number`                     | `void`                                           | 滚动到指定单元格（纵向 + 横向居中） |
| `reset`              | —                                              | `void`                                           | 重置虚拟滚动状态                    |
| `setList`            | `list: T[]`                                    | `void`                                           | 更新数据源                          |
| `setColumns`         | `columns: VirtTableColumn<T>[]`                | `void`                                           | 更新列配置                          |
| `setMerges`          | `merges: MergeCell[]`                          | `void`                                           | 更新表体合并单元格                  |
| `getMerges`          | —                                              | `MergeCell[]`                                    | 静态合并配置的副本（**不含** `mergeKey` 自动合并） |
| `getEffectiveMerges` | `rowBegin?: number, rowEnd?: number`           | `MergeCell[]`                                    | 区间内实际生效的合并块：静态 + 自动合并的**真实段**（不受渲染窗口裁剪） |
| `getState`           | —                                              | `VirtTableState`                                 | 导出可持久化的视图状态（列宽 / 列序 / 列显隐 / 排序 / 筛选） |
| `setState`           | `state: VirtTableState \| null`                | `boolean`                                        | 应用状态，只应用**出现的**字段；版本不认识时返回 `false` |
| `setHeaderMerges`    | `merges: MergeCell[], headerData?: string[][]` | `void`                                           | 更新表头合并与表头数据              |
| `setFooterData`      | `data: string[][], merges?: MergeCell[]`       | `void`                                           | 更新表尾数据与合并                  |
| `forceUpdate`        | —                                              | `void`                                           | 强制重新渲染                        |
| `setCellRender`      | `rowKey, colKey, config \| null`               | `void`                                           | 单元格级渲染，覆盖列级；`null` 清除 |
| `setCellRenders`     | `Array<{rowKey, colKey, config}>`              | `void`                                           | 批量版，整批写完只刷新一次          |
| `getCellRender`      | `rowKey, colKey`                               | `CellRenderConfig \| undefined`                  | 该格的单元格级配置（不含列级回落）  |
| `resolveCellRender`  | `rowKey, colKey`                               | `CellRenderConfig`                               | 该格**最终生效**的配置（含列级回落）|
| `clearCellRenders`   | `rowKey?`                                      | `void`                                           | 清除一行或全部单元格级配置          |
| `getCheckedRows`     | —                                              | `T[]`                                            | 已勾选的**行数据**，按当前 `list` 过滤 —— 拿不到不在当前页的项 |
| `getCheckedKeys`     | —                                              | `string[]`                                       | 已勾选的**全部 key**，按勾选顺序；服务端分页下提交全部选中项用这个 |
| `setCheckedRows`     | `keys: string[]`                               | `void`                                           | 按 `itemKey` 设置勾选状态           |
| `clearCheckedRows`   | —                                              | `void`                                           | 清除所有勾选                        |
| `setActiveCell`      | `rowKey: string \| null, colKey: string \| null` | `void`                                         | 标记激活态（当前单元格描边），传 `null` 清除；与 `highlightSelectCell` 同一份状态、同一个浮层，没开那个选项也能用 |
| `getActiveCell`      | —                                              | `{ rowKey, colKey } \| null`                     | 当前激活的单元格                    |
| `toggleExpand`       | `rowKey: string`                               | `void`                                           | 切换展开行展开/折叠                 |
| `toggleFold`         | `rowKey: string`                               | `void`                                           | 切换树/分组节点折叠状态             |
| `expandAll`          | —                                              | `void`                                           | 展开所有展开行/树节点               |
| `collapseAll`        | —                                              | `void`                                           | 折叠所有展开行/树节点               |
| `setColumnFilter`    | `key: string, vals: unknown[]`                 | `void`                                           | 设置指定列的筛选值                  |
| `clearAllFilters`    | —                                              | `void`                                           | 清除所有列筛选                      |
| `getActiveFilters`   | —                                              | `Record<string, unknown[]>`                      | 获取当前生效的筛选条件              |
| `setFilterModel`     | `model: FilterModel`                           | `void`                                           | 应用高级筛选条件树（AND/OR）        |
| `getFilterModel`     | —                                              | `FilterModel`                                    | 获取高级筛选条件树（深拷贝）        |
| `clearFilterModel`   | —                                              | `void`                                           | 仅清空高级筛选                      |
| `hasActiveFilters`   | —                                              | `boolean`                                        | 列头筛选或高级筛选任一生效          |
| `getCellSelection`   | —                                              | `{ startRow, startCol, endRow, endCol } \| null` | 获取当前框选区域                    |
| `clearCellSelection` | —                                              | `void`                                           | 清除框选                            |
| `hideContextMenu`    | —                                              | `void`                                           | 隐藏右键菜单（由 `vtContextMenu` 插件注入）|
| `reload`             | —                                              | `void`                                           | 清空已加载数据并重新取第一批        |
| `refresh`            | —                                              | `void`                                           | 重拉已加载区间，保留滚动位置        |
| `loadMore`           | —                                              | `void`                                           | 手动加载下一批                      |
| `loadPrev`           | —                                              | `void`                                           | 手动加载更早的一批（向上）          |
| `retryLoad`          | —                                              | `void`                                           | 重试上次失败的请求                  |
| `getRemoteState`     | —                                              | `RemoteState \| null`                            | 远程状态快照（未启用时为 `null`）   |
| `setLoadData`        | `loadData`                                     | `void`                                           | 运行时替换取数实现（不自动重取）    |
| `appendRows`         | `rows: T[]`                                    | `void`                                           | 手动追加数据（不清行 DOM 池）       |
| `prependRows`        | `rows: T[]`                                    | `void`                                           | 手动前插数据（含滚动偏移补偿）      |
| `setHasMore`         | `hasMore: boolean, dir?: 'down' \| 'up'`       | `void`                                           | 手动模式下控制触发闸门与状态条      |
| `setCursor`          | `cursor: string \| null, dir?: 'down' \| 'up'` | `void`                                           | 手动模式下推进游标                  |
| `loadChildrenFor`    | `rowKey: string`                               | `void`                                           | 主动取某树节点的子节点              |
| `resetLazyNode`      | `rowKey: string, clearChildren = true`         | `void`                                           | 清掉该节点懒加载缓存，下次展开重取  |
| `destroy`            | —                                              | `void`                                           | 销毁实例，释放 DOM 与事件监听       |

### 实例属性

| 属性             | 类型              | 说明                   |
| ---------------- | ----------------- | ---------------------- |
| `core`           | `VirtListCore<T>` | 底层虚拟滚动内核实例   |
| `state`          | `ListState`       | 当前虚拟滚动响应式状态 |
| `leftFixedCount` | `number`          | 左侧固定列数量         |

### 滚动模型（自绘滚动条）

纵向滚动位置由 JS 掌管，横向保留原生 scrollport，两条滚动条都是自绘的浮层轨道：

| 轴   | 位置来源                                    | 滚动条                          |
| ---- | ------------------------------------------- | ------------------------------- |
| 纵向 | `@virt-list/core` 的偏移量 + 表体残差 `top` | 自绘，按**行索引**映射          |
| 横向 | 原生 `scrollLeft`（`overflow-x: auto`）     | 自绘，按**像素**映射、驱动原生  |

横向刻意保留原生 scrollport：固定列、分组表头标签、自动合并标签三处 `position: sticky`
都以它为参照，改成 JS 位移会同时失效。

::: warning 破坏性变更
以下几条随虚拟滚动内核（`@virt-list/core`）的重构一起变化：

- **`scroll` 事件的载荷不再是 DOM `Event`**，而是 `VirtScrollEvent`：
  `{ offset, delta, direction, clientSize, scrollSize, maxOffset, atStart, atEnd, source }`。
  容器的 `overflow-y` 是 `hidden`，没有原生纵向 scroll 事件可转发，伪造一个只会让
  `e.target.scrollTop` 读到恒定的 `0`。`source` 是 `'user' | 'program' | 'adjust'`，
  其中 `'adjust'`（库为保持视口内容不跳做的内部补偿）通常应当判掉。
- **`clientEl.scrollTop` 恒为 `0`**，不再代表滚动位置 —— 用 `getOffset()`。
  自己算浮层位置时也不要再加 `scrollTop`（横向的 `scrollLeft` 仍然有效）。
- **`rangeUpdate` 现在由表格自己派生**（内核已移除该事件），语义不变：
  可视区间**真的变化**时才触发，不随每帧滚动刷。
:::

## 类型定义

```ts
interface CellRenderContext<T> {
  value: T[keyof T];
  row: T;
  rowIndex: number;
  column: VirtTableColumn<T>;
}

interface CellEditContext<T> extends CellRenderContext<T> {
  el: HTMLElement;
}

interface HeaderRenderContext<T> {
  column: VirtTableColumn<T>;
}

interface ExpandRenderContext<T> {
  column: VirtTableColumn<T>;
  row: T;
}

interface VirtTableColumn<T = any> {
  key: string;
  title: string;
  /** 列宽（px）；分组节点可填 0，宽度恒等于可见子列之和 */
  width: number;
  /** 子列 —— 配置它即成为多级分组表头的分组节点，叶子才是数据列 */
  children?: VirtTableColumn<T>[];
  /** 多级分组表尾：该节点表尾格的静态内容 */
  footerValue?: string | number;
  /** 多级分组表尾：该节点表尾格的自定义渲染 */
  renderFooter?: (ctx: FooterRenderContext<T>) => string | HTMLElement;
  fixed?: 'left' | 'right';
  type?: 'index' | 'checkbox' | 'expand' | 'tree' | 'radio' | 'drag';
  /** 内容类型；优先级低于同级 render，高于表级兜底与默认取值 */
  cellType?: CellContentType;
  render?: (ctx: CellRenderContext<T>) => string | HTMLElement;
  renderEditor?: (ctx: CellEditContext<T>) => HTMLElement | null | void;
  /** 编辑浮层是否替这一列画外观，默认 true；第三方组件自带外观时设 false */
  editorChrome?: boolean;
  renderHeader?: (ctx: HeaderRenderContext<T>) => string | HTMLElement;
  renderExpandRow?: (ctx: ExpandRenderContext<T>) => string | HTMLElement;
  align?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  headerAlign?: 'left' | 'center' | 'right';
  headerVAlign?: 'top' | 'middle' | 'bottom';
  footerAlign?: 'left' | 'center' | 'right';
  footerVAlign?: 'top' | 'middle' | 'bottom';
  textOverflow?: 'ellipsis' | 'tooltip';
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  filters?: Array<{ label: string; value: unknown; checked?: boolean }>;
  filterMultiple?: boolean;
  filterMethod?: (value: unknown, row: T) => boolean;
}

interface VirtTableOptions<T extends Record<string, any>> extends Omit<
  VirtListOptions<T>,
  'horizontal'
> {
  columns: VirtTableColumn<T>[];
  colBuffer?: number;
  merges?: MergeCell[];
  headerData?: string[][];
  headerMerges?: MergeCell[];
  footerData?: string[][];
  footerMerges?: MergeCell[];
  border?: boolean;
  stripe?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  emptyText?: string;
  align?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  headerAlign?: 'left' | 'center' | 'right';
  headerVAlign?: 'top' | 'middle' | 'bottom';
  footerAlign?: 'left' | 'center' | 'right';
  footerVAlign?: 'top' | 'middle' | 'bottom';
  /** 表级内容类型兜底（内容层最低一级；刻意没有表级 render） */
  cellType?: CellContentType;
  textOverflow?: 'ellipsis' | 'tooltip';
  highlightHoverRow?: boolean;
  highlightSelectRow?: boolean;
  highlightSelectCol?: boolean;
  highlightSelectCell?: boolean;
  headerClass?: string;
  headerStyle?: string;
  rowClass?: string | ((row: T, index: number) => string);
  rowStyle?: string | ((row: T, index: number) => string);
  cellClass?: string | ((column: VirtTableColumn<T>, row: T) => string);
  cellStyle?: string | ((column: VirtTableColumn<T>, row: T) => string);
  defaultExpandAll?: boolean;
  groupConfig?: { field: string; sort?: 'asc' | 'desc' }[];
  onCellSelectionChange?: (
    range: {
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    } | null,
  ) => void;
  plugins?: VirtTablePlugin<T>[];
  onFilterChange?: (filters: Record<string, unknown[]>) => void;
  filterModel?: FilterModel;
  onFilterModelChange?: (model: FilterModel) => void;
  onCheckChange?: (checked: boolean, row: T) => void;
  onCheckAll?: (checked: boolean) => void;
  onExpandChange?: (row: T, expandedKeys: string[]) => void;
  onTreeToggle?: (row: T, expanded: boolean) => void;
  onGroupToggle?: (row: T, expanded: boolean) => void;
  onRowRemoved?: (tr: HTMLTableRowElement) => void;
}

type CellContentType = 'text' | 'number' | 'rich-text' | 'image' | 'option' | 'checkbox';

/**
 * 单元格级渲染配置（`setCellRender` 的入参）。与列级**同形**：内容层的每个粒度都
 * 接受 `render` 与 `cellType` 两种来源。`render` / `cellType` 走同一条链，
 * `resolveCellRender()` 返回时两者最多只有一个有值。
 */
interface CellRenderConfig<T = any> {
  render?: (ctx: CellRenderContext<T>) => string | HTMLElement;
  cellType?: CellContentType;
  renderEditor?: (ctx: CellEditContext<T>) => HTMLElement | null | void;
}

interface MergeCell {
  rowIndex: number;
  colIndex: number;
  rowspan: number;
  colspan: number;
}

interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuContext<T = any> {
  rowIndex: number;
  colIndex: number;
  row: T;
  column: VirtTableColumn<T>;
  selection: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
}

interface ClipboardCopyContext<T = any> {
  selection: ClipboardSelectionRange;
  rows: string[][];
  columnIndexes: number[];
  list: T[];
}

interface ClipboardCopyResult {
  text: string;
  payload?: unknown;
}

interface ClipboardPasteContext<T = any> {
  selection: ClipboardSelectionRange;
  text: string;
  rows: string[][];
  payload: unknown | null;
  columnIndexes: number[];
  list: T[];
  setList: (list: T[]) => void;
}

interface VirtTableEvents<
  T extends Record<string, any>,
> extends VirtListEvents<T> {}

// ---- 服务端数据 / 无限滚动 ----

interface DataRequest {
  page: number;          // 目标页码（1 基）
  pageSize: number;
  offset: number;        // main 为 (page-1)*pageSize；追加时为已加载条数
  cursor: string | null;      // 向下游标
  prevCursor: string | null;  // 向上游标
  loadedCount: number;
  sort: SortSpec[];
  filters: Record<string, unknown[]>;
  filterModel: FilterModel;
  search: string;
  reason: 'init' | 'reload' | 'refresh' | 'page' | 'sort' | 'filter'
        | 'append' | 'prepend' | 'retry';
  channel: 'main' | 'more' | 'prev';
  signal: AbortSignal;
}

interface DataResponse<T> {
  rows: T[];
  total?: number;
  cursor?: string | null;
  prevCursor?: string | null;
  hasMore?: boolean;
  hasPrev?: boolean;
  footerData?: string[][];   // 服务端聚合行，直接接管表尾
}

// 受控层上下文 = DataRequest + 交付回调
interface LoadMoreContext<T> extends DataRequest {
  done: (rows?: T[], meta?: Omit<DataResponse<T>, 'rows'>) => void;
  fail: (err?: unknown) => void;
}

interface RemoteState {
  page: number;
  pageSize: number;
  total: number;         // 未知时为 -1（TOTAL_UNKNOWN）
  cursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  hasPrev: boolean;
  loading: boolean;      // 首屏/换参/翻页（全屏遮罩）
  loadingMore: boolean;  // 向下追加（底部状态条）
  loadingPrev: boolean;  // 向上追加（顶部状态条）
  error: unknown | null;
  loadedCount: number;
  initialized: boolean;
}
```

---

## 新增能力

以下为在双向虚拟化基础上补齐的表格能力。所有 `option` / `column` 字段在 React / Vue 端自动透传；`实例方法`需通过组件 ref 调用。

### 列排序

| 位置     | 字段/方法                                                    | 说明                                             |
| -------- | ------------------------------------------------------------ | ------------------------------------------------ |
| column   | `sortable?: boolean`                                         | 是否可排序（表头显示排序图标，仅点击图标触发）   |
| column   | `sortMethod?: (a, b) => number`                             | 自定义比较（默认按值：数字比大小，其余字典序）   |
| column   | `defaultSort?: 'asc' \| 'desc'`                             | 初始排序方向                                     |
| option   | `sortMode?: 'single' \| 'multiple'`                        | 单列（默认）或 Shift+点击多列                     |
| option   | `onSortChange?: (state: SortSpec[]) => void`                | 排序变化回调                                     |
| 方法     | `sort(colKey, order \| null)` / `clearSort()` / `getSortState()` | 编程式排序                                  |

表头点击三态循环 `无 → 升 → 降 → 无`。**存在 `merges` 合并单元格时排序自动禁用**（合并按绝对行号）。

### 加载态

| 位置   | 字段/方法                       | 说明                     |
| ------ | ------------------------------- | ------------------------ |
| option | `loading?: boolean`             | 加载遮罩                 |
| option | `loadingText?: string`          | 遮罩文案（默认「加载中...」） |
| 方法   | `setLoading(loading: boolean)`  | 切换加载态               |

### 键盘导航

| 位置   | 字段                          | 说明                                                       |
| ------ | ----------------------------- | ---------------------------------------------------------- |
由 `vtKeyboardNav` 插件提供，**依赖 `vtCellSelection`**（焦点位置就是选区）：
`plugins: [vtCellSelection(), vtKeyboardNav()]`。同时装了 `vtCellEditor` 才响应 F2。

| 按键 | 行为 |
| --- | --- |
| 方向键 | 移动焦点 |
| Tab / Shift+Tab | 左右移动 |
| Enter | 下移一行 |
| Home / End | 跳到行首 / 行尾列 |
| **Ctrl（或 Cmd）+ Home / End** | 跳到表首 / 表尾单元格 |
| **PageUp / PageDown** | 上翻 / 下翻一屏 |
| Shift + 上述任意导航键（除 Tab / Enter） | 保持锚点扩展选区 |
| F2 | 进入编辑（需 `vtCellEditor`） |

翻一屏 = 视口能放下多少行，按 `clientHeight / estimatedSize` 估。动态行高下是近似值——差一两行无妨，`scrollToCell` 会把目标行滚进视口。Mac 上多数键盘没有独立 Home/End 键，所以 `Cmd` 组合与 `Ctrl` 等效。

### 导出 / 打印

由 `vtExport` 插件提供：`plugins: [vtExport()]`。

| 方法                                | 说明                                 |
| ----------------------------------- | ------------------------------------ |
| `exportCsv(opts?: ExportOptions)`   | 导出 CSV（带 UTF-8 BOM）             |
| `exportExcel(opts?: ExportOptions)` | 导出 Excel（HTML 表格 .xls）         |
| `print(opts?: { title? })`          | 打印全表（新窗口 + 内联样式）        |
| column `exportValue?: (row) => string \| number` | 覆盖导出取值            |

`ExportOptions`：`{ filename?, scope?: 'all' | 'selection', includeHeader?, delimiter? }`。
`scope: 'selection'` 需同时装载 `vtCellSelection` 插件（未装载时会告警并返回空结果）。

### 自动聚合合计行

| 位置   | 字段                                                          | 说明                       |
| ------ | ------------------------------------------------------------- | -------------------------- |
| option | `showSummary?: boolean`                                       | 显示合计行（占用表尾）     |
| option | `summaryText?: string`                                        | 合计行首列标签（默认「合计」） |
| column | `summary?: 'sum'\|'avg'\|'count'\|'max'\|'min'`               | 内置聚合                   |
| column | `summaryMethod?: (values, rows) => string \| number`         | 自定义聚合                 |

合计基于**筛选/排序后的叶子行**，自动随视图变化。

### 拖拽排序

| 位置   | 字段/类型                                             | 说明                                       |
| ------ | ----------------------------------------------------- | ------------------------------------------ |
| 插件   | `vtColumnDrag()`                                      | 拖拽表头调整列顺序                         |
| option | `onColumnOrderChange?: (columns) => void`             | 列顺序变化回调                             |
| 插件   | `vtRowDrag()`                                         | 行拖拽（仅扁平数据且未排序/筛选时生效，配合 `type:'drag'` 手柄列）|
| option | `onRowOrderChange?: (list, from, to) => void`         | 行顺序变化回调                             |
| column | `type: 'drag'`                                        | 行拖拽手柄列                               |

### 主题

| 位置   | 字段/方法                          | 说明                        |
| ------ | ---------------------------------- | --------------------------- |
| option | `theme?: 'light' \| 'dark'`        | 显式指定主题                |
| 方法   | `setTheme('light' \| 'dark')`      | 显式切换主题                |

样式基于 `.vt-root` 上的 `--vt-*` CSS 变量：**颜色 / 圆角 / 间距 / 字号 / 阴影 / 动效时长全部可覆盖**，换肤不需要覆盖任何选择器。悬停底色、选中底色、框选底色、focus 环等派生色由 `--vt-color-primary` 经 `color-mix()` 推导，改主色即整体联动（不支持 `color-mix()` 的浏览器回落到内置静态值）。

- 暗色生效条件（任一即可）：显式 `theme: 'dark'` / `setTheme('dark')`（加 `.vt-root--dark`）、或处于 **`.dark`** / **`[data-theme='dark']`** 祖先元素下（兼容 VitePress / Tailwind 等约定）。
- 暗色页面中需要强制亮色：给根节点加 `.vt-root--light`。
- 密度：`.vt-compact`（行高 30px）/ `.vt-loose`（行高 50px），可加在表格根节点或任意外层容器上。**换密度必须同时把 `estimatedSize` 改成对应行高**（默认密度 40px），否则滚动几何会失真；自定义密度见 [行高等式](/vanilla/examples/basic/theme#行高等式)。

完整变量清单见 [暗夜模式 / 主题定制](/vanilla/examples/basic/theme)。

### 国际化 i18n

所有内置 UI 文案（空数据、加载、合计行、表头排序提示、列头筛选下拉、全文搜索框、高级筛选算子与构建器）收进统一的 `locale` 字典。内置 `zhCN`（默认）与 `enUS` 两个完整语言包。

| 位置   | 字段/方法                                  | 说明                                                             |
| ------ | ------------------------------------------ | ---------------------------------------------------------------- |
| option | `locale?: DeepPartial<VirtTableLocale>`    | 覆盖内置文案，与 `zhCN` **深合并**（默认 `zhCN`）                 |
| 方法   | `setLocale(locale)`                        | 运行时切换/覆盖文案，即时刷新已渲染 DOM                          |
| 方法   | `getLocale()`                              | 返回当前生效的完整 `VirtTableLocale`                             |
| 导出   | `zhCN` / `enUS`                            | 内置语言包（三端均从各自入口 re-export）                         |
| 导出   | `mergeLocale(base, override?)`             | 深合并两个 locale                                                |

- 传完整语言包整体切换（`setLocale(enUS)`），或传 `DeepPartial` 局部覆盖（`{ empty: '空空如也' }`）。
- **优先级**：单项 option `emptyText` / `loadingText` / `summaryText` **高于** `locale` 对应项（向后兼容）。
- 高级筛选构建器 `VtFilterBuilder` 关联 `table` 时，默认文案取表格 `locale`；其 `texts` option 仍为最高优先。

```ts
import { VirtTable, enUS } from '@virt-table/vanilla';

const table = new VirtTable(el, { list, columns, locale: enUS });
table.setLocale(zhCN); // 运行时切回中文
```

示例见 [国际化 i18n](/vanilla/examples/feature/i18n)。

### 分页

传 `pagination` option 就渲染分页条。**默认是客户端分页**（表格自己切片），开
`manualPagination`（或 `dataMode: 'server'`）切成服务端模式。

| | 客户端（默认） | 服务端（`manualPagination`） |
| --- | --- | --- |
| 谁切数据 | 表格 | 使用方（`onPageChange` 里 `setList`） |
| `total` | 由**筛选后的行数**派生；`setTotal()` 告警并跳过 | 使用方给 |
| 排序 / 筛选 | 作用于全量数据，再切当前页 | 交给服务端 |

客户端分页的行为细节：筛选后回到第 1 页（行集合变了）、排序不重置页码、树形/分组**按根行**切片（子节点跟着父节点，`total` 数根行）、合计行算当前页、与 `infinite` 互斥、翻页后滚回顶部。见[分页（客户端）示例](/vanilla/examples/feature/pagination-client)。

三个 manual 开关至此对称：`manualSorting` / `manualFiltering` / `manualPagination` 各自让表格跳过管线里对应的一段。

#### 原有的服务端分页说明

::: tip 以下是服务端模式（`manualPagination: true`）
表格只渲染分页器并派发 `onPageChange`，**不做数据切片**。`total` 由外部提供，翻页时在回调里自行取数并 `setList` + `setTotal`。不开这个开关就是客户端分页（见上）。

| 位置   | 字段/方法                                                            | 说明                                                           |
| ------ | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| option | `pagination?: { total?; page?; pageSize?; pageSizes? }`             | 存在即渲染分页器（总数 + 每页条数 + 上/下页 + 页码 + 跳页）      |
| option | `onPageChange?: (page, pageSize) => void`                           | 翻页/跳页/切换每页条数时触发（切换每页条数会重置到第 1 页）      |
| 方法   | `setPage(page)`                                                     | 跳转到指定页（自动 clamp），页码变化时派发 `onPageChange`        |
| 方法   | `setPageSize(pageSize)`                                             | 设置每页条数，重置到第 1 页并派发 `onPageChange(1, pageSize)`    |
| 方法   | `setTotal(total)`                                                   | 更新总条数（取数返回后调用），clamp 当前页并重绘，**不派发事件** |
| 方法   | `getPagination()`                                                   | 读取 `{ page, pageSize, total }`                               |

- `pagination` 默认值：`page=1`、`pageSize=pageSizes[0] ?? 10`、`pageSizes=[10,20,50,100]`、`total=0`。
- 分页器文案通过 `locale.pagination` 定制（`total` / `prev` / `next` / `jumpTo` / `jumpUnit` / `pageSizeUnit`），随 `setLocale` 即时切换。

```ts
const table = new VirtTable(el, {
  list: fetchPage(1, 20),
  columns,
  pagination: { total: 200, pageSize: 20 },
  onPageChange: (page, pageSize) => {
    table.setList(fetchPage(page, pageSize)); // 换成接口请求即可
    table.setTotal(200);
  },
});
```

示例见 [分页 pagination](/vanilla/examples/feature/pagination)。
:::

配了 `loadData` / `onLoadMore` 后，翻页改由表格取数（见下节），无需再自行处理 `onPageChange`。

### 服务端数据 / 无限滚动

::: tip 分工
**库负责**「何时该取数、取数期间的状态与 UI、取回后怎么并进虚拟滚动」；**你负责**「怎么取数」。
因此内置能力里没有缓存、重试策略、HTTP 包装 —— 想要这些请用受控层接 TanStack Query / SWR。
:::

**一套内核，两个入口**：

| 入口                          | 适用                                              |
| ----------------------------- | ------------------------------------------------- |
| `loadData(req) => Promise<DataResponse>` | 糖层，开箱即用                          |
| `onLoadMore(ctx)` / `onLoadPrev(ctx)`    | 受控层，自己发请求并 `ctx.done/fail` 交付；两者同时给时受控层优先 |

**三个细粒度开关**（真实项目常见混合口径，故按维度分开）：

| 位置   | 字段                                       | 说明                                          |
| ------ | ------------------------------------------ | --------------------------------------------- |
| option | `manualSorting`                            | 排序交给服务端：跳过本地排序，改为重新取数     |
| option | `manualFiltering`                          | 筛选交给服务端：列头筛选与高级筛选都不再本地过滤 |
| option | `manualPagination`                         | 分页/加载交给服务端                            |
| option | `dataMode: 'server'`                       | 快捷方式，等价于以上三个全开                   |

排序/筛选状态变化时会**清空已加载数据并回到第 1 页**重新取数。

**无限滚动**：

| 位置   | 字段                                                          | 默认    | 说明                                     |
| ------ | ------------------------------------------------------------- | ------- | ---------------------------------------- |
| option | `infinite.pageSize`                                           | `50`    | 每批条数                                  |
| option | `infinite.distance`                                           | `200`   | 距底/距顶触发阈值（写入内核 `edgeThreshold`） |
| option | `infinite.autoLoadFirst`                                      | 无初始 `list` 时为 `true` | 首屏是否自动取第一批      |
| option | `infinite.manual`                                             | `false` | 只显示「加载更多」按钮，不自动触发        |
| option | `infinite.direction`                                          | `'down'`| `'down'`/`'up'`/`'both'`，`up` 走 `onLoadPrev` |
| option | `infinite.showNoMore`                                         | `true`  | 到底后显示「没有更多」                    |
| option | `onLoad` / `onLoadError` / `onRemoteStateChange`               | —       | 取数成功 / 失败 / 状态变化回调            |
| 方法   | `reload()` / `refresh()` / `loadMore()` / `loadPrev()` / `retryLoad()` | — | 主动触发                          |
| 方法   | `getRemoteState()`                                            | —       | 状态快照（见类型定义 `RemoteState`）      |
| 方法   | `appendRows()` / `prependRows()` / `setHasMore()` / `setCursor()` | —    | 完全手动管理数据时使用                    |

**`hasMore` 推导优先级**：显式 `hasMore` > 游标（`cursor === null` 即到底）> 总数（`loadedCount >= total`）> 满页启发式（`rows.length >= pageSize`）。因此**游标与页码不必二选一**：请求里 `page`/`offset`/`cursor` 同时下发，后端认哪个用哪个，状态机内部无分支。

**竞态与去重**（这部分是库替你兜住的）：

- `toBottom` 每次向下滚动都会触发 —— 在途加锁 + `hasMore` 门禁，重复触发直接忽略；
- 换排序/筛选/翻页走 main 通道，会 `abort` 全部在途请求并作废其响应，只采用最后一次；
- 追加走 more 通道、向上加载走 prev 通道，两者可并发、各自加锁；
- 失败保留已加载数据，`retryLoad()` 复用同一批参数；
- `destroy()` 中断所有在途请求。

**`pagination` 与 `infinite` 互斥**：前者是页视图（replace，当前页是唯一状态），后者是累积流（append，页码只表示取到第几批）。同时给出时以 `pagination` 为准、忽略 `infinite` 并告警。

**加载态语义**：首屏/换参/翻页 → 全屏遮罩 `.vt-loading-mask`；追加 → 只亮状态条 `.vt-infinite-bar`（四态：加载中 / 加载更多按钮 / 没有更多 / 失败重试），文案见 `locale.infinite`。状态条用 `visibility` 隐藏、**常驻占位**（约 34px）——否则出现/消失会改变滚动容器高度，虚拟滚动跟着抖动。

**前插补偿**：向上加载后把滚动位置下推等量距离，并跟随 `ResizeObserver` 的实测高度逐帧收敛（连续稳定即停，硬上限约 650ms）；校正期间用户一滚动立即让位。

```ts
const table = new VirtTable(el, {
  list: [],
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,                    // 固定行高：追加时滚动条不抖
  dataMode: 'server',
  infinite: { pageSize: 50 },
  async loadData(req) {
    const res = await fetch('/api/rows?' + new URLSearchParams({
      offset: String(req.offset),
      limit: String(req.pageSize),
      sort: JSON.stringify(req.sort),
      filters: JSON.stringify(req.filters),
    }), { signal: req.signal });
    const { rows, total } = await res.json();
    return { rows, total };
  },
});
```

::: warning 限制
- **合并单元格（`merges`）与无限滚动不兼容**：`merges` 基于扁平行索引，追加后索引语义漂移；需要合并请改用分页。
- 服务端模式下 `showSummary` 的本地聚合只覆盖**已加载数据**，全量口径请让服务端返回 `footerData`。导出 / 打印同理。
- 向上加载（prepend）在动态行高下的偏移补偿有测量误差（rAF 内会再校正一次），要精确请开 `fixedSize: true`。
:::

示例见 [无限滚动](/vanilla/examples/feature/infinite)、[服务端数据](/vanilla/examples/feature/server-data)。

### 树形懒加载

配 `loadChildren` 即启用（配合 `type: 'tree'` 列）：首屏只给根节点，首次展开某节点时才取它的 `children`。

| 位置   | 字段/方法                                    | 说明                                                     |
| ------ | -------------------------------------------- | -------------------------------------------------------- |
| option | `loadChildren(row, ctx)`                     | 取子节点；`ctx` 含 `level` 与 `signal`，返回的行写进 `row.children` |
| option | `hasChildren(row)`                           | 未加载时是否给展开箭头（默认读 `row.hasChildren`）         |
| option | `onChildrenLoaded` / `onChildrenLoadError`   | 成功 / 失败回调                                           |
| 方法   | `loadChildrenFor(rowKey)`                    | 主动取某节点子节点（等价于用户首次展开）                   |
| 方法   | `resetLazyNode(rowKey, clearChildren = true)` | 清缓存，下次展开重新取数（刷新子树）                      |

行为约定：取数期间箭头变小 spinner 且**忽略点击**（否则连点会按奇偶随机决定最终折叠态）；同一节点在途只请求一次、已加载不再请求；返回空数组记为「确实没有子节点」（箭头变叶子）；失败回到折叠态，再点一次即重试；`destroy()` 中断所有在途请求。

`defaultExpandAll` / `expandAll()` **只作用于已加载的节点**——否则初始化就会递归拉下整棵树，与懒加载意图相反。

另外：子节点数据写进 `row.children`，因此筛选/排序/合计只覆盖已加载的部分。

示例见 [树形懒加载](/vanilla/examples/feature/lazy-tree)。

### 单选行

| 位置   | 字段/方法                          | 说明                    |
| ------ | ---------------------------------- | ----------------------- |
| column | `type: 'radio'`                    | 单选列                  |
| option | `onRadioChange?: (row) => void`    | 单选变化回调            |
| 方法   | `getSelectedRadio()` / `setSelectedRadio(rowKey \| null)` | 单选行读写 |

### 编辑校验

| 位置   | 字段/方法                                          | 说明                                       |
| ------ | -------------------------------------------------- | ------------------------------------------ |
| column | `validator?: (value, row) => true \| string`       | 返回 `true` 通过，返回字符串为错误信息     |
| 方法   | `validateAll()`                                    | 返回未通过项 `{ row, colKey, message }[]`  |

内置编辑器（`VtInput` / `VtNumberInput` / `VtTextarea`）会实时标记错误态。

### 列显隐

| 位置   | 字段/方法                                | 说明                       |
| ------ | ---------------------------------------- | -------------------------- |
| column | `hidden?: boolean`                       | 是否隐藏                   |
| column | `hideable?: boolean`                     | 是否允许在列面板切换（默认 true） |
| 方法   | `setColumnVisible(colKey, visible)`      | 切换列显隐                 |
| 方法   | `getVisibleColumns()` / `getAllColumns()`| 可见叶子列 / 全量列树      |
| 方法   | `getLeafColumns()`                       | 全量叶子列（含隐藏）        |
| 方法   | `toggleColumnPanel(anchor?)`             | 打开/关闭列设置面板（需装载 `vtColumnPanel` 插件）|

列设置面板由 `vtColumnPanel()` 插件提供：`plugins: [vtColumnPanel()]`。传锚点元素则面板贴在锚点下方，不传则贴表格右上角。勾掉分组节点等于整组隐藏。

### 富筛选

| 位置   | 字段                                                       | 说明                                    |
| ------ | ---------------------------------------------------------- | --------------------------------------- |
| column | `filterType?: 'enum'\|'text'\|'number-range'\|'date-range'` | 筛选类型（默认 enum 枚举勾选）        |

`number-range` / `date-range` 筛选值为 `{ min, max }` / `{ start, end }`。

### 高级筛选（筛选管理器）

列筛选有两种入口，可同时使用，两者**状态独立、最终 AND 组合**：

1. 表头快捷筛选 —— 上面的 `filters` / `filterType`，状态由 `setColumnFilter` / `getActiveFilters` 管理。
2. 高级筛选 —— 一棵 AND/OR 条件树（`FilterModel`），可任意层嵌套；配套的可视化条件构建器
   `VtFilterBuilder` 挂在**表格之外**由使用方指定的容器里，按需引入。

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

| 位置   | 字段/方法                                          | 说明                                                   |
| ------ | -------------------------------------------------- | ------------------------------------------------------ |
| column | `filterValueKind?: FilterValueKind`                | 显式指定值域类别（默认由 `filterType` / `filters` 推断） |
| column | `filterOperators?: FilterOperator[]`               | 收窄该列在管理器里的候选算子                            |
| option | `filterModel?: FilterModel`                        | 初始条件树                                             |
| option | `onFilterModelChange?: (model) => void`            | 条件树变化回调                                          |
| 方法   | `setFilterModel(model)`                            | 应用条件树（传 `null` 清空）                            |
| 方法   | `getFilterModel()`                                 | 读取条件树（深拷贝）                                    |
| 方法   | `clearFilterModel()`                               | 仅清空高级筛选，不影响表头筛选                          |
| 方法   | `hasActiveFilters()`                                | 表头筛选或高级筛选任一生效                              |

各值域可用算子：

| 值域             | 算子                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| `text`           | `contains` `notContains` `eq` `neq` `startsWith` `endsWith` `isEmpty` `isNotEmpty` |
| `number` `date`  | `eq` `neq` `gt` `gte` `lt` `lte` `between` `isEmpty` `isNotEmpty`       |
| `enum`           | `in` `notIn` `eq` `neq` `isEmpty` `isNotEmpty`                          |
| `boolean`        | `eq` `neq`                                                              |

求值约定：

- 列的 `filterMethod` **只参与** `in` / `notIn`（其签名 `(value, row)` 没有算子概念），其余算子按值域内建比较。
- `isEmpty` = `null` / `undefined` / `''`，**不含** `0` 与 `false`；`between` 为闭区间，只填一端即当单边界。
- `date` 值统一按 `new Date(v).getTime()` 归一后比较，无法解析的单元格不命中。
- 半成品条件（缺值、空条件组）一律视为**通过**，避免编辑过程中把表格筛空。
- 指向**不存在或已隐藏**列的条件同样视为通过（与列头筛选一致：求值只认当前可见列）。
- 树形数据下与列头筛选一致：命中子节点时保留其祖先。
- 高级筛选生效时行拖拽排序同样被禁用（等同列头筛选）。

#### VtFilterBuilder（条件构建器）

```ts
import { VirtTable } from '@virt-table/vanilla';
import { VtFilterBuilder } from '@virt-table/vanilla/components';

const fb = new VtFilterBuilder({
  el: '#filter-bar',        // 挂载容器（元素或选择器）
  table,                    // 传入则自动取可见列，并在应用时调 table.setFilterModel()
  columns,                  // 不关联表格时手动提供列
  model,                    // 初始条件树
  autoApply: false,         // true 则每次改动即时生效（默认需点「应用筛选」）
  showFooter: true,         // 底部操作栏
  theme: 'dark',            // 不传则跟随 .dark / [data-theme='dark'] 祖先
  texts: { apply: 'Apply' }, // 文案覆盖（默认中文）
  onChange: (model) => {},  // 条件变化（含编辑中的半成品）
  onApply: (model) => {},   // 已应用到表格
});
```

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
或直接引全量 `style.css`），容器自带全套 `--vt-*` 变量，暗色自动适配。
React / Vue 端对应 `<VirtFilterBuilderReact />`（`tableRef` + 受控 `value`）与
`<VirtFilterBuilderVue />`（`:table` + `v-model:model`）。

### 固定行（pinned rows）

| 位置   | 字段/方法                                | 说明                       |
| ------ | ---------------------------------------- | -------------------------- |
| option | `pinnedTop?: T[]`                        | 置顶固定行（冻结在表头下方） |
| option | `pinnedBottom?: T[]`                     | 置底固定行（冻结在表尾上方） |
| 方法   | `setPinnedRows(top?, bottom?)`           | 更新固定行                 |

固定行冻结的是**数据行**，固定表头（默认开启，见 `showHeader`）冻结的是**列名**，两者互不替代。
二者的差异对照与使用场景区分见[固定行 pinned](../examples/feature/pinned)。

### 多级分组表头

给列配置 `children` 即可得到多级分组表头：带 `children` 的节点是**分组节点**（自身不承载数据，只在表头占一格并横跨其全部叶子后代），叶子才是真正的数据列。嵌套层数不限，表头行数 = 列树深度。

**表头与表体一起做横向虚拟化**：只渲染视口内的叶子列；跨越视口边界的分组格裁剪到视口内，视口外整段列折叠成一个贯通表头高度的留白格。

```ts
const columns: VirtTableColumn[] = [
  // fixed 写在分组上，会强制下发给所有后代
  { key: 'g_base', title: '基础信息', width: 0, fixed: 'left', children: [
    { key: 'index', title: '#', width: 56, type: 'index' },
    { key: 'name', title: '门店', width: 140, sortable: true },
  ]},
  { key: 'y2024', title: '2024 年', width: 0, children: [
    { key: 'q1', title: 'Q1', width: 0, children: [
      { key: 'q1_rev', title: '营收', width: 110, align: 'right' },
      { key: 'q1_cost', title: '成本', width: 110, align: 'right' },
    ]},
  ]},
];
```

| 位置   | 字段/方法               | 说明                                                     |
| ------ | ----------------------- | -------------------------------------------------------- |
| column | `children?`             | 子列；配置即成为分组节点                                  |
| column | `fixed?`（分组上）      | 强制下发给全部后代，保证分组格与其叶子落在同一冻结区段      |
| 方法   | `getHeaderDepth()`      | 表头行数（= 列树深度）                                    |
| 方法   | `getLeafColumns()`      | 全量叶子列（含隐藏）                                      |
| 方法   | `getVisibleColumns()`   | 当前可见叶子列                                            |
| 方法   | `getAllColumns()`       | 全量列树（含隐藏列与分组节点）                             |
| 方法   | `setColumnVisible(key,v)` | 传分组 `key` 即整组显隐                                 |
| 渲染   | `renderHeader(ctx)`     | `ctx.isGroup` 标识是否分组节点，`ctx.headerRow` 为所在表头行 |

约束：

- 数据相关配置（`render` / `sortable` / `filters` / `resizable` / `type` / `summary` / `validator` …）写在**叶子列**上；分组节点只需要 `title` 或 `renderHeader`。
- 与手写多行表头（`headerData` / `headerMerges`）**互斥**：配置了 `children` 时后者被忽略并在控制台告警。
- 列显隐按树生效：隐藏叶子使父分组收窄，隐藏分组等于隐藏其全部叶子；某分组的可见子列为空时整组消失。
- `vtColumnDrag` 在分组表头下**只允许同一父分组内换位**，跨分组拖拽被忽略；有 `merges` 时整体禁用。
- 分组格默认 `text-align: center`（`headerAlign` / `align` 可覆盖），样式类 `.vt-th--group`，底色变量 `--vt-header-group-bg`。
- **分组格恒为单行**（`white-space: nowrap`），超出部分裁掉、完整内容挂在原生 `title` 上。原因：横向虚拟化会把跨视口的分组格 colspan 裁窄，若允许折行则行高会随滚动变化，sticky 的表头/表尾就会抖动。
- **分组标签横向跟随**：中间段的分组格把内容放进一层 `.vt-group-label`（`position: sticky`）。分组比可见区宽时标签被钉在可见区并居中、滚动中完全不动；分组窄于可见区时退化为格内居中。由 CSS sticky 在合成器逐帧完成，主线程零开销。左右冻结段的分组格本身已冻结在视口内，不套此内层。

#### 分组标签为什么要 sticky

分组格的 colspan 会被列窗口裁剪，而**裁剪按整列取整、滚动按像素**。若直接在格子里 `text-align: center`，标签会一边随内容匀速漂移、一边在跨列时跳半个列宽（实测在 900px 视口下于屏幕中心附近 ±27px 反复蹭）。

把标签交给 CSS sticky 后：

```
left  = var(--vt-fixed-left-w)                       左冻结区宽度
width = min(100%, var(--vt-center-view-w))           min(本格宽, 可见中间区宽)
```

两个变量由表格在**容器尺寸/列宽变化时**写到 `.vt-root` 上（不随滚动更新），逐像素的跟随全部交给浏览器。

- **分组盖满可见区**（常见情形，也是真正需要读标签的时候）：标签钉在可见区居中，滚动中位移 **0px**。
- **分组正在滑出视口**：标签随内容 1:1 平滑左移；但此时标签宽度取自被裁剪的格子宽，仍会在每次有列离开渲染窗口时跳半个列宽（120px 列宽下约 50px）。此刻分组已大半滑出屏幕，观感影响远小于改动前。彻底消掉需要在每个滚动帧用 JS 重算标签几何，代价是把这份工作搬回主线程。
- 冻结段的分组格不套此内层（它本身就冻结在视口内，`left` 偏移反而会把标签推出格子）。

### 多级分组表尾

表尾与表头**同序**（最外层分组在上、叶子小计在下），网格与表头逐行一致，因此复用同一份表头网格与同一套横向虚拟化裁剪规则——列很多时表尾也只渲染视口内的列。

**启用条件**：列树里有分组节点（`children`），并且表尾确实有内容来源——开了 `showSummary`，或任一节点配了 `footerValue` / `renderFooter`。否则退回 `footerData` / `footerMerges` 的扁平表尾（两者互斥，启用分组表尾时后者被忽略并告警）。

**每格内容的优先级**：`renderFooter` > `footerValue` > `summary`/`summaryMethod` 自动聚合 > 合计标签（仅整表首列的叶子格）> 空。

```ts
const columns: VirtTableColumn[] = [
  { key: 'g_base', title: '基础信息', width: 0, fixed: 'left', children: [
    // 首列叶子格默认自动放合计标签；显式给空值可让位给下一列
    { key: 'index', title: '#', width: 56, type: 'index', footerValue: '' },
    { key: 'name', title: '门店', width: 140, footerValue: '合计' },
  ]},
  { key: 'y2024', title: '2024 年', width: 0,
    summary: 'sum',                       // 分组：聚合旗下全部叶子列 × 全部行
    children: [
      { key: 'q1', title: 'Q1', width: 0,
        summaryMethod: (values, rows) => `营收 ${…}`,   // 分组：自定义聚合
        children: [
          { key: 'q1_rev', title: '营收', width: 110, summary: 'sum' },
          { key: 'q1_rate', title: '毛利率', width: 110, footerValue: '—' },
        ]},
    ]},
  { key: 'g_total', title: '汇总', width: 0, fixed: 'right',
    renderFooter: ({ rows }) => `<b>${rows.length} 家</b>`,
    children: [{ key: 'total', title: '合计营收', width: 130, summary: 'sum' }] },
];
new VirtTable(el, { list, columns, itemKey: 'id', estimatedSize: 40, showSummary: true });
```

**分组格的聚合语义**：把该格覆盖的**全部叶子列 × 全部行**的原始值摊平成一维 `values`，再交给 `summaryMethod`（优先）或内置 `summary`。叶子格是同一套语义的特例（`values = rows.map(r => r[key])`），因此 `count` 在分组格上统计的是**摊平后的单元格数**而非行数。聚合始终基于当前视图（筛选/排序后的叶子行），数据变化会自动重算。

```ts
interface FooterRenderContext<T> {
  column: VirtTableColumn<T>;   // 该格对应的列节点
  isGroup: boolean;             // 是否分组节点
  footerRow: number;            // 所在表尾行（0 = 最外层分组）
  leafColumns: VirtTableColumn<T>[];  // 该格覆盖的可见叶子列
  rows: T[];                    // 当前视图的叶子数据行
  summary: string;              // 该格的自动聚合结果，无聚合配置时为空串
}
```

样式：分组小计格类名 `.vt-td--group`，底色变量 `--vt-footer-group-bg`；默认 `text-align: center`（`footerAlign` / `align` 可覆盖）。分组小计格同样恒为单行（同上，避免横向滚动时表尾高度抖动）。

### 溢出文本 tooltip

`textOverflow` 的第三种取值 `'tooltip'`：省略号 + 内置浮层。全局配一次或按列覆盖，
不需要装插件、不需要额外引 CSS（样式在 `core.css`）。

```ts
new VirtTable(el, {
  list,
  columns: [
    { key: 'name', title: '姓名', width: 120 },
    // 列级覆盖：只有这一列弹浮层
    { key: 'remark', title: '备注', width: 200, textOverflow: 'tooltip' },
  ],
  itemKey: 'id',
  estimatedSize: 40,
  textOverflow: 'ellipsis', // 其余列只要省略号
  tooltip: { delay: 150 },  // 悬停延迟（ms），默认 150，0 为立即弹
});
```

行为细节：

- **只在文本真被裁掉时弹**（比较 `scrollWidth` / `clientWidth`），短文本悬停无反应；
- 悬停 `tooltip.delay` 毫秒后出现（默认 150），长文本在浮层里换行，最大宽度取表格宽度；
- 浮层挂在 `.vt-root` 内（不是 `document.body`），上方放不下自动翻到下方、贴边自动夹取并把箭头指回单元格中心；
  - 挂在表格内是刻意的：`absolute` 定位相对 root，页面滚动时浮层跟着表格一起走，**零 JS**。挂 body 只能用 `position: fixed`，那是锚在视口的，页面一滚就得靠 JS 逐帧重算位置，视觉上会卡。代价是很窄的表格里长文本会被压成高窄块（靠换行消化）。
- 跟随明暗主题（`--vt-tooltip-bg` / `--vt-tooltip-text` 两个变量可覆盖），`prefers-reduced-motion` 下不做淡入；
- 滚动、换数据、排序/筛选触发重绘时立即隐藏（行 DOM 会被复用）。

与 `'ellipsis'` 的区别只在于给不给查看完整内容的手段。只响应鼠标悬停，纯键盘操作下看不到（单元格文本节点本身是完整的，读屏不受影响）。

> 早期还有过 `'title'`（省略号 + 原生 `title` 属性）。实测它在渲染与悬停上都没有性能优势，却延迟不可控、不换行、不跟主题，而且**无论文本是否真被裁掉都会挂上属性**——短文本悬停会弹一个与眼前内容重复的气泡。已移除。

**性能**（Chrome 无头实测）：两种取值在渲染路径上开销一致（10 万单元格 49.4 / 48.3 ms，差异在噪声内）。`'tooltip'` 的额外成本只有 tbody 上一对事件委托，约 **0.5µs / 次 `mouseover`**，不随单元格数量增长；截断判定被推迟到延迟计时器里，所以鼠标横扫单元格不产生任何强制重排 —— 只有真正停下来那一格付一次 `scrollWidth` 读取。

> 只作用于**未自定义渲染**的单元格。列上写了 `render` 时内容由你接管，`textOverflow` 不介入。表头暂不支持（`th` 直接写 `textContent`）。

### 状态持久化

把用户调过的列宽 / 列序 / 列显隐 / 排序 / 筛选存下来，下次进页面还原。

```ts
// 存
localStorage.setItem('my-table', JSON.stringify(table.getState()));

// 还原
table.setState(JSON.parse(localStorage.getItem('my-table') ?? 'null'));
```

```ts
interface VirtTableState {
  /** 结构版本，当前为 1 */
  version: number;
  /** 叶子列状态；数组顺序即列序（含隐藏列，所以隐藏列的位置也能还原） */
  columns?: Array<{ key: string; width?: number; hidden?: boolean }>;
  /** 排序；多列排序时数组顺序有意义 */
  sort?: SortSpec[];
  /** 列头筛选：列 key → 勾选值 */
  columnFilters?: Record<string, unknown[]>;
  /** 高级筛选条件树；`getState()` 恒输出此字段，无筛选时为 `null` */
  filterModel?: FilterModel;
  /** 分页（仅配了 `pagination` option 时有意义）；不含 total —— 它是派生的 */
  pagination?: { page?: number; pageSize?: number };
}
```

**每个字段都是可选的，`setState()` 只应用出现的字段。** 所以可以只持久化一部分——比如只存列宽与列序，让排序每次回到默认：

```ts
const { version, columns } = table.getState();
localStorage.setItem('my-table', JSON.stringify({ version, columns }));
```

注意「不给字段」与「给空值」是两回事：不给 `sort` = 保持当前排序，给 `sort: []` = 清空排序。

正因如此，**`getState()` 输出的是完整快照**：没有高级筛选时它给 `filterModel: null` 而不是省略该字段。
否则「先存快照 → 之后加了筛选 → 还原」清不掉那条筛选，`setState(getState())` 就不是恒等操作了。
想只存一部分，自己挑字段即可（如上例）。

几个要点：

- **列宽是逻辑宽度**（`column.width`），不含容器拉伸系数。换个窗口宽度打开时按新容器重新拉伸，这才是想要的效果。
- **分组表头下列序只在同一分组内还原**。跨组搬家没有意义（与 `moveColumn` 同约束）；分组节点按其后代里最小的目标位次参与排序，所以「整组前移」是可以的。
- **状态里多出的列被忽略，缺的列保持现状**，排序里指向不存在的列会被丢掉——列配置改版后旧状态不会把表搞坏。
- **版本不匹配整体忽略并告警**（返回 `false`）。改了状态形状就把 `version` 加一，旧状态自动作废。
- 全过程只做一次列重建 + 一次数据管线重算，不会因为逐列 `setColumnVisible` / 逐列 `sort` 触发 N 次重排。
- 还原后会派发 `onSortChange` / `onFilterChange` / `onFilterModelChange`，方便把状态同步给外部 UI。
- 与 `getRemoteState()` 无关——那是服务端取数状态机的运行时状态，不该持久化。
- **隐藏一列不会让它上面的筛选/排序失效。** 筛选与排序是数据层的事，数据管线读的是全量叶子列（含隐藏），与 AG Grid / Excel 同语义。所以「隐藏某列 + 该列有筛选」这种状态能被完整还原。

### 无障碍（ARIA）

自动为根元素添加 `role="grid"` + `aria-rowcount/colcount`，表头 `role="columnheader"` + `aria-sort`，行 `role="row"` + `aria-rowindex`（真实数据索引），单元格 `role="gridcell"`，加载态 `aria-busy`。

### 插件机制

可选的 UI / 交互层以插件形式装载，未引入的插件代码可被 tree-shake。核心能力（虚拟化、固定列、合并单元格、表头/表尾渲染、数据管线）不做插件。

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtContextMenu } from '@virt-table/vanilla/plugins';

new VirtTable(el, {
  columns,
  plugins: [
    vtContextMenu((ctx) => [
      { label: `删除第 ${ctx.rowIndex + 1} 行`, action: () => remove(ctx.row) },
      { divider: true, label: '导出', action: () => table.exportCsv() },
    ]),
  ],
});
```

内置插件：

| 插件 | 说明 | 注入的实例方法 |
| --- | --- | --- |
| `vtContextMenu(provider)` | 右键菜单，见 [示例](/vanilla/examples/plugins/context-menu) | `hideContextMenu()` |
| `vtExport()` | 导出 CSV/Excel + 打印，见 [示例](/vanilla/examples/plugins/export) | `exportCsv()` / `exportExcel()` / `print()` |
| `vtClipboard(options?)` | 选区复制/粘贴（`requires: vtCellSelection`），见 [示例](/vanilla/examples/plugins/clipboard) | — |
| `vtCellSelection(options?)` | 单元格区域框选 + 边缘自动滚动，见 [示例](/vanilla/examples/plugins/cell-selection) | `getCellSelection()` / `setCellSelection(range)` / `clearCellSelection()` |
| `vtKeyboardNav()` | 键盘导航（`requires: vtCellSelection`），见 [示例](/vanilla/examples/plugins/keyboard) | — |
| `vtCellEditor(options?)` | 单元格编辑浮层，见 [示例](/vanilla/examples/plugins/cells-render)。编辑态按 `rowKey` + `colKey` 归属：被编辑的行滚出渲染窗口只是**隐藏**浮层，滚回来带着未提交的输入原样显形；关闭只发生在点到别处或按 Esc。选项 `trigger: 'click' \| 'dblclick'`、`chrome?: boolean`（浮层是否画外观，用第三方组件时设 `false`，见[编辑浮层的外观归属](#编辑浮层的外观归属)）、`activeCell?: boolean`（点开一格时同时打上激活态描边，默认开，装了 `vtCellSelection` 时默认关，见[激活态](#激活态)） | `openCellEditor(row, col)` / `closeCellEditor()` / `isCellEditing()` |
| `vtColumnFilter(options?)` | 列头筛选下拉，见 [示例](/vanilla/examples/plugins/filter) | `openColumnFilter(colKey)` / `closeColumnFilter()` |
| `vtColumnDrag(options?)` | 列拖拽排序，见 [示例](/vanilla/examples/plugins/column-drag) | — |
| `vtRowDrag(options?)` | 行拖拽排序，见 [示例](/vanilla/examples/plugins/row-drag) | — |
| `vtSearch(options?)` | Ctrl/Cmd+F 搜索，见 [示例](/vanilla/examples/plugins/search) | `openSearch()` / `closeSearch()` / `search(term)` / `nextMatch()` / `prevMatch()` / `getSearchMatches()` |
| `vtColumnPanel(options?)` | 列设置面板，见 [示例](/vanilla/examples/plugins/column-visibility) | `toggleColumnPanel(anchor?)` / `openColumnPanel(anchor?)` / `closeColumnPanel()` / `isColumnPanelOpen()` |
| `vtAIQuery(options)` | 自然语言查询：一句话 → 筛选/排序/列显隐，见 [示例](/vanilla/examples/plugins/ai-query)。**不发请求、不绑厂商**，调模型由 `resolve` 回调实现 | `askAITable(text)` / `applyAIQuery(query)` / `undoAIQuery()` / `getAITableSchema()` / `getAIPromptContext()` / `getAIToolSchema()` / `openAIQueryBar()` / `closeAIQueryBar()` / `toggleAIQueryBar()` |
| `vtAIStream(options?)` | 流式表格：攒帧落地 + stick-to-bottom + 首批自动推断列，见 [示例](/vanilla/examples/plugins/ai-stream) | `consumeAIStream(source, opts?)` / `startAIStream()` / `pushAIStreamRows(rows)` / `endAIStream()` / `abortAIStream(err?)` / `getAIStreamState()` / `isAIStreamFollowingBottom()` / `setAIStreamFollowBottom(on)` |
| `vtAIColumn(options)` | AI 列：值由模型从同行其他列算出，**只为渲染窗口内的行发起调用**，支持流式逐段写入，见 [示例](/vanilla/examples/plugins/ai-column) | `computeAIColumn(rowKeys?)` / `recomputeAIColumn(rowKey)` / `clearAIColumn(rowKey?)` / `getAIColumnState(rowKey)` / `getAIColumnValues()` / `getAIColumnStats()` |

插件注入的方法在类型上通过 `VirtTablePluginApi` 声明（class / interface 声明合并），未装载对应插件时运行时不存在。

#### 按需引入与样式

插件**不从主入口 `@virt-table/vanilla` 导出**——放主入口的话插件代码与样式都会被算进核心产物。
两种引法产物完全一致，按喜好选：

```ts
import { vtSearch, vtExport } from '@virt-table/vanilla/plugins';  // barrel
import { vtSearch } from '@virt-table/vanilla/plugins/search';     // 精确到单个插件
```

带独立样式的插件需要额外引一份 CSS（都只依赖 `core.css` 的 `--vt-*` 变量，与引入顺序无关）：

| 插件 | 需引入的 CSS |
| --- | --- |
| `vtContextMenu` | `@virt-table/vanilla/plugins/context-menu.css` |
| `vtSearch` | `@virt-table/vanilla/plugins/search.css` |
| `vtCellSelection` / `vtKeyboardNav` | `@virt-table/vanilla/plugins/cell-selection.css` |
| `vtCellEditor` | `@virt-table/vanilla/plugins/cell-editor.css` |
| `vtColumnFilter` | `@virt-table/vanilla/plugins/column-filter.css` |
| `vtColumnPanel` | `@virt-table/vanilla/plugins/column-panel.css` |
| `vtColumnDrag` / `vtRowDrag` | `@virt-table/vanilla/plugins/drag-sort.css` |
| `vtAIQuery` | `@virt-table/vanilla/plugins/ai-query.css` |
| `vtAIStream` | `@virt-table/vanilla/plugins/ai-stream.css` |
| `vtAIColumn` | `@virt-table/vanilla/plugins/ai-column.css` |
| `vtExport` / `vtClipboard` | 无（纯命令式，不渲染 UI） |

嫌麻烦就引全量 `@virt-table/vanilla/style.css`（核心 + 全部插件 + 内置组件）。

内置单元格组件（`VtInput` / `VtTag` / `VtActions` / `VtFilterBuilder` …）同理走
`@virt-table/vanilla/components`，样式为 `components/index.css` 与
`components/vt-filter-builder.css`。完整清单见下方「内置单元格组件」。

#### 写一个插件

```ts
import type { VirtTablePlugin } from '@virt-table/vanilla';

function myPlugin(): VirtTablePlugin {
  return {
    name: 'myPlugin',          // 唯一名，供 requires 依赖与告警定位
    requires: [],              // 依赖的插件名；缺失时本插件被跳过并告警
    setup(ctx) {
      // ctx.rootEl / clientEl / tableEl / theadEl / tbodyEl / tfootEl —— 核心创建的 DOM
      // ctx.getOptions() / getColumns() / getList() / getRowData(key) / getLocale() —— 状态快照
      // ctx.table —— 宿主公共方法白名单（scrollToCell / forceUpdate / setList …）
      ctx.on('onCellRendered', (td, col, row, rowIndex) => { /* … */ });
      ctx.provide('myService', { /* 供其它插件 inject */ });

      return {
        api: { myCommand: () => { /* 自动挂到实例，三端 ref 也自动透出 */ } },
        destroy: () => { /* 解绑事件、移除自建 DOM */ },
      };
    },
  };
}
```

可用钩子（`ctx.on`）：

| 钩子 | 时机 |
| --- | --- |
| `onMounted` | 全部插件装载完、首帧渲染就绪 |
| `onRowCreated(tr, row, rowIndex)` | 行 DOM 新建（虚拟滚动复用行时不触发） |
| `onCellRendered(td, col, row, rowIndex)` | 数据单元格填充完成 |
| `onHeaderCellRendered(th, col, headerRow)` | 表头单元格填充完成 |
| `onDataChanged(list)` | 数据管线重建（换数据/排序/筛选/折叠展开） |
| `onScroll(scrollLeft, offset)` | 横向或纵向滚动 |
| `onColumnsChanged()` | 列结构变化（`setColumns` / 列显隐） |
| `onLocaleChanged(locale)` | `setLocale` 后 |

约定与边界：

- 插件只能通过 `ctx` 触达宿主，拿不到 `VirtTable` 私有成员。
- `onRowCreated` / `onCellRendered` / `onHeaderCellRendered` 在渲染热路径上；**无插件注册时核心零开销**，注册后请勿在回调里做 DOM 查询或布局读取。
- 插件间协作用 `provide` / `inject`，并在 `requires` 里声明依赖——运行时会按依赖自动拓扑排序，成环时环内插件全部跳过并告警。
- 插件 API 不得覆盖核心方法或其它插件的同名 API（会被拒绝并告警）。
- 卸载按安装逆序进行（依赖方先走），单个插件抛错不影响其余插件。
- 插件自带样式各成一份文件（如 `plugins/context-menu.css`），依赖核心 `core.css` 提供的 `--vt-*` 变量与 `vt-pop-in` keyframes；见上方「按需引入与样式」。

### 单元格组件

`@virt-table/vanilla/components` 是一组工厂函数，交付的东西是**一格该长什么样 + 怎么改值**：

- **常态**（`render`）—— 没进入编辑时这一格的样子。**常态不等于只读**：`VtSwitch` /
  `VtCheckbox` / `VtRate` / `VtActions` 的交互与写回全都发生在常态里（所以这批组件刻意
  不提供 `renderEditor`）。
- **编辑态**（`renderEditor`）—— 由 `vtCellEditor` 打开的编辑会话，浮层盖在单元格上方。

调用工厂得到一个配好这两者的 `VirtTableColumn`，所以最常见的用法是「一列的每一格都这样」，
直接塞进 `columns`；配 `asCell()` 也能只装在**单个格子**上。

> 曾经叫「列组件」。改称单元格组件是因为「列」是**用法**不是**身份** —— 同一个工厂装在列上
> 还是装在一格上，交付的都是那一格的内容与编辑器。它们也**不是优先级链上的一档**：装在
> 哪一级，就以那一级的身份参与[内容层解析](#单元格渲染)。

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { VtTag, VtSwitch, VtActions } from '@virt-table/vanilla/components';
import '@virt-table/vanilla/components/index.css';

new VirtTable(el, {
  columns: [
    { key: 'id', title: 'ID', width: 80 },
    VtTag({ key: 'status', title: '状态', width: 120, options: STATUS }),
    VtSwitch({ key: 'enabled', title: '启用', width: 100 }),
    VtActions({ key: 'ops', title: '操作', width: 180, fixed: 'right', items: [
      { text: '编辑', onClick: (row) => openDialog(row) },
      { text: '删除', variant: 'danger', confirm: '确定删除？', onClick: (row) => remove(row) },
    ]}),
  ],
  plugins: [vtCellEditor()],   // 编辑态组件需要它
});
```

#### 三类交互模型

| 类别 | 组件 | 怎么改值 | 需要 `vtCellEditor` |
| --- | --- | --- | --- |
| **编辑态** | `VtInput` `VtNumberInput` `VtTextarea` `VtSelect` `VtCascader` `VtAutocomplete` `VtPerson`（配 `options`） `VtDatePicker` `VtDateRangePicker` `VtTimePicker` `VtLink`（配 `editable`） | 进入编辑态后在浮层里改 | ✅ |
| **直接可点** | `VtCheckbox` `VtSwitch` `VtRate` `VtActions` | 常态本身可交互，点一下就写回 | ❌ |
| **纯展示** | `VtTag` `VtProgress` `VtLink`（默认） `VtPerson`（不配 `options`） | 不改值 | ❌ |

「直接可点」那一类**刻意不提供 `renderEditor`**：给了的话，装了 `vtCellEditor` 的人点开关会
先得到一个盖住开关的编辑浮层，要点第二下才生效。它们内部用 `stopCellInterference` 拦掉
指针事件冒泡，所以与 `vtCellSelection` / `vtCellEditor` 共存也不会互相触发。

#### 装在单个格子上（`asCell`）

```ts
import { VtSelect, asCell } from '@virt-table/vanilla/components';

table.setCellRender('42', 'status', asCell(VtSelect, { options: STATUS }));
```

`asCell` 做三件事：

1. **不用编造 `key` / `title` / `width`** —— 真正的列键来自 `setCellRender` 的 `colKey`
   （组件写回走 `ctx.column.key`，从不读 `opts.key`）；
2. **整对写入 `render` + `renderEditor`** —— `renderEditor` 在核心里是独立回落的，手写单元格级
   配置很容易只给 `render`，结果这一格展示是进度条、点开却是列上的下拉；
3. **列专属选项在类型上被拒**（`fixed` / `sortable` / `align` …）—— 它们在单元格级本来就会
   被丢弃，不该静默失效。`validator` 是例外，它由组件自己消费，照常生效。

要让 `onChange` / `validator` 的 `row` 有类型，用实例化表达式把行类型传给工厂：

```ts
asCell(VtSelect<Row>, { options: STATUS, onChange: (v, row) => save(row.id, v) });
```

#### 公共选项

所有组件的 options 都继承 `BaseColumnOptions`，即 **`VirtTableColumn` 的全部字段**
（`key` / `title` / `width` / `fixed` / `align` / `sortable` / `validator` / `textOverflow` …
除 `render` / `renderEditor` 外原样透传）外加：

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `placeholder` | `string` | 空值时的占位文案 |
| `disabled` | `boolean` | 关掉编辑/交互，只保留展示 |
| `clearable` | `boolean` | 控件右侧给一个「×」清除按钮（只在有值时出现）。输入类组件与下拉类组件（`VtSelect` / `VtCascader` / `VtPerson`）是同一个位置、同一个外观 |
| `onChange` | `(value, row, rowIndex) => void` | 值写回行数据**之后**触发（组件不做受控模式） |

#### 各组件专属选项

| 组件 | 专属选项 |
| --- | --- |
| `VtInput` | `maxLength` |
| `VtNumberInput` | `min` `max` `step` `precision` |
| `VtTextarea` | `maxRows`（最多长到几行，默认不限、只受表格高度约束）`maxLength` |
| `VtSelect` | `options: { value, label, variant?, color?, disabled? }[]` `multiple` `valueType: 'array'\|'string'` `separator` `searchable`（默认 false）`searchPlaceholder` `emptyText` `showActions` `display: 'text'\|'tag'`；`display: 'tag'` 时另有 `variant` `color`（可按行动态）`maxCount`（默认 3，0 为不折叠）。编辑态是自绘面板（非原生 `<select>`），↑↓ 选、Enter 确认，`clearable` 时控件右侧给「×」 |
| `VtCascader` | `options`（`{ value, label, children?, disabled? }` 树）`separator` `valueType: 'path'\|'leaf'` `checkStrictly` |
| `VtPerson` | `options: { value, label, avatar?, color?, desc?, email?, phone?, fields?, disabled? }[]`（不给就是纯展示列）`multiple`（默认 false，即选单人）`valueType: 'array'\|'string'` `separator` `maxCount`（默认 3，0 为不折叠）`avatarOnly` `searchable`（默认 true）`searchPlaceholder` `emptyText` `showActions` `hoverCard`（默认 true）`renderCard(person, row, rowIndex)` |
| `VtAutocomplete` | `fetchSuggestions(query, row)`（同步数组或 Promise）`debounce`（默认 200）`triggerOnFocus` `emit: 'value'\|'label'` `emptyText` `maxLength` |
| `VtDatePicker` / `VtDateRangePicker` | `min` `max` `firstDayOfWeek`（0=周日 … 6，默认 1）`shortcuts` `texts` `native`（切回原生控件）；范围版另有 `separator` `panels`（1\|2，默认 2）。详见下方「日期与区间日历」 |
| `VtTimePicker` | `min` `max` `step`（给 1 出现秒位） |
| `VtCheckbox` / `VtSwitch` | `trueValue` `falseValue`；`VtSwitch` 另有 `activeText` `inactiveText` |
| `VtTag` | `options`（「值→文案+配色」字典，可不给）`variant` `color`（都可写成 `(row, rowIndex) => …`）。**纯展示**，不提供 `renderEditor`；要可选的标签列用 `VtSelect({ display: 'tag' })` |
| `VtActions` | `items: { text, onClick, variant?, disabled?, hidden?, confirm? }[]`；`text` / `disabled` / `hidden` 均可写成 `(row, rowIndex) => …` |
| `VtProgress` | `max`（默认 100）`showText` `format(value, percent, row)` `color` `variant` `thresholds: { lte, variant?, color? }[]` |
| `VtRate` | `count`（默认 5）`allowHalf` `showText` `format` `color` |
| `VtLink` | 共通：`target` `onClick` `underline: 'always'\|'hover'\|'never'`。**只读支路**（默认）：`href`（可动态）`protocol: 'mailto'\|'tel'` `text`。**可编辑支路**（`editable: true`）：`textLabel` `urlLabel` `textPlaceholder` `urlPlaceholder` `onChange`；这一支**不许配** `href` / `protocol` / `text`（类型上就拒），见下方「可编辑的链接列」 |

#### 日期与区间日历（`VtDatePicker` / `VtDateRangePicker`）

两个组件共用一套**自绘日历面板**：`VtDateRangePicker` 是双月并排的区间选择，
`VtDatePicker` 是同一套面板的单月单选。外观走 `--vt-*`，所以跟随暗色主题与密度档。

**值的形状没有变**：区间是 `['YYYY-MM-DD', 'YYYY-MM-DD']`，单日是 `'YYYY-MM-DD'`，
清空分别写回 `['', '']` 与 `''`。排序、框选复制、CSV/Excel 导出、打印都按这个形状消费，
所以不必给这两列另配 `sortMethod`。

**区间怎么选**：点起点 → 移动鼠标预览区间 → 点终点即写回并关闭面板。没有「确定」按钮
（面板只产出成对的区间，没有半成品要暂存）。

| 操作 | 结果 |
| --- | --- |
| 先点晚的、再点早的 | 自动归一成 `[早, 晚]` |
| 同一天点两次 | 一天的区间 `[d, d]` |
| 已有值时再次打开 | 第一下开一段**全新**区间（不做「就近端点延长」—— 那要猜你想动哪一头） |
| 点越界（`min`/`max` 之外）的格子 | 无反应，也不进入拾取态 |

```ts
VtDateRangePicker({ key: 'period', title: '项目周期', width: 260, clearable: true })
VtDateRangePicker({ key: 'period', title: '项目周期', width: 260,
                    panels: 1, firstDayOfWeek: 0, min: '2024-01-01', max: '2026-12-31' })
VtDatePicker({ key: 'joinDate', title: '入职日期', width: 180, native: true })  // 原生控件
```

**双月与降级**：区间版默认 `panels: 2`（一趟点完跨月区间），面板宽约 450px，挂在 `.vt-root`
上、不受单元格宽度限制。`.vt-root` 放不下时**自动降级成单月**（实测宽度，不是写死断点 ——
密度档会改字号进而改面板宽），降级后跨月区间照样能选：起点定下后翻月不影响拾取态。

**快捷项**：底部一排按钮。内置 7 颗，区间模式全给，单日模式只留前两颗（「本周」这类区间语义
在单日下没有意义）：

| 标签 | 区间 | 单日 |
| --- | --- | --- |
| 今天 / 昨天 | ✅ | ✅ |
| 本周 / 本月 / 本季度 | ✅ | — |
| 最近 7 天 / 最近 30 天 | ✅ | — |

`shortcuts` 三种写法，同一个入口覆盖「替换 / 追加 / 裁剪 / 改一颗」：

```ts
shortcuts: []                                                  // 一颗都不要
shortcuts: [{ label: '上个季度', value: (today) => [s, e] }]     // 整体替换
shortcuts: (builtin) => [...builtin, { label: '下周一', value: … }]        // 追加
shortcuts: (builtin) => builtin.filter((s) => s.label !== '本季度')        // 裁掉一颗
shortcuts: (builtin) => [...builtin, { label: '今天', value: 我的算法 }]    // 同名 = 就地覆盖
```

同 label 视作**就地覆盖**（位置取首次出现、值取最后一次），所以最后那种写法是「把内置的
『今天』换成我的算法」，不会排出两颗「今天」。自定义项可带 `mode: 'single' | 'range' | 'both'`
限定出现场合。`min`/`max` 会参与筛选：整段越界的项**整颗不出现**（宁可少一颗，也不要一排点不动
的灰按钮），部分越界的取交集（`min` 是今天-10 时，「最近 30 天」应用 `[min, 今天]`）。

**键盘**（焦点全程在单元格锚点上，面板里的按钮不参与 Tab 序）：

| 键 | 行为 |
| --- | --- |
| `←` `→` | 前后一天（跳过越界格） |
| `↑` `↓` | 前后一周 |
| `PageUp` `PageDown` | 前后一月（配 `Shift` 为一年） |
| `Home` `End` | 本周第一天 / 最后一天 |
| `Enter` `Space` | 对光标所在日执行一次「点击」（区间要按两次） |
| `Esc` | 关闭面板 |

**文案与 i18n**：默认取 `zhCN.calendar`（`locale.ts` 里的 `calendar` 块是单一事实源）。
单元格组件是纯工厂函数、拿不到表格实例，所以**面板文案不跟随运行时 `setLocale()`**；要别的
语言在列上显式传：

```ts
import { enUS } from '@virt-table/vanilla';
VtDateRangePicker({ key: 'period', title: 'Period', width: 260, texts: enUS.calendar })
// 也可以只覆盖几项（浅合并，`months` / `weekdays` 是整体替换）
VtDatePicker({ key: 'd', title: '日期', width: 160, texts: { today: '今日' } })
```

**`native: true`** 切回浏览器原生控件（`VtDatePicker` 一个 `input[type=date]`，
`VtDateRangePicker` 两个并排）—— 也就是这两个组件改造前的样子。代价是外观不跟随暗色主题、
起止要分两次点开各自的原生日历。两支在 `min`/`max` 上的语义**不同**：原生支路交给浏览器
（各家对越界输入的处理不一致），自绘支路是确定的（越界格不可点、快捷项按上面的规则取舍）。
`native` 与面板专属选项（`panels` / `firstDayOfWeek` / `shortcuts` / `texts`）互斥，类型上就拒。

> `VtDateRangePicker` 原有的 `startPlaceholder` / `endPlaceholder` 已删除：它们从未生效
> （原生 `input[type=date]` 不渲染 placeholder）。两端的空态提示现在由面板底部的回显承担
> （`texts.pickStart` / `texts.pickEnd`），整格的空态仍用 `placeholder`。

#### 可编辑的链接列（`VtLink({ editable: true })`）

默认的 `VtLink` 是纯展示。配 `editable: true` 之后，单元格**激活即展开一个下拉面板**，
里面两栏分别改「文案」与「链接」，`Enter` / 确定写回，`Esc` / 取消丢弃：

```ts
import { VtLink, type VtLinkValue } from '@virt-table/vanilla/components';

interface Row { id: number; ref: string | VtLinkValue }

VtLink<Row>({
  key: 'ref', title: '参考链接', width: 240,
  editable: true,
  target: '_blank',
  placeholder: '双击添加链接',
  urlLabel: '地址',            // 两栏的标签与占位都可改
  onChange: (v, row) => save(row.id, v),
});
```

**值的形状**：文案与地址存在同一格里。

| 行数据 | 展示 | 说明 |
| --- | --- | --- |
| `{ text: '需求文档', url: 'https://…' }` | `<a>需求文档</a>` | 有地址就是对象 |
| `'待补链接'` | `<button>待补链接</button>` | 只有文案时是**纯字符串**，不是 `{ text, url: '' }` |
| `''` / `null` | `placeholder` | — |
| `{ url: 'https://…' }` | `<a>https://…</a>` | 没文案就拿地址当文案（否则是个看不见的格子） |

写回时按「有没有地址」定形状：有地址写对象，地址被清空则**退回纯字符串**。这一列的值还要被
排序、筛选、框选复制反复消费，能是标量的时候就别变成对象。

**这一支不许配 `href` / `protocol` / `text`**（类型上就拒）：它们是「文案或地址另有来源」的
开关，配了之后面板改完会被它们盖掉 —— 那是一次静默失效。要用 `protocol: 'mailto'` 之类的
糖，就保持这一列只读。

几个要知道的点：

- **触发方式建议 `vtCellEditor({ trigger: 'dblclick' })`**。链接元素常常铺满整格，`click`
  触发时「点链接跳转」与「点单元格进编辑」抢同一次点击。组件为此**只拦 `mousedown` /
  `click`，放 `dblclick` 冒泡过去**；`trigger: 'click'` 下则只有单元格左右两条内边距能进编辑态。
- **地址过协议白名单**（`http` / `https` / `mailto` / `tel` / `ftp` + 相对地址）。名单外的
  （`javascript:`、`data:`，含 `java\tscript:` 这种夹控制字符的变体）按「没有地址」处理，
  渲染成 `<button>` —— 面板里的地址是用户手打的，落到 `<a href>` 上就是一次存储型 XSS。
- **排序**：`sortable: true` 时默认按文案比较（对象值走默认比较等于永远相等，点表头没反应）。
  自己给了 `sortMethod` 就用你的。
- **框选复制**走 `String(row[key])`（核心行为），对象值会复制成 `[object Object]`。需要好看的
  TSV 就别在这一列存地址，或者在 `onChange` 里同时往另一个纯文本列写一份。

#### 枚举选择那一家是同一个内核

**「从候选集里选」只有 `VtSelect` 一个入口**，元数与样式都是它的参数：

| | `display: 'text'`（默认） | `display: 'tag'` |
| --- | --- | --- |
| **单值** | `VtSelect({ options })` | `VtSelect({ options, display: 'tag' })` |
| **多值** | `VtSelect({ options, multiple: true })` | `VtSelect({ options, display: 'tag', multiple: true })` |

**「长什么样」是参数，不该是组件名** —— 这是走过弯路之后的结论：曾经「单值彩色标签」叫
`VtTag({ editable: true })`、「多值彩色标签」叫 `VtMultiSelect`，等于让元数和样式各自换了个
组件名，同一件事出现多种拼法。`display` 用**判别联合**声明，所以 `display: 'text'` 时传
`variant` / `maxCount` 会直接编译报错（那些只对胶囊有意义）。

两个例外留作独立组件，因为它们不只是「样式」：

| 组件 | 为什么不并进 `VtSelect` |
| --- | --- |
| `VtTag` | 它**没有候选集**：值本身就是内容（`options` 只是「值→文案+配色」的字典，可不给），配色能按行算。这一半职责与「选择」无关，和 `VtProgress` / `VtLink` 同类。胶囊外观与 `VtSelect({display:'tag'})` 共用 `createTagChip`，所以两者必然长得一样 |
| `VtPerson` | 头像 fallback 与首字哈希色、悬停名片（`renderCard` / `email` / `phone` / `fields`）、`avatarOnly`、副标题参与搜索 —— 一整套额外交互与数据契约（8 个专属选项），并进去会让一个组件挂着三套互斥选项 |

面板、搜索、`↑↓`/`Enter`、清除 `×`、`+N` 折叠、值形状（`valueType` / `separator`）都来自同一份
实现（`_enum.ts` 的 `createEnumEditor`），所以这些能力在 `VtSelect` 与 `VtPerson` 上**行为一致**。

`VtCascader` 不在这一家（树形面板是分栏的，只共享锚点 / 清除 × / 浮层基元），
`VtAutocomplete` 也不在（值不受候选集约束）。

#### 常见配方

| 要做的事 | 怎么写 |
| --- | --- |
| 只读的状态标签列 | `VtTag({ key, options })`（`options` 可不给，值即文案） |
| 运行时切换展示形态 | 重建列定义再 `table.setColumns(...)` —— 示例页的「🏷️ 一键切换标签样式」按钮就是这么做的，行数据不动 |
| 按行动态上色的标签 | `VtTag({ key, color: (row) => … })` |
| 可选的状态标签（单值） | `VtSelect({ key, options, display: 'tag' })` |
| 多值标签 + 折叠 `+N` | `VtSelect({ key, options, display: 'tag', multiple: true, maxCount: 2 })` |
| 只读的多值标签 | `VtSelect({ …, display: 'tag', multiple: true, disabled: true })` |
| 候选很多要搜索 | `VtSelect({ …, searchable: true })` |
| 多值存逗号分隔字符串 | `VtSelect({ …, multiple: true, valueType: 'string' })` |

面板、搜索、`↑↓`/`Enter`、清除 `×`、`+N` 折叠、值形状（`valueType` / `separator`）全部来自同一份
实现，所以这些能力在四个预设上**行为一致**；各预设只决定「值形状 / 面板项长什么样 /
常态一项长什么样」。名字保留四个是刻意的：列定义读起来应该是「这列是什么」，而不是
「开了哪几个开关」，而且分开的 options 类型能让编译器拦住互斥选项
（`VtSelect` 传 `avatarOnly` 会报错）。

`VtCascader` 不在这一家（树形面板是分栏的，只共享锚点 / 清除 × / 浮层基元），
`VtAutocomplete` 也不在（值不受候选集约束）。

几处刻意的取舍：

- **语义色叫 `variant` 而不是 `type`**：`type` 在列上已经是**功能列**
  （`checkbox` / `index` / `tree` …），而组件 options 就是从 `VirtTableColumn` 派生的，
  复用这个名字会直接顶掉功能列字段。
- **标签胶囊复用 `cellType: 'option'`**（`--vt-cell-option-color` + `color-mix` 派生底色），
  `VtTag` 与 `VtSelect({display:'tag'})` 共用 `createTagChip` 一份实现 —— 否则换主题要改两处。
- **`VtActions` 的确认气泡不接表格 i18n**：单元格组件是纯工厂函数，拿不到 `VirtTable` 实例，
  也就读不到 `options.locale`。默认文案是中文，要别的语言在 `confirm` 对象里传
  `okText` / `cancelText`。
- **`VtCascader` 的 `valueType: 'leaf'` 会在建列时预建 `value → 路径` 索引**，所以
  `options` 必须在建列时定下来；运行时换树请重新 `setColumns()`。
- **`VtAutocomplete` 允许自由输入**（不强制从建议里选），要强约束请配列上的 `validator`。
- **`VtPerson` 的编辑态回显就是常态那串胶囊**（走 `AnchorHandle.setNodes`，含 `+N` 折叠），
  不是把姓名拼成一行文字 —— 否则点一下单元格头像整排消失，看起来像换了一列。锚点的左右
  内边距扣掉了 `.vt-cell-cover` 的 2px 边框，激活前后胶囊位置一致（实测 `left 103 → 103`）。
- **`VtPerson` 悬停在某个人身上会弹名片**（放大头像 + 姓名 + 副标题 + 邮箱/电话/`fields`）：
  200ms 延迟（避免横扫单元格时闪），挂 `.vt-client`、随单元格移动、行被虚拟滚动回收时自毁。
  **指针可以移进名片**（选中复制里面的邮箱/电话）：hover 判定按「胶囊 ∪ 名片」两块区域算，
  离开后留 160ms 宽限期才收 —— 名片与胶囊之间隔着 4px，指针跨过去时必然先离开胶囊。
  在名片里划选文字时 Cmd+C 归浏览器，不会被 `vtClipboard` 抢去复制框选区域
  （`[data-vt-popup]` 在放行名单里）。
  只在「有东西可看」时才弹：候选项带了 `desc` / `email` / `phone` / `fields`，或姓名看不见
  （`avatarOnly`）、或姓名被列宽截断。`hoverCard: false` 关掉，`renderCard` 整块替换
  （返回 `null` 表示这个人不弹）。
- **`VtPerson` 的「一个人」是一枚胶囊**：淡底 + 全圆角，头像贴在左端当端帽、姓名在右侧
  （与 `cellType: 'option'` 的标签同一门语言）。这样多人列里一眼能看出「哪个名字属于哪个
  头像」—— 裸排时头像↔姓名与人↔人的间距几乎相等，读起来会是「一排头像 + 一排名字」。
  `avatarOnly` 不套胶囊（没有姓名要圈，留底色就是右边空一截的怪胶囊）。
- **`VtPerson` 的头像有图用图、无图退首字色块**：色块的颜色按 `value` **稳定哈希**从语义色
  令牌（primary / success / warning / danger / 次要文字色）里取，同一个人在任何行任何表格
  里都是同一色 —— 按行号取色的话，虚拟滚动复用行 DOM 时颜色会随滚动跳变。图加载失败
  （离职销号、外链失效、防盗链）会把 `<img>` 摘掉露出色块，而不是留一个断图占位符。
  首字规则：中日韩取**最后一个字**（「张伟」→「伟」，一屏不会全是「张」），拉丁取前两段
  首字母（`John Doe` → `JD`）。
- **`VtPerson` 的常态也认对象值**：行数据里存 `{ id, name, avatar }`（接口原样落库的常见
  形状）能直接画出来，因此不给 `options` 就是一列纯展示的人员。但**通过面板改值一律写回
  `options` 里的标量 `value`** —— 需要保留对象形状请在 `onChange` 里自己转回去。

#### 自绘浮层挂在哪

`VtSelect` / `VtCascader` / `VtAutocomplete` / `VtPerson` / `VtTextarea` 的浮层挂在 **`.vt-client`** 上 ——
**与 `vtCellEditor` 的编辑浮层 `.vt-cell-cover` 同一层、排在它之后、用同一套定位公式**
（不是 `document.body`，不是 `.vt-root`，也不是塞在编辑浮层里面）。原因有四条，缺一条都不行：

1. `--vt-*` 只声明在 `.vt-root` / `.vt-fb` 上，`body` 的子节点继承不到，整批 `var()` 会静默失效；
2. `.vt-cell-cover` 的高度**就是单元格高度**（且 `> * { height: 100% }`），在 40px 的格子里
   塞下拉/文本域要么被压回一行、要么撑破那个盒子 —— 所以是它的**兄弟**而不是子节点；
3. 浮层带 `data-vt-popup` 标记，`vtCellEditor` 的 outside-click 认这个属性放行，
   否则点一下下拉项就把编辑器连同锚点一起关掉；
4. `.vt-client` 就是横向的原生 scrollport —— 浮层与 `.vt-cell-cover` 由同一个 scrollport 搬运，
   **横滚时两者逐像素同步**（写进 `style.left` 的是内容坐标，含 `scrollLeft`）。挂在 `.vt-root`
   上时浮层不在 scrollport 内，只能逐帧追单元格，与编辑浮层之间必然差一帧。

浮层会随锚点移动自动跟随（纵向滚动由 JS 掌管、列宽变化、排序筛选换行），
锚点离开 DOM（滚动回收、编辑关闭）时自毁。

在浮层上滚滚轮 / 触摸滑动**只滚浮层自己的列表**，不会滚到底下的表格上（`wheel` / `touchstart` /
`touchmove` 在浮层根节点被截住，否则表格的纵向输入接管会把面板的原生滚动 `preventDefault` 掉，
长名单直接滚不动）。滚到列表尽头也不会续传给表格。

两种定位模式：

| 模式 | 用在哪 | 行为 |
| --- | --- | --- |
| `below` | `VtSelect` / `VtCascader` / `VtAutocomplete` 的下拉、`VtPerson` 的选人面板、`VtActions` 的确认气泡 | 挂在单元格下方（几何基准取单元格盒子，宽度对齐），空间不足翻到上方；套 `.vt-filter-panel` 面板皮肤 |
| `cover` | `VtTextarea` 的内联编辑框 | **盖住单元格**：左上角对齐、宽度取齐、初始等高，随内容长高，顶出容器下缘时整体上移；不套面板皮肤，边框与 `.vt-cell-cover` 一致 |

#### 行高约束

组件的展示元素一律锁高在 `var(--vt-line-height)` 上并配 `vertical-align: top`。
这不是风格偏好：撑出 22px 就把 40px 的行高顶成 42，`estimatedSize` 与实际行高对不上，
十万行量级下会滚不到底（详见 guide/decisions 的行高几何一节）。
`components-contract.test.ts` 静态扫描 `components.css` 守着这条，自定义样式时请一并遵守。
