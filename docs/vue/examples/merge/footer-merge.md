# Vue 表尾合并

通过 `footerData` 与 `footerMerges` 展示多行表尾并合并单元格。

## 示例

<PlaygroundHost framework="vue" example-id="vue-footer-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/merge/FooterMerge.vue
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `footerData` | 表尾数据 | [表格配置](/vanilla/api/table#virttableoptions) |
| `footerMerges` | 表尾合并配置 | [合并单元格](/vanilla/api/merge#mergecell) |
| `setFooterData(data, merges?)` | 运行时替换 | [实例方法](/vanilla/api/instance) |
| `showFooter` | 是否渲染表尾 | [表格配置](/vanilla/api/table#virttableoptions) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
