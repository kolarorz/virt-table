# Vanilla JS API

按**作用对象**分组：先整张表，再一列，再一格，最后是跨层的机制与类型。

这些页面只答「有什么」—— 字段表、方法签名、取值与优先级。「怎么用、为什么这么设计、边界在哪」
都在对应的[功能](/vanilla/examples/basic/basic)页里，每张表下方都有链接。

所有 `option` / `column` 字段在 React / Vue 端自动透传，实例方法通过组件 `ref` 调用 ——
因此这份文档同时是三端的事实源，两端各自的 API 页只写封装层特有的部分。

## 表格级

| 页面 | 内容 |
| --- | --- |
| [表格配置](./table) | `VirtTableOptions` 全量字段、加载态、主题与密度、国际化 i18n、状态持久化、无障碍 |
| [实例方法](./instance) | 实例上的全部方法与属性、滚动模型的两条轴 |
| [数据与远程](./data) | 分页、服务端取数 / 无限滚动、树形懒加载、列头筛选与高级筛选、合计行、固定行、单选行 |

## 列级

| 页面 | 内容 |
| --- | --- |
| [列配置](./column) | `VirtTableColumn` 全量字段、功能列 `type`、列排序、列显隐、列 / 行拖拽 |
| [多级分组表头与表尾](./group-header) | `children` 分组节点、分组表尾的聚合语义与约束 |

## 单元格级

| 页面 | 内容 |
| --- | --- |
| [单元格渲染](./cell) | 内容层六档优先级、`cellType` 取值、`setCellRender`、会话层与编辑校验、容器层 |
| [单元格组件](./components) | 18 个 `Vt*` 单元格组件的公共选项与逐个专属选项表、`asCell()`、浮层定位 |
| [合并单元格](./merge) | `MergeCell` 形状、`mergeKey` 与断段规则、从 `spanMethod` 迁移 |

## 其他

| 页面 | 内容 |
| --- | --- |
| [插件机制](./plugins) | 内置插件清单与注入的方法、按需引入与样式、键盘导航、导出 / 打印、怎么写一个插件 |
| [类型定义](./types) | 渲染上下文、`VirtTableOptions` / `VirtTableColumn` 接口、远程取数相关类型 |

::: tip 找不到某个字段？
四层模型（接管层 / 内容层 / 容器层 / 会话层）与「为什么这么分」在
[渲染粒度](/vanilla/examples/cell/render-levels)；虚拟化与固定列的实现取舍在
[指南 · 架构设计](/vanilla/guide/architecture)与[设计决策](/vanilla/guide/decisions)。
:::
