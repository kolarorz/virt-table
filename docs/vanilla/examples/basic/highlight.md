# 高亮悬停/选中

开启行悬停高亮与行/列/单元格选中高亮效果。

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
  highlightHoverRow: boolean;  // 高亮 hover 行
  highlightSelectRow: boolean;  // 高亮选中行
}
```

## 示例

<PlaygroundHost framework="vanilla" example-id="table-highlight" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/highlight.ts
:::