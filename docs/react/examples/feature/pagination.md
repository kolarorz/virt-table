# React 分页（服务端）

服务端模式（靠 `manualPagination: true` 开启）：表格只渲染分页器 + 派发 `onPageChange`，**不做任何数据切片**。在回调里按页取数后 `setList` + `setTotal` 回填。

示例用本地 200 条数据模拟「服务端」，真实项目里换成接口请求即可。想让表格自己切片见[分页（客户端）](./pagination-client)。

## 使用的 API

```ts
type Options = {
  list: T[];  // 当前页数据（首屏）
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  manualPagination: true;  // 关掉表格自己的切片
  pagination: {
    total: number;
    page?: number;
    pageSize: number;
    pageSizes?: number[];
  };
  onPageChange?: (page: number, pageSize: number) => void;
}

// 回调里回填（ref 上调用）
tableRef.current?.setList(fetchPage(page, pageSize));
tableRef.current?.setTotal(total);
```

::: tip 注意
首屏切片要用 `useMemo` 稳定住：`options.list` 每次渲染换新引用会触发封装内部的 `setList`，把翻页结果顶掉。
:::

完整语义（与排序筛选的组合、竞态处理、和 `dataMode: 'server'` 的区别）见 [Vanilla · 分页（服务端）](/vanilla/examples/feature/pagination)。

## 示例

<PlaygroundHost framework="react" example-id="react-pagination" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/feature/Pagination.tsx
:::
