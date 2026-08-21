# 服务端数据 server data

把排序 / 筛选 / 分页交给服务端：表格不再本地排序、筛选、切片，只把这些状态收进一次请求。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-server-data" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/server-data.ts
:::

## 三个细粒度开关

真实项目常见混合口径（服务端分页 + 前端排已加载的那一页），所以按维度分开控制：

```ts
{
  manualSorting?: boolean;    // 排序交给服务端
  manualFiltering?: boolean;  // 筛选交给服务端（列头筛选 + 高级筛选）
  manualPagination?: boolean; // 分页/加载交给服务端
  dataMode?: 'client' | 'server';  // 快捷方式：'server' 等价于上面三个全开
}
```

开启后对应的本地管线阶段被跳过（数据已由服务端排好/筛好，本地再算一遍既冗余又会与服务端口径打架），状态变化则触发重新取数并**回到第 1 页**。

## 完整示例

```ts
const table = new VirtTable(el, {
  list: [],
  columns,          // 列上照常写 sortable / filters / filterType
  itemKey: 'id',
  estimatedSize: 40,
  dataMode: 'server',
  sortMode: 'multiple',
  pagination: { total: 0, pageSize: 20, pageSizes: [10, 20, 50] },
  async loadData(req) {
    const res = await fetch('/api/rows?' + new URLSearchParams({
      page: String(req.page),
      pageSize: String(req.pageSize),
      // req.sort: [{ colKey, order }]；req.filters: { colKey: values[] }
      sort: JSON.stringify(req.sort),
      filters: JSON.stringify(req.filters),
      filterModel: JSON.stringify(req.filterModel),
    }), { signal: req.signal });
    const { rows, total } = await res.json();
    return { rows, total };
  },
});
```

## 请求参数

```ts
interface DataRequest {
  page: number;        // 目标页码（1 基）
  pageSize: number;
  offset: number;      // main 为 (page-1)*pageSize，追加时为已加载条数
  cursor: string | null;      // 向下游标（append 时带上）
  prevCursor: string | null;
  loadedCount: number;
  sort: SortSpec[];               // [{ colKey, order }]
  filters: Record<string, unknown[]>;  // 列头筛选
  filterModel: FilterModel;            // 高级筛选条件树（AND/OR）
  search: string;
  reason: 'init' | 'reload' | 'refresh' | 'page' | 'sort' | 'filter' | 'append' | 'prepend' | 'retry';
  channel: 'main' | 'more' | 'prev';
  signal: AbortSignal;   // 被新请求抢占 / 表格销毁时中断
}
```

`reason` 让你能区分「用户换了筛选」和「滚动追加」，据此决定要不要带上完整过滤条件、要不要打埋点。

## 竞态与抢占

- 换排序/筛选/翻页走 **main 通道**：会 `abort` 掉所有在途请求并作废其响应，只采用最后一次。连点筛选不会出现旧数据覆盖新数据。
- 滚动追加走 **more 通道**、向上加载走 **prev 通道**：两者可并发，各自加锁。
- 请求失败保留已加载数据，`retryLoad()` 用同一批参数重试。

## 分页与无限滚动是二选一

`pagination` 是**页视图**（每次取数 replace，「当前第几页」是唯一状态）；`infinite` 是**累积流**（append，页码只表示取到第几批）。同时启用会让「当前第几页」有两个互相打架的含义，因此表格以 `pagination` 为准、忽略 `infinite` 并在控制台告警。

按场景选一个：需要精确跳页、可分享「第 N 页」→ 分页；数据流式浏览、不关心页边界 → 无限滚动。

没有 `loadData` / `onLoadMore` 时，分页条退回原有行为：只派发 `onPageChange`，由你自己取数 + `setList` + `setTotal`。

## 服务端聚合与总数

```ts
return {
  rows,
  total,                       // 分页条总数 + hasMore 判定
  footerData: [['合计', '', '', String(sumQty), String(sumPrice)]],  // 直接接管表尾
};
```

服务端模式下本地 `showSummary` 只能算已加载数据，全量口径请用 `footerData` 注入。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `dataMode: 'server'` | `manualSorting` / `manualFiltering` / `manualPagination` 三者全开的快捷方式 | [数据与远程](/vanilla/api/data) |
| `loadData(req)` | 糖层：表格编排请求，`req` 带 `page` / `offset` / `cursor` / `sort` / `filters` / `signal` | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `onLoad` / `onLoadError` | 每批取回 / 失败回调 | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `setLoadData(fn)` | 运行时替换取数实现 | [实例方法](/vanilla/api/instance) |
| `DataRequest` / `DataResponse` / `RemoteState` | 取数相关类型 | [类型定义](/vanilla/api/types) |

`hasMore` 的四级推导（显式 > 游标 > 总数 > 满页启发式）见 [API](/vanilla/api/data#服务端数据-无限滚动) —— 游标与页码不必二选一。
