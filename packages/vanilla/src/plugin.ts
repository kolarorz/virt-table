/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CellRenderConfig,
  GroupSpec,
  RowDropTarget,
  VirtTableColumn,
  VirtTableOptions,
  VirtTableState,
} from './index';
import type { MergeCell } from './merge';
import type { VirtTableLocale } from './locale';

/**
 * 插件机制：把「可选的 UI / 交互层」从 VirtTable 主类里搬出去，实现按需引入与 tree-shaking。
 *
 * 边界（重要）：
 * - **核心负责**行/列双向虚拟化、固定列、合并单元格、thead/tfoot 渲染、行 DOM 池、
 *   数据管线枢纽 `_rebuildData`。这些不做插件——它们互相耦合，且人人都要。
 * - **插件负责**独立的浮层与交互：右键菜单、搜索、框选、剪贴板、分页条、导出…
 *   判定标准是「有清晰的 setup/destroy 边界，且依赖面收敛在 PluginContext 内」。
 *
 * 插件只能通过 `PluginContext` 触达宿主，不允许访问 VirtTable 的私有成员——
 * 这层收敛是插件机制的成败点：一旦发布，`PluginContext` 就是公共 API。
 */

/** 行 DOM 上挂的行数据（由核心的 _rowDataMap 提供） */
export interface PluginRowData<T> {
  item: T;
  rowIndex: number;
}

/**
 * 插件可调用的宿主公共方法白名单。
 *
 * 用接口而非直接给出 VirtTable 实例，是为了显式收敛暴露面：
 * VirtTable 类天然满足这个结构，插件却只能看见这里列出的方法。
 */
export interface VirtTableHost<T extends Record<string, any> = any> {
  // ---- 滚动 ----
  scrollToIndex(index: number): void;
  scrollIntoView(index: number): void;
  scrollToTop(): void;
  scrollToBottom(): void;
  scrollToOffset(offset: number): void;
  scrollToCell(rowIndex: number, colIndex: number): void;
  /** 当前纵向偏移量（新模型下取代了 `clientEl.scrollTop`，后者恒为 0） */
  getOffset(): number;
  /**
   * 纵向相对滚动，语义是「**用户**动的」：会触发 toTop / toBottom 与自动续拉。
   *
   * 拖拽到边缘的自动滚动用它 —— 那确实是用户意图，且拖到底部时应该把下一页拉进来。
   * 纯程序化定位仍走 `scrollToOffset`。
   */
  scrollByY(dy: number): void;
  /**
   * 当前横向偏移量。与 `getOffset()`（纵向）成对。
   *
   * 横向仍是原生 `scrollLeft`，插件本可以自己读 `ctx.clientEl.scrollLeft`；给一个
   * 具名读取口是为了让「横向位移由什么承载」保持可替换 —— 哪天横向也改成 JS 位移，
   * 换的是这里的实现，而不是每个插件。
   */
  getScrollLeft(): number;
  /**
   * 横向相对滚动。拖拽（框选、甘特条改期）到左右边缘时的自动滚动用它。
   *
   * 与 `scrollByY` 不同，横向没有「续拉下一页」的语义，就是纯位移。
   */
  scrollByX(dx: number): void;
  // ---- 数据 ----
  setList(list: T[]): void;
  /**
   * 追加 / 前插行。走 `_rebuildData({ keepPool: true })`，已渲染的行 DOM 不重建；
   * `prependRows` 另带滚动补偿（否则加载历史数据后视口会跳到新内容顶部）。
   *
   * `vtAIStream` 用 `appendRows` 落每一批流式数据。
   */
  appendRows(rows: T[]): void;
  prependRows(rows: T[]): void;
  forceUpdate(): void;
  // ---- 列 ----
  /** 整体替换列树。`vtAIStream` 的 `autoColumns` 用它落推断出来的列 */
  setColumns(columns: VirtTableColumn<T>[]): void;
  setColumnVisible(colKey: string, visible: boolean): void;
  getVisibleColumns(): VirtTableColumn<T>[];
  getAllColumns(): VirtTableColumn<T>[];
  getLeafColumns(): VirtTableColumn<T>[];
  /**
   * 列/行重排。留在核心：`moveColumn` 依赖 `_allColumns` 列树与 `setColumns` 重建流程，
   * `moveRowTo` 依赖 `_originList` 的 children 结构、`_foldMap` 与数据管线。
   * `vtColumnDrag` / `vtRowDrag` 只负责手势、ghost、落点指示线与落点归约。
   */
  moveColumn(fromKey: string, toKey: string, insertAfter: boolean): boolean;
  /** 把行移到目标行的前/后（`moveRowTo` 的薄包装，扁平表的老签名） */
  moveRow(fromKey: string, toKey: string, insertAfter: boolean): boolean;
  /**
   * 把行移到「某个父级下、某个兄弟之后」——**行拖拽落数据的正路**。
   * 父级可以是数据行（成为子节点）、分组行（落进该分组，核心改写分组字段）或空（根层）。
   */
  moveRowTo(sourceKey: string, target: RowDropTarget): boolean;
  /** 这个落点能不能放（只判定不改数据；「拖回原处」也算放不下）。用来决定指示线画不画 */
  canDropRow(sourceKey: string, target: RowDropTarget): boolean;
  /** 当前行序是否可拖拽重排（排序/筛选/自动合并下为 false；树形与分组是支持的） */
  canReorderRows(): boolean;

  // ---- 行高 ----
  /**
   * 运行时改行高（`vtRowHeightConfig` 的三档落在这条上）。留在核心的理由是它要同时动
   * **三处**：使用方那份 `estimatedSize`、虚拟化账本里的热快照、以及总高重算 ——
   * 后两处都在核心私有面里。插件只管「哪三档、界面长什么样」。
   */
  setRowHeight(size: number): void;
  /** 当前行高（`fixedSize` 下即每行实际高度，否则是未测量行的估算值） */
  getRowHeight(): number;

  // ---- 树 / 分组折叠 ----
  /**
   * 切换树 / 分组节点的折叠态。留在核心：它还串着懒加载（首次展开会去取 children）。
   * `vtRowDrag` 悬停在折叠节点上一会儿就自动展开，走的是这条 —— 直接写折叠表会漏掉取数。
   */
  toggleFold(rowKey: string): void;
  /** 该节点当前是否折叠（叶子行恒为 false） */
  isFolded(rowKey: string): boolean;
  // ---- 选择 ----
  getCheckedRows(): T[];

  // ---- 激活态（当前单元格描边） ----
  /**
   * 标记 / 清除当前单元格（`.vt-active-cell-overlay`）。留在核心是因为它与
   * `highlightSelectCell` 是**同一份状态、同一个浮层**：插件另画一份就成了两套
   * 「当前单元格」，同时开着会叠出两层框。
   *
   * `vtCellEditor` 用它把「正在编辑 / 刚编辑完的那一格」标出来 —— 编辑浮层关掉后
   * 描边还在，用户才知道刚改的是哪一格。
   */
  setActiveCell(rowKey: string | null, colKey: string | null): void;
  /** 当前激活的单元格；未激活时返回 null */
  getActiveCell(): { rowKey: string; colKey: string } | null;

  // ---- 单元格几何 ----
  /**
   * 这几个留在核心而不进 `vtCellSelection` 插件：它们依赖列虚拟化的内部状态
   * （列宽前缀和、固定列偏移与宽度、行 DOM 映射），搬进插件就得把那批私有几何
   * 全部暴露出去。**选区状态与 overlay 在插件，几何换算在核心**。
   */
  /** 屏幕坐标 → 单元格坐标；不在可选列/不在数据行上时返回 null */
  cellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null;
  /** 可参与框选/复制的列索引（跳过序号等功能列） */
  getSelectableColumnIndexes(): number[];
  /** 把选区按合并单元格向外扩张成完整矩形（无 merges 时原样返回） */
  expandSelectionForMerges(range: CellSelectionRange): CellSelectionRange;
  /** 选区在 `.vt-client` 内的像素矩形；选区行都不在渲染窗口内时返回 null */
  getSelectionRect(range: CellSelectionRange): SelectionRect | null;
  /**
   * 列区间 `[startCol, endCol]` 的横向像素范围（`.vt-client` **内容坐标**，
   * 与 `getSelectionRect().left` 同基准）。列索引超界时返回 null。
   *
   * 与 `getSelectionRect` 的关键差别：**不依赖渲染窗口**，纯列宽前缀和算术，
   * 因此横向窗口外的列也算得出来。甘特的条形要横跨几十个时间桶（多数不在窗口内），
   * 图表浮层要对齐到具体列，都只能走这条。
   *
   * 返回值已含列宽拉伸系数（列宽之和窄于容器时核心会等比放大列），
   * 所以调用方不需要知道 `_widthScale` 的存在。
   */
  getColumnRange(startCol: number, endCol: number): ColumnRange | null;
  /**
   * 当前渲染窗口内所有数据行的纵向位置，按 `rowIndex` 升序。
   *
   * 一次 `querySelectorAll` + 每行一次 `getBoundingClientRect`。**要按行摆浮层就用它**，
   * 不要对每一行分别调 `getSelectionRect` —— 那是每行一次全表查询 + 一次强制布局，
   * 在每帧都要重摆 N 个浮层的场景（甘特条、多人光标）会直接吃掉帧预算。
   */
  getRenderedRowRects(): RowRect[];
  /**
   * 单行的纵向位置。**渲染窗口外的行也返回值**（按已渲染行做锚点、用行位置账本外推），
   * 列表为空或一行都没渲染时才返回 null。
   *
   * 这是它与 `getSelectionRect` 的分工：那个用于「选区浮层」，行不在窗口内就该隐藏，
   * 所以返回 null 是对的；而依赖箭头的另一端经常在窗口外，箭头仍要画出去、被容器裁掉，
   * 拿不到坐标就画不成。
   *
   * ⚠️ 不定高模式下，未被测量过的行只能按 `estimatedSize` 估算，越远越不准。
   * 需要精确几何的场景（甘特）应当用固定行高。
   */
  getRowRect(rowIndex: number): RowRect | null;

  // ---- 查询状态 ----
  /**
   * 列头筛选。`_activeFilters` 与谓词留核心（是查询状态，会进 `RemoteQuery.filters`），
   * `vtColumnFilter` 插件只负责表头图标与下拉面板 UI。
   */
  setColumnFilter(colKey: string, values: unknown[]): void;
  getActiveFilters(): Record<string, unknown[]>;

  /**
   * 搜索词。它是**查询状态**（与排序/筛选同级，会进 `RemoteQuery.search` 参与服务端取数），
   * 因此留在核心；搜索框 UI 与命中高亮才是 `vtSearch` 插件的职责。
   *
   * 注意：设置它不会自动触发重新取数（与既有行为一致），需要时自行调 `reload()`。
   */
  setSearchTerm(term: string): void;
  getSearchTerm(): string;

  /**
   * 分组维度的读写。**这是「换个维度看」唯一的运行期入口** —— `groupConfig` 本身只是构造期
   * option，插件（`@virt-table-pro/gantt` 工具栏的「分组」按钮）没法在 `new VirtTable` 那一刻
   * 参与决定它。
   *
   * 刻意**不合进 `setState`**：分组不在 `VirtTableState` 里（进去就得把 `version` 加一，
   * 已存的视图会全部作废），详见 `VirtTable.setGroupConfig` 的注释。
   */
  getGroupConfig(): GroupSpec[];
  setGroupConfig(config: GroupSpec[] | null | undefined): void;

  /**
   * 视图状态的读写。它们是**查询状态的统一入口**（列宽/列序/显隐/排序/两套筛选/分页
   * 一次批量提交），插件想整体改查询就该走这里，而不是拼几个单独的 setter ——
   * 后者会触发 N 次列重建与管线重算。
   *
   * `vtAIQuery` 用它把自然语言解析出的查询一次性落地，并在应用前存一份快照做撤销。
   */
  getState(): VirtTableState;
  setState(state: VirtTableState | null | undefined): boolean;

  // ---- 合并单元格 ----
  /**
   * 静态合并配置（`options.merges` / `setMerges()` 传入的那份），返回副本。
   *
   * **不含**列 `mergeKey` 产出的自动合并 —— 那部分是派生状态、跨度随数据变。
   * 要还原「用户看到的合并结构」用 `getEffectiveMerges()`。
   */
  getMerges(): MergeCell[];
  /**
   * 指定行区间内**实际生效**的合并块：静态 `merges` + 自动合并解析出的真实段。
   *
   * 给的是段的**真实起止**，不受渲染窗口影响 —— 这正是导出需要的：xlsx 里的
   * `<mergeCells>` 描述整张表，而渲染裁剪出的那份只描述当前一屏。
   *
   * 坐标系与 `options.merges` 一致：`rowIndex` 是显示列表（树形展开后）的行号，
   * `colIndex` 是**非固定列**中的列号。
   *
   * 不传区间则覆盖整份显示列表 —— 自动合并的段数与行数同阶，百万行会产出十万级
   * 数组，按需传区间。
   */
  getEffectiveMerges(rowBegin?: number, rowEnd?: number): MergeCell[];
  /**
   * 整体替换静态合并配置。
   *
   * 给「把行集整个换掉」的插件用：合并坐标是按**显示行号**定义的，换了行集之后原来那份
   * 指向的行已经不存在了 —— 不清掉的话表上会浮着一批位置毫无意义的合并格。
   * `@virt-table-pro/pivot` 在开启透视时把它存一份并清空，关掉透视时原样还回去。
   *
   * 传空数组 = 没有静态合并（列上的 `mergeKey` 自动合并不受影响，那是列配置）。
   */
  setMerges(merges: MergeCell[]): void;

  /**
   * 源数据的行数 —— **筛选、搜索、分页之前**的那一份。
   *
   * `ctx.getList()` 给的是管线出口（筛完排完展开完的展示列表），而
   * `getOptions().list` **不能**当源数据用：核心会把它改写成展示列表交给虚拟滚动，
   * 筛掉一半之后读它拿到的是筛后的长度（`@virt-table-pro/status-bar` 就是在这上面踩了一次，
   * 「总行数」跟着筛选一起变了）。
   *
   * 只给数量不给数组：源数据是使用方的引用，交出去等于允许插件就地改它 ——
   * 而管线的唯一数据源就是它，改了之后表格的状态与使用方手里那份会静默分叉。
   * 真要遍历源数据的插件请自己持有传进来的那份（`transformSourceRows` 的入参就是它）。
   */
  getSourceRowCount(): number;
  /** 源行主键副本，包含树子节点及不可见的源行。 */
  getSourceRowKeys(): string[];
}

export interface CellSelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** 选区拍平结果：`rows[i][j]` 对应 `columnIndexes[j]` 列 */
export interface SelectionRows {
  selection: CellSelectionRange;
  columnIndexes: number[];
  rows: string[][];
}

/** `.vt-client` 内的像素矩形 */
export interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** 列区间的横向像素范围（`.vt-client` 内容坐标，含列宽拉伸系数） */
export interface ColumnRange {
  left: number;
  width: number;
}

/**
 * 一行的纵向位置。`top` 相对 `.vt-client` **可视区上缘**（纵向 `scrollTop` 恒为 0，
 * 所以它同时也是内容坐标），与 `SelectionRect.top` 同基准。
 */
export interface RowRect {
  rowIndex: number;
  top: number;
  height: number;
}

/**
 * `vtCellSelection` 通过 `provide('cellSelection')` 暴露的服务。
 *
 * 消费方：`vtClipboard`（复制/粘贴范围）、`vtExport`（导出选区）、
 * `vtKeyboardNav`（焦点位置）、`vtContextMenu`（菜单上下文的 selection 字段）。
 * 用 `ctx.inject<CellSelectionService>('cellSelection')` 取用，未装载时为 undefined。
 */
export interface CellSelectionService {
  /** 当前选区（已按合并单元格扩张）；无选区时 null */
  getSelection(): CellSelectionRange | null;
  /** 设置选区并重绘 overlay；传 null 等价于 clearSelection */
  setSelection(range: CellSelectionRange | null): void;
  clearSelection(): void;
  /** 当前选区拍平成二维字符串（复制与「导出选区」共用） */
  buildSelectionRows(): SelectionRows | null;
  /** 重绘 overlay（数据/滚动/列几何变化后） */
  refresh(): void;
  /**
   * 订阅选区变化，返回退订函数。触发时机与 `onChange` 完全相同
   * （拖选结束、程序化 `setSelection`、`clearSelection`）。
   *
   * 与 `options.onChange` / `options.onCellSelectionChange` 的区别是**多消费者**：
   * 那两处各只有一个槽位、后者还会被前者顶掉，所以只适合使用方自己用。插件想跟着
   * 选区更新（状态栏的选区聚合、跟随选区的图表）必须走这一条，否则装两个就会互相抢掉回调。
   *
   * 订阅者抛异常会被吞掉并 `console.warn` —— 一个消费者写崩了不该连带让选区功能失灵。
   */
  subscribe(listener: (range: CellSelectionRange | null) => void): () => void;
}

/**
 * 生命周期钩子。插件在 `setup` 里通过 `ctx.on(...)` 注册，可注册多个同名钩子。
 *
 * 性能约定：`onRowCreated` / `onCellRendered` / `onHeaderCellRendered` 位于渲染热路径，
 * 无插件注册时核心不产生任何额外开销（运行时按数组长度短路）。注册了就要自觉写得快——
 * 别在里面做 DOM 查询或布局读取。
 */
export interface PluginHooks<T extends Record<string, any> = any> {
  /** 全部插件 setup 完成、首帧渲染就绪后触发（构造函数末尾） */
  onMounted?: () => void;
  /** 行 DOM 创建完成（虚拟滚动复用行时不会重复触发，重建才触发） */
  onRowCreated?: (tr: HTMLTableRowElement, item: T, rowIndex: number) => void;
  /** 数据单元格内容填充完成 */
  onCellRendered?: (
    td: HTMLTableCellElement,
    column: VirtTableColumn<T>,
    item: T,
    rowIndex: number,
  ) => void;
  /** 表头单元格内容填充完成（headerRow 为 0 基行号，扁平表头恒为 0） */
  onHeaderCellRendered?: (
    th: HTMLTableCellElement,
    column: VirtTableColumn<T>,
    headerRow: number,
  ) => void;
  /**
   * 一帧渲染完成（`_patch` 末尾）。行 DOM 与位置此刻都已就位，
   * 适合重绘依赖行几何的浮层（选区框、焦点框）。
   *
   * 与 `onRowCreated` 的区别：那个是单行级、只在新建行时触发；
   * 这个是整帧级，行复用/位移也会触发。
   */
  onRendered?: () => void;
  /** 数据管线重建完成（换数据/排序/筛选/折叠展开都会触发） */
  onDataChanged?: (list: T[]) => void;
  /** 勾选状态变化（单行、全选及命令式 API）；不占用用户回调。 */
  onCheckedRowsChanged?: (keys: readonly string[]) => void;
  /**
   * ⚠️ **钩子表里唯一有返回值的一条** —— 其余全是通知，这个是**变换**。
   *
   * 在数据管线的**最前面**把源行集换成别的：返回值取代 `_originList`，之后的
   * 筛选 → 排序 → 分页 → 聚合 → 结构展开全部作用在返回值上。
   *
   * ```
   * _originList → [transformSourceRows] → 筛选 → 排序 → 分页 → 聚合 → 结构展开 → 提交
   * ```
   *
   * ## 为什么位置在最前面
   *
   * 真正需要它的是「把明细行换成另一种行」的插件（`@virt-table-pro/pivot` 把明细换成
   * 透视结果）。这类插件**同时会换掉列**，而筛选与排序的谓词是照**当前列**建的 ——
   * 换列之后再筛明细行就是拿透视列的谓词去问明细行，那没有意义。所以变换必须先跑完，
   * 之后的查询阶段面对的是同一套列与同一批行。
   *
   * 代价要如实知道：**源数据级的筛选走不了列头筛选**了（列头筛选此时作用在变换结果上）。
   * 需要「只统计已完成的订单」这种就在变换里自己筛，或者先筛好数组再 `setList`。
   *
   * ## 三条约定
   *
   * 1. **不要改传进来的数组**，也不要改里面的行对象。那是使用方的数据，
   *    核心自己从头到尾没碰过它。要变形就返回新数组。
   * 2. **返回值可以是树**（行带 `children`）—— 但只有在某一列配了 `type: 'tree'`
   *    时核心才会展开它并给折叠箭头。透视要复用折叠展开就得自己把那一列配上。
   * 3. **每次 `_rebuildData` 都会调**（折叠一下、排一次序都算）。所以贵的计算
   *    必须自己按「入参数组引用 + 自己的配置」记缓存，否则十万行会在每次折叠时重算一遍。
   *
   * 多个插件按注册顺序串联（前一个的返回值是后一个的入参）。某一个抛异常时
   * 只有它被跳过（记一条 `console.error`），链上其余的照常跑 —— 与 setup 失败不连坐同理。
   */
  transformSourceRows?: (rows: T[]) => T[];
  /** 横向滚动或纵向滚动（scrollLeft / 纵向 offset） */
  onScroll?: (scrollLeft: number, offset: number) => void;
  /** 列结构变化（setColumns / 列显隐 / 列顺序） */
  onColumnsChanged?: () => void;
  /**
   * 行高变了（`setRowHeight`，`vtRowHeightConfig` 的三档走它）。
   *
   * 行的**摆位**不用管：`setRowHeight` 内部 `forceUpdate()` → 一帧 `onRendered`，
   * 按行几何画浮层的插件（框选、甘特的条）在那里就跟上了。
   *
   * 这个钩子是给**表头几何**用的：三档换的不只是行高，还有密度 token（内边距、字号），
   * 于是表头也会高矮几像素。谁把表头高度反解成一个具体值写进了行内样式（付费甘特为了让
   * 左表表头与时间轴表头对齐就这么做），谁就必须在这里重新解一次 —— 否则表头与它自己
   * 画的那一半差几个像素，而 `onRendered` 说的是「行画完了」，读不出这件事。
   */
  onRowHeightChanged?: (size: number) => void;
  /** 文案变化（setLocale） */
  onLocaleChanged?: (locale: VirtTableLocale) => void;
}

/** 插件可用的宿主能力面 */
export interface PluginContext<T extends Record<string, any> = any> {
  // ---- DOM 引用（由核心创建，插件只可追加子节点与监听事件，不可移除/重排） ----
  readonly rootEl: HTMLElement;
  readonly clientEl: HTMLElement;
  readonly tableEl: HTMLTableElement;
  readonly theadEl: HTMLTableSectionElement;
  readonly tbodyEl: HTMLTableSectionElement;
  readonly tfootEl: HTMLTableSectionElement;

  // ---- 状态读取：每次调用取当前快照，不要缓存返回值 ----
  /** 表格 options（含用户传入的全部配置与回调） */
  getOptions(): VirtTableOptions<T>;
  /** 可见叶子列（分组表头摊平后的数据列） */
  getColumns(): VirtTableColumn<T>[];
  /** 当前展示列表（已筛选/排序/结构展开，含 group/expand 合成行） */
  getList(): T[];
  /** 按行 key 取行数据；行未在渲染窗口内时返回 undefined */
  getRowData(rowKey: string): PluginRowData<T> | undefined;
  /**
   * 该格**最终生效**的渲染配置（单元格级覆盖列级）。
   * 别自己去读行数据的 `_cellRenders` —— 优先级链只在核心实现一次。
   */
  resolveCellRender(rowKey: string, colKey: string): CellRenderConfig<T>;
  /** 合并后的完整文案 */
  getLocale(): VirtTableLocale;

  /** 宿主公共方法（白名单，见 VirtTableHost） */
  readonly table: VirtTableHost<T>;

  /** 注册生命周期钩子 */
  on<K extends keyof PluginHooks<T>>(hook: K, fn: NonNullable<PluginHooks<T>[K]>): void;

  /** 对外提供服务，供其它插件 inject（如框选把选区能力给剪贴板/键盘导航） */
  provide<S>(key: string, service: S): void;
  /** 取用其它插件提供的服务；未注册时返回 undefined */
  inject<S>(key: string): S | undefined;
}

/** 插件 setup 的返回物 */
export interface PluginHandle {
  /** 卸载：解绑事件、移除自建 DOM。核心 destroy() 时按注册逆序调用 */
  destroy?: () => void;
  /**
   * 命令式 API：自动挂到 VirtTable 实例上，并由三端 ref 自动透出。
   * 与核心方法或其它插件同名时会被拒绝并告警（核心方法优先）。
   */
  api?: Record<string, (...args: any[]) => any>;
}

/** 插件定义 */
export interface VirtTablePlugin<T extends Record<string, any> = any> {
  /** 唯一名（约定 `vtXxx`），用于依赖声明、去重与告警定位 */
  name: string;
  /** 依赖的插件名。缺失时本插件被跳过并告警；运行时自动按依赖拓扑排序 */
  requires?: string[];
  /** 安装：在核心 DOM 就绪后、首帧渲染前调用 */
  setup(ctx: PluginContext<T>): PluginHandle | void;
}

/** 核心传给运行时的 DOM 引用集合 */
export interface PluginDomRefs {
  rootEl: HTMLElement;
  clientEl: HTMLElement;
  tableEl: HTMLTableElement;
  theadEl: HTMLTableSectionElement;
  tbodyEl: HTMLTableSectionElement;
  tfootEl: HTMLTableSectionElement;
}

/** 核心传给运行时的状态读取器集合 */
export interface PluginStateAccessors<T extends Record<string, any>> {
  getOptions: () => VirtTableOptions<T>;
  getColumns: () => VirtTableColumn<T>[];
  getList: () => T[];
  getRowData: (rowKey: string) => PluginRowData<T> | undefined;
  resolveCellRender: (rowKey: string, colKey: string) => CellRenderConfig<T>;
  getLocale: () => VirtTableLocale;
}

type HookName = keyof PluginHooks<any>;

/**
 * 依赖拓扑排序（稳定）：同层保持声明顺序，便于用户预测安装次序。
 *
 * 不抛异常——一个坏插件不该搞死整张表：
 * - 依赖**缺失**：此处只排序，跳过与告警统一留给 setup 阶段；
 * - 依赖**成环**：这里告警定位环成员，环内插件随后都会因「依赖未安装」被 setup 跳过。
 *   宁可全部不装，也不随意挑一个装——后者的行为无法预测。
 */
function topoSort<T extends Record<string, any>>(
  plugins: VirtTablePlugin<T>[],
): VirtTablePlugin<T>[] {
  const byName = new Map(plugins.map((p) => [p.name, p]));
  const sorted: VirtTablePlugin<T>[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  const cyclic = new Set<string>();

  const visit = (p: VirtTablePlugin<T>): void => {
    if (done.has(p.name)) return;
    if (visiting.has(p.name)) {
      cyclic.add(p.name);
      return;
    }
    visiting.add(p.name);
    for (const dep of p.requires ?? []) {
      const target = byName.get(dep);
      if (target) visit(target);
    }
    visiting.delete(p.name);
    done.add(p.name);
    sorted.push(p);
  };

  for (const p of plugins) visit(p);

  if (cyclic.size > 0) {
    console.warn(
      `[VirtTable] 插件依赖成环：${[...cyclic].map((n) => `"${n}"`).join(' / ')}，` +
        '环内插件的依赖无法满足，将全部跳过安装。',
    );
  }
  return sorted;
}

/**
 * 插件运行时：注册、依赖校验、钩子派发、逆序销毁。
 *
 * 由 VirtTable 内部持有，用户不直接接触。
 */
export class PluginRuntime<T extends Record<string, any>> {
  /** 已安装插件（按安装顺序），销毁时逆序调用 */
  private _installed: Array<{ name: string; handle: PluginHandle }> = [];
  private _services = new Map<string, unknown>();
  /** 钩子回调表；热路径按数组长度短路 */
  private _hooks: { [K in HookName]: Array<NonNullable<PluginHooks<T>[K]>> } = {
    onMounted: [],
    onRowCreated: [],
    onCellRendered: [],
    onHeaderCellRendered: [],
    onRendered: [],
    onDataChanged: [],
    onCheckedRowsChanged: [],
    transformSourceRows: [],
    onScroll: [],
    onColumnsChanged: [],
    onRowHeightChanged: [],
    onLocaleChanged: [],
  };

  constructor(
    private _host: VirtTableHost<T>,
    private _dom: PluginDomRefs,
    private _state: PluginStateAccessors<T>,
  ) {}

  /** 渲染热路径是否需要派发（核心据此完全跳过调用） */
  get hasRowHooks(): boolean {
    return this._hooks.onRowCreated.length > 0;
  }
  get hasCellHooks(): boolean {
    return this._hooks.onCellRendered.length > 0;
  }
  get hasHeaderCellHooks(): boolean {
    return this._hooks.onHeaderCellRendered.length > 0;
  }
  /** 有没有插件要接管源行集（核心据此完全跳过这一步，含那次 try/catch） */
  get hasSourceTransform(): boolean {
    return this._hooks.transformSourceRows.length > 0;
  }

  /**
   * 安装插件，返回需要合并到实例上的命令式 API。
   * `reservedKeys` 是宿主已占用的方法名（核心方法优先，插件不得覆盖）。
   */
  setup(plugins: VirtTablePlugin<T>[], reservedKeys: Set<string>): Record<string, (...args: any[]) => any> {
    const api: Record<string, (...args: any[]) => any> = {};
    const seen = new Set<string>();
    const deduped: VirtTablePlugin<T>[] = [];

    for (const p of plugins) {
      if (!p || typeof p.setup !== 'function' || !p.name) {
        console.warn('[VirtTable] 忽略非法插件（缺少 name 或 setup）。');
        continue;
      }
      if (seen.has(p.name)) {
        console.warn(`[VirtTable] 插件 "${p.name}" 重复注册，仅保留第一个。`);
        continue;
      }
      seen.add(p.name);
      deduped.push(p);
    }

    for (const plugin of topoSort(deduped)) {
      const missing = (plugin.requires ?? []).filter((d) => !this._services.has(`plugin:${d}`));
      if (missing.length > 0) {
        console.warn(
          `[VirtTable] 插件 "${plugin.name}" 依赖 ${missing.map((m) => `"${m}"`).join(' / ')} ` +
            '未注册，已跳过安装。',
        );
        continue;
      }

      const ctx = this._createContext();
      let handle: PluginHandle | void;
      try {
        handle = plugin.setup(ctx);
      } catch (err) {
        // 单个插件安装失败不应连坐整张表
        console.error(`[VirtTable] 插件 "${plugin.name}" 安装失败：`, err);
        continue;
      }

      const h = handle ?? {};
      this._installed.push({ name: plugin.name, handle: h });
      // 标记「已安装」供后续插件的 requires 校验
      this._services.set(`plugin:${plugin.name}`, true);

      for (const [key, fn] of Object.entries(h.api ?? {})) {
        if (reservedKeys.has(key) || key in api) {
          console.warn(
            `[VirtTable] 插件 "${plugin.name}" 的 API "${key}" 与已有方法冲突，已忽略。`,
          );
          continue;
        }
        api[key] = fn;
      }
    }

    return api;
  }

  private _createContext(): PluginContext<T> {
    return {
      rootEl: this._dom.rootEl,
      clientEl: this._dom.clientEl,
      tableEl: this._dom.tableEl,
      theadEl: this._dom.theadEl,
      tbodyEl: this._dom.tbodyEl,
      tfootEl: this._dom.tfootEl,
      getOptions: this._state.getOptions,
      getColumns: this._state.getColumns,
      getList: this._state.getList,
      getRowData: this._state.getRowData,
      resolveCellRender: this._state.resolveCellRender,
      getLocale: this._state.getLocale,
      table: this._host,
      on: (hook, fn) => {
        (this._hooks[hook] as unknown[]).push(fn);
      },
      provide: (key, service) => {
        if (this._services.has(`svc:${key}`)) {
          console.warn(`[VirtTable] 服务 "${key}" 被重复 provide，后者覆盖前者。`);
        }
        this._services.set(`svc:${key}`, service);
      },
      inject: <S,>(key: string) => this._services.get(`svc:${key}`) as S | undefined,
    };
  }

  emitMounted(): void {
    for (const fn of this._hooks.onMounted) fn();
  }

  emitRowCreated(tr: HTMLTableRowElement, item: T, rowIndex: number): void {
    for (const fn of this._hooks.onRowCreated) fn(tr, item, rowIndex);
  }

  emitCellRendered(
    td: HTMLTableCellElement,
    column: VirtTableColumn<T>,
    item: T,
    rowIndex: number,
  ): void {
    for (const fn of this._hooks.onCellRendered) fn(td, column, item, rowIndex);
  }

  emitHeaderCellRendered(
    th: HTMLTableCellElement,
    column: VirtTableColumn<T>,
    headerRow: number,
  ): void {
    for (const fn of this._hooks.onHeaderCellRendered) fn(th, column, headerRow);
  }

  /** 渲染热路径（每帧一次）：无插件注册时短路 */
  emitRendered(): void {
    for (const fn of this._hooks.onRendered) fn();
  }

  emitCheckedRowsChanged(keys: readonly string[]): void {
    for (const fn of this._hooks.onCheckedRowsChanged) fn(keys);
  }

  emitDataChanged(list: T[]): void {
    for (const fn of this._hooks.onDataChanged) fn(list);
  }

  /**
   * 串联全部 `transformSourceRows`，返回最终行集。
   *
   * 三道兜底，都是「一个坏插件不该搞死整张表」的同一条原则：
   * 抛异常 → 跳过它、保留上一环的结果；返回非数组 → 同样跳过并告警
   * （最常见的是忘了 `return`，那会让整张表变空 —— 空表看起来像「数据没加载」，
   * 是最难查的一种失败）。
   */
  applySourceTransform(rows: T[]): T[] {
    let out = rows;
    for (const fn of this._hooks.transformSourceRows) {
      let next: T[];
      try {
        next = fn(out);
      } catch (err) {
        console.error('[VirtTable] transformSourceRows 抛出异常，已跳过这一环：', err);
        continue;
      }
      if (!Array.isArray(next)) {
        console.warn(
          '[VirtTable] transformSourceRows 必须返回数组（忘了 return？），已跳过这一环。',
        );
        continue;
      }
      out = next;
    }
    return out;
  }

  emitScroll(scrollLeft: number, offset: number): void {
    for (const fn of this._hooks.onScroll) fn(scrollLeft, offset);
  }

  emitRowHeightChanged(size: number): void {
    for (const fn of this._hooks.onRowHeightChanged) fn(size);
  }

  emitColumnsChanged(): void {
    for (const fn of this._hooks.onColumnsChanged) fn();
  }

  emitLocaleChanged(locale: VirtTableLocale): void {
    for (const fn of this._hooks.onLocaleChanged) fn(locale);
  }

  /** 逆序销毁：后安装的先卸载（依赖方先走，被依赖方后走） */
  destroy(): void {
    for (let i = this._installed.length - 1; i >= 0; i--) {
      const { name, handle } = this._installed[i];
      try {
        handle.destroy?.();
      } catch (err) {
        console.error(`[VirtTable] 插件 "${name}" 卸载失败：`, err);
      }
    }
    this._installed = [];
    this._services.clear();
    for (const key of Object.keys(this._hooks) as HookName[]) {
      (this._hooks[key] as unknown[]).length = 0;
    }
  }
}
