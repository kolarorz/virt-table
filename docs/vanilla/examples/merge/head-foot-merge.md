# 表头 + 表尾合并

同时配置表头与表尾的自定义数据及合并规则。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-head-foot-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/merge/head-foot-merge.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `headerData` / `headerMerges` | 表头 | [合并单元格](/vanilla/api/merge#mergecell) |
| `footerData` / `footerMerges` | 表尾 | [合并单元格](/vanilla/api/merge#mergecell) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
