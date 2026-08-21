# React 表头 + 表尾合并

同时配置表头与表尾的自定义数据及合并规则。

## 示例

<PlaygroundHost framework="react" example-id="react-head-foot-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/merge/HeadFootMerge.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `headerData` / `headerMerges` | 表头 | [合并单元格](/vanilla/api/merge#mergecell) |
| `footerData` / `footerMerges` | 表尾 | [合并单元格](/vanilla/api/merge#mergecell) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
