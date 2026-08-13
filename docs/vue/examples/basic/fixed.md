# Vue 冻结列与合并

通过 `fixed` 冻结左右列，并结合 `merges` 实现表身单元格合并。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  fixed: 'left' | 'right';  // 冻结列方向
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
  merges: MergeCell[];  // 表身合并单元格
}
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-fixed" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Fixed.vue
:::