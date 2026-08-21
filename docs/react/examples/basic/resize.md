# React 可调整列宽

为列设置 `resizable: true` 后，可拖动列边界调整宽度。

## 示例

<PlaygroundHost framework="react" example-id="react-resize" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/basic/Resize.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.resizable` | 允许拖拽调整该列列宽 | [列配置](/vanilla/api/column#virttablecolumn) |
| `col.minWidth` / `maxWidth` | 拖拽的上下界 | [列配置](/vanilla/api/column#virttablecolumn) |
| `getState()` / `setState()` | 把用户调过的列宽存下来 | [状态持久化](/react/examples/advanced/state-persist) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
