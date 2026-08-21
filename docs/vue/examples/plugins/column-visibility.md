# Vue 字段配置（列显隐 / 列序）

字段配置面板 = **勾选控制列显隐 + 拖手柄调整列序**。列支持 `hidden`（默认隐藏）与 `hideable: false`（禁止在面板切换）。装载 `vtFieldConfig()` 后用 ref 上的 `toggleFieldConfig(anchor)` 打开面板，或用 `setColumnVisible(key, visible)` / `moveColumn()` 编程控制。

装了 [`vtToolbar`](./toolbar) 时它会把自己挂成工具栏上的「字段配置」那颗按钮 —— 工具栏**一颗都不自带**，所以这个插件（或 `...vtToolbarPanels()` 那个预设）必须写出来。选项见 [vanilla 版](/vanilla/examples/plugins/column-visibility)。

## 示例

<PlaygroundHost framework="vue" example-id="vue-column-visibility" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/ColumnVisibility.vue
:::

## 说明

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.hidden` / `col.hideable` | 默认隐藏 / 允不允许用户切换 | [列配置 · 列显隐](/vanilla/api/column#列显隐) |
| `setColumnVisible(colKey, visible)` | 编程式显隐 | [列配置 · 列显隐](/vanilla/api/column#列显隐) |
| `getVisibleColumns` / `getLeafColumns` / `getAllColumns` | 三种读列口径 | [实例方法](/vanilla/api/instance) |
| `toggleFieldConfig(anchor?)` | 打开 / 关闭面板 | [插件机制](/vanilla/api/plugins) |
| `moveColumn(fromKey, toKey, after)` | 编程式换序（面板里拖手柄落的就是它） | [实例方法](/vanilla/api/instance) |
| `getState()` / `setState()` | 把列显隐存下来 | [状态持久化](/vue/examples/advanced/state-persist) |

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
