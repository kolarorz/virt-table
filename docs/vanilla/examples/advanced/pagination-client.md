# 分页（客户端）

传 `pagination` option 就有分页器，**默认由表格自己切片**——把全量数据交给它，翻页、切换每页条数、排序、筛选全都不用管。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-pagination-client" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/pagination-client.ts
:::

## 说明

```ts
new VirtTable(el, {
  list,                 // 全量数据
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  pagination: { pageSize: 20, pageSizes: [20, 50, 100] },
});
```

不需要 `onPageChange`，也不需要 `total`。

## 与服务端模式的差别

| | 客户端（默认） | 服务端（`manualPagination: true`） |
| --- | --- | --- |
| 谁切数据 | 表格 | 使用方（在 `onPageChange` 里 `setList`） |
| `total` | 由**筛选后的行数**派生，`setTotal()` 会告警并跳过 | 使用方给（option 或 `setTotal()`） |
| 排序 / 筛选 | 作用于**全量数据**，再切当前页 | 交给服务端（配合 `manualSorting` / `manualFiltering`） |
| 适用 | 数据量能一次拿完 | 数据在服务端分页 |

三个 manual 开关是对称的：`manualSorting` / `manualFiltering` / `manualPagination` 各自让表格跳过管线里对应的那一段。

## 行为细节

- **总数随筛选变化**，页码在超出范围时自动 clamp。
- **筛选后回到第 1 页**（行集合变了）；**排序不重置页码**（还是那些行，只是顺序变了）。
- **树形 / 分组按根行切片**：每页 N 个根行，子节点跟着父节点走，不会被切到两页去。`total` 数的也是根行数。
- **合计行（`showSummary`）算的是当前页**——与「聚合反映当前视图」一致。要全量合计请用服务端模式自己算。
- 与**无限滚动互斥**：同时配 `infinite` 时分页切片不生效（两者都在管「该显示哪些行」）。
- 翻页后自动滚回顶部。

## 与状态持久化一起用

`getState()` 会带上 `pagination: { page, pageSize }`（不带 `total`——它是派生的，存下来只会在数据变了以后骗人）：

```ts
localStorage.setItem('k', JSON.stringify(table.getState()));
table.setState(JSON.parse(localStorage.getItem('k')!));   // 列宽/列序/排序/筛选/页码一起还原
```

还原时页码不会被「筛选回第 1 页」那条规则顶掉。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `pagination` | `{ total?, page?, pageSize?, pageSizes? }`，存在即渲染分页器 | [数据与远程 · 分页](/vanilla/api/data#分页) |
| `setPage` / `setPageSize` / `getPagination` | 编程式翻页 | [实例方法](/vanilla/api/instance) |
| `manualPagination` | 关掉客户端切片，交给服务端 | [数据与远程 · 分页](/vanilla/api/data#分页) |
| `locale.pagination` | 分页器文案 | [表格配置 · i18n](/vanilla/api/table#国际化-i18n) |
