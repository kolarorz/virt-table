# Vue 单元格编辑

通过 `renderEditor` 与 `render` 为不同列定制查看态与编辑态渲染。

## 示例

<PlaygroundHost framework="vue" example-id="vue-cells-render" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/CellsRender.vue
:::

## 说明

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtCellEditor({ chrome?, activeCell? })` | 编辑会话插件 | [插件机制](/vanilla/api/plugins) |
| `col.renderEditor` | 列级编辑器（回落链：单元格级 > 列级） | [单元格渲染 · 会话层](/vanilla/api/cell#会话层-编辑态) |
| `col.editorChrome` | 这一列的浮层要不要画外观 | [列配置](/vanilla/api/column#virttablecolumn) |
| `openCellEditor` / `setActiveCell` / `getActiveCell` | 程序化进入与描边 | [实例方法](/vanilla/api/instance) |

> 相关示例：[渲染粒度](/vue/examples/cell/render-levels)（`renderEditor` 的回落）、
> [第三方组件库集成](/vue/examples/cell/third-party)（浮层外观归属）、
> [编辑校验](/vue/examples/advanced/validate)
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
