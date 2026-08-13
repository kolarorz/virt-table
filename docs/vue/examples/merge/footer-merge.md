# Vue 表尾合并

通过 `footerData` 与 `footerMerges` 展示多行表尾并合并单元格。

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
  footerData: string[][];  // 表尾数据
  footerMerges: MergeCell[];  // 表尾合并单元格
}
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-footer-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/merge/FooterMerge.vue
:::