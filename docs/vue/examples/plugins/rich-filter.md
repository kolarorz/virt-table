# Vue 富筛选类型

为列配置 `filterType`：`text`（关键字模糊）、`number-range`（数值区间）、`date-range`（日期区间）、`enum`（枚举勾选，默认）。点击表头筛选图标弹出对应筛选器。

## 示例

<PlaygroundHost framework="vue" example-id="vue-rich-filter" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/RichFilter.vue
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.filterType` | `'enum'`（默认）/ `'text'` / `'number-range'` / `'date-range'` | [数据与远程 · 列头筛选](/vanilla/api/data#列头筛选) |
| 筛选值形状 | 区间类为 `{ min, max }` / `{ start, end }` | [数据与远程 · 列头筛选](/vanilla/api/data#列头筛选) |
| `vtColumnFilter()` | 列头筛选下拉插件 | [插件机制](/vanilla/api/plugins) |

`filterType` 同时决定该列在[高级筛选](/vue/examples/advanced/filter-builder)里的值域类别（可用 `filterValueKind` 显式覆盖）。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
