# Vue VtTextarea 多行文本

多行文本列：常态一行截断（配 `textOverflow: 'tooltip'` 可悬停看全文），编辑态**盖住单元格并随内容长高**，到 `maxRows` 或容器下缘封顶后内部滚动。

## 示例

<PlaygroundHost framework="vue" example-id="vue-vt-textarea" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/cell/VtTextarea.vue
:::

## 说明

编辑态走 `renderEditor`，**必须装 `vtCellEditor` 插件**才会被触发。Enter 在这里是换行、不提交；结束编辑按 Esc 或点别处。

编辑框不放在 `.vt-cell-cover` 里（那层高度恒等于单元格高度），而是与 cover 同挂 `.vt-client`、按「左上角 + 宽度」对齐单元格，高度自己长 —— 视觉上就是单元格自己长高了。宽度恒等于单元格宽度，横向不溢出，不会盖住相邻列。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `maxRows` | 最多长到几行，超过内部滚动 |
| `maxLength` | 最大输入长度 |
| `col.textOverflow` | 常态一行截断，配 `tooltip` 可悬停看全文 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vttextarea)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
