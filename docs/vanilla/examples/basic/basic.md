# 基础表格

展示 VirtTable 的基础用法：配置列与数据，支持虚拟滚动及滚动定位。

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
}
```

## 示例

<PlaygroundHost framework="vanilla" example-id="table-basic" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/basic.ts
:::