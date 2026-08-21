# React 带边框表格

通过 `border: true` 为表格显示边框。

## 示例

<PlaygroundHost framework="react" example-id="react-border" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/basic/Border.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `border` | 是否显示边框（表格外框 + 单元格分隔线） | [表格配置](/vanilla/api/table#virttableoptions) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
