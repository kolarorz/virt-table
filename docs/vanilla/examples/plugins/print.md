# 打印

> 由 `vtExport` 插件提供：`plugins: [vtExport()]`。

调用 `print({ title })` 在新窗口输出全表（内联样式），复用导出的 HTML 构造，适合快速打印或另存。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-print" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/print.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtExport()` | 打印由导出插件提供 | [插件机制 · 导出](/vanilla/api/plugins#导出-打印) |
| `print(opts?: { title? })` | 新窗口输出全表（内联样式） | [插件机制 · 导出](/vanilla/api/plugins#导出-打印) |
