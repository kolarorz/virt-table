# 按值自动合并

列上配 `mergeKey`，**相邻同键的行自动纵向合并**。这是对静态 `merges` 的补充，不是替代：

| | 静态 `merges` | `mergeKey` |
| --- | --- | --- |
| 表达什么 | 任意几何（含 `colspan`、不连续的块、表头 / 表尾合并） | 相邻同键成段（只纵向） |
| 坐标 | 使用方自己算，跟着数据顺序变就得重算 | 管线自动维护 |
| 排序 | **禁用排序**（合并按绝对行号，排序会错位） | **不影响排序**，排序后重新分段 |
| 大数据 | 手写，规模由使用方控制 | 10 万行实测滚动帧耗时零回归 |

## 使用的 API

```ts
type Column = {
  key: string;
  title: string;
  width: number;
  /**
   * true                → 用 row[key] 作为比较键
   * (row, i) => unknown → 自定义键；返回 undefined 表示该行不参与合并
   */
  mergeKey?: boolean | ((row: T, rowIndex: number) => unknown);
  /** 单段最大跨度，超出则断开（不传则不限） */
  mergeMaxSpan?: number;
};
```

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

## 从 el-table / vxe 的 `spanMethod` 迁移

表格**不内建**逐格 `spanMethod`（理由见 [API 文档](../../api/#不提供逐格-spanmethod)），但提供一个纯函数把它求值成静态 `merges`：

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

## 示例

<PlaygroundHost framework="vanilla" example-id="table-auto-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/merge/auto-merge.ts
:::
