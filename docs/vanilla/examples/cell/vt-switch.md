# VtSwitch 开关

开关列。值语义与交互模型和 [`VtCheckbox`](./vt-checkbox) 完全一致（共用同一套真值判定与写回），差别只在外观：一个轨道 + 一个滑块，可以另配开 / 关文案。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-switch" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-switch.ts
:::

## 说明

**「直接可点」类组件**：点一下就写回，**不提供 `renderEditor`，也不需要 `vtCellEditor` 插件**。

::: warning 用字符串枚举时必须显式配 `trueValue`
不配就退回 JS 真值判断，`'off'` 这种非空字符串会被判成真。
:::

用 `<button role="switch">` 而不是 `<input type="checkbox">`：轨道 + 滑块要两层元素才画得出来，而 `input` 不能有子节点（伪元素能凑出来，但拿不到 `aria-checked` 那种明确的状态表达，读屏也读不出「开关」这个角色）。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `trueValue` / `falseValue` | 写回的值，默认 `true` / `false` |
| `activeText` / `inactiveText` | 开 / 关文案，不配就不画 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtcheckbox-vtswitch)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
