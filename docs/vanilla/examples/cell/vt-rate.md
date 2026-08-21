# VtRate 星级评分

星级列。默认可点选，`disabled: true` 变只读回显。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-rate" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-rate.ts
:::

## 说明

**「直接可点」类组件**：点一下直接写回，**不提供 `renderEditor`，也不需要 `vtCellEditor` 插件**。

半星靠「底层空心星 + 上层按百分比裁剪的实心星」画（`.vt-comp-rate-fill` 的宽度），所以只需要一份图标；点选时按点击位置落在星的左半还是右半决定 `.5`。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `count` / `allowHalf` | 星数与半星 |
| `showText` / `format` | 右侧分值与格式化 |
| `color` | 星色 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtrate)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
