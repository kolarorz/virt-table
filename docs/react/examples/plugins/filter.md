# React 列筛选

为列配置 `filters` 与 `filterMethod`，在表头进行单选或多选筛选。

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

<PlaygroundHost framework="react" example-id="react-filter" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/Filter.tsx
:::