# Vue 斑马纹表格

通过 `stripe: true` 开启斑马纹行样式。

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
  stripe: boolean;  // 是否显示斑马纹
}
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-stripe" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Stripe.vue
:::