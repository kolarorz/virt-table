# 第三方组件库（Ant Design）

演示与 Ant Design 集成的单元格编辑：查看态使用轻量 DOM，编辑态挂载真实组件以保证虚拟滚动性能。

:::tip
为保证虚拟滚动性能，查看态不直接渲染第三方 UI 组件。若在滚动过程中持续挂载组件，会产生频繁的创建与销毁，导致帧率下降和交互抖动。

推荐将"查看态"和"交互态"分离：查看态使用轻量 DOM + CSS 还原组件视觉风格，交互态仅在激活单元格时挂载真实组件。这样可以兼顾性能、一致性与可维护性。
:::

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  render: (ctx) => string | HTMLElement;  // 自定义渲染
  renderEditor: (ctx) => HTMLElement | null | void;  // 单元格编辑渲染
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
  textOverflow: 'ellipsis' | 'tooltip';  // 全局文本溢出处理
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-cell-edit" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/third-party/AntDesign.tsx
:::