# 无障碍 ARIA

表格自动输出 ARIA 语义：`role=grid` + `aria-rowcount/colcount`，表头 `role=columnheader` + `aria-sort`，行 `role=row` + `aria-rowindex`（真实数据索引），单元格 `role=gridcell`，加载态 `aria-busy`，便于屏幕阅读器识别。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-aria" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/aria.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| 自动挂上的 role / aria-* | 根元素 / 表头 / 行 / 单元格 / 加载态 | [表格配置 · 无障碍](/vanilla/api/table#无障碍-aria) |
| `aria-rowindex` | 真实数据索引（不是 DOM 下标）—— 虚拟滚动下这两者不一致 | [表格配置 · 无障碍](/vanilla/api/table#无障碍-aria) |
| `vtKeyboardNav` | 键盘导航（读屏用户靠它遍历单元格） | [插件机制](/vanilla/api/plugins#键盘导航) |
