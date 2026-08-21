# 导出 CSV / Excel

装载 `vtExport()` 插件后调用 `exportCsv()` / `exportExcel()` 导出数据，`scope: 'selection'` 可仅导出当前框选区域，`exportValue` 可自定义列导出值。CSV 带 UTF-8 BOM，Excel 为 HTML 表格。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-export" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/export.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtExport()` | 导出插件，注入 `exportCsv` / `exportExcel` / `print` | [插件机制 · 导出](/vanilla/api/plugins#导出-打印) |
| `ExportOptions` | `{ filename?, scope?: 'all' \| 'selection', includeHeader?, delimiter? }` | [插件机制 · 导出](/vanilla/api/plugins#导出-打印) |
| `col.exportValue` | 覆盖该列的导出取值 | [插件机制 · 导出](/vanilla/api/plugins#导出-打印) |

`scope: 'selection'` 需同时装 `vtCellSelection`（未装载会告警并返回空结果）。服务端模式下导出只覆盖**已加载数据**。
