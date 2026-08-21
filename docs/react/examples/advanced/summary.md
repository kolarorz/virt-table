# React 自动合计行

开启 `showSummary`，为列配置 `summary: 'sum'|'avg'|'count'|'max'|'min'` 或 `summaryMethod` 自定义聚合。合计基于筛选/排序后的数据动态计算，占用表尾。

## 示例

<PlaygroundHost framework="react" example-id="react-summary" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/Summary.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `showSummary` / `summaryText` | 开启合计行与首列标签 | [数据与远程 · 合计行](/vanilla/api/data#自动聚合合计行) |
| `col.summary` | `'sum' \| 'avg' \| 'count' \| 'max' \| 'min'` | [数据与远程 · 合计行](/vanilla/api/data#自动聚合合计行) |
| `col.summaryMethod` | `(values, rows) => string | number` | [数据与远程 · 合计行](/vanilla/api/data#自动聚合合计行) |

合计基于**筛选 / 排序后的叶子行**，随视图自动重算。分组表头下表尾也按列树渲染，分组格的聚合语义见[多级分组表尾](/vanilla/api/group-header#多级分组表尾)；客户端分页时算的是**当前页**。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
