# Vue 空数据表格

当 `list` 为空时显示空态，可通过 `emptyText` 自定义提示文案。

## 示例

<PlaygroundHost framework="vue" example-id="vue-empty" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Empty.vue
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `emptyText` | 空态文案（也可走 `locale.empty`） | [表格配置](/vanilla/api/table#virttableoptions) |
| `--vt-empty-icon` | 空态图标，尺寸设 `0` 可隐藏 | [主题定制](/vue/examples/basic/theme) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
