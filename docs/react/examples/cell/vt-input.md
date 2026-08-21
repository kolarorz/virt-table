# React VtInput 文本输入

文本输入列：常态显示纯文本，进入编辑态后在浮层里改，值实时写回行数据。

编辑态走 `renderEditor`，**必须装 `vtCellEditor` 插件**才会被触发。

## 示例

<PlaygroundHost framework="react" example-id="react-vt-input" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/cell/VtInput.tsx
:::

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `maxLength` | 最大输入长度 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtinput)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
