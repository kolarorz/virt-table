# 表身合并

通过 `merges` 配置表身单元格的 rowspan/colspan 合并。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/merge/body-merge.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `merges` | 表体合并配置 `MergeCell[]` | [合并单元格](/vanilla/api/merge#mergecell) |
| `setMerges` / `getMerges` / `getEffectiveMerges` | 运行时读写 | [合并单元格](/vanilla/api/merge#mergecell) |
| `col.mergeKey` | 按值自动合并（不禁用排序） | [合并单元格 · mergeKey](/vanilla/api/merge#按值自动合并-mergekey) |

`colIndex` **只数非固定列**，见[坐标系](/vanilla/guide/notes#合并单元格的坐标系)；存在 `merges` 时排序自动禁用。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
