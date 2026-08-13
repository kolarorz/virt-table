# 自动换行

默认情况下，单元格内的长文本会自动换行显示。

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

<PlaygroundHost framework="vanilla" example-id="table-wrap" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/wrap.ts
:::