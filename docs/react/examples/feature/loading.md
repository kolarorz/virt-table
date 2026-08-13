# React 加载态

通过 `loading` 选项或 ref 上的 `setLoading(bool)` 显示加载遮罩，常用于异步刷新数据期间。可配 `loadingText` 自定义文案。

## 使用的 API

```ts
type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
  loadingText: string;  // 加载遮罩文案
}

// 实例方法（ref 上调用）
tableRef.current?.setLoading(true);
tableRef.current?.setList(nextList);
```

## 示例

<PlaygroundHost framework="react" example-id="react-loading" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/feature/Loading.tsx
:::
