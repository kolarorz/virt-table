# Vue VtProgress 进度条

进度条列：一条进度轨 + 右侧文字，支持非百分制满值、自定义文案与按百分比取色。

## 示例

<PlaygroundHost framework="vue" example-id="vue-vt-progress" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/cell/VtProgress.vue
:::

## 说明

**默认只读**（不提供 `renderEditor`，也不需要任何插件）。配 `editable: true` 才有编辑态 ——
**滑块 + 数字输入框**，此时必须装 `vtCellEditor`：

```ts
VtProgress({ key: 'done', title: '完成度', width: 220, editable: true })
// 非百分制：数字框键入的是原值(0 ~ max)，所以这一列后面不跟 `%`
VtProgress({ key: 'score', title: '得分', width: 220, max: 5, step: 0.5, editable: true })
```

两个控件都要，因为它们解决的是两件事：滑块负责「大概拖到七成」（连续比例最自然的手感，也与只读态
的条形一致），数字框负责「就要 65」—— 200px 的单元格里滑块一个像素约等于半个百分点，点不准整数。
两者共享同一个值：拖滑块刷新数字框、键入数字反推滑块位置，两边都是**边改边写回**（使用方常要在
`onChange` 里联动别的视图，过程中就跟着动才对得上「同一份数据」）。

数字框键入的是**原值**（`0 ~ max`）—— 默认 `max: 100` 下它就是百分比，框后面跟一个 `%`。
越界输入在失焦时夹回 `0 ~ max`；删空**不写回**（那一刻的 `Number('')` 是 0，提交它等于「删到空
就先归零」，条会闪一下再跳回来），失焦时回填当前值。`format` 只作用于只读态 —— 编辑态那一格
被输入框占了。没有 `clearable`（进度是个数，没有「空」这一档）。

`thresholds` 按数组顺序求值，命中第一条 `percent <= lte` 的规则：

```ts
thresholds: [{ lte: 30, variant: 'danger' }, { lte: 70, variant: 'warning' }]
// 30 以下红、70 以下黄、其余用默认主色
```

值非数字（`null` / 空串 / 文本）时按 0 画条，但文字位显示原始值 —— 直接画成空条会让「真的是 0」和「这行没数据」看起来一样。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `max` | 满值，默认 100 |
| `editable` / `step` | 可编辑（滑块 + 数字框，需装 `vtCellEditor`）与步长 |
| `showText` / `format` | 右侧那格数字（只读态是 `format` 文字，编辑态是数字框） |
| `thresholds` | 按百分比取色 |
| `color` / `variant` | 统一颜色（优先于 `thresholds`） |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtprogress)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
