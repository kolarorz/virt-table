# 单元格选区

启用单元格选区后，可拖动鼠标选择矩形区域，并通过回调获取选区范围。

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
  plugins: [vtCellSelection()];  // 单元格选区（插件）
  onCellSelectionChange: (range) => void;  // 选区变化回调
}
```

## 示例

<PlaygroundHost framework="vanilla" example-id="table-cell-selection" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/cell-selection.ts
:::