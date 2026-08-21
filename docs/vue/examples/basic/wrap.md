# Vue 自动换行

默认情况下，单元格内的长文本会自动换行显示。

## 示例

<PlaygroundHost framework="vue" example-id="vue-wrap" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Wrap.vue
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.textOverflow` | 不配即允许换行；配 `ellipsis` / `tooltip` 变单行 | [列配置](/vanilla/api/column#virttablecolumn) |
| `estimatedSize` / `fixedSize` | 换行会撑高行 —— 动态行高下别开 `fixedSize` | [表格配置](/vanilla/api/table#virttableoptions) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
