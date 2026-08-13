# React 服务端数据

`dataMode: 'server'` + `pagination` + `loadData`：表头点排序、列头筛选、翻页 / 切换每页条数**全部交给服务端**。表格不再本地排序 / 筛选 / 切片，只把状态收进一次请求（`req.sort` / `req.filters` / `req.page`），并处理竞态（连点筛选只采用最后一次响应）。

示例用 400 条本地数据模拟服务端查询，下方日志显示每次实际下发的请求参数。

## 使用的 API

```ts
type Options = {
  list: T[];  // 初始值（远程模式下只作首屏用）
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  // 等价于 manualSorting + manualFiltering + manualPagination
  dataMode: 'server';
  sortMode?: 'single' | 'multiple';
  pagination: { total: number; pageSize: number; pageSizes?: number[] };
  loadData: (req: DataRequest) => Promise<DataResponse<T>>;
  onRemoteStateChange?: (state: RemoteState) => void;
}

// 实例方法（ref 上调用）
tableRef.current?.refresh();  // 保留滚动位置重拉
tableRef.current?.reload();   // 回到第 1 页
```

::: tip 注意
`loadData` 由封装内部包一层读最新 props，所以**不需要** `useCallback`：函数身份变化既不会重建表格也不会触发重新取数。
:::

完整语义（`DataRequest` 字段、竞态与失败重试、与 `manualPagination` 的区别）见 [Vanilla · 服务端数据](/vanilla/examples/feature/server-data)。

## 示例

<PlaygroundHost framework="react" example-id="react-server-data" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/feature/ServerData.tsx
:::
