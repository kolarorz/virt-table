# 高级筛选（筛选管理器）

列筛选有两种入口 —— 表头快捷筛选与筛选管理器（`VtFilterBuilder`），可同时使用，状态独立、最终 AND 组合。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-filter-builder" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/filter-builder.ts
:::

## 说明

1. **表头快捷筛选** —— 点击表头筛选图标，按列快速勾选/输入（见 [列筛选](../plugins/filter)）。
2. **筛选管理器** —— `VtFilterBuilder`，挂在**表格之外**由你指定的容器里，用 AND/OR 条件组表达
   「分数 ≥ 80 **且**（部门属于工程部/设计部 **或** 级别为 P8）」这类复合条件，支持任意层嵌套。

每个条件组左侧有一条括号线，线上的「且 / 或」胶囊**既是当前逻辑的回显，也是切换按钮**——
点一下就在「且」「或」之间切换，线的颜色随之变化（且=主色 / 或=警示色），嵌套层级一眼可辨。

两者是**独立状态**，最终以 **AND** 组合：表头筛掉的行，管理器再筛一遍。

### 算子

| 值域 | 可用算子 |
| ---- | -------- |
| `text` | 包含 / 不包含 / 等于 / 不等于 / 开头是 / 结尾是 / 为空 / 不为空 |
| `number`、`date` | 等于 / 不等于 / 大于 / 大于等于 / 小于 / 小于等于 / 介于 / 为空 / 不为空 |
| `enum` | 属于 / 不属于 / 等于 / 不等于 / 为空 / 不为空 |
| `boolean` | 等于 / 不等于 |

::: tip 几点约定
- 列的 `filterMethod` **只参与** `in` / `notIn`（它的签名 `(value, row)` 没有算子概念），其余算子按值域内建比较。
- 「为空」= `null` / `undefined` / `''`，不含 `0` 与 `false`。「介于」是闭区间，只填一端即当单边界。
- 编辑中的半成品条件（缺值、指向已删除的列、空条件组）一律视为**通过**，不会把表格瞬间筛空。
- 构建器挂在表格外部，样式在 `@virt-table/vanilla/components/vt-filter-builder.css`，暗色主题自动适配。
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `filterModel` / `onFilterModelChange` | 条件树与变化回调 | [数据与远程](/vanilla/api/data#高级筛选-筛选管理器) |
| `setFilterModel` / `getFilterModel` / `clearFilterModel` / `hasActiveFilters` | 编程式读写 | [数据与远程](/vanilla/api/data#高级筛选-筛选管理器) |
| `col.filterValueKind` / `filterOperators` | 值域类别与可用算子白名单 | [数据与远程](/vanilla/api/data#高级筛选-筛选管理器) |
| `VtFilterBuilder` | 可视化条件构建器（构造选项与方法） | [数据与远程](/vanilla/api/data#vtfilterbuilder-条件构建器) |

`FilterModel` / `FilterOperator` 的完整定义与各值域可用算子表在 [数据与远程](/vanilla/api/data#高级筛选-筛选管理器)。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
