# Vue 分页（客户端）

客户端分页（默认模式）：把全量数据交给表格，翻页 / 切换每页条数 / 排序 / 筛选全部由表格自己处理，**不用写 onPageChange，也不用管 total**。

## 示例

<PlaygroundHost framework="vue" example-id="vue-pagination-client" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/advanced/PaginationClient.vue
:::

## 说明

- `total` 由**筛选后**的行数派生，筛选变化时页码自动回到第 1 页
- 排序作用于全量数据而不是当前页
- 与服务端模式（见[分页（服务端）](./pagination)）的差别就是 `manualPagination` 那一个开关

完整语义（total 派生规则、与排序筛选的先后、状态快照字段）见 [Vanilla · 分页（客户端）](/vanilla/examples/advanced/pagination-client)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `pagination` | `{ total?, page?, pageSize?, pageSizes? }`，存在即渲染分页器 | [数据与远程 · 分页](/vanilla/api/data#分页) |
| `setPage` / `setPageSize` / `getPagination` | 编程式翻页 | [实例方法](/vanilla/api/instance) |
| `manualPagination` | 关掉客户端切片，交给服务端 | [数据与远程 · 分页](/vanilla/api/data#分页) |
| `locale.pagination` | 分页器文案 | [表格配置 · i18n](/vanilla/api/table#国际化-i18n) |

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
