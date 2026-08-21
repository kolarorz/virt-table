# Vue 对齐方式

通过 `align`、`vAlign` 设置列的水平和垂直对齐方式。使用 `headerAlign`、`headerVAlign`、`footerAlign`、`footerVAlign` 分别覆盖表头和表尾的对齐。通过 `cellStyle` 可以为单个单元格独立设置对齐。

## 示例

包含两个表格：列级对齐（headerAlign/footerAlign 覆盖 align）和单元格独立对齐（cellStyle 回调）。

<PlaygroundHost framework="vue" example-id="vue-align" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Align.vue
:::

## 优先级

`column.headerAlign > column.align > options.headerAlign > options.align`

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `align` / `vAlign` | 表身对齐（全局 + 列级覆盖） | [列配置](/vanilla/api/column#virttablecolumn) |
| `headerAlign` / `headerVAlign` | 表头对齐 | [列配置](/vanilla/api/column#virttablecolumn) |
| `footerAlign` / `footerVAlign` | 表尾对齐 | [列配置](/vanilla/api/column#virttablecolumn) |
| `cellStyle` / `cellClass` | 逐格样式回调（容器层，一律叠加） | [表格配置](/vanilla/api/table#virttableoptions) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
