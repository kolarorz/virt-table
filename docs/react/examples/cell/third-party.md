# 第三方组件库（Ant Design）

演示与 Ant Design 集成的单元格编辑：查看态使用轻量 DOM，编辑态挂载真实组件以保证虚拟滚动性能。

## 示例

<PlaygroundHost framework="react" example-id="react-cell-edit" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/cell/AntDesign.tsx
:::

## 说明

:::tip
为保证虚拟滚动性能，查看态不直接渲染第三方 UI 组件。若在滚动过程中持续挂载组件，会产生频繁的创建与销毁，导致帧率下降和交互抖动。

推荐将"查看态"和"交互态"分离：查看态使用轻量 DOM + CSS 还原组件视觉风格，交互态仅在激活单元格时挂载真实组件。这样可以兼顾性能、一致性与可维护性。
:::

## 相关 API

| 字段 | 作用 | 详见 |
| --- | --- | --- |
| `col.render` / `col.renderEditor` | 常态与编辑态两个钩子 | [单元格渲染](/vanilla/api/cell#内容层) |
| `col.editorChrome` | 这一列的浮层要不要画外观（默认 `true`） | [列配置](/vanilla/api/column#virttablecolumn) |
| `vtCellEditor({ chrome })` | 整表的外观归属默认值 | [插件机制](/vanilla/api/plugins) |

> 编辑会话本身（浮层生命周期、激活态）见 [vtCellEditor 单元格编辑](/react/examples/plugins/cells-render)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
