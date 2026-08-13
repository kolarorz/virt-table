# 列筛选

为列配置 `filters` 与 `filterMethod`，在表头进行单选或多选筛选。

> 这是列筛选的第一种入口（表头快捷筛选）。需要「A 且（B 或 C）」这类复合条件时，
> 用第二种入口 [高级筛选（筛选管理器）](../advanced/filter-builder)，两者可同时使用，结果取交集。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  filters: Array<{label, value, checked?}>;  // 筛选选项
  filterMultiple: boolean;  // 是否多选筛选
  filterMethod: (value, row) => boolean;  // 自定义筛选方法
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

<PlaygroundHost framework="vanilla" example-id="table-filter" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/filter.ts
:::