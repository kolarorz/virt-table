# 高亮悬停/选中

开启行悬停高亮与行/列/单元格选中高亮效果。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-highlight" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/highlight.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `highlightHoverRow` | 悬停高亮整行 | [表格配置](/vanilla/api/table#virttableoptions) |
| `highlightSelectRow` / `highlightSelectCol` / `highlightSelectCell` | 点击高亮行 / 列 / 单元格 | [表格配置](/vanilla/api/table#virttableoptions) |

跨行合并格（`rowspan > 1`）不参与行高亮 —— 它属于整段而不是某一行。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
