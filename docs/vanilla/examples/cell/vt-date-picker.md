# VtDatePicker 日期选择

日期列。值就是 `'YYYY-MM-DD'` 字符串，不做二次解析 —— 表格拿到什么就存什么。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-date-picker" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-date-picker.ts
:::

## 说明

编辑态默认是**自绘的单月日历**（与 `VtDateRangePicker` 同一套面板，只是单选 + 单月），外观跟随 `--vt-*` 含暗色主题。`native: true` 切回浏览器原生 `input[type=date]`。走 `renderEditor`，**必须装 `vtCellEditor` 插件**。

```ts
VtDatePicker({ key: 'joinDate', title: '入职日期', width: 180 })
// 清除「×」默认就有；必填列关掉它
VtDatePicker({ key: 'joinDate', title: '入职日期', width: 180, clearable: false })
VtDatePicker({ key: 'joinDate', title: '入职日期', width: 180, native: true })  // 原生控件
```

单日特有的几点：

- 底部快捷项只留「今天 / 昨天」——「本周」这类区间语义在单日下没有意义，内部按模式滤掉。
- 自定义快捷项的 `value` 返回的是区间，单日模式**只取 `[0]`**；用 `mode: 'single'` 可以让某颗只在单日下出现。
- 选中即写回并关闭面板（没有「确定」按钮）。
- 清除「×」**默认就有**（日历里只能改选另一天，没有「选回空」那一格），激活后按 `Delete` / `Backspace` 同效，清空写回 `''`；不许清空的列传 `clearable: false`。

面板本身（双月与降级、`shortcuts` 的四种写法、完整键盘表、`texts` 与 i18n、原生支路的差异）
与区间版**完全共用一套**，写在那一页里，不再抄第二份：
[VtDateRangePicker · 快捷项](./vt-date-range-picker#快捷项) /
[键盘](./vt-date-range-picker#键盘) /
[文案与 i18n](./vt-date-range-picker#文案与-i18n) /
[原生支路](./vt-date-range-picker#原生支路)。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `min` / `max` | 可选范围 |
| `firstDayOfWeek` / `shortcuts` / `texts` | 自绘面板专属 |
| `native` | 切回原生 `input[type=date]`（与上面三项互斥） |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtdatepicker)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
