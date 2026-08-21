# Vue 无表头表格

通过 `showHeader: false` 隐藏表头，仅渲染表身。

## 示例

<PlaygroundHost framework="vue" example-id="vue-no-header" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/NoHeader.vue
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `showHeader` | 是否渲染表头 | [表格配置](/vanilla/api/table#virttableoptions) |
| `showFooter` | 是否渲染表尾（有 `footerData` 时生效） | [表格配置](/vanilla/api/table#virttableoptions) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
