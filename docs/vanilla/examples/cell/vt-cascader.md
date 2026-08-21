# VtCascader 级联选择

级联选择列：常态是 `浙江 / 杭州 / 西湖`，编辑态是多栏面板。选中叶子（或 `checkStrictly` 下点任意节点）立即写回并关闭面板；展开父级只改面板，不动数据。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-cascader" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-cascader.ts
:::

## 说明

编辑态走 `renderEditor`，**必须装 `vtCellEditor` 插件**才会被触发。

清除「×」在锚点右侧、**默认就有**（面板里只能换选别的节点，没有「选回空」这一项 —— 不给等于
「这一列填过一次就填不回空」），激活后按 `Delete` / `Backspace` 同效；清空写回的形状跟着
`valueType` 走（`'path'` 写 `[]`、`'leaf'` 写 `''`）。不许清空的列传 `clearable: false`。

两种值形状：

- `'path'`（默认）—— 存整条路径 `['zj', 'hz', 'xh']`，自解释、不需要反查；
- `'leaf'` —— 只存最后一级 `'xh'`，展示时按 `options` 反查路径。反查的 `value → 路径` 索引**在工厂里预建一次**（否则虚拟滚动下每帧要遍历整棵树几十次），代价是 `options` 必须在建列时就定下来，运行时换树请重新 `setColumns()`。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `options` | 候选树（必填） |
| `valueType` | 存整条路径还是只存最后一级 |
| `checkStrictly` | 允许选中非叶子节点 |
| `separator` | 常态的层级分隔符 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtcascader)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
