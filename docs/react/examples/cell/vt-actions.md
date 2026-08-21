# React VtActions 操作列

操作列：一格里排几个链接式按钮，可带二次确认气泡。

## 示例

<PlaygroundHost framework="react" example-id="react-vt-actions" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/cell/VtActions.tsx
:::

## 说明

**「直接可点」类组件**：交互发生在常态里，**不提供 `renderEditor`，也不需要 `vtCellEditor` 插件**。它不读也不写单元格值，因此没有 `placeholder` / `clearable` / `onChange`。

`text` / `disabled` / `hidden` 都能写成 `(row, rowIndex) => …`：操作列的可用性几乎总是跟着行状态走（草稿才能编辑、已停用的不能再停用），做成常量就得让使用方回退到手写 `render`。

::: warning 确认气泡不接表格的 i18n
单元格组件是纯工厂函数，拿不到 `VirtTable` 实例，也就读不到 `options.locale`。默认文案是中文（与默认语言包 `zhCN` 一致），要别的语言就在 `confirm` 对象里传 `okText` / `cancelText`。
:::

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `items` | 按钮列表（必填）：`text` / `onClick` / `variant` / `disabled` / `hidden` / `confirm` |
| `col.fixed` | 操作列一般配 `right` |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtactions)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
