# Vue 可调整列宽

为列设置 `resizable: true` 后，可拖动列边界调整宽度。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  resizable: boolean;  // 是否可拖拽调整列宽
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

<PlaygroundHost framework="vue" example-id="vue-resize" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Resize.vue
:::