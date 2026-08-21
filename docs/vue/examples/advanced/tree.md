# Vue 树形结构

通过 `type: tree` 列展示层级数据，支持展开/收起子节点。

## 示例

<PlaygroundHost framework="vue" example-id="vue-tree" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/advanced/Tree.vue
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.type: 'tree'` | 树形列（只画缩进与箭头，内容照常走内容层） | [列配置 · 功能列](/vanilla/api/column#功能列-type) |
| 行数据 `children` | 子节点数组 | [类型定义](/vanilla/api/types) |
| `defaultExpandAll` | 默认全部展开 | [表格配置](/vanilla/api/table#virttableoptions) |
| `onTreeToggle` / `toggleFold` | 折叠回调与编程控制 | [实例方法](/vanilla/api/instance) |
| `loadChildren` | 懒加载子节点 | [数据与远程](/vanilla/api/data#树形懒加载) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
