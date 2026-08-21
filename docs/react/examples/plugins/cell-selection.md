# React 单元格选区

启用单元格选区后，可拖动鼠标选择矩形区域，并通过回调获取选区范围。

## 示例

<PlaygroundHost framework="react" example-id="react-cell-selection" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/CellSelection.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtCellSelection()` | 框选插件 | [插件机制](/vanilla/api/plugins) |
| `onCellSelectionChange` | 选区变化回调 `{ startRow, startCol, endRow, endCol } \| null` | [表格配置](/vanilla/api/table#virttableoptions) |
| `getCellSelection` / `clearCellSelection` | 读写选区 | [实例方法](/vanilla/api/instance) |

选区会按合并块扩张成完整矩形，见[按值自动合并](/react/examples/merge/auto-merge#与选区-导出的联动)。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
