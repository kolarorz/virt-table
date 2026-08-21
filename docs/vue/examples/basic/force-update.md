# Vue 强制刷新

在原地修改行数据后，调用实例方法 `forceUpdate()` 强制刷新可见区域。

## 示例

<PlaygroundHost framework="vue" example-id="vue-force-update" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/ForceUpdate.vue
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `setList(list)` | 换整份数据（重走数据管线） | [实例方法](/vanilla/api/instance) |
| `forceUpdate()` | 数据对象没换、只改了字段值时强制重绘 | [实例方法](/vanilla/api/instance) |
| `onRowRemoved` | 行 DOM 被回收时清理自定义挂载 | [表格配置](/vanilla/api/table#virttableoptions) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
