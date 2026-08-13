# Vue 多选列

通过列类型 `checkbox` 添加行多选列，支持单选、全选及清除选中。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  type: 'checkbox';  // 特殊列类型：多选列
  align: 'left' | 'center' | 'right';  // 列的水平对齐（应用于表头、表身、表尾）
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

<PlaygroundHost framework="vue" example-id="vue-checkbox" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Checkbox.vue
:::