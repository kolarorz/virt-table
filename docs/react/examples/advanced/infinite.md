# React 无限滚动

配置 `infinite` 并给一个 `loadData`，滚到底部就自动加载下一批。表格负责在途去重、竞态作废、状态条四态与滚动位置维持；你只负责发请求。

ref 方法（`VirtTableRef`）：`reload()` / `refresh()` / `loadMore()` / `loadPrev()` / `retryLoad()` / `getRemoteState()` / `setLoadData()` / `appendRows()` / `prependRows()` / `setHasMore()` / `setCursor()`。

## 示例

<PlaygroundHost framework="react" example-id="react-infinite" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/Infinite.tsx
:::

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

完整语义（竞态处理、`hasMore` 推导、向上加载补偿、与 `pagination` 互斥、限制）见 [Vanilla · 无限滚动](/vanilla/examples/advanced/infinite)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `infinite` | `{ enabled?, pageSize?, distance?, autoLoadFirst?, manual?, direction?, showNoMore? }` | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `loadData` / `onLoadMore` / `onLoadPrev` | 糖层与受控层两个入口 | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `reload` / `refresh` / `loadMore` / `loadPrev` / `retryLoad` | 主动触发 | [实例方法](/vanilla/api/instance) |
| `getRemoteState()` / `onRemoteStateChange` | 取数状态机快照与回调 | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `fixedSize` | 固定行高：追加与前插时滚动条不抖 | [表格配置](/vanilla/api/table#virttableoptions) |

与 `pagination` **互斥**（前者累积流、后者页视图），与 `merges` 不兼容 —— 三条限制见 [API](/vanilla/api/data#服务端数据-无限滚动)。

> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
