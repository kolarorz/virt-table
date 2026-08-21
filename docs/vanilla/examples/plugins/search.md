# 表格搜索

启用内置搜索功能，使用 Cmd/Ctrl+F 打开搜索框查找单元格内容。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-search" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/search.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtSearch()` | 全文搜索插件（Cmd/Ctrl+F 打开） | [插件机制](/vanilla/api/plugins) |
| `--vt-highlight-bg` / `--vt-highlight-border` | 命中高亮配色 | [主题定制](/vanilla/examples/basic/theme) |
| `locale.search` | 搜索框文案 | [表格配置 · i18n](/vanilla/api/table#国际化-i18n) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
