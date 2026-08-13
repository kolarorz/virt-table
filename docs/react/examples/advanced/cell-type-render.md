# React 行级单元格渲染

通过行数据 `_cellRenders` 为不同行配置独立的 `render` / `renderEditor`。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  render: (ctx) => string | HTMLElement;  // 自定义渲染
  renderEditor: (ctx) => HTMLElement | null | void;  // 单元格编辑渲染
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
  textOverflow: 'ellipsis' | 'tooltip';  // 全局文本溢出处理
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-cell-type-render" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/CellTypeRender.tsx
:::