# React 多级分组表头 / 表尾

给列配置 `children` 即可得到多级分组表头：带 `children` 的节点是**分组节点**（自身不承载数据，只在表头占一格并横跨其全部叶子后代），不带 `children` 的叶子才是真正的数据列。嵌套层数不限，表头行数 = 列树深度。

## 示例

<PlaygroundHost framework="react" example-id="react-header-group" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/basic/HeaderGroup.tsx
:::

## 说明

开了 `showSummary`（或给节点配 `footerValue` / `renderFooter`）后，**表尾也按同一棵列树渲染成多级分组表尾**。

**表头、表尾与表体一起做横向虚拟化**：只渲染视口内的叶子列，跨越视口边界的分组格会被裁剪到视口内，视口外的整段列折叠成一个贯通表头高度的留白格。因此几十上百列的分组表头滚动依然流畅。

## 要点

- **`fixed` 写在分组上**，会强制下发给所有后代（保证分组格与它的叶子落在同一冻结区段）；不要在分组内的单个子列上单独设 `fixed`。
- **数据相关配置写在叶子列上**：`render` / `sortable` / `filters` / `resizable` / `type` 等。分组节点只需要 `title`（或 `renderHeader`）。
- 分组节点的 `width` 可以写 `0`：它的宽度恒等于可见子列宽度之和。
- 与手写多行表头（`headerData` / `headerMerges`）**互斥**——配置了 `children` 时后者被忽略并给出告警。
- 列显隐按树生效：隐藏叶子会让父分组自动收窄，隐藏分组等于隐藏其全部叶子；某分组的子列全被隐藏时整组消失。
- **分组格恒为单行**（`white-space: nowrap`），超出部分裁掉、完整内容挂在原生 `title` 上。原因：横向虚拟化会把跨视口的分组格 colspan 裁窄，若允许折行则行高会随滚动变化，sticky 的表头/表尾就会抖动。
- **分组标签横向跟随**：中间段的分组格把内容放进一层 `.vt-group-label`（`position: sticky`）。分组比可见区宽时标签被钉在可见区并居中、滚动中完全不动；分组窄于可见区时退化为格内居中。由 CSS sticky 在合成器逐帧完成，主线程零开销。左右冻结段的分组格本身已冻结在视口内，不套此内层。
- 列拖拽排序（`columnDraggable`）在分组表头下**只允许同一父分组内换位**，跨分组拖拽会被忽略。

## 分组标签为什么要 sticky

分组格的 colspan 会被列窗口裁剪，而**裁剪按整列取整、滚动按像素**。若直接在格子里
`text-align: center`，标签会一边随内容匀速漂移、一边在跨列时跳半个列宽（实测在 900px 视口下
于屏幕中心附近 ±27px 反复蹭）。

把标签交给 CSS sticky 后：

```
left  = var(--vt-fixed-left-w)                       左冻结区宽度
width = min(100%, var(--vt-center-view-w))           min(本格宽, 可见中间区宽)
```

两个变量由表格在**容器尺寸 / 列宽变化时**写到 `.vt-root` 上（不随滚动更新），逐像素的跟随
全部交给浏览器 —— 合成器逐帧完成，主线程零开销。

- **分组盖满可见区**（常见情形，也是真正需要读标签的时候）：标签钉在可见区居中，滚动中位移 **0px**。
- **分组正在滑出视口**：标签随内容 1:1 平滑左移；但此时标签宽度取自被裁剪的格子宽，仍会在每次有列
  离开渲染窗口时跳半个列宽（120px 列宽下约 50px）。此刻分组已大半滑出屏幕，观感影响远小于改动前。
  彻底消掉需要在每个滚动帧用 JS 重算标签几何，代价是把这份工作搬回主线程。
- 冻结段的分组格不套此内层（它本身就冻结在视口内，`left` 偏移反而会把标签推出格子）。

## 多级分组表尾

表尾与表头**同序**（最外层分组在上、叶子小计在下），网格与表头逐行一致，因此复用同一份表头网格与同一套横向虚拟化裁剪规则——列很多时表尾也只渲染视口内的列。

**启用条件**：列树里有分组节点，并且表尾有内容来源——开了 `showSummary`，或任一节点配了 `footerValue` / `renderFooter`。否则退回 `footerData` / `footerMerges` 的扁平表尾（两者互斥）。

**每格内容优先级**：`renderFooter` > `footerValue` > `summary`/`summaryMethod` 自动聚合 > 合计标签（仅整表首列的叶子格）> 空。

**分组格聚合语义**：把该格覆盖的**全部叶子列 × 全部行**的原始值摊平成一维 `values`，再交给 `summaryMethod`（优先）或内置 `summary`。因此 `count` 在分组格上统计的是摊平后的单元格数而非行数。聚合始终基于当前视图（筛选/排序后），数据变化自动重算。

```ts
{ key: 'y2024', title: '2024 年', width: 0,
  summary: 'sum',                      // 分组：聚合旗下全部叶子列
  children: [
    { key: 'q1_rev', title: 'Q1 营收', width: 110, summary: 'sum' },
    { key: 'q1_rate', title: 'Q1 毛利率', width: 110, footerValue: '—' },
  ]}
```

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.children` | 配它即成为分组节点（`width` 可填 `0`） | [多级分组表头与表尾](/vanilla/api/group-header#多级分组表头) |
| `col.fixed`（写在分组上） | 强制下发给全部后代 | [多级分组表头与表尾](/vanilla/api/group-header#多级分组表头) |
| `col.footerValue` / `renderFooter` / `summary` / `summaryMethod` | 表尾每格的内容来源与优先级 | [多级分组表尾](/vanilla/api/group-header#多级分组表尾) |
| `getHeaderDepth` / `getLeafColumns` / `getVisibleColumns` / `getAllColumns` | 四种读列口径 | [实例方法](/vanilla/api/instance) |
| `options.colBuffer` | 横向虚拟化的缓冲列数 | [表格配置](/vanilla/api/table#virttableoptions) |
| `FooterRenderContext` | `renderFooter` 拿到的上下文 | [类型定义](/vanilla/api/types) |

> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
