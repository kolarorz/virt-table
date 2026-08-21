# 可调整列宽

为列设置 `resizable: true` 后，可拖动列边界调整宽度。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-resize" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/resize.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.resizable` | 允许拖拽调整该列列宽 | [列配置](/vanilla/api/column#virttablecolumn) |
| `col.minWidth` / `maxWidth` | 拖拽的上下界 | [列配置](/vanilla/api/column#virttablecolumn) |
| `getState()` / `setState()` | 把用户调过的列宽存下来 | [状态持久化](/vanilla/examples/advanced/state-persist) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
