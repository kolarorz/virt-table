# 列拖拽排序

开启 `columnDraggable` 后拖拽表头即可调整列顺序，通过 `onColumnOrderChange` 获取新顺序。与列宽拖拽、点击排序互不冲突（拖拽阈值区分）。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-column-drag" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/column-drag.ts
:::
