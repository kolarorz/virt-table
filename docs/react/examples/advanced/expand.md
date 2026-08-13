# React 展开行

通过展开列类型与 `renderExpandRow` 自定义展开区域内容，支持全部展开/收起。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  type: 'expand';  // 特殊列类型：展开行
  renderExpandRow: (ctx) => string | HTMLElement;  // 展开行渲染
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-expand" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/Expand.tsx
:::