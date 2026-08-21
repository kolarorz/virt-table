# VtNumberInput 数字输入

数字输入列：与 `VtInput` 同构，编辑态是数字输入框，另有取值范围、步进与小数位数。

编辑态走 `renderEditor`，**必须装 `vtCellEditor` 插件**才会被触发。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-number-input" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-number-input.ts
:::

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `min` / `max` | 取值范围 |
| `step` / `precision` | 步进与小数位数 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtnumberinput)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
