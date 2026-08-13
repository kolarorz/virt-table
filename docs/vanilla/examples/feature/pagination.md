# 分页 pagination

> 这是**服务端模式**（`manualPagination: true`）。想让表格自己切片、不写 `onPageChange`，见[分页（客户端）](./pagination-client)。

传入 `pagination` 选项即可在表格底部渲染分页器,含**总数、每页条数选择器、上/下一页、页码(带省略号)、跳至指定页**五组控件。

::: tip 仅服务端 UI 模式
表格**只渲染分页器 UI 并派发 `onPageChange` 事件,不做任何数据切片**。`total` 由外部传入;翻页时你在 `onPageChange` 回调里自行取数(接口请求或本地切片)再 `setList`,并用 `setTotal` 回填总数。这样分页与虚拟滚动、数据管线完全解耦,语义清晰。
:::

## 选项

```ts
pagination?: {
  total?: number;      // 总条数,默认 0(取数返回后用 setTotal 回填)
  page?: number;       // 初始页码,默认 1
  pageSize?: number;   // 每页条数,默认取 pageSizes[0] 或 10
  pageSizes?: number[];// 每页条数下拉选项,默认 [10, 20, 50, 100]
};
onPageChange?: (page: number, pageSize: number) => void;
```

## 事件与方法

- `onPageChange(page, pageSize)`:翻页、跳页、切换每页条数时触发(**切换每页条数会重置到第 1 页**)。回调里取数并 `setList`。
- `setPage(page)`:跳转到指定页(自动 clamp),页码变化时派发 `onPageChange`。
- `setPageSize(pageSize)`:设置每页条数,重置到第 1 页并派发 `onPageChange(1, pageSize)`。
- `setTotal(total)`:更新总条数(取数返回后调用),clamp 当前页并重绘,**不派发事件**。
- `getPagination()`:读取当前 `{ page, pageSize, total }`。

分页器文案通过 `locale.pagination` 定制,随 `setLocale` 即时切换(见[国际化 i18n](./i18n))。

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

## 示例

<PlaygroundHost framework="vanilla" example-id="table-pagination" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/feature/pagination.ts
:::
