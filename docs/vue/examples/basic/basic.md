# Vue 基础表格

展示 VirtTable 的基础用法：配置列与数据，支持虚拟滚动及滚动定位。

## 示例

<PlaygroundHost framework="vue" example-id="vue-basic" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Basic.vue
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `list` / `columns` / `itemKey` | 数据、列、行唯一标识（三个必填） | [表格配置](/vanilla/api/table#virttableoptions) |
| `estimatedSize` | 行预估高度（px），虚拟滚动的几何基准 | [表格配置](/vanilla/api/table#virttableoptions) |
| `buffer` | 上下渲染缓冲行数 | [表格配置](/vanilla/api/table#virttableoptions) |
| `scrollToIndex` / `scrollToCell` | 滚动定位 | [实例方法](/vanilla/api/instance) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
