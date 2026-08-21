# 列级 API

一列的身份与外观：列标识、宽度、对齐、功能列、排序、显隐、拖拽。
带 `children` 的分组节点见[多级分组表头与表尾](./group-header)；一格的内容怎么画见[单元格级 API](./cell)。

## VirtTableColumn

列配置项。

| 属性             | 类型                                                          | 默认值 | 说明                                 |
| ---------------- | ------------------------------------------------------------- | ------ | ------------------------------------ |
| `key`            | `string`                                                      | —      | **必填**。列唯一标识，对应行数据字段 |
| `title`          | `string`                                                      | —      | **必填**。列标题                     |
| `width`          | `number`                                                      | —      | **必填**。列宽（px）；分组节点可填 `0`，宽度由可见子列求和 |
| `children`       | `VirtTableColumn<T>[]`                                        | —      | 子列 —— 配置它即成为**多级分组表头**的分组节点（见[多级分组表头](./group-header)） |
| `fixed`          | `'left' \| 'right'`                                           | —      | 固定列位置；写在分组上会强制下发给全部后代 |
| `type`           | `'index' \| 'checkbox' \| 'radio' \| 'expand' \| 'drag' \| 'tree'` | —      | **功能列**类型，独占单元格（`tree` 例外，见下） |
| `cellType`       | `'text' \| 'number' \| 'rich-text' \| 'image' \| 'option' \| 'checkbox'` | —      | **内容类型**：把 `row[key]` 按内置样式渲染，见[单元格渲染](./cell) |
| `align`          | `'left' \| 'center' \| 'right'`                               | —      | 单元格水平对齐，覆盖全局 `align`     |
| `vAlign`         | `'top' \| 'middle' \| 'bottom'`                               | —      | 单元格垂直对齐，覆盖全局 `vAlign`    |
| `headerAlign`    | `'left' \| 'center' \| 'right'`                               | —      | 表头水平对齐                         |
| `headerVAlign`   | `'top' \| 'middle' \| 'bottom'`                               | —      | 表头垂直对齐                         |
| `footerAlign`    | `'left' \| 'center' \| 'right'`                               | —      | 表尾水平对齐                         |
| `footerVAlign`   | `'top' \| 'middle' \| 'bottom'`                               | —      | 表尾垂直对齐                         |
| `footerValue`    | `string \| number`                                            | —      | 多级分组表尾：该节点表尾格的静态内容（分组/叶子皆可） |
| `renderFooter`   | `(ctx: FooterRenderContext<T>) => string \| HTMLElement`      | —      | 多级分组表尾：该节点表尾格的自定义渲染（返回字符串按 HTML 插入） |
| `textOverflow`   | `'ellipsis' \| 'tooltip'`                          | —      | 文本溢出处理，覆盖全局设置（`ellipsis` / `tooltip`） |
| `mergeKey`       | `boolean \| ((row, i) => unknown)`                 | —      | 相邻同键自动纵向合并（见[按值自动合并](./merge#按值自动合并-mergekey)）；仅非固定列生效 |
| `mergeMaxSpan`   | `number`                                           | —      | `mergeKey` 的单段最大跨度，超出则断开 |
| `resizable`      | `boolean`                                                     | —      | 是否允许拖拽调整列宽                 |
| `minWidth`       | `number`                                                      | —      | 列最小宽度（px），配合 `resizable`   |
| `maxWidth`       | `number`                                                      | —      | 列最大宽度（px），配合 `resizable`   |
| `render`         | `(ctx: CellRenderContext<T>) => string \| HTMLElement`        | —      | 自定义单元格渲染                     |
| `renderHeader`   | `(ctx: HeaderRenderContext<T>) => string \| HTMLElement`      | —      | 自定义表头渲染                       |
| `renderEditor`     | `(ctx: CellEditContext<T>) => HTMLElement \| null \| void`    | —      | 自定义单元格编辑渲染                 |
| `editorChrome`   | `boolean`                                                     | `true` | 编辑浮层是否替这一列画外观（边框 / focus 环）。第三方组件自带外观时设 `false`，见[编辑浮层的外观归属](./cell#编辑浮层的外观归属) |
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
| `radio`    | 单选列，配合 `getSelectedRadio` 使用                  |
| `expand`   | 展开列，点击展开/折叠子内容，需配置 `renderExpandRow`    |
| `drag`     | 行拖拽手柄列，需装 `vtRowDrag` 插件；这一格**不参与高亮激活** |
| `tree`     | 树形列，显示展开/折叠图标，行数据需含 `children` 字段 |

前五种**独占单元格**（配在上面的 `render` / `renderEditor` / `cellType` 被忽略并告警），
`tree` 例外；单元格级配置可以穿透。三条的用法与边界见[功能列](/vanilla/examples/feature-columns/)。

## 列排序

| 位置     | 字段/方法                                                    | 说明                                             |
| -------- | ------------------------------------------------------------ | ------------------------------------------------ |
| column   | `sortable?: boolean`                                         | 是否可排序（表头显示排序图标，仅点击图标触发）   |
| column   | `sortMethod?: (a, b) => number`                             | 自定义比较（默认按值：数字比大小，其余字典序）   |
| column   | `defaultSort?: 'asc' \| 'desc'`                             | 初始排序方向                                     |
| option   | `sortMode?: 'single' \| 'multiple'`                        | 单列（默认）或 Shift+点击多列                     |
| option   | `onSortChange?: (state: SortSpec[]) => void`                | 排序变化回调                                     |
| 方法     | `sort(colKey, order \| null)` / `clearSort()` / `getSortState()` | 编程式排序                                  |

表头点击三态循环 `无 → 升 → 降 → 无`；存在 `merges` 时排序自动禁用，见[列排序](/vanilla/examples/advanced/sort)。

## 列显隐

| 位置   | 字段/方法                                | 说明                       |
| ------ | ---------------------------------------- | -------------------------- |
| column | `hidden?: boolean`                       | 是否隐藏                   |
| column | `hideable?: boolean`                     | 是否允许在列面板切换（默认 true） |
| 方法   | `setColumnVisible(colKey, visible)`      | 切换列显隐                 |
| 方法   | `getVisibleColumns()` / `getAllColumns()`| 可见叶子列 / 全量列树      |
| 方法   | `getLeafColumns()`                       | 全量叶子列（含隐藏）        |
| 方法   | `toggleFieldConfig(anchor?)`             | 打开/关闭字段配置面板（需装载 `vtFieldConfig` 插件，或装 `vtToolbar` 用它自带的那颗）|

面板行为见[字段配置](/vanilla/examples/plugins/column-visibility)。

## 拖拽排序（列 / 行）

| 位置   | 字段/类型                                             | 说明                                       |
| ------ | ----------------------------------------------------- | ------------------------------------------ |
| 插件   | `vtColumnDrag()`                                      | 拖拽表头调整列顺序                         |
| option | `onColumnOrderChange?: (columns) => void`             | 列顺序变化回调                             |
| 插件   | `vtRowDrag(options?)`                                 | 行拖拽，配合 `type:'drag'` 手柄列。**扁平 / 树形 / 分组都支持**；排序、筛选、按值自动合并生效时停用 |
| option | `onRowMove?: (detail) => void`                        | 行落位回调，**任何一次成功的移动都会触发**，`detail` 见 [`RowMoveDetail`](./instance#行拖拽) |
| option | `onRowOrderChange?: (list, from, to) => void`         | 行顺序变化回调，只在**根层同父换位**时触发（扁平表的老签名）|
| column | `type: 'drag'`                                        | 行拖拽手柄列                               |
