# 展开行

通过展开列类型与 `renderExpandRow` 自定义展开区域内容，支持全部展开/收起。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-expand" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/expand.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.type: 'expand'` | 展开列（接管层，独占单元格） | [列配置 · 功能列](/vanilla/api/column#功能列-type) |
| `col.renderExpandRow` | 展开行的内容 | [列配置](/vanilla/api/column#virttablecolumn) |
| `defaultExpandAll` | 默认全部展开 | [表格配置](/vanilla/api/table#virttableoptions) |
| `onExpandChange` / `toggleExpand` / `expandAll` / `collapseAll` | 状态回调与编程控制 | [实例方法](/vanilla/api/instance) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
