# 分页 pagination

> 这是**服务端模式**（`manualPagination: true`）。想让表格自己切片、不写 `onPageChange`，见[分页（客户端）](./pagination-client)。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-pagination" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/pagination.ts
:::

## 说明

传入 `pagination` 选项即可在表格底部渲染分页器，含**总数、每页条数选择器、上/下一页、页码（带省略号）、跳至指定页**五组控件。

::: tip 服务端模式下表格只管 UI
表格**只渲染分页器并派发 `onPageChange`，不做任何数据切片**。`total` 由外部传入；翻页时你在
回调里自行取数（接口请求或本地切片）再 `setList`，并用 `setTotal` 回填总数。这样分页与虚拟滚动、
数据管线完全解耦。
:::

三件要知道的事：

- **切换每页条数会重置到第 1 页**（并派发 `onPageChange(1, pageSize)`）。
- `setTotal()` 会 clamp 当前页并重绘，但**不派发事件** —— 它是「取数回来了，把总数补上」，不是一次翻页。
- 分页器文案走 `locale.pagination`，随 `setLocale` 即时切换（见[国际化 i18n](./i18n)）。

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

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `pagination` / `onPageChange` | 分页器与翻页回调（服务端模式必接） | [数据与远程 · 分页](/vanilla/api/data#分页) |
| `setTotal(total)` | 取数返回后回填总数（**不派发事件**） | [实例方法](/vanilla/api/instance) |
| `manualPagination` / `dataMode` | 声明分页由服务端负责 | [数据与远程](/vanilla/api/data) |
| `loadData` / `onLoadMore` | 让表格编排请求（配了它就不用自己接 `onPageChange`） | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
