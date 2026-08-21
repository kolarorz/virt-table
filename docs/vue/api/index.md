# Vue API

按**作用对象**分组，与 Vanilla 一一对应。字段语义三端一致（`options` / `columns` 原样透传给内核），
所以这里只写 Vue 封装层特有的部分：`VNode` 渲染、`ref` 暴露的方法、`options` 的响应式约定。
完整语义随时回 [Vanilla API](/vanilla/api/) 查 —— 那份是三端的事实源。

这些页面只答「有什么」（字段表、方法签名、取值）。「怎么用、为什么这么设计、边界在哪」
都在对应的[功能](/vue/examples/basic/basic)页里，每张表下方都有链接。

## 表格级

| 页面 | 内容 |
| --- | --- |
| [表格配置](./table) | 组件 Props、`VirtTableOptions` 全量字段 |
| [实例方法](./instance) | `ref` 暴露的方法（含插件注入的方法） |
| [数据与远程](./data) | 服务端取数 / 无限滚动的 Vue 写法与两条响应式约定 |

## 列级

| 页面 | 内容 |
| --- | --- |
| [列配置](./column) | `VueTableColumn` 字段、返回 `VNode` 的渲染函数 |
| [多级分组表头与表尾](./group-header) | `children` 分组节点、分组小计格的聚合语义与约束 |

## 单元格级

| 页面 | 内容 |
| --- | --- |
| [单元格渲染](./cell) | `render` / `renderEditor` 返回 `VNode`、单元格级渲染、编辑浮层的外观归属 |
| [单元格组件](./components) | 内置单元格组件在 Vue 端的引入方式 |
| [合并单元格](./merge) | `MergeCell` 形状 |

## 其他

| 页面 | 内容 |
| --- | --- |
| [插件机制](./plugins) | 插件从 `@virt-table/vue` 引入、样式与 ref 透出 |
| [类型定义](./types) | `VueTableColumn`、组件 Props、ref 接口 |
