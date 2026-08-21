# 分组 + 树形

结合 `groupConfig` 与树形列，在同一表格中展示分组与层级结构。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-group-tree" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/group-tree.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `groupConfig` | 分组配置 | [表格配置](/vanilla/api/table#virttableoptions) |
| `col.type: 'tree'` | 树形列（分组之下继续按 `children` 展开） | [列配置 · 功能列](/vanilla/api/column#功能列-type) |
| `defaultExpandAll` | 默认全部展开 | [表格配置](/vanilla/api/table#virttableoptions) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
