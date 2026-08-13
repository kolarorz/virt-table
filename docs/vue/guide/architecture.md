# 架构设计

## 整体分层

```
┌─────────────────────────────────────────────┐
│            Vue / React 适配层               │
│  (VNode/JSX → DOM 桥接, 生命周期管理)        │
├─────────────────────────────────────────────┤
│           VirtTable (vanilla)               │
│  列管理 | 合并算法 | 固定列 | 横向虚拟化      │
│  树形/分组/展开 | 选区 | 剪贴板 | DOM patch   │
├─────────────────────────────────────────────┤
│            VirtListCore                     │
│  纵向虚拟滚动引擎 (框架无关, 不操作DOM)       │
└─────────────────────────────────────────────┘
```

### 为什么这样分层？

**VirtListCore 只管一维**：纵向列表的滚动窗口计算是通用的，和表格的二维特性无关。提取为独立层后可被其他组件复用，且经过充分测试。

**VirtTable 做所有 2D 逻辑**：列管理、合并单元格、固定列、横向虚拟化——这些都是表格特有的。统一在一层实现意味着 Vue 和 React 不需要各自维护一套。

**适配层只做桥接**：将框架的 VNode/JSX 挂载到 vanilla 创建的 DOM 容器内；在行离开 DOM 池时清理框架组件树。

---

## 纵向虚拟滚动

### 核心状态

```ts
interface ListState {
  itemsTotalSize: number;    // 所有行高度总和 → 控制滚动条高度
  leadingSize: number;      // renderBegin 之前的累积高度 → 顶部占位
  inViewBegin: number;      // 视口内第一行
  inViewEnd: number;        // 视口内最后一行
  renderBegin: number;      // 实际渲染起始 (inView - buffer)
  renderEnd: number;        // 实际渲染结束 (inView + buffer)
}
```

### 双层窗口设计

```
                  ┌─────────────────┐
                  │   bufferTop     │  ← renderBegin
                  ├─────────────────┤
                  │                 │  ← inViewBegin
                  │    viewport     │
                  │                 │  ← inViewEnd
                  ├─────────────────┤
                  │   bufferBottom  │  ← renderEnd
                  └─────────────────┘
```

- **inView 窗口**：视口内实际可见的行
- **render 窗口**：inView ± buffer，预渲染一部分缓冲行

缓冲行的意义：快速滚动时，已经在 DOM 中的缓冲行可以立即进入视口，避免白屏闪烁。

### 滚动时的范围计算 (`_calcRange`)

不使用全量二分查找，而是**从上次 inViewBegin 出发做增量搜索**：

```
向下滚动(forward)：
  从当前 inViewBegin 向后遍历，累加行高
  直到 offset 落入某行范围内 → 新的 inViewBegin

向上滚动(backward)：
  从当前 inViewBegin 向前遍历，减去行高
  直到 offset 落入某行范围内 → 新的 inViewBegin
```

**复杂度**：典型滚动下 O(buffer)，只有大跳转才退化为 O(n)。

### leadingSize 的增量更新

`leadingSize` = renderBegin 之前所有行的高度和。每次 `renderBegin` 变化时增量更新（加/减移出/移入行的高度），避免每帧 O(n) 重算。

### 变高行的测量与修正

```
1. 行首次渲染 → 使用 estimatedSize 占位
2. ResizeObserver 回调 → 记录实测高度到 sizesMap
3. 下次滚动计算使用实测高度
4. scrollToIndex 使用渐进修正循环（测量→调整→再测量）
```

---

## 横向虚拟化

### 列分区

```
┌──────────┬─────────────────────────┬──────────┐
│ leftFixed│      center (虚拟化)      │rightFixed│
│  sticky  │  只渲染可视列+buffer     │  sticky  │
└──────────┴─────────────────────────┴──────────┘
```

列在初始化时被分为三组：
- **leftFixed** — `fixed: 'left'`，始终渲染
- **center** — 无 fixed，横向虚拟化
- **rightFixed** — `fixed: 'right'`，始终渲染

### 列范围计算 (`_calcColRange`)

```ts
effectiveViewWidth = clientWidth - leftFixedWidth - rightFixedWidth
viewRight = scrollLeft + effectiveViewWidth

begin = 第一个 prefixSum[i+1] > scrollLeft 的列
end   = 最后一个 prefixSum[i] < viewRight 的列
```

使用列宽前缀和数组 `_colPrefixSums` 实现 O(1) 查找。

### 行内 DOM 结构

```
<tr>
  [左固定列 × L]
  [左pad td: colspan=renderColBegin]
  [可见中间列...]
  [右pad td: colspan=totalCenter-renderColEnd-1]
  [右固定列 × R]
  [高度td: width=0]
</tr>
```

**padding cell** 是不可见的 `<td>`，通过 `colspan` 占据不在视口的列宽，保证 `<colgroup>` 对齐。

### 固定列实现

使用 CSS `position: sticky` + 计算偏移量：

```css
td.vt-fixed-left { position: sticky; left: ${offset}px; }
td.vt-fixed-right { position: sticky; right: ${offset}px; }
```

**优势**：一个 `<table>` 内完成所有列，不需要同步多个滚动区域。

---

## 增量 DOM 更新 (`_patch`)

### 行级 DOM 池

```ts
_itemPool: Map<rowKey, HTMLTableRowElement>  // key → 复用的 <tr>
```

当 VirtListCore 触发 `update(renderList, state)` 事件：

1. **删除** — 离开 render 窗口的行从池中移除，触发 `onRowRemoved`
2. **复用** — 如果行 key 在池中已有 `<tr>`，直接复用
3. **创建** — 新进入窗口的行创建新 `<tr>`
4. **排序** — 通过 `insertBefore` 调整 DOM 顺序，保证与数据顺序一致

### 列级增量更新 (`_updateCenterCells`)

横向滚动时，只更新行内的中间列部分：

1. 计算新的 `planRowCells`（哪些列需要渲染）
2. 通过 `_ci`（center index）标记复用现有 `<td>`
3. 移除不再可见的 `<td>`，创建新进入视口的 `<td>`
4. 固定列和高度 td 不动

**设计考量**：固定列内的 render 函数可能挂载了框架组件或事件监听器，每次横向滚动都重建会造成不必要的开销和状态丢失。

---

## 树形 / 分组 / 展开

### 统一模型：扁平化

三种模式共享同一设计：**将层级结构转为扁平列表，VirtListCore 只看到一维数组**。

```
原始树形数据                    扁平化后
├─ 工程部                      [ 工程部(group),
│  ├─ 前端组                     前端组(group),
│  │  ├─ 张三                    张三,
│  │  └─ 李四                    李四,
│  └─ 后端组                     后端组(group),
│     └─ 王五                    王五,
└─ 设计部                        设计部(group),
   └─ 赵六                       赵六 ]
```

### 折叠/展开

```ts
_foldMap: Record<string, boolean>  // key → 是否折叠
```

切换折叠状态 → 重新扁平化 → 更新 VirtListCore 的 list。

展开行使用独立的 `_expandMap`，插入合成行（`_rowType: 'expand'`）。

**为什么不用虚拟的 display:none？** 因为 VirtListCore 的尺寸计算依赖列表长度。隐藏行仍会占据滚动空间，导致虚拟滚动计算错误。必须真正从列表中移除。
