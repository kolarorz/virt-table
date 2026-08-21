# VtTimePicker 时间选择

时间列。与 `VtDatePicker` 同构，编辑态是原生 `input[type=time]`。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-time-picker" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-time-picker.ts
:::

## 说明

值就是原生控件的字符串格式（`'09:30'`，`step` 带秒时 `'09:30:15'`），不做二次解析 —— 表格拿到什么就存什么，格式化留给使用方的 `render` 或数据层。走 `renderEditor`，**必须装 `vtCellEditor` 插件**。

日期与区间那两个组件已经换成自绘面板（跟随暗色主题），时间列仍是原生控件：原生 `input[type=time]` 的下拉由操作系统渲染，吃不到 `--vt-*`。

清除「×」在控件右侧、**默认就有**（原生 time 控件「怎么删回空」各家不一，给个叉更确定），
清空写回 `''`；不需要的列传 `clearable: false`。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `min` / `max` | 可选范围 |
| `step` | 步进（秒）；给 `1` 出现秒位 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vttimepicker)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
