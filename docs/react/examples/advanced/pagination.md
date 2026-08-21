# React 分页（服务端）

服务端模式（靠 `manualPagination: true` 开启）：表格只渲染分页器 + 派发 `onPageChange`，**不做任何数据切片**。在回调里按页取数后 `setList` + `setTotal` 回填。

## 示例

<PlaygroundHost framework="react" example-id="react-pagination" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/Pagination.tsx
:::

## 说明

示例用本地 200 条数据模拟「服务端」，真实项目里换成接口请求即可。想让表格自己切片见[分页（客户端）](./pagination-client)。

::: tip 注意
首屏切片要用 `useMemo` 稳定住：`options.list` 每次渲染换新引用会触发封装内部的 `setList`，把翻页结果顶掉。
:::

完整语义（与排序筛选的组合、竞态处理、和 `dataMode: 'server'` 的区别）见 [Vanilla · 分页（服务端）](/vanilla/examples/advanced/pagination)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `pagination` / `onPageChange` | 分页器与翻页回调（服务端模式必接） | [数据与远程 · 分页](/vanilla/api/data#分页) |
| `setTotal(total)` | 取数返回后回填总数（**不派发事件**） | [实例方法](/vanilla/api/instance) |
| `manualPagination` / `dataMode` | 声明分页由服务端负责 | [数据与远程](/vanilla/api/data) |
| `loadData` / `onLoadMore` | 让表格编排请求（配了它就不用自己接 `onPageChange`） | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |

> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
