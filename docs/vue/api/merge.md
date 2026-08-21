# 合并单元格

`merges` / `headerMerges` / `footerMerges` 的元素形状。坐标系、按值自动合并（`mergeKey`）、与排序 / 选区 / 导出的联动见 [Vanilla API · 合并单元格](/vanilla/api/merge)。

## MergeCell

合并单元格配置。

| 属性       | 类型     | 说明       |
| ---------- | -------- | ---------- |
| `rowIndex` | `number` | 起始行索引 |
| `colIndex` | `number` | 起始列索引 |
| `rowspan`  | `number` | 合并行数   |
| `colspan`  | `number` | 合并列数   |
