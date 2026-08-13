# Vue 分页（客户端）

客户端分页（默认模式）：把全量数据交给表格，翻页 / 切换每页条数 / 排序 / 筛选全部由表格自己处理，**不用写 onPageChange，也不用管 total**。

- `total` 由**筛选后**的行数派生，筛选变化时页码自动回到第 1 页
- 排序作用于全量数据而不是当前页
- 与服务端模式（见[分页（服务端）](./pagination)）的差别就是 `manualPagination` 那一个开关

## 使用的 API

```ts
type Options = {
  list: T[];  // 全量数据
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  // 传了 pagination 就有分页器；不开 manualPagination 即客户端分页
  pagination: { pageSize: number; pageSizes?: number[] };
}

// 实例方法（ref 上调用）
tableRef.value?.setPage(7);
tableRef.value?.setPageSize(50);
tableRef.value?.getPagination();  // { page, pageSize, total }
tableRef.value?.getState();       // 列宽/列序/排序/筛选/分页快照
tableRef.value?.setState(saved);  // 还原快照
```

完整语义（total 派生规则、与排序筛选的先后、状态快照字段）见 [Vanilla · 分页（客户端）](/vanilla/examples/feature/pagination-client)。

## 示例

<PlaygroundHost framework="vue" example-id="vue-pagination-client" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/feature/PaginationClient.vue
:::
