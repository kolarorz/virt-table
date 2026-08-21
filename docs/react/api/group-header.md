# 多级分组表头与表尾

列配 `children` 即得到分组表头；表尾与表头同序。约束与 Vanilla 相同。

## 多级分组表头

给列配置 `children` 即可得到多级分组表头：带 `children` 的节点是**分组节点**（自身不承载数据，只在表头占一格并横跨其全部叶子后代），叶子才是真正的数据列。表头与表体一起做横向虚拟化。

```tsx
const columns: ReactTableColumn[] = [
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

数据相关配置（`render` / `sortable` / `filters` / `type` …）写在**叶子列**上；分组节点只需要 `title` 或 `renderHeader`（`ctx.isGroup` 可判断是否分组）。与 `headerData` / `headerMerges` 互斥。详见 [Vanilla API · 多级分组表头](/vanilla/api/group-header)。
