# React 无限滚动

配置 `infinite` 并给一个 `loadData`，滚到底部就自动加载下一批。表格负责在途去重、竞态作废、状态条四态与滚动位置维持；你只负责发请求。

## 使用的 API

```ts
type Options = {
  list: T[];             // 无限滚动时传 []，数据由表格内部累积
  itemKey: string;       // 行唯一标识字段名
  estimatedSize: number;   // 行预估高度(px)
  fixed?: boolean;       // 固定行高：追加时滚动条不因重新测量而抖动
  infinite?: {
    pageSize?: number;   // 每批条数，默认 50
    distance?: number;   // 距底触发阈值(px)，默认 200
    manual?: boolean;    // 只显示「加载更多」按钮，不自动触发
    direction?: 'down' | 'up' | 'both';  // 加载方向，默认 down
    showNoMore?: boolean;// 到底后显示「没有更多」，默认 true
  };
  loadData?: (req: DataRequest) => Promise<DataResponse<T>>;   // 取数糖层
  onLoadMore?: (ctx: LoadMoreContext<T>) => void | Promise<void>; // 受控层（优先）
  onLoad?: (res, req) => void;
  onLoadError?: (err, req) => void;
  onRemoteStateChange?: (state: RemoteState) => void;
}
```

ref 方法（`VirtTableRef`）：`reload()` / `refresh()` / `loadMore()` / `loadPrev()` / `retryLoad()` / `getRemoteState()` / `setLoadData()` / `appendRows()` / `prependRows()` / `setHasMore()` / `setCursor()`。

## 关键写法

```tsx
const tableRef = useRef<VirtTableRef>(null);

<VirtTableReact
  ref={tableRef}
  columns={columns}
  options={{
    list: [],
    itemKey: 'id',
    estimatedSize: 40,
    fixedSize: true,
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
```

::: tip 取数回调不用 useCallback，但要读最新 state 时用 ref
表格只在 mount 时创建一次。组件内部已把取数回调换成读 ref 的稳定包装函数，因此**函数身份变化不会重建表格，也不会触发重新取数**，同时闭包里能拿到最新的 props。

但 `loadData` 内部若要读某个会变的 state（如示例里的「注入故障」开关），仍要自己用 ref 承接——因为那份闭包是渲染时创建的：

```tsx
const failRef = useRef(failNext);
failRef.current = failNext;   // 每次渲染同步
```

「是否启用」由首屏是否提供决定：首屏没传 `loadData`，之后要补上请用 `ref.current.setLoadData(fn)`。
:::

::: tip 远程模式下 `list` 只是初始值
内联写在 JSX 上的 `options` 对象（含 `list: []`）每次渲染都是新引用。提供 `loadData` / `onLoadMore` 后，组件对 `options.list` 的同步会自动跳过，因此不会把累积数据清空——传 `[]` 即可，数据归表格管。

另外 `infinite` 配置在构造时生效，示例里切换「手动模式」是靠 `key` 重建组件实现的。
:::

完整语义（竞态处理、`hasMore` 推导、向上加载补偿、与 `pagination` 互斥、限制）见 [Vanilla · 无限滚动](/vanilla/examples/feature/infinite)。

## 示例

<PlaygroundHost framework="react" example-id="react-infinite" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/feature/Infinite.tsx
:::
