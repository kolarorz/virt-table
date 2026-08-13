# Vue 组件渲染

在列 `render` 中返回 VNode（JSX），框架自动挂载/卸载，支持响应式组件渲染。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  render: (ctx) => string | HTMLElement;  // 自定义渲染
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

<PlaygroundHost framework="vue" example-id="vue-render" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/RenderDemo.vue
:::