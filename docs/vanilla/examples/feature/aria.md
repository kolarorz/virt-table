# 无障碍 ARIA

表格自动输出 ARIA 语义：`role=grid` + `aria-rowcount/colcount`，表头 `role=columnheader` + `aria-sort`，行 `role=row` + `aria-rowindex`（真实数据索引），单元格 `role=gridcell`，加载态 `aria-busy`，便于屏幕阅读器识别。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-aria" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/feature/aria.ts
:::
