# 导出 CSV / Excel

装载 `vtExport()` 插件后调用 `exportCsv()` / `exportExcel()` 导出数据，`scope: 'selection'` 可仅导出当前框选区域，`exportValue` 可自定义列导出值。CSV 带 UTF-8 BOM，Excel 为 HTML 表格。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-export" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/export.ts
:::
