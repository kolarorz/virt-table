# Vue 自动合计行

开启 `showSummary`，为列配置 `summary: 'sum'|'avg'|'count'|'max'|'min'` 或 `summaryMethod` 自定义聚合。合计基于筛选/排序后的数据动态计算，占用表尾。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  summary?: 'sum' | 'avg' | 'count' | 'max' | 'min';  // 内置聚合
  summaryMethod?: (values: unknown[]) => string;  // 自定义聚合
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  showSummary: boolean;  // 显示合计行
  summaryText: string;  // 合计行首列文案
}
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-summary" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/feature/Summary.vue
:::
