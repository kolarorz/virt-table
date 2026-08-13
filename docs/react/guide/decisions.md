# 设计决策

本节记录项目中的关键算法和设计选择，解释**为什么这样做**而不是其他方式。

---

## Rect 补全算法（合并单元格 + 虚拟滚动）

### 问题

虚拟滚动只渲染可视窗口内的行和列。但合并单元格可能跨越窗口边界：

```
        可视窗口
        ┌──────┐
  ┌─────┼──┐   │   ← 合并单元格的起点在窗口外
  │merge│  │   │
  │     │  │   │
  └─────┼──┘   │
        │      │
        └──────┘
```

如果只渲染窗口内的行，合并单元格的 `rowspan`/`colspan` 无法正确表达，表格列对齐会崩溃。

### 解决方案：三步走

**第一步：`calcRenderRect` — 扩展渲染范围**

1. 扫描可视窗口四条边界上的每个单元格
2. 查询该单元格是否属于某个 merge
3. 如果 merge 延伸到窗口外 → 扩展 render rect 到 merge 的完整范围
4. 收集所有"边界 merge"（起点在窗口外但与边界交叉的 merge）

```ts
// 输入：虚拟滚动计算出的可视范围
originRect = { ys: renderBegin, ye: renderEnd, xs: colBegin, xe: colEnd }

// 输出：扩展后的渲染范围
renderRect = { rys: expandedBegin, rye: expandedEnd, rxs, rxe }
```

**第二步：`generateMergeCells` — 占位分割**

扩展区域中，窗口外的部分不需要真实数据，只需要结构上正确的 `<td>` 来维持列对齐。

算法为每个扩展方向（上、下、左、右）：

1. 创建一个覆盖整个扩展条带的大 placeholder
2. 对于每个与该条带相交的边界 merge → 将 placeholder 分割为不重叠的片段
3. 分割结果就是需要渲染的占位 `<td>`

```
  原始大 placeholder          分割后
  ┌──────────────┐          ┌───┬────┬────┐
  │              │          │   │merge    │
  │              │    →     ├───┤    ├────┤
  │              │          │   │    │    │
  └──────────────┘          └───┴────┴────┘
```

**第三步：`planRowCells` — 每行渲染计划**

对 render 范围内的每一行，生成该行需要的 `<td>` 列表：

```ts
type CellPlan = 
  | { type: 'pad', colSpan }     // 占位（不可见列）
  | { type: 'cell', colIndex }   // 普通单元格
  | { type: 'merge', merge }     // 合并主格（带 rowspan/colspan）
```

**不变量**：每行所有 `<td>` 的 `colspan` 之和 = 总中间列数。这保证了 `<colgroup>` 对齐。

### 为什么不用 CSS Grid？

- `<table>` 的 `colspan`/`rowspan` 天然支持合并语义
- CSS Grid 的 span 需要显式轨道定义，动态增减列更复杂
- 固定列的 `sticky` 在 `<table>` 中表现稳定
- 浏览器对 `<table>` 渲染有专门优化路径

---

## 单 Table 架构 vs 多 Table 同步

### 其他方案（被否决）

许多表格库使用 3 个 `<table>` 来实现固定列：左固定表 + 中间表 + 右固定表，通过 JS 同步滚动位置。

### 本项目的选择：单 `<table>` + CSS sticky

```html
<table>
  <tr>
    <td class="vt-fixed-left" style="position:sticky;left:0">固定</td>
    <td>普通列...</td>
    <td class="vt-fixed-right" style="position:sticky;right:0">固定</td>
  </tr>
</table>
```

**优势**：
- 无需同步多个滚动容器（滚动同步有微小延迟会导致抖动）
- DOM 结构更简单，内存开销更小
- 行高自动对齐（同一行在同一个 `<tr>` 中）
- `colgroup` 统一管理所有列宽

**代价**：
- `position: sticky` 有层叠上下文限制（需要正确设置 `z-index`）
- 横向虚拟化需要 padding cell 保持列对齐

---

## 增量搜索 vs 二分查找

滚动时定位 `inViewBegin`（第一个可见行）：

| 方案 | 复杂度 | 适用场景 |
|------|--------|----------|
| 二分查找 | O(log n) | 随机跳转 |
| 从上次位置增量搜索 | O(Δ) | 连续滚动 |

本项目选择**增量搜索**：

- 正常用户滚动每帧移动 1-5 行，Δ 极小
- 避免维护有序前缀和数组（变高行修改高度后需要 O(n) 重建）
- `scrollToIndex` 等跳转使用渐进修正循环而非一次定位

---

## DOM 池复用策略

### 行级池

```
数据 key → <tr> DOM 节点
```

- 行进入窗口：从池中取已有 `<tr>` 或创建新的
- 行离开窗口：从 DOM 移除并从池中删除

**不复用不同 key 的行**（不做 recycle）。原因：

1. 行内可能挂载框架组件（Vue/React），key 变化需要 unmount + remount
2. ResizeObserver 的关联通过 `data-id` 与 key 绑定
3. 自定义 render 函数可能持有行数据引用

### 列级池

横向滚动时，使用 `_ci`（center index）标记复用中间列的 `<td>`：

- 同一列只是滑入/滑出视口，DOM 结构不变
- 减少 `createElement` + `appendChild` 开销

---

## 扁平化而非虚拟隐藏

树形/分组的折叠不使用 `display: none` 或 `visibility: hidden`，而是真正从列表中移除折叠行。

**原因**：VirtListCore 的 `itemsTotalSize` = Σ(所有行高度)。隐藏的行如果仍在列表中，会使滚动条高度虚高，且 `inViewBegin` 计算会跳过不可见行导致偏移量错误。

扁平化是最干净的方案：**VirtListCore 只看到该看到的行，数学计算天然正确**。

---

## 选区的 Merge 扩展

用户选择一个单元格范围后，如果选区与合并单元格相交：

```
用户选区        扩展后
┌───┐          ┌─────┐
│ A │          │     │
│   │     →    │  A  │  ← 包含了 merge 的完整范围
└───┘          │     │
               └─────┘
```

**算法**：迭代扩展

```ts
do {
  expanded = false;
  for (每个 merge) {
    if (merge 与 selection 相交 && merge 未完全包含在 selection 中) {
      扩展 selection 到包含 merge;
      expanded = true;
    }
  }
} while (expanded);
```

**为什么迭代？** 扩展选区可能触及新的 merge，需要继续扩展直到稳定。

---

## 剪贴板双格式

复制时同时写入两种格式：

| 格式 | 用途 |
|------|------|
| `text/plain` (TSV) | 粘贴到 Excel、Google Sheets、其他应用 |
| 自定义 MIME (JSON) | 在应用内粘贴时保留类型、样式、合并信息 |

**为什么不只用 JSON？** 用户期望能从表格复制到 Excel。TSV 是表格应用间的通用协议。

**为什么不只用 TSV？** TSV 丢失了单元格类型（数字 vs 文本）、对齐、合并等元数据。自定义格式保留这些信息用于应用内操作。
