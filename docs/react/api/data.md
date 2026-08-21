# 数据与远程

服务端取数与无限滚动在 React 端的写法与注意点。分页、筛选、树形懒加载等配置项同样写在 `options` 里，语义见 [Vanilla API · 数据与远程](/vanilla/api/data)。

本节只讲怎么写；完整语义（竞态处理、`hasMore` 推导、限制）见 [Vanilla API · 服务端数据 / 无限滚动](/vanilla/api/data#服务端数据-无限滚动)。

```tsx
import { useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef, type DataRequest, type DataResponse, type RemoteState } from '@virt-table/react';

interface Row extends Record<string, unknown> { id: number; name: string }

const columns = [
  { key: 'id', title: 'ID', width: 80, sortable: true },
  { key: 'name', title: '姓名', width: 220 },
];

export default function Demo() {
  const tableRef = useRef<VirtTableRef>(null);
  const [remote, setRemote] = useState<RemoteState | null>(null);

  return (
    <>
      <VirtTableReact
        ref={tableRef}
        columns={columns}
        options={{
          list: [],
          itemKey: 'id',
          estimatedSize: 40,
          fixedSize: true,
          border: true,
          dataMode: 'server',
          infinite: { pageSize: 50 },
          // 不需要 useCallback：组件内部用 ref 转发，函数身份变化不会重建表格
          async loadData(req: DataRequest): Promise<DataResponse<Row>> {
            const res = await fetch(`/api/rows?offset=${req.offset}&limit=${req.pageSize}`, { signal: req.signal });
            const { rows, total } = await res.json();
            return { rows, total };
          },
          onRemoteStateChange: setRemote,
        }}
      />
      <button onClick={() => tableRef.current?.reload()}>重新加载</button>
      <span>{remote ? `已加载 ${remote.loadedCount}/${remote.total}` : ''}</span>
    </>
  );
}
```

::: tip 取数回调不用 useCallback
表格只在 mount 时创建一次，如果把渲染期新建的函数直接交给它，会闭包捕获首屏的 state（经典 stale closure）。组件内部把 `loadData` / `onLoadMore` / `onLoadPrev` / `onLoad` / `onLoadError` / `onRemoteStateChange` 都换成了读 ref 的稳定包装函数：**既拿得到最新的 state，也不会因为函数身份变化触发重建或重新取数**。

代价是「是否启用」由首屏是否提供决定 —— 首屏没传 `loadData` 就不会启用糖层，之后要补上请用 `ref.current.setLoadData(fn)`。
:::

::: tip 远程模式下 `options.list` 只作为初始值
组件平时会在 `options.list` 变化时 `setList`（整批替换）。而 React 里内联写在 JSX 上的 `options` 对象（含 `list: []`）**每次渲染都是新引用**，照常同步会把刚追加的数据清空——因此**一旦提供了 `loadData` / `onLoadMore`，该同步就会跳过**。远程模式下数据归表格管，要改数据用 `ref.current.reload()` / `appendRows()`。
:::
