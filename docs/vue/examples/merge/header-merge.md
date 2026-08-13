# Vue 表头合并

通过 `headerData` 与 `headerMerges` 实现多行表头及单元格合并。

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
  headerData: string[][];  // 表头自定义数据
  headerMerges: MergeCell[];  // 表头合并单元格
}
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-header-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/merge/HeaderMerge.vue
:::