# React 强制刷新

在原地修改行数据后，调用实例方法 `forceUpdate()` 强制刷新可见区域。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-force-update" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/basic/ForceUpdate.tsx
:::