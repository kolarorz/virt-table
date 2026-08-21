# 基础表格

展示 VirtTable 的基础用法：配置列与数据，支持虚拟滚动及滚动定位。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-basic" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/basic.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `list` / `columns` / `itemKey` | 数据、列、行唯一标识（三个必填） | [表格配置](/vanilla/api/table#virttableoptions) |
| `estimatedSize` | 行预估高度（px），虚拟滚动的几何基准 | [表格配置](/vanilla/api/table#virttableoptions) |
| `buffer` | 上下渲染缓冲行数 | [表格配置](/vanilla/api/table#virttableoptions) |
| `scrollToIndex` / `scrollToCell` | 滚动定位 | [实例方法](/vanilla/api/instance) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
