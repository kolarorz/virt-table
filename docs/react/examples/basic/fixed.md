# React 冻结列与合并

通过 `fixed` 冻结左右列，并结合 `merges` 实现表身单元格合并。

## 示例

<PlaygroundHost framework="react" example-id="react-fixed" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/basic/Fixed.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.fixed` | `'left' \| 'right'`；写在分组上会下发给全部后代 | [列配置](/vanilla/api/column#virttablecolumn) |
| `--vt-fixed-shadow-color` / `-size` | 固定列阴影 | [主题定制](/react/examples/basic/theme) |

固定列不在合并坐标系里（`merges` 的 `colIndex` 只数非固定列），见[坐标系](/react/guide/notes#合并单元格的坐标系)。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
