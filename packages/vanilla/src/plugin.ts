/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CellRenderConfig, VirtTableColumn, VirtTableOptions, VirtTableState } from './index';
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
   * `moveRow` 依赖 `_originList` 原始顺序与数据管线。
   * `vtColumnDrag` / `vtRowDrag` 只负责手势、ghost 与落点指示线。
   */
  moveColumn(fromKey: string, toKey: string, insertAfter: boolean): boolean;
  moveRow(fromKey: string, toKey: string, insertAfter: boolean): boolean;
  /** 当前行序是否可拖拽重排（排序/筛选/树形/分组下为 false） */
  canReorderRows(): boolean;
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
   * 视图状态的读写。它们是**查询状态的统一入口**（列宽/列序/显隐/排序/两套筛选/分页
   * 一次批量提交），插件想整体改查询就该走这里，而不是拼几个单独的 setter ——
   * 后者会触发 N 次列重建与管线重算。
   *
   * `vtAIQuery` 用它把自然语言解析出的查询一次性落地，并在应用前存一份快照做撤销。
   */
  getState(): VirtTableState;
  setState(state: VirtTableState | null | undefined): boolean;
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
  /** 横向滚动或纵向滚动（scrollLeft / 纵向 offset） */
  onScroll?: (scrollLeft: number, offset: number) => void;
  /** 列结构变化（setColumns / 列显隐 / 列顺序） */
  onColumnsChanged?: () => void;
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
    onScroll: [],
    onColumnsChanged: [],
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

  emitDataChanged(list: T[]): void {
    for (const fn of this._hooks.onDataChanged) fn(list);
  }

  emitScroll(scrollLeft: number, offset: number): void {
    for (const fn of this._hooks.onScroll) fn(scrollLeft, offset);
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
