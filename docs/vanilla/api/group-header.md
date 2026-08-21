# 多级分组表头与表尾

列配 `children` 就得到分组表头，表尾与表头同序复用同一份网格。两者都参与横向虚拟化，因此有一批只在这儿成立的约束。

## 多级分组表头

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

| 约束 | 说明 |
| --- | --- |
| 数据相关配置写在**叶子列**上 | `render` / `sortable` / `filters` / `resizable` / `type` / `summary` / `validator` …；分组节点只需要 `title` 或 `renderHeader` |
| 与手写多行表头**互斥** | 配了 `children` 时 `headerData` / `headerMerges` 被忽略并告警 |
| 列显隐按树生效 | 隐藏叶子使父分组收窄；隐藏分组等于隐藏其全部叶子；可见子列为空时整组消失 |
| `vtColumnDrag` 只允许**同父分组内换位** | 跨分组拖拽被忽略；有 `merges` 时整体禁用 |
| 分组格恒为单行 | `white-space: nowrap`，超出裁掉、完整内容挂原生 `title`（否则行高随横滚变化，sticky 表头会抖） |
| 分组标签横向跟随 | 中间段的分组格把内容放进一层 `.vt-group-label`（`position: sticky`），理由见[示例页](/vanilla/examples/basic/header-group#分组标签为什么要-sticky) |
| 样式 | `.vt-th--group`，底色 `--vt-header-group-bg`，默认 `text-align: center`（`headerAlign` / `align` 可覆盖） |

## 多级分组表尾

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
