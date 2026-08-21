# 实例方法

`new VirtTable(el, options)` 返回的实例上能调的东西。React / Vue 端通过组件 `ref` 调用同名方法。
插件注入的方法（`exportCsv` / `openSearch` …）见[插件机制](./plugins)。

| 方法                 | 参数                                           | 返回值                                           | 说明                                |
| -------------------- | ---------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| `scrollToIndex`      | `index: number`                                | `void`                                           | 滚动到指定行索引                    |
| `scrollIntoView`     | `index: number`                                | `void`                                           | 将指定行滚动到可视区域              |
| `scrollToTop`        | —                                              | `void`                                           | 滚动到顶部                          |
| `scrollToBottom`     | —                                              | `void`                                           | 滚动到底部                          |
| `scrollToOffset`     | `offset: number`                               | `void`                                           | 滚动到指定像素偏移                  |
| `getOffset`          | —                                              | `number`                                         | 当前纵向偏移量（取代 `clientEl.scrollTop`，后者恒为 `0`） |
| `scrollByY`          | `dy: number`                                   | `void`                                           | 纵向相对滚动，按「用户发起」记账（会触发 `toBottom` 与自动续拉） |
| `scrollToCell`       | `row: number, col: number`                     | `void`                                           | 滚动到指定单元格（纵向 + 横向居中） |
| `reset`              | —                                              | `void`                                           | 重置虚拟滚动状态                    |
| `setList`            | `list: T[]`                                    | `void`                                           | 更新数据源                          |
| `setColumns`         | `columns: VirtTableColumn<T>[]`                | `void`                                           | 更新列配置                          |
| `setMerges`          | `merges: MergeCell[]`                          | `void`                                           | 更新表体合并单元格                  |
| `getMerges`          | —                                              | `MergeCell[]`                                    | 静态合并配置的副本（**不含** `mergeKey` 自动合并） |
| `getEffectiveMerges` | `rowBegin?: number, rowEnd?: number`           | `MergeCell[]`                                    | 区间内实际生效的合并块：静态 + 自动合并的**真实段**（不受渲染窗口裁剪） |
| `getState`           | —                                              | `VirtTableState`                                 | 导出可持久化的视图状态（列宽 / 列序 / 列显隐 / 排序 / 筛选） |
| `setState`           | `state: VirtTableState \| null`                | `boolean`                                        | 应用状态，只应用**出现的**字段；版本不认识时返回 `false` |
| `setHeaderMerges`    | `merges: MergeCell[], headerData?: string[][]` | `void`                                           | 更新表头合并与表头数据              |
| `setFooterData`      | `data: string[][], merges?: MergeCell[]`       | `void`                                           | 更新表尾数据与合并                  |
| `forceUpdate`        | —                                              | `void`                                           | 强制重新渲染                        |
| `setCellRender`      | `rowKey, colKey, config \| null`               | `void`                                           | 单元格级渲染，覆盖列级；`null` 清除 |
| `setCellRenders`     | `Array<{rowKey, colKey, config}>`              | `void`                                           | 批量版，整批写完只刷新一次          |
| `getCellRender`      | `rowKey, colKey`                               | `CellRenderConfig \| undefined`                  | 该格的单元格级配置（不含列级回落）  |
| `resolveCellRender`  | `rowKey, colKey`                               | `CellRenderConfig`                               | 该格**最终生效**的配置（含列级回落）|
| `clearCellRenders`   | `rowKey?`                                      | `void`                                           | 清除一行或全部单元格级配置          |
| `getCheckedRows`     | —                                              | `T[]`                                            | 已勾选的**行数据**，按当前 `list` 过滤 —— 拿不到不在当前页的项 |
| `getCheckedKeys`     | —                                              | `string[]`                                       | 已勾选的**全部 key**，按勾选顺序；服务端分页下提交全部选中项用这个 |
| `setCheckedRows`     | `keys: string[]`                               | `void`                                           | 按 `itemKey` 设置勾选状态           |
| `clearCheckedRows`   | —                                              | `void`                                           | 清除所有勾选                        |
| `setActiveCell`      | `rowKey: string \| null, colKey: string \| null` | `void`                                         | 标记激活态（当前单元格描边），传 `null` 清除；与 `highlightSelectCell` 同一份状态、同一个浮层，没开那个选项也能用 |
| `getActiveCell`      | —                                              | `{ rowKey, colKey } \| null`                     | 当前激活的单元格                    |
| `toggleExpand`       | `rowKey: string`                               | `void`                                           | 切换展开行展开/折叠                 |
| `toggleFold`         | `rowKey: string`                               | `void`                                           | 切换树/分组节点折叠状态（懒节点首次展开会去取子节点）|
| `isFolded`           | `rowKey: string`                               | `boolean`                                        | 该树/分组节点是否折叠（叶子行恒为 `false`）|
| `getGroupConfig`     | —                                              | `GroupSpec[]`                                    | 当前分组层级（拷贝）；未分组时返回 `[]` |
| `setGroupConfig`     | `config: GroupSpec[] \| null`                  | `void`                                           | 运行期换分组维度（「这周按阶段看、下周按负责人看」），`null` / `[]` 取消分组。折叠态按分组路径记，换回来时还在。**不进 `getState()`** —— 那会让状态版本加一、已存的视图全部作废 |
| `expandAll`          | —                                              | `void`                                           | 展开所有展开行/树节点               |
| `collapseAll`        | —                                              | `void`                                           | 折叠所有展开行/树节点               |
| `setColumnFilter`    | `key: string, vals: unknown[]`                 | `void`                                           | 设置指定列的筛选值                  |
| `clearAllFilters`    | —                                              | `void`                                           | 清除所有列筛选                      |
| `getActiveFilters`   | —                                              | `Record<string, unknown[]>`                      | 获取当前生效的筛选条件              |
| `setFilterModel`     | `model: FilterModel`                           | `void`                                           | 应用高级筛选条件树（AND/OR）        |
| `getFilterModel`     | —                                              | `FilterModel`                                    | 获取高级筛选条件树（深拷贝）        |
| `clearFilterModel`   | —                                              | `void`                                           | 仅清空高级筛选                      |
| `hasActiveFilters`   | —                                              | `boolean`                                        | 列头筛选或高级筛选任一生效          |
| `getCellSelection`   | —                                              | `{ startRow, startCol, endRow, endCol } \| null` | 获取当前框选区域                    |
| `clearCellSelection` | —                                              | `void`                                           | 清除框选                            |
| `hideContextMenu`    | —                                              | `void`                                           | 隐藏右键菜单（由 `vtContextMenu` 插件注入）|
| `reload`             | —                                              | `void`                                           | 清空已加载数据并重新取第一批        |
| `refresh`            | —                                              | `void`                                           | 重拉已加载区间，保留滚动位置        |
| `loadMore`           | —                                              | `void`                                           | 手动加载下一批                      |
| `loadPrev`           | —                                              | `void`                                           | 手动加载更早的一批（向上）          |
| `retryLoad`          | —                                              | `void`                                           | 重试上次失败的请求                  |
| `getRemoteState`     | —                                              | `RemoteState \| null`                            | 远程状态快照（未启用时为 `null`）   |
| `setLoadData`        | `loadData`                                     | `void`                                           | 运行时替换取数实现（不自动重取）    |
| `appendRows`         | `rows: T[]`                                    | `void`                                           | 手动追加数据（不清行 DOM 池）       |
| `prependRows`        | `rows: T[]`                                    | `void`                                           | 手动前插数据（含滚动偏移补偿）      |
| `setHasMore`         | `hasMore: boolean, dir?: 'down' \| 'up'`       | `void`                                           | 手动模式下控制触发闸门与状态条      |
| `setCursor`          | `cursor: string \| null, dir?: 'down' \| 'up'` | `void`                                           | 手动模式下推进游标                  |
| `loadChildrenFor`    | `rowKey: string`                               | `void`                                           | 主动取某树节点的子节点              |
| `resetLazyNode`      | `rowKey: string, clearChildren = true`         | `void`                                           | 清掉该节点懒加载缓存，下次展开重取  |
| `moveRowTo`          | `sourceKey: string, target: RowDropTarget`     | `boolean`                                        | 把行移到某父级下、某兄弟之后，见[行拖拽](#行拖拽)|
| `canDropRow`         | `sourceKey: string, target: RowDropTarget`     | `boolean`                                        | 这个落点能不能放（只判定不改数据）  |
| `moveRow`            | `fromKey: string, toKey: string, insertAfter: boolean` | `boolean`                                 | 把行移到目标行前/后（`moveRowTo` 的薄包装）|
| `canReorderRows`     | —                                              | `boolean`                                        | 当前行序能不能拖（排序/筛选/自动合并下为 `false`）|
| `destroy`            | —                                              | `void`                                           | 销毁实例，释放 DOM 与事件监听       |

## 行拖拽

落点用「**父级 + 前一个兄弟**」表达，而不是「目标行的前/后」—— 后者在树里说不出「是它的
子节点还是它的兄弟」。手势那一层在 [`vtRowDrag`](./plugins#vtrowdrag-options) 插件里。

```ts
interface RowDropTarget {
  /** 数据行 = 成为它的子节点；分组行 = 落进该分组；null / 省略 = 根层 */
  parentKey?: string | null;
  /** 落在这个兄弟**之后**；null / 省略 = 落到该父级下的第一个 */
  prevKey?: string | null;
}

interface RowMoveDetail<T> {
  row: T;              // 被移动的行（落进分组时它的分组字段已被改写）
  parentRow: T | null; // 新父行；分组行也算；根层为 null
  prevRow: T | null;   // 落点前一个兄弟
  list: T[];           // 移动后的完整原始列表
}
```

| 落点 | 结果 |
| --- | --- |
| `parentKey` 是数据行 | 成为它的子节点（叶子行也行，它会因此长出 `children` 与展开箭头，并自动展开）|
| `parentKey` 是分组行 | 落进该分组：按分组行的分组路径把行上**每一层**的分组字段改写成对应值。多级分组会整条路径一起改 |
| `parentKey` 为空 | 根层。`groupConfig` 生效时会按 `prevKey` 那行所属的分组同步字段，保证「指示线画在哪就落在哪」|

分组字段**只改被移动的那一行**，不递归到它的后代 —— 后代不参与分组（分组只作用于根行），
而静默改写整棵子树的数据太重。需要级联时在 `onRowMove` 里自己做。

以下情况一律放不下（`canDropRow` 返回 `false`，`moveRowTo` 返回 `false` 且不改数据）：
拖到自己身上或自己的子树里、拖回原处、没有 `type:'tree'` 列却想「成为子节点」、
分组表里落到第一个分组之前（那里没有对应的分组）。

## 实例属性

| 属性             | 类型              | 说明                   |
| ---------------- | ----------------- | ---------------------- |
| `core`           | `VirtListCore<T>` | 底层虚拟滚动内核实例   |
| `state`          | `ListState`       | 当前虚拟滚动响应式状态 |
| `leftFixedCount` | `number`          | 左侧固定列数量         |

## 滚动模型（自绘滚动条）

纵向由 JS 掌管、横向保留原生 scrollport，两条滚动条都是自绘浮层。三条与原生表格不同的地方
（`scroll` 事件载荷是 `VirtScrollEvent`、`clientEl.scrollTop` 恒为 `0`、`rangeUpdate` 由表格派生）
见[滚动模型](/vanilla/examples/advanced/scroll-model)。

| 轴 | 位置来源 | 滚动条 |
| --- | --- | --- |
| 纵向 | `@virt-list/core` 的偏移量 + 表体残差 `top` | 自绘，按**行索引**映射 |
| 横向 | 原生 `scrollLeft`（`overflow-x: auto`） | 自绘，按**像素**映射、驱动原生 |
