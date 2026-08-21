# React VtDateRangePicker 日期范围

日期区间列。值是 `['YYYY-MM-DD', 'YYYY-MM-DD']` 两个字符串。

## 示例

<PlaygroundHost framework="react" example-id="react-vt-date-range-picker" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/cell/VtDateRangePicker.tsx
:::

## 说明

编辑态默认是**自绘的双月日历**：点起点 → 移动鼠标预览区间 → 点终点即写回并关面板。反向选择（先点晚的再点早的）自动归一，同一天点两次得到一天的区间。走 `renderEditor`，**必须装 `vtCellEditor` 插件**。

```ts
VtDateRangePicker({ key: 'period', title: '项目周期', width: 260 })
// 清除「×」默认就有（两条支路都有）；必填列关掉它
VtDateRangePicker({ key: 'period', title: '项目周期', width: 260, clearable: false })
VtDateRangePicker({ key: 'period', title: '项目周期', width: 260,
                    panels: 1, firstDayOfWeek: 0, min: '2024-01-01', max: '2026-12-31' })
```

**值的形状**：区间是 `['YYYY-MM-DD', 'YYYY-MM-DD']`，清空写回 `['', '']`（清除「×」默认就有，
面板支路按 `Delete` / `Backspace` 同效；`native: true` 那一支的 `×` 挂在外壳上）。排序、框选复制、
CSV/Excel 导出、打印都按这个形状消费，所以不必给这一列另配 `sortMethod`。

## 区间怎么选

没有「确定」按钮 —— 面板只产出成对的区间，没有半成品要暂存。

| 操作 | 结果 |
| --- | --- |
| 先点晚的、再点早的 | 自动归一成 `[早, 晚]` |
| 同一天点两次 | 一天的区间 `[d, d]` |
| 已有值时再次打开 | 第一下开一段**全新**区间（不做「就近端点延长」—— 那要猜你想动哪一头） |
| 点越界（`min`/`max` 之外）的格子 | 无反应，也不进入拾取态 |

## 双月与降级

默认 `panels: 2`（一趟点完跨月区间），面板宽约 450px，挂在 `.vt-root` 上、不受单元格宽度限制。
`.vt-root` 放不下时**自动降级成单月**（实测宽度，不是写死断点 —— 密度档会改字号进而改面板宽），
降级后跨月区间照样能选：起点定下后翻月不影响拾取态。

## 快捷项

底部一排按钮。内置 7 颗，区间模式全给，单日模式（`VtDatePicker`）只留前两颗：

| 标签 | 区间 | 单日 |
| --- | --- | --- |
| 今天 / 昨天 | ✅ | ✅ |
| 本周 / 本月 / 本季度 | ✅ | — |
| 最近 7 天 / 最近 30 天 | ✅ | — |

`shortcuts` 三种写法，同一个入口覆盖「替换 / 追加 / 裁剪 / 改一颗」：

```ts
shortcuts: []                                                  // 一颗都不要
shortcuts: [{ label: '上个季度', value: (today) => [s, e] }]     // 整体替换
shortcuts: (builtin) => [...builtin, { label: '下周一', value: … }]        // 追加
shortcuts: (builtin) => builtin.filter((s) => s.label !== '本季度')        // 裁掉一颗
shortcuts: (builtin) => [...builtin, { label: '今天', value: 我的算法 }]    // 同名 = 就地覆盖
```

同 label 视作**就地覆盖**（位置取首次出现、值取最后一次），所以最后那种写法是「把内置的
『今天』换成我的算法」，不会排出两颗「今天」。自定义项可带 `mode: 'single' | 'range' | 'both'`
限定出现场合。`min`/`max` 会参与筛选：整段越界的项**整颗不出现**（宁可少一颗，也不要一排点不动
的灰按钮），部分越界的取交集（`min` 是今天-10 时，「最近 30 天」应用 `[min, 今天]`）。

## 键盘

焦点全程在单元格锚点上，面板里的按钮不参与 Tab 序。

| 键 | 行为 |
| --- | --- |
| `←` `→` | 前后一天（跳过越界格） |
| `↑` `↓` | 前后一周 |
| `PageUp` `PageDown` | 前后一月（配 `Shift` 为一年） |
| `Home` `End` | 本周第一天 / 最后一天 |
| `Enter` `Space` | 对光标所在日执行一次「点击」（区间要按两次） |
| `Esc` | 关闭面板 |

## 文案与 i18n

默认取 `zhCN.calendar`（`locale.ts` 里的 `calendar` 块是单一事实源）。单元格组件是纯工厂函数、
拿不到表格实例，所以**面板文案不跟随运行时 `setLocale()`**；要别的语言在列上显式传：

```ts
import { enUS } from '@virt-table/react';
VtDateRangePicker({ key: 'period', title: 'Period', width: 260, texts: enUS.calendar })
// 也可以只覆盖几项（浅合并，`months` / `weekdays` 是整体替换）
VtDatePicker({ key: 'd', title: '日期', width: 160, texts: { today: '今日' } })
```

## 原生支路

`native: true` 切回浏览器原生控件（两个 `input[type=date]` 并排）—— 也就是这个组件改造前的
样子。代价是外观不跟随暗色主题、起止要分两次点开各自的原生日历。两支在 `min`/`max` 上的语义
**不同**：原生支路交给浏览器（各家对越界输入的处理不一致），自绘支路是确定的（越界格不可点、
快捷项按上面的规则取舍）。`native` 与面板专属选项（`panels` / `firstDayOfWeek` / `shortcuts` /
`texts`）互斥，类型上就拒。

> 原有的 `startPlaceholder` / `endPlaceholder` 已删除：它们从未生效（原生 `input[type=date]`
> 不渲染 placeholder）。两端的空态提示现在由面板底部的回显承担（`texts.pickStart` /
> `texts.pickEnd`），整格的空态仍用 `placeholder`。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `panels` | 并排几个月，放不下自动降级 |
| `min` / `max` | 可选范围（影响快捷项取舍） |
| `shortcuts` / `texts` / `firstDayOfWeek` | 自绘面板专属 |
| `separator` | 常态与锚点回显的分隔符 |
| `native` | 切回两个并排的原生控件 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtdaterangepicker)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
