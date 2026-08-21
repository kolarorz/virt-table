# VtAutocomplete 输入建议

带建议下拉的输入列：输入框在单元格里（与 `VtInput` 同款），建议列表在浮层里。`↑↓` 移动高亮、`Enter` 选中、`Esc` 关闭。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-autocomplete" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-autocomplete.ts
:::

## 说明

**自由输入也会写回**，不强制从建议里选 —— 表格里这一列多半是「可以随便填，但给点提示」。要强约束就配列上的 `validator`。编辑态走 `renderEditor`，**必须装 `vtCellEditor` 插件**。

过滤逻辑由使用方决定（组件不猜「是前缀匹配还是模糊匹配」），`query` 就是输入框当前内容。异步竞态由内部递增序号挡掉：慢请求先发、快请求后到时，旧结果不会盖掉新结果 —— 防抖只能减少请求数，挡不住乱序返回。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `fetchSuggestions` | 建议源（必填），过滤逻辑由使用方决定 |
| `debounce` / `triggerOnFocus` | 请求时机 |
| `emit` | 选中建议时写回 `value` 还是 `label` |
| `col.validator` | 需要强约束时配它（组件允许自由输入） |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtautocomplete)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
