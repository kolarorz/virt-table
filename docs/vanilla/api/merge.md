# 合并单元格

两条入口：静态 `merges` 表达任意几何，列上的 `mergeKey` 按值自动成段。可以同时用。

| | 静态 `merges` | `mergeKey` |
| --- | --- | --- |
| 表达什么 | 任意几何（含 `colspan`、不连续的块、表头 / 表尾合并） | 相邻同键成段（只纵向） |
| 坐标维护 | 使用方自己算，数据顺序变了要重算 | 管线自动维护 |
| **排序** | **禁用排序**（合并按绝对行号，排序会错位） | **不影响排序**，排序后重新分段 |

用法与边界在示例页：[表身合并](/vanilla/examples/merge/body-merge)、
[按值自动合并](/vanilla/examples/merge/auto-merge)、[表头合并](/vanilla/examples/merge/header-merge)、
[表尾合并](/vanilla/examples/merge/footer-merge)。

## MergeCell

合并单元格配置，用于表体（`merges`）、表头（`headerMerges`）、表尾（`footerMerges`）。

| 属性       | 类型     | 说明                            |
| ---------- | -------- | ------------------------------- |
| `rowIndex` | `number` | 合并区域起始行索引（从 0 开始） |
| `colIndex` | `number` | 合并区域起始列索引（从 0 开始，**只数非固定列**，见[坐标系](../guide/notes#合并单元格的坐标系)） |
| `rowspan`  | `number` | 合并行数                        |
| `colspan`  | `number` | 合并列数                        |

| 方法 | 返回 | 说明 |
| --- | --- | --- |
| `setMerges(merges)` / `setHeaderMerges` / `setFooterData` | `void` | 换一份静态合并配置 |
| `getMerges()` | `MergeCell[]` | **只返回静态配置**，不含自动合并（后者是派生状态） |
| `getEffectiveMerges(rowBegin?, rowEnd?)` | `MergeCell[]` | 实际生效的合并块（静态 + 自动合并的真实段）。段数与行数同阶，百万行请传区间 |

## 按值自动合并（`mergeKey`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `col.mergeKey` | `boolean \| ((row: T, rowIndex: number) => unknown)` | `true` 用 `row[key]` 当键；函数返回 `undefined` 表示该行不参与合并。键用 `!==` 比较，**请返回原始值** |
| `col.mergeMaxSpan` | `number` | 单段最大跨度，超出则断开（不传则不限） |

自动断段与失效的几种情形：

| 情形 | 行为 |
| --- | --- |
| 分组行、树形层级变化处 | 一定断段，父子行不会被并成一格 |
| 配在固定列上 | `console.warn` 并忽略（固定列不在合并坐标系里） |
| 装了 `vtRowDrag` | 行拖拽禁用，`canReorderRows()` 返回 `false`（把一行拖出所属合并段没有语义）|
| 开了 `stripe` | 合并格不带斑马纹（hover / 选中高亮不受影响） |
| 段长超出渲染窗口 | 起点抬到可视区顶部、内容套 sticky 内层「重锚」 |

分段索引的性能实测、重锚的取舍、与选区 / 导出的联动见[按值自动合并](/vanilla/examples/merge/auto-merge)。

## 从 `spanMethod` 迁移

不提供逐格 `spanMethod`（虚拟滚动下全量求值是 O(行 × 列) 次回调，只对窗口求值结果又是错的）。
给的是一个纯函数：

```ts
import { buildMergesFromSpan } from '@virt-table/vanilla';

table.setMerges(buildMergesFromSpan(list, centerColumns, ({ rowIndex, columnIndex }) => {
  if (columnIndex === 0) return rowIndex % 2 === 0 ? [2, 1] : [0, 0];
}));
```

| 约定 | 说明 |
| --- | --- |
| `centerColumns` | 只传非固定列，顺序即 `colIndex` 的顺序 |
| 返回值 | `[rowspan, colspan]` 与 `{ rowspan, colspan }` 都吃；`[1,1]` / `[0,0]` / `undefined` 不产出合并块 |
| 回调次数 | 正好 `行数 × 列数`；数据变了要自己重算 |
| 产出的块 | 不能互相重叠（同直接写 `options.merges`） |

迁移前先想想能不能用 `mergeKey` —— 完整对照见[示例页](/vanilla/examples/merge/auto-merge#从-el-table-vxe-的-spanmethod-迁移)。
