# React 无障碍 ARIA

表格自动输出 ARIA 语义：`role=grid` + `aria-rowcount/colcount`，表头 `role=columnheader` + `aria-sort`，行 `role=row` + `aria-rowindex`（真实数据索引），单元格 `role=gridcell`，加载态 `aria-busy`，便于屏幕阅读器识别。

无需任何额外配置——语义由核心渲染时输出，React 封装不改变这一层。

## 示例

<PlaygroundHost framework="react" example-id="react-aria" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/feature/Aria.tsx
:::
