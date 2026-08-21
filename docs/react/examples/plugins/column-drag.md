# React 列拖拽排序

装载 `vtColumnDrag()` 后拖拽表头即可调整列顺序，通过 `onColumnOrderChange` 获取新顺序。与列宽拖拽、点击排序互不冲突（拖拽阈值区分）。

## 示例

<PlaygroundHost framework="react" example-id="react-column-drag" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/ColumnDrag.tsx
:::

## 说明

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtColumnDrag()` | 拖拽表头调整列顺序 | [插件机制](/vanilla/api/plugins) |
| `onColumnOrderChange` | 列顺序变化回调 | [列配置 · 拖拽排序](/vanilla/api/column#拖拽排序-列-行) |
| `moveColumn(colKey, toIndex)` | 编程式移动 | [实例方法](/vanilla/api/instance) |
| `getState()` / `setState()` | 把列序存下来 | [状态持久化](/react/examples/advanced/state-persist) |

分组表头下**只允许同一父分组内换位**，跨分组拖拽被忽略；有 `merges` 时整体禁用。

> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
