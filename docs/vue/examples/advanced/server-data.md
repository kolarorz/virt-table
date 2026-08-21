# Vue 服务端数据

`dataMode: 'server'` + `pagination` + `loadData`：表头点排序、列头筛选、翻页 / 切换每页条数**全部交给服务端**。表格不再本地排序 / 筛选 / 切片，只把状态收进一次请求（`req.sort` / `req.filters` / `req.page`），并处理竞态（连点筛选只采用最后一次响应）。

## 示例

<PlaygroundHost framework="vue" example-id="vue-server-data" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/advanced/ServerData.vue
:::

## 说明

示例用 400 条本地数据模拟服务端查询，下方日志显示每次实际下发的请求参数。

::: tip 注意
`loadData` 由封装内部包一层读 props，所以函数身份变化不会重建表格或重新取数——不需要手动稳定化。
:::

完整语义（`DataRequest` 字段、竞态与失败重试、与 `manualPagination` 的区别）见 [Vanilla · 服务端数据](/vanilla/examples/advanced/server-data)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `dataMode: 'server'` | `manualSorting` / `manualFiltering` / `manualPagination` 三者全开的快捷方式 | [数据与远程](/vanilla/api/data) |
| `loadData(req)` | 糖层：表格编排请求，`req` 带 `page` / `offset` / `cursor` / `sort` / `filters` / `signal` | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `onLoad` / `onLoadError` | 每批取回 / 失败回调 | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `setLoadData(fn)` | 运行时替换取数实现 | [实例方法](/vanilla/api/instance) |
| `DataRequest` / `DataResponse` / `RemoteState` | 取数相关类型 | [类型定义](/vanilla/api/types) |

`hasMore` 的四级推导（显式 > 游标 > 总数 > 满页启发式）见 [API](/vanilla/api/data#服务端数据-无限滚动) —— 游标与页码不必二选一。

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
