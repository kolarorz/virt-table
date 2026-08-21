# VtSelect 多选

多值选择就是 `VtSelect({ multiple: true })` —— **元数是参数，不是另一个组件**（这一页原来叫 `VtMultiSelect`）。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-multi-select" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-multi-select.ts
:::

## 说明

面板里勾选**即时写回**，没有「确定」按钮：这一列的编辑本来就是多次点击的过程，让底部的「清空 / 全选」与逐项勾选走同一条路，省掉一份「暂存态 vs 已提交态」的状态机。走 `renderEditor`，**必须装 `vtCellEditor` 插件**。

锚点右侧的清除「×」**默认就有**，一下清空**全部**选择（与面板底部那颗「清空」同效，只是不必先
展开面板），激活后按 `Delete` / `Backspace` 同效；清空写回 `[]`（`valueType: 'string'` 写 `''`）。
不许清空的列传 `clearable: false`。

值的形状由 `valueType` 决定，与展示形态无关：`'array'`（默认）存 `['a', 'b']`，`'string'` 存 `'a,b'` 并按 `separator` 拆/拼。换 `display` 只改列定义，行数据一个字节都不动 —— 示例里的「一键切换标签样式」就是这么做的。

单值用法、`display` 判别联合的完整签名见 [`VtSelect` 下拉选择](./vt-select)。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `multiple: true` | 多值 |
| `valueType` / `separator` | 存数组还是分隔符字符串 |
| `display` / `maxCount` | 胶囊形态与 `+N` 折叠 |
| `showActions` | 面板底部「清空 / 全选」 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtselect)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
