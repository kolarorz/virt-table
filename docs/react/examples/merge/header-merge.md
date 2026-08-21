# React 表头合并

通过 `headerData` 与 `headerMerges` 实现多行表头及单元格合并。

## 示例

<PlaygroundHost framework="react" example-id="react-header-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/merge/HeaderMerge.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `headerData` | 手写多行表头数据（与列 `children` 互斥） | [表格配置](/vanilla/api/table#virttableoptions) |
| `headerMerges` | 表头合并配置 | [合并单元格](/vanilla/api/merge#mergecell) |
| `setHeaderMerges(merges, headerData?)` | 运行时替换 | [实例方法](/vanilla/api/instance) |

要的是「按列树自动生成」的分组表头？那是 [`children`](/react/examples/basic/header-group)，两者互斥。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
