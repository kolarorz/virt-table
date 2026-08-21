# VtTag 标签

标签列（**纯展示**）：把行里的值画成彩色胶囊。不给 `options` 时值本身就是标签文案；给了 `options` 就是一份「值 → 文案 + 配色」的**字典**（不是候选集）。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-tag" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-tag.ts
:::

## 说明

它不参与选择，因此不提供 `renderEditor`，也不需要任何插件。空值不画空胶囊，走 `placeholder`。

配色优先级只有一处实现，所以「纯展示的标签」和「选出来的标签」必然长得一样、跟主题也只跟一次：

```
options[].color > options[].variant > 列级 color > 列级 variant > 默认主色
```

要「从候选集里选」用 [`VtSelect`](./vt-select) —— **「长什么样」是参数，不该是组件名**：

| 要做的事 | 怎么写 |
| --- | --- |
| 只读的标签列 | `VtTag({ key, options? })` |
| 可选的标签列（单值） | `VtSelect({ key, options, display: 'tag' })` |
| 可选的标签列（多值） | `VtSelect({ key, options, display: 'tag', multiple: true })` |

胶囊外观两者共用同一个工厂（`createTagChip`），差别只在能不能选。更多写法（多值折叠、只读多值、
运行时换形态）见 [VtSelect · 常见配方](./vt-select#常见配方)。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `options` | 「值 → 文案 + 配色」字典，可不给 |
| `variant` / `color` | 列级配色，可写成 `(row, rowIndex) => …` |

> 全量选项表见 [单元格组件](/vanilla/api/components#vttag)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
