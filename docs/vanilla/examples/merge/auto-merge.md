---
description: 原生 JavaScript 虚拟表格按值合并单元格示例：配置 mergeKey，在大数据表格中组合自动合并与虚拟滚动。
---

# 按值自动合并

列上配 `mergeKey`，**相邻同键的行自动纵向合并** —— 坐标由管线自动维护，且不禁用排序。这是对静态 `merges` 的补充，不是替代。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-auto-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/merge/auto-merge.ts
:::

## 说明

| | 静态 `merges` | `mergeKey` |
| --- | --- | --- |
| 表达什么 | 任意几何（含 `colspan`、不连续的块、表头 / 表尾合并） | 相邻同键成段（只纵向） |
| 坐标 | 使用方自己算，跟着数据顺序变就得重算 | 管线自动维护 |
| 排序 | **禁用排序**（合并按绝对行号，排序会错位） | **不影响排序**，排序后重新分段 |
| 大数据 | 手写，规模由使用方控制 | 10 万行实测滚动帧耗时零回归 |

```ts
const columns = [
  // 按单字段合并
  { key: 'dept', title: '部门', width: 150, mergeKey: true, sortable: true },
  // 拼键：只有「大区 + 状态」都相同才合并
  { key: 'region', title: '大区', width: 150, mergeKey: (r) => `${r.region}/${r.status}` },
  // 条件合并：金额 ≤ 100 的行不参与
  { key: 'amount', title: '金额', width: 120, mergeKey: (r) => (r.amount > 100 ? r.dept : undefined) },
];
```

## 行为与边界

- **键用 `!==` 比较**，请返回原始值；要按多字段合并就自己拼成字符串（深比较会让分段从 O(n) 变成 O(n × 字段数)）。
- **结构边界自动断开**：分组行、树形层级变化处一定断段，父子行不会被并成一格。
- **只对非固定列生效**。`merges` 的坐标系里固定列不参与合并（见[合并单元格的坐标系](../../guide/notes#合并单元格的坐标系)），配在固定列上会 `console.warn` 并忽略。
- **行拖拽被禁用**：把一行拖出所属段没有语义。
- **开了 `stripe` 时合并格不带斑马纹**：跨行的格子只属于起始行，染上起始行的颜色就会和它覆盖的几行对不上，所以抹平成基础底色（hover / 选中高亮不受影响，仍跟随整行）。详见[斑马纹](../basic/stripe)。
- **动态行高下也可用**：合并会让同组几行共担内容高度（实测每行 518px → 104px），同一行往返测量一致、滚动无漂移。代价是合并块在窗口边缘被裁短时那几行会变高，滚过去又变回来。要绝对稳定的行高就配 `fixedSize: true`。

### 长段会「重锚」

滚进一个很长的段（比如一个只有 3 个取值的状态列在 10 万行上）中间时，合并格的起点会被抬到**可视区顶部**，其内容会**钉在可见数据区上缘**（像粘性小标题），段尾进入视口时被平滑推出。

之所以不做「格内垂直居中」：裁剪按整行取整、滚动按像素，居中的文字会每行回跳一整行高（实测锯齿 32px）。短段（整段可见）与静态 `merges` 不套这层，仍是格内居中。

这不是取巧，而是虚拟滚动下的唯一正确做法：合并块的真实起点可能在窗口外几万行处，要在那儿渲染 primary 单元格就得把这几万行全部 materialize（实测 `rowspan=50000` 时会渲染 5 万个 `<tr>`，虚拟滚动直接失效）。AG Grid 的 Cell Span 同样如此，并把「合并值始终可见」当作特性。

不想要这个观感就用 `mergeMaxSpan` 把段切碎（代价是长段之间出现分隔线）。

## 与选区 / 导出的联动

- **框选会按合并块扩张成完整矩形**。查的是段的**真实起止**而不是渲染窗口的裁剪结果 —— 选区可以
  远超窗口（例如一个 5 万行的段，选中其中一格会把选区扩成 0–49999），用裁剪结果会把选区截在
  窗口边界上。
- **`getMerges()` 只返回静态配置**（`options.merges` / `setMerges()` 那份），不含自动合并 ——
  后者是派生状态、跨度随数据变。
- **`getEffectiveMerges(rowBegin?, rowEnd?)` 返回实际生效的合并块**（静态 + 自动合并的真实段），
  给导出、自定义复制这类需要还原合并结构的场景用。不传区间覆盖整份显示列表；自动合并的段数与
  行数同阶，百万行会产出十万级数组，按需传区间。
- `vtClipboard` / `vtExport` **本来就不读合并信息**（逐行取值），对静态 `merges` 与自动合并一视同仁。
  要让导出还原合并结构，自己用 `getEffectiveMerges()` 构造。

## 性能

分段索引（`Int32Array` 存段起点）在数据管线末端一列一趟 O(n) 扫描建好，每帧再按渲染窗口裁剪出
至多「窗口行数」个合并块交给现有管线。实测：

| | 结果 |
| --- | --- |
| 建索引（100 万行 / 1 列） | 3.3ms，781KB |
| 10 万行 2 列，滚动帧耗时 | 中位 8.3ms / p95 9.2ms —— 与不开自动合并**完全一致** |
| 10 万行 2 列，初始化 | 3.5ms → 7.9ms |
| 段长 9.3 万行时渲染的 `<tr>` | 25（与不开自动合并一致） |

## 从 el-table / vxe 的 `spanMethod` 迁移

el-table / vxe 那种「每个单元格调一次回调返回 `[rowspan, colspan]`」的形式**不内建**，因为它们
不虚拟化。在虚拟滚动下两条路都不成立：全量求值是 O(行 × 列) 次回调（50 万行 × 10 列 = 500 万次，
秒级）；只对窗口求值则拿不到窗口外的段起点，结果是错的。

所以给的是一个纯函数，把逐格回调求值成静态 `merges` —— 代价显式摊在调用点上，而不是藏在
option 后面：

```ts
import { VirtTable, buildMergesFromSpan } from '@virt-table/vanilla';

// el-table 里的写法几乎可以原样搬过来
const spanMethod = ({ rowIndex, columnIndex }) => {
  if (columnIndex !== 0) return;
  return rowIndex % 2 === 0 ? [2, 1] : [0, 0];  // [0,0] = 被上一格覆盖
};

const merges = buildMergesFromSpan(list, centerColumns, spanMethod);
table.setMerges(merges);
// 数据变了要自己重算：table.setList(next); table.setMerges(buildMergesFromSpan(next, centerColumns, spanMethod));
```

`[rowspan, colspan]` 与 `{ rowspan, colspan }` 两种返回值都吃；`[1, 1]`（普通格）、`[0, 0]`（被覆盖）与 `undefined` 都不产出合并块——覆盖关系由 primary 格的跨度自动推导。

三个约定：

- **`centerColumns` 只传非固定列**，顺序即 `colIndex` 的顺序。
- 产出的合并块**不能互相重叠**，`rowspan` 要自己控制在合理范围（巨大的 rowspan 会把渲染区间拉回合并块起始行）。这两点与直接写 `options.merges` 完全一致。
- 回调次数正好是 `行数 × 列数`，**代价摊在调用点上**：你能看见它遍历了多少行，也自己决定什么时候重算。

**先想想能不能用 `mergeKey`。** `spanMethod` 的绝大多数真实用法就是「按某个值成段」，用 `mergeKey` 表达是 O(1) 摊销的，而且不禁用排序、数据变了自动重算。只有需要 **`colspan` 或不连续的几何**时才用这个 helper。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.mergeKey` | `boolean \| ((row, i) => unknown)`，相邻同键成段；返回 `undefined` 表示该行不参与 | [合并单元格](/vanilla/api/merge#按值自动合并-mergekey) |
| `col.mergeMaxSpan` | 单段最大跨度，超出则断开 | [合并单元格](/vanilla/api/merge#按值自动合并-mergekey) |
| `options.merges` / `setMerges` / `getMerges` | 静态合并（任意几何） | [合并单元格](/vanilla/api/merge#mergecell) |
| `getEffectiveMerges(rowBegin?, rowEnd?)` | 实际生效的合并块（含自动合并的真实段） | [合并单元格](/vanilla/api/merge#mergecell) |
| `buildMergesFromSpan(list, centerColumns, spanMethod)` | 把逐格回调求值成静态 `merges` | [合并单元格](/vanilla/api/merge#从-spanmethod-迁移) |
