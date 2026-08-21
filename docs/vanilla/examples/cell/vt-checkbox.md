# VtCheckbox 布尔勾选

布尔列：单元格里直接画一个可点的勾选框。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-checkbox" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-checkbox.ts
:::

## 说明

**「直接可点」类组件**：交互与写回都发生在常态里，点一下就改值，**不提供 `renderEditor`，也不需要 `vtCellEditor` 插件**。给了 `renderEditor` 的话，装了编辑插件的人点勾选框会先弹出一个盖住勾选框的浮层，得点第二下才切换 —— 对一个开关型控件是纯粹的多余。

值不是 `true` / `false` 时配 `trueValue` / `falseValue`（`1/0`、`'Y'/'N'` 都常见）。

::: warning 用字符串枚举时必须显式配 `trueValue`
不配就退回 JS 真值判断，`'N'`、`'0'` 这种非空字符串会被判成真。配了 `trueValue` 就**只认它**（严格相等）。
:::

代价是这一列不参与「编辑态」语义（Esc 撤销、`openCellEditor()` 打开）—— 布尔列本来也没有可撤销的中间状态。皮肤直接用核心的 `.vt-cell-bool` + `.vt-checkbox`，与只读版 `cellType: 'checkbox'` 同源，视觉必然一致。

区别只在外观、值语义完全相同的还有 [`VtSwitch`](./vt-switch)。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `trueValue` / `falseValue` | 写回的值，默认 `true` / `false` |
| `col.align` | 布尔列一般配 `center` |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtcheckbox-vtswitch)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
