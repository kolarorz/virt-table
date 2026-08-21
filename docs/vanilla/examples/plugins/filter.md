# 列筛选

为列配置 `filters` 与 `filterMethod`，在表头进行单选或多选筛选。

> 这是列筛选的第一种入口（表头快捷筛选）。需要「A 且（B 或 C）」这类复合条件时，
> 用第二种入口 [高级筛选（筛选管理器）](../advanced/filter-builder)，两者可同时使用，结果取交集。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-filter" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/filter.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.filters` | 枚举候选 `{ label, value, checked? }[]` | [数据与远程](/vanilla/api/data#列头筛选) |
| `col.filterMultiple` | 是否允许多选 | [数据与远程](/vanilla/api/data#列头筛选) |
| `col.filterMethod` | 自定义筛选逻辑 | [数据与远程](/vanilla/api/data#列头筛选) |
| `setColumnFilter` / `clearAllFilters` / `getActiveFilters` | 编程式筛选 | [实例方法](/vanilla/api/instance) |

文本 / 数值区间 / 日期区间等类型见[富筛选类型](/vanilla/examples/plugins/rich-filter)；跨列 AND/OR 见[高级筛选](/vanilla/examples/advanced/filter-builder)。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
