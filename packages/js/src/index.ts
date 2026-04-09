/* eslint-disable @typescript-eslint/no-explicit-any */
import { VirtListCore } from '@virt-list/core';
import type { ReactiveData, VirtListOptions, VirtListEvents } from '@virt-list/core';
import './index.css';
import {
  type MergeCell,
  getMergeInfo,
  calcRenderRect,
  calcMergeRowCount,
  buildMergeCoveredSet,
  planRowCells,
} from './merge';
export type { MergeCell } from './merge';

export interface VirtTableColumn<T = any> {
  key: string;
  title: string;
  width: number;
  fixed?: 'left' | 'right';
  type?: 'index' | 'checkbox' | 'expand' | 'tree';
  expandRender?: (col: VirtTableColumn<T>, row: T) => string | HTMLElement;
  render?: (value: any, row: T, rowIndex: number) => string | HTMLElement;
  cellCoverRender?: (value: any, row: T, rowIndex: number, col: VirtTableColumn<T>) => HTMLElement | null;
  headerRender?: (column: VirtTableColumn<T>) => string | HTMLElement;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  textOverflow?: 'ellipsis' | 'title' | 'tooltip';
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  filters?: Array<{ label: string; value: any; checked?: boolean }>;
  filterMultiple?: boolean;
  filterMethod?: (value: any, row: any) => boolean;
}

export interface VirtTableOptions<T extends Record<string, any>>
  extends Omit<VirtListOptions<T>, 'horizontal'> {
  columns: VirtTableColumn<T>[];
  colBuffer?: number;
  merges?: MergeCell[];
  headerData?: string[][];
  headerMerges?: MergeCell[];
  footerData?: string[][];
  footerMerges?: MergeCell[];
  border?: boolean;
  stripe?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  emptyText?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  textOverflow?: 'ellipsis' | 'title' | 'tooltip';
  highlightHoverRow?: boolean;
  highlightSelectRow?: boolean;
  highlightSelectCol?: boolean;
  highlightSelectCell?: boolean;
  headerClass?: string;
  headerStyle?: string;
  rowClass?: string | ((row: T, index: number) => string);
  rowStyle?: string | ((row: T, index: number) => string);
  cellClass?: string | ((column: VirtTableColumn<T>, row: T) => string);
  cellStyle?: string | ((column: VirtTableColumn<T>, row: T) => string);
  defaultExpandAll?: boolean;
  groupConfig?: { field: string; sort?: 'asc' | 'desc' }[];
  enableCellSelection?: boolean;
  onCellSelectionChange?: (range: { startRow: number; startCol: number; endRow: number; endCol: number } | null) => void;
  enableSearch?: boolean;
  onFilterChange?: (filters: Record<string, any[]>) => void;
  onCheckChange?: (checked: boolean, row: T) => void;
  onCheckAll?: (checked: boolean) => void;
  onExpandChange?: (row: T, expandedKeys: string[]) => void;
  onTreeToggle?: (row: T, expanded: boolean) => void;
  onGroupToggle?: (row: T, expanded: boolean) => void;
  onRowRemoved?: (tr: HTMLTableRowElement) => void;
}

export interface VirtTableEvents<T extends Record<string, any>>
  extends VirtListEvents<T> { }

/**
 * DOM structure (with horizontal column virtualization):
 *
 * root (user-provided container)
 * └── div.vt-root (position:relative, overflow:hidden)
 *     ├── div.vt-client (overflow:auto)
 *     │   ├── div.vt-skeleton  (float:left, height = listTotalSize)
 *     │   └── table.vt-table   (table-layout:fixed, width = sum(col.width))
 *     │       ├── colgroup > col * N
 *     │       ├── thead > tr * N > th * columns + [th-height]  (multi-row if headerMerges)
 *     │       ├── tbody
 *     │       │
 *     │           ├── tr.vt-padding (height = virtualSize)
 *     │           └── tr * rendered-rows
 *     │                 └── [td-pad-left] + td * visible + [td-pad-right] + [td-height]
 *     │       └── tfoot > tr * N > td * columns + [td-height]  (if footerData)
 *     ├── div.vt-fixed-shadow (left)
 *     └── div.vt-fixed-shadow (right)
 */
export class VirtTable<T extends Record<string, any>> {
  private _core: VirtListCore<T>;
  private _columns: VirtTableColumn<T>[];
  private _options: VirtTableOptions<T>;

  private _root: HTMLElement;
  private _rootEl!: HTMLElement;
  private _clientEl!: HTMLElement;
  private _skeletonEl!: HTMLElement;
  private _tableEl!: HTMLTableElement;
  private _colgroupEl!: HTMLTableColElement;
  private _theadEl!: HTMLTableSectionElement;
  private _tbodyEl!: HTMLTableSectionElement;
  private _paddingTr!: HTMLTableRowElement;

  // vertical virtualization
  private _itemPool: Map<string, HTMLTableRowElement> = new Map();
  private _renderedKeys: string[] = [];
  private _domReady = false;

  // horizontal column virtualization
  private _colPrefixSums: number[] = [];
  private _renderColBegin = 0;
  private _renderColEnd = 0;
  private _lastScrollLeft = -1;
  private _lastClientWidth = -1;
  private _rowDataMap: Map<string, { item: T; rowIndex: number }> = new Map();
  private _boundOnHScroll: () => void;

  // fixed columns
  private _leftFixedCols: VirtTableColumn<T>[] = [];
  private _centerCols: VirtTableColumn<T>[] = [];
  private _rightFixedCols: VirtTableColumn<T>[] = [];
  private _leftFixedOffsets: number[] = [];
  private _rightFixedOffsets: number[] = [];
  private _leftFixedWidth = 0;
  private _rightFixedWidth = 0;
  private _leftShadowEl!: HTMLElement;
  private _rightShadowEl!: HTMLElement;

  // empty state
  private _emptyEl!: HTMLElement;

  // checkbox
  private _checkedRows: Set<string> = new Set();
  private _headerCheckbox: HTMLInputElement | null = null;

  // highlight selection
  private _selectRowKey: string | null = null;
  private _selectColKey: string | null = null;
  private _boundOnBodyClick: ((e: MouseEvent) => void) | null = null;

  // column resize
  private _resizeLine: HTMLElement | null = null;

  // expand / tree / group
  private _originList: T[] = [];
  private _foldMap: Record<string, boolean> = {};
  private _expandMap: Record<string, boolean> = {};
  private _expandRowCache: Record<string, T> = {};
  private _hasExpandCol = false;
  private _hasTreeCol = false;

  // merge cell support
  private _merges: MergeCell[] = [];
  private _placeholderMerges: MergeCell[] = [];
  private _renderMerges: MergeCell[] = [];
  private _baseColBegin = 0;
  private _baseColEnd = 0;
  private _inViewRowBegin = 0;
  private _inViewRowEnd = 0;
  private _userRenderControl?: (
    begin: number,
    end: number,
  ) => { begin: number; end: number };
  private _needsTheadRebuild = false;
  private _needsRowCellsRebuild = false;

  // column filters
  private _activeFilters: Map<string, any[]> = new Map();
  private _filterDropdown: HTMLDivElement | null = null;
  private _filterDropdownCol: VirtTableColumn<T> | null = null;
  private _unfilteredList: T[] | null = null;
  private _boundDismissFilter: ((e: MouseEvent) => void) | null = null;

  // cell cover overlay
  private _coverOverlayEl: HTMLDivElement | null = null;
  private _coverActiveCell: { rowIndex: number; colIndex: number; td: HTMLElement } | null = null;
  private _coverCleanup: (() => void) | null = null;

  // cell range selection
  private _cellSelecting = false;
  private _cellSelStart: { row: number; col: number } | null = null;
  private _cellSelEnd: { row: number; col: number } | null = null;
  private _selOverlayEl: HTMLDivElement | null = null;
  private _boundSelMove: ((e: MouseEvent) => void) | null = null;
  private _boundSelUp: ((e: MouseEvent) => void) | null = null;
  private _autoScrollRaf = 0;
  private _autoScrollDx = 0;
  private _autoScrollDy = 0;
  private _lastSelMouseX = 0;
  private _lastSelMouseY = 0;

  // search
  private _searchBoxEl: HTMLDivElement | null = null;
  private _searchInput: HTMLInputElement | null = null;
  private _searchMatches: Array<{ rowIndex: number; colIndex: number }> = [];
  private _searchCurrentIdx = -1;
  private _searchTerm = '';
  private _boundKeyDown: ((e: KeyboardEvent) => void) | null = null;

  // tfoot
  private _tfootEl!: HTMLTableSectionElement;

  get core(): VirtListCore<T> {
    return this._core;
  }

  get state(): ReactiveData {
    return this._core.state;
  }

  constructor(
    root: HTMLElement,
    options: VirtTableOptions<T>,
    externalEvents?: VirtTableEvents<T>,
  ) {
    this._root = root;
    this._options = options;
    this._columns = options.columns;
    this._merges = options.merges ?? [];
    this._boundOnHScroll = this._onHScroll.bind(this);

    this._hasExpandCol = this._columns.some((c) => c.type === 'expand');
    this._hasTreeCol = this._columns.some((c) => c.type === 'tree');

    if (this._hasExpandCol || this._hasTreeCol || options.groupConfig) {
      this._originList = options.list;
      const flat = this._flattenTree(options.list);
      options.list = flat;
    }

    this._splitColumns();
    this._buildColPrefixSums();
    this._baseColEnd = Math.max(0, this._centerCols.length - 1);
    this._renderColEnd = this._baseColEnd;

    if (this._merges.length > 0) {
      this._userRenderControl = options.renderControl;
      options.renderControl = (begin: number, end: number) =>
        this._mergeRenderControl(begin, end);
    }

    const events: VirtListEvents<T> = {
      scroll: (e) => externalEvents?.scroll?.(e),
      toTop: (item) => externalEvents?.toTop?.(item),
      toBottom: (item) => externalEvents?.toBottom?.(item),
      itemResize: (id, size) => externalEvents?.itemResize?.(id, size),
      rangeUpdate: (begin, end) => externalEvents?.rangeUpdate?.(begin, end),
      update: (renderList, state) => {
        if (this._domReady) {
          this._patch(renderList, state);
        }
        externalEvents?.update?.(renderList, state);
      },
    };

    this._core = new VirtListCore<T>(options, events);
    this._buildDOM();
    this._calcColRange();
    if (this._merges.length > 0) this._expandColRangeForMerges();
    if (this._options.showHeader !== false) this._rebuildThead();
    if (this._getFooterRowCount() > 0) this._rebuildTfoot();
    this._initFiltersFromChecked();
    this._domReady = true;
    this._patch(this._core.renderList, this._core.state);
    this._core.bindDOM(this._clientEl);
    if (this._options.showHeader !== false) this._core.observeSlotEl(this._theadEl);
    this._clientEl.addEventListener('scroll', this._boundOnHScroll, { passive: true });
    this._updateFixedShadow();
  }

  // --------------- public proxy API ---------------

  scrollToIndex(index: number): void {
    this._core.scrollToIndex(index);
  }

  scrollIntoView(index: number): void {
    this._core.scrollIntoView(index);
  }

  scrollToTop(): void {
    this._core.scrollToTop();
  }

  scrollToBottom(): void {
    this._core.scrollToBottom();
  }

  scrollToOffset(offset: number): void {
    this._core.scrollToOffset(offset);
  }

  scrollToCell(rowIndex: number, colIndex: number): void {
    this._core.scrollIntoView(rowIndex);

    const centerIdx = this._centerCols.findIndex((c) => c === this._columns[colIndex]);
    if (centerIdx >= 0 && this._clientEl) {
      const colLeft = this._colPrefixSums[centerIdx] ?? 0;
      const colRight = this._colPrefixSums[centerIdx + 1] ?? colLeft;
      const viewWidth = this._clientEl.clientWidth - this._leftFixedWidth - this._rightFixedWidth;
      const target = colLeft - Math.max(0, (viewWidth - (colRight - colLeft)) / 2);
      this._clientEl.scrollLeft = Math.max(0, target);
    }
  }

  reset(): void {
    this._core.reset();
  }

  setList(list: T[]): void {
    if (this._hasExpandCol || this._hasTreeCol || this._options.groupConfig) {
      this._originList = list;
      const flat = this._flattenTree(list);
      this._options.list = flat;
      this._core.updateOptions({ list: flat });
    } else {
      this._core.updateOptions({ list });
    }
  }

  setColumns(columns: VirtTableColumn<T>[]): void {
    this._columns = columns;
    this._options.columns = columns;
    this._hasExpandCol = columns.some((c) => c.type === 'expand');
    this._hasTreeCol = columns.some((c) => c.type === 'tree');
    this._splitColumns();
    this._buildColPrefixSums();
    this._baseColEnd = Math.max(0, this._centerCols.length - 1);
    this._rebuildColgroup();
    this._calcColRange();
    if (this._merges.length > 0) this._expandColRangeForMerges();
    this._rebuildThead();
    if (this._getFooterRowCount() > 0) this._rebuildTfoot();
    this._leftShadowEl.style.left = `${this._leftFixedWidth - 1}px`;
    this._updateShadowPosition();
    this._updateFixedShadow();
    this._clearItemPool();
    this._core.forceUpdate();
  }

  setMerges(merges: MergeCell[]): void {
    const hadMerges = this._merges.length > 0;
    this._merges = merges;
    this._updateRenderMerges([]);

    if (merges.length > 0 && !hadMerges) {
      this._userRenderControl = this._options.renderControl;
      (this._options as unknown as Record<string, unknown>).renderControl = (
        begin: number,
        end: number,
      ) => this._mergeRenderControl(begin, end);
    } else if (merges.length === 0 && hadMerges) {
      (this._options as unknown as Record<string, unknown>).renderControl =
        this._userRenderControl;
    }

    this._calcColRange();
    if (merges.length > 0) this._expandColRangeForMerges();
    this._rebuildThead();
    this._clearItemPool();
    this._core.forceUpdate();
  }

  setHeaderMerges(merges: MergeCell[], headerData?: string[][]): void {
    this._options.headerMerges = merges;
    if (headerData !== undefined) this._options.headerData = headerData;
    this._rebuildThead();
  }

  setFooterData(data: string[][], merges?: MergeCell[]): void {
    this._options.footerData = data;
    if (merges !== undefined) this._options.footerMerges = merges;
    const count = this._getFooterRowCount();
    if (count > 0) {
      if (!this._tfootEl.parentElement) {
        this._tableEl.appendChild(this._tfootEl);
      }
      this._rebuildTfoot();
    } else {
      this._tfootEl.innerHTML = '';
      this._tfootEl.remove();
    }
  }

  forceUpdate(): void {
    this._core.forceUpdate();
  }

  getCheckedRows(): T[] {
    const list = this._options.list ?? [];
    const key = this._options.itemKey;
    return list.filter((item) => this._checkedRows.has(String(item[key])));
  }

  setCheckedRows(keys: string[]): void {
    this._checkedRows = new Set(keys);
    this._refreshCheckboxes();
    this._updateHeaderCheckbox();
  }

  clearCheckedRows(): void {
    this._checkedRows.clear();
    this._refreshCheckboxes();
    this._updateHeaderCheckbox();
  }

  destroy(): void {
    this._clientEl.removeEventListener('scroll', this._boundOnHScroll);
    if (this._boundOnBodyClick) {
      this._tbodyEl.removeEventListener('click', this._boundOnBodyClick as EventListener);
    }
    if (this._options.showHeader !== false) {
      this._core.unobserveSlotEl(this._theadEl);
    }
    this._removeResizeLine();
    this._dismissFilterDropdown();
    this._destroyCellCover();
    this._destroyCellSelection();
    this._destroySearch();

    this._itemPool.forEach((el) => {
      this._options.onRowRemoved?.(el);
      this._core.resizeObserver?.unobserve(el);
    });
    this._itemPool.clear();
    this._rowDataMap.clear();

    this._core.destroy();
    this._root.innerHTML = '';
  }

  // --------------- column prefix sums ---------------

  private _buildColPrefixSums(): void {
    this._colPrefixSums = [0];
    for (const col of this._centerCols) {
      this._colPrefixSums.push(
        this._colPrefixSums[this._colPrefixSums.length - 1] + col.width,
      );
    }
  }

  private _splitColumns(): void {
    this._leftFixedCols = [];
    this._centerCols = [];
    this._rightFixedCols = [];

    for (const col of this._columns) {
      if (col.fixed === 'left') this._leftFixedCols.push(col);
      else if (col.fixed === 'right') this._rightFixedCols.push(col);
      else this._centerCols.push(col);
    }

    this._leftFixedOffsets = [];
    let offset = 0;
    for (const col of this._leftFixedCols) {
      this._leftFixedOffsets.push(offset);
      offset += col.width;
    }
    this._leftFixedWidth = offset;

    this._rightFixedOffsets = [];
    offset = 0;
    for (let i = this._rightFixedCols.length - 1; i >= 0; i--) {
      this._rightFixedOffsets[i] = offset;
      offset += this._rightFixedCols[i].width;
    }
    this._rightFixedWidth = offset;

    this._validateFixedWidth();
  }

  private _validateFixedWidth(): void {
    const clientWidth = this._clientEl?.clientWidth ?? this._rootEl?.clientWidth ?? this._root.clientWidth;
    if (clientWidth > 0 && this._leftFixedWidth + this._rightFixedWidth > clientWidth) {
      console.error(
        `[VirtTable] 固定列总宽度 (${this._leftFixedWidth} + ${this._rightFixedWidth} = ${this._leftFixedWidth + this._rightFixedWidth}px) 超出容器宽度 (${clientWidth}px)，固定列将无法正常显示。`,
      );
    }
  }

  private _updateShadowPosition(): void {
    const scrollbarWidth = this._clientEl
      ? this._clientEl.offsetWidth - this._clientEl.clientWidth
      : 0;
    // 10px 是阴影宽度
    this._rightShadowEl.style.right =
      `${this._rightFixedWidth + scrollbarWidth + 10}px`;
  }

  private _updateFixedShadow(): void {
    if (!this._clientEl) return;
    const { scrollLeft, scrollWidth, clientWidth } = this._clientEl;

    let status: 'none' | 'left' | 'right' | 'middle';
    if (scrollWidth <= clientWidth) {
      status = 'none';
    } else if (scrollLeft === 0) {
      status = 'left';
    } else if (Math.abs(scrollLeft + clientWidth - scrollWidth) < 1) {
      status = 'right';
    } else {
      status = 'middle';
    }

    const showLeft =
      status !== 'left' &&
      status !== 'none' &&
      this._leftFixedCols.length > 0;
    const showRight =
      status !== 'right' &&
      status !== 'none' &&
      this._rightFixedCols.length > 0;

    this._leftShadowEl.classList.toggle('vt-fixed-shadow--left', showLeft);
    this._rightShadowEl.classList.toggle('vt-fixed-shadow--right', showRight);
  }

  /**
   * Determine which columns are inside the horizontal viewport.
   * Returns true if the range changed.
   */
  private _calcColRange(): boolean {
    const totalCenterCols = this._centerCols.length;
    if (totalCenterCols === 0) {
      this._baseColBegin = 0;
      this._baseColEnd = -1;
      this._renderColBegin = 0;
      this._renderColEnd = -1;
      return false;
    }

    const scrollLeft = this._clientEl?.scrollLeft ?? 0;
    const clientWidth = this._clientEl?.clientWidth ?? 0;

    if (clientWidth <= 0) {
      const changed =
        this._baseColBegin !== 0 ||
        this._baseColEnd !== totalCenterCols - 1;
      this._baseColBegin = 0;
      this._baseColEnd = totalCenterCols - 1;
      this._renderColBegin = 0;
      this._renderColEnd = totalCenterCols - 1;
      return changed;
    }

    const effectiveViewWidth = Math.max(
      0,
      clientWidth - this._leftFixedWidth - this._rightFixedWidth,
    );
    const viewRight = scrollLeft + effectiveViewWidth;
    const buffer = this._options.colBuffer ?? 0;

    let begin = 0;
    for (let i = 0; i < totalCenterCols; i++) {
      if (this._colPrefixSums[i + 1] > scrollLeft) {
        begin = i;
        break;
      }
    }

    let end = totalCenterCols - 1;
    for (let i = begin; i < totalCenterCols; i++) {
      if (this._colPrefixSums[i] >= viewRight) {
        end = i - 1;
        break;
      }
    }

    begin = Math.max(0, begin - buffer);
    end = Math.min(totalCenterCols - 1, end + buffer);

    const changed =
      begin !== this._baseColBegin || end !== this._baseColEnd;
    this._baseColBegin = begin;
    this._baseColEnd = end;
    this._renderColBegin = begin;
    this._renderColEnd = end;
    return changed;
  }

  private _onHScroll(): void {
    const scrollLeft = this._clientEl.scrollLeft;
    const clientWidth = this._clientEl.clientWidth;

    this._updateFixedShadow();
    this._removeResizeLine();

    if (
      scrollLeft === this._lastScrollLeft &&
      clientWidth === this._lastClientWidth
    ) {
      return;
    }
    this._lastScrollLeft = scrollLeft;
    this._lastClientWidth = clientWidth;

    if (!this._calcColRange()) return;

    if (this._merges.length > 0) this._expandColRangeForMerges();
    this._rebuildAllRowCells();
  }

  // --------------- merge cell helpers ---------------

  private _updateRenderMerges(placeholders: MergeCell[]): void {
    const prev = this._renderMerges;
    this._placeholderMerges = placeholders;
    const next =
      placeholders.length > 0
        ? [...placeholders, ...this._merges]
        : this._merges;

    let changed = prev.length !== next.length;
    if (!changed) {
      for (let i = 0; i < prev.length; i++) {
        const a = prev[i];
        const b = next[i];
        if (
          a.rowIndex !== b.rowIndex ||
          a.colIndex !== b.colIndex ||
          a.rowspan !== b.rowspan ||
          a.colspan !== b.colspan
        ) {
          changed = true;
          break;
        }
      }
    }

    this._renderMerges = next;
    // Important: merge list can change even when col range is unchanged.
    // Rebuild center cells to avoid reusing stale DOM merge layout.
    if (changed && this._domReady) {
      this._needsRowCellsRebuild = true;
    }
  }

  private _mergeRenderControl(
    begin: number,
    end: number,
  ): { begin: number; end: number } {
    if (this._userRenderControl) {
      const ctrl = this._userRenderControl(begin, end);
      begin = ctrl.begin;
      end = ctrl.end;
    }

    this._inViewRowBegin = begin;
    this._inViewRowEnd = end;

    if (this._merges.length === 0) {
      return { begin, end };
    }

    const renderRect = calcRenderRect(this._merges, {
      ys: begin,
      ye: end,
      xs: this._renderColBegin,
      xe: this._renderColEnd,
    });

    const oldCb = this._renderColBegin;
    const oldCe = this._renderColEnd;
    this._renderColBegin = Math.min(this._renderColBegin, renderRect.xs);
    this._renderColEnd = Math.max(this._renderColEnd, renderRect.xe);

    this._updateRenderMerges(renderRect.placeholderMerges);

    if (
      this._domReady &&
      (oldCb !== renderRect.xs || oldCe !== renderRect.xe)
    ) {
      this._needsRowCellsRebuild = true;
    }

    return { begin: renderRect.ys, end: renderRect.ye };
  }

  private _expandColRangeForMerges(): void {
    if (this._merges.length === 0) return;

    const renderRect = calcRenderRect(this._merges, {
      ys: this._inViewRowBegin,
      ye: this._inViewRowEnd,
      xs: this._baseColBegin,
      xe: this._baseColEnd,
    });

    this._renderColBegin = Math.min(this._renderColBegin, renderRect.xs);
    this._renderColEnd = Math.max(this._renderColEnd, renderRect.xe);

    this._updateRenderMerges(renderRect.placeholderMerges);

    // Horizontal range changes can also alter required render rows
    // (merge rowspan crossing top/bottom boundaries). Align with Vue behavior.
    if (
      this._domReady &&
      (renderRect.ys !== this._core.state.renderBegin ||
        renderRect.ye !== this._core.state.renderEnd)
    ) {
      this._needsRowCellsRebuild = true;
      this._core.manualRender(renderRect.ys, renderRect.ye);
    }
  }

  /**
   * Update center cells for all currently pooled rows when the
   * horizontal column range changes. Fixed cols and height td are
   * kept stable (DOM reuse). Expand/group rows are skipped because
   * their full-colspan td is unaffected by column range.
   */
  private _rebuildAllRowCells(): void {
    this._rowDataMap.forEach(({ item, rowIndex }, key) => {
      const tr = this._itemPool.get(key);
      if (!tr) return;
      const rowType = (item as any)._rowType as string | undefined;
      if (rowType === 'expand' || rowType === 'group') return;
      this._updateCenterCells(tr, item, rowIndex);
    });
  }

  // --------------- expand / tree / group ---------------

  private _flattenTree(source: T[]): T[] {
    const itemKey = this._options.itemKey;
    const defaultAll = this._options.defaultExpandAll ?? false;
    const hasGroupConfig = !!this._options.groupConfig;
    const result: T[] = [];

    let list = source;
    if (hasGroupConfig && list.length > 0 && !(list[0] as any)._rowType) {
      list = this._constructGroups(list) as T[];
    }

    const walk = (items: T[], treeLevel: number, groupLevel: number) => {
      for (const item of items) {
        const key = String(item[itemKey]);
        const rowType = (item as any)._rowType as string | undefined;
        const children = (item as any).children as T[] | undefined;
        const hasKids = Array.isArray(children) && children.length > 0;

        if (rowType === 'group') {
          if (this._foldMap[key] === undefined) {
            this._foldMap[key] = !defaultAll;
          }
          (item as any)._groupLevel = groupLevel;
          (item as any)._hasChildren = hasKids;
          result.push(item);
          if (hasKids && !this._foldMap[key]) {
            walk(children!, treeLevel, groupLevel + 1);
          }
        } else {
          if (this._hasTreeCol && hasKids) {
            if (this._foldMap[key] === undefined) {
              this._foldMap[key] = !defaultAll;
            }
            (item as any)._treeLevel = treeLevel;
            (item as any)._groupLevel = groupLevel;
            (item as any)._hasChildren = true;
            result.push(item);
            if (!this._foldMap[key]) {
              walk(children!, treeLevel + 1, groupLevel);
            }
          } else {
            (item as any)._treeLevel = treeLevel;
            (item as any)._groupLevel = groupLevel;
            (item as any)._hasChildren = false;
            result.push(item);
          }

          if (this._hasExpandCol) {
            if (this._expandMap[key] === undefined) {
              this._expandMap[key] = defaultAll;
            }
            if (this._expandMap[key]) {
              const expandKey = key + '__expand';
              if (!this._expandRowCache[expandKey]) {
                this._expandRowCache[expandKey] = {
                  [itemKey]: expandKey,
                  _rowType: 'expand',
                  _parentId: key,
                } as unknown as T;
              }
              result.push(this._expandRowCache[expandKey]);
            }
          }
        }
      }
    };

    walk(list, 1, 1);
    return result;
  }

  private _constructGroups(list: T[]): T[] {
    const gc = this._options.groupConfig;
    if (!gc || gc.length === 0) return list;

    const buildLevel = (items: T[], levelIdx: number, parentPath: string): T[] => {
      if (levelIdx >= gc.length) return items;
      const { field, sort } = gc[levelIdx];
      const groups = new Map<string, T[]>();
      for (const item of items) {
        const val = String(item[field] ?? '');
        if (!groups.has(val)) groups.set(val, []);
        groups.get(val)!.push(item);
      }
      let keys = Array.from(groups.keys());
      if (sort === 'asc') keys.sort();
      else if (sort === 'desc') keys.sort().reverse();

      const itemKey = this._options.itemKey;
      return keys.map((k) => {
        const groupPath = parentPath ? `${parentPath}/${field}:${k}` : `${field}:${k}`;
        const children = buildLevel(groups.get(k)!, levelIdx + 1, groupPath);
        return {
          [itemKey]: `__group_${groupPath}`,
          _rowType: 'group',
          _groupName: k,
          _groupField: field,
          children,
        } as unknown as T;
      });
    };

    return buildLevel(list, 0, '');
  }

  toggleExpand(rowKey: string): void {
    this._expandMap[rowKey] = !this._expandMap[rowKey];
    this._reflatten();
    const item = this._originList.find(
      (it) => String(it[this._options.itemKey]) === rowKey,
    );
    if (item) {
      const expandedKeys = Object.keys(this._expandMap).filter(
        (k) => this._expandMap[k],
      );
      this._options.onExpandChange?.(item, expandedKeys);
    }
  }

  toggleFold(rowKey: string): void {
    this._foldMap[rowKey] = !this._foldMap[rowKey];
    const expanded = !this._foldMap[rowKey];
    this._reflatten();
    const flatItem = (this._options.list ?? []).find(
      (it) => String(it[this._options.itemKey]) === rowKey,
    );
    if (flatItem) {
      if ((flatItem as any)._rowType === 'group') {
        this._options.onGroupToggle?.(flatItem, expanded);
      } else {
        this._options.onTreeToggle?.(flatItem, expanded);
      }
    }
  }

  expandAll(): void {
    if (this._hasExpandCol) {
      for (const key of Object.keys(this._expandMap)) {
        this._expandMap[key] = true;
      }
      this._forEachItem(this._originList, (item) => {
        this._expandMap[String(item[this._options.itemKey])] = true;
      });
    }
    for (const key of Object.keys(this._foldMap)) {
      this._foldMap[key] = false;
    }
    this._reflatten();
  }

  collapseAll(): void {
    if (this._hasExpandCol) {
      for (const key of Object.keys(this._expandMap)) {
        this._expandMap[key] = false;
      }
    }
    for (const key of Object.keys(this._foldMap)) {
      this._foldMap[key] = true;
    }
    this._reflatten();
  }

  private _forEachItem(items: T[], fn: (item: T) => void): void {
    for (const item of items) {
      fn(item);
      const children = (item as any).children as T[] | undefined;
      if (children) this._forEachItem(children, fn);
    }
  }

  private _reflatten(): void {
    const flat = this._flattenTree(this._originList);
    this._options.list = flat;
    this._clearItemPool();
    this._core.updateOptions({ list: flat });
  }

  private _getExpandCol(): VirtTableColumn<T> | undefined {
    return this._columns.find((c) => c.type === 'expand');
  }

  // --------------- DOM build ---------------

  private _buildDOM(): void {
    this._root.innerHTML = '';

    this._rootEl = document.createElement('div');
    this._rootEl.className = 'vt-root';
    if (this._options.border) this._rootEl.classList.add('vt-root--border');
    this._root.appendChild(this._rootEl);

    this._clientEl = document.createElement('div');
    let clientCls = 'vt-client';
    if (this._options.highlightHoverRow) clientCls += ' vt-client--highlight-hover-row';
    if (this._options.highlightSelectRow) clientCls += ' vt-client--highlight-select-row';
    if (this._options.highlightSelectCol) clientCls += ' vt-client--highlight-select-col';
    if (this._options.highlightSelectCell) clientCls += ' vt-client--highlight-select-cell';
    this._clientEl.className = clientCls;
    this._clientEl.dataset.id = 'client';

    this._skeletonEl = document.createElement('div');
    this._skeletonEl.className = 'vt-skeleton';
    this._clientEl.appendChild(this._skeletonEl);

    this._tableEl = document.createElement('table');
    this._tableEl.className = 'vt-table';

    this._colgroupEl = document.createElement(
      'colgroup',
    ) as HTMLTableColElement;
    this._rebuildColgroup();
    this._tableEl.appendChild(this._colgroupEl);

    this._theadEl = document.createElement('thead');
    this._theadEl.className = 'vt-thead';
    this._theadEl.dataset.id = 'stickyHeader';
    if (this._options.showHeader !== false) {
      this._tableEl.appendChild(this._theadEl);
    }

    this._tbodyEl = document.createElement('tbody');
    this._tbodyEl.className = 'vt-tbody';

    this._paddingTr = document.createElement('tr');
    this._paddingTr.className = 'vt-padding';
    this._tbodyEl.appendChild(this._paddingTr);

    this._tableEl.appendChild(this._tbodyEl);

    this._tfootEl = document.createElement('tfoot');
    this._tfootEl.className = 'vt-tfoot';
    if (this._options.showFooter !== false && this._getFooterRowCount() > 0) {
      this._tableEl.appendChild(this._tfootEl);
    }

    this._clientEl.appendChild(this._tableEl);
    this._rootEl.appendChild(this._clientEl);

    this._leftShadowEl = document.createElement('div');
    this._leftShadowEl.className = 'vt-fixed-shadow';
    this._leftShadowEl.style.left = `${this._leftFixedWidth - 1}px`;
    this._rootEl.appendChild(this._leftShadowEl);

    this._rightShadowEl = document.createElement('div');
    this._rightShadowEl.className = 'vt-fixed-shadow';
    this._rootEl.appendChild(this._rightShadowEl);
    this._updateShadowPosition();

    this._emptyEl = document.createElement('div');
    this._emptyEl.className = 'vt-empty';
    this._emptyEl.textContent = this._options.emptyText ?? '暂无数据';
    this._emptyEl.style.display = 'none';
    this._rootEl.appendChild(this._emptyEl);

    if (this._options.highlightSelectRow || this._options.highlightSelectCol || this._options.highlightSelectCell) {
      const handler = this._onBodyClick.bind(this);
      this._boundOnBodyClick = handler;
      this._tbodyEl.addEventListener('click', handler as EventListener);
    }

    if (this._options.enableCellSelection) {
      this._initCellSelection();
    }

    if (this._options.enableSearch) {
      this._initSearch();
    }

    this._initCellCover();
  }

  private _rebuildColgroup(): void {
    this._colgroupEl.innerHTML = '';
    let totalWidth = 0;
    const appendCol = (col: VirtTableColumn<T>) => {
      const colEl = document.createElement('col');
      colEl.style.width = `${col.width}px`;
      colEl.style.minWidth = `${col.width}px`;
      this._colgroupEl.appendChild(colEl);
      totalWidth += col.width;
    };
    for (const col of this._leftFixedCols) appendCol(col);
    for (const col of this._centerCols) appendCol(col);
    for (const col of this._rightFixedCols) appendCol(col);

    const heightCol = document.createElement('col');
    heightCol.style.width = '0px';
    heightCol.style.minWidth = '0px';
    this._colgroupEl.appendChild(heightCol);
    this._tableEl.style.width = `${totalWidth}px`;
  }

  private _getHeaderRowCount(): number {
    return calcMergeRowCount(
      this._options.headerData,
      this._options.headerMerges,
      1,
    );
  }

  private _getFooterRowCount(): number {
    return calcMergeRowCount(
      this._options.footerData,
      this._options.footerMerges,
      0,
    );
  }

  private _rebuildThead(): void {
    if (this._options.showHeader === false) return;
    this._theadEl.innerHTML = '';
    this._headerCheckbox = null;

    const columns = this._options.columns;
    const hMerges = this._options.headerMerges ?? [];
    const hData = this._options.headerData;
    const rowCount = this._getHeaderRowCount();
    const covered = buildMergeCoveredSet(hMerges);

    const applyDefaultHeaderContent = (
      th: HTMLTableCellElement,
      col: VirtTableColumn<T>,
    ) => {
      if (col.align) th.style.textAlign = col.align;
      if (col.type === 'checkbox') {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'vt-checkbox';
        this._headerCheckbox = cb;
        this._updateHeaderCheckbox();
        cb.addEventListener('change', () => {
          if (cb.checked) {
            const list = this._options.list;
            for (const item of list) {
              this._checkedRows.add(String(item[this._options.itemKey]));
            }
          } else {
            this._checkedRows.clear();
          }
          this._refreshCheckboxes();
          this._options.onCheckAll?.(cb.checked);
        });
        th.appendChild(cb);
        return;
      }
      if (col.headerRender) {
        const content = col.headerRender(col);
        if (typeof content === 'string') th.textContent = content;
        else th.appendChild(content);
      } else {
        th.textContent = col.title;
      }

      if (col.filters && col.filters.length > 0) {
        th.classList.add('vt-th--filterable');
        const filterBtn = document.createElement('span');
        filterBtn.className = 'vt-filter-icon';
        if (this._activeFilters.has(col.key) && this._activeFilters.get(col.key)!.length > 0) {
          filterBtn.classList.add('vt-filter-icon--active');
        }
        filterBtn.innerHTML = '<svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor"><path d="M349 838c-8 0-15-2-22-7a38 38 0 0 1-16-31V558L56 246a38 38 0 0 1-4-36 38 38 0 0 1 34-22h852a38 38 0 0 1 34 22 38 38 0 0 1-4 36L717 558v168a38 38 0 0 1-16 31L365 845a38 38 0 0 1-16 -7z"/></svg>';
        filterBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._toggleFilterDropdown(col, filterBtn);
        });
        th.appendChild(filterBtn);
      }
    };

    const applyResizeTrigger = (
      th: HTMLTableCellElement,
      col: VirtTableColumn<T>,
    ) => {
      if (!col.resizable) return;
      th.style.position = 'relative';
      const trigger = document.createElement('div');
      trigger.className = 'vt-resize-trigger';
      trigger.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._startResize(e, col, th);
      });
      th.appendChild(trigger);
    };

    const applyFixedStyle = (th: HTMLElement, col: VirtTableColumn<T>) => {
      if (col.fixed === 'left') {
        const idx = this._leftFixedCols.indexOf(col);
        if (idx >= 0) {
          th.classList.add('vt-fixed-left');
          th.style.left = `${this._leftFixedOffsets[idx]}px`;
        }
      } else if (col.fixed === 'right') {
        const idx = this._rightFixedCols.indexOf(col);
        if (idx >= 0) {
          th.classList.add('vt-fixed-right');
          th.style.right = `${this._rightFixedOffsets[idx]}px`;
        }
      }
    };

    const renderOrder = [
      ...this._leftFixedCols,
      ...this._centerCols,
      ...this._rightFixedCols,
    ];

    for (let row = 0; row < rowCount; row++) {
      const tr = document.createElement('tr');

      for (let ci = 0; ci < renderOrder.length; ci++) {
        if (covered.has(`${row},${ci}`)) continue;

        const col = renderOrder[ci];
        const merge = getMergeInfo(hMerges, row, ci);
        const isPrimary = merge
          ? merge.rowIndex === row && merge.colIndex === ci
          : false;

        if (merge && !isPrimary) continue;

        const th = document.createElement('th');
        th.className = 'vt-th';

        if (isPrimary && merge) {
          if (merge.rowspan > 1) th.rowSpan = merge.rowspan;
          if (merge.colspan > 1) th.colSpan = merge.colspan;
        }

        applyFixedStyle(th, col);

        const cellText = hData?.[row]?.[ci];
        if (cellText != null && cellText !== '') {
          th.textContent = cellText;
        } else if (row === 0) {
          applyDefaultHeaderContent(th, col);
        }

        const cellEndRow = isPrimary && merge
          ? merge.rowIndex + merge.rowspan - 1
          : row;
        if (cellEndRow === rowCount - 1) {
          applyResizeTrigger(th, col);
        }

        tr.appendChild(th);
      }

      if (row === 0) {
        const heightTh = document.createElement('th');
        heightTh.className = 'vt-cell-h';
        if (rowCount > 1) heightTh.rowSpan = rowCount;
        tr.appendChild(heightTh);
      }

      this._theadEl.appendChild(tr);
    }
  }

  private _rebuildTfoot(): void {
    this._tfootEl.innerHTML = '';

    const fMerges = this._options.footerMerges ?? [];
    const fData = this._options.footerData ?? [];
    const rowCount = this._getFooterRowCount();
    if (rowCount === 0) return;
    const covered = buildMergeCoveredSet(fMerges);

    const renderOrder = [
      ...this._leftFixedCols,
      ...this._centerCols,
      ...this._rightFixedCols,
    ];

    const applyFixedStyle = (td: HTMLElement, col: VirtTableColumn<T>) => {
      if (col.fixed === 'left') {
        const idx = this._leftFixedCols.indexOf(col);
        if (idx >= 0) {
          td.classList.add('vt-fixed-left');
          td.style.left = `${this._leftFixedOffsets[idx]}px`;
        }
      } else if (col.fixed === 'right') {
        const idx = this._rightFixedCols.indexOf(col);
        if (idx >= 0) {
          td.classList.add('vt-fixed-right');
          td.style.right = `${this._rightFixedOffsets[idx]}px`;
        }
      }
    };

    for (let row = 0; row < rowCount; row++) {
      const tr = document.createElement('tr');
      tr.className = 'vt-tfoot-row';

      for (let ci = 0; ci < renderOrder.length; ci++) {
        if (covered.has(`${row},${ci}`)) continue;

        const col = renderOrder[ci];
        const merge = getMergeInfo(fMerges, row, ci);
        const isPrimary = merge
          ? merge.rowIndex === row && merge.colIndex === ci
          : false;

        if (merge && !isPrimary) continue;

        const td = document.createElement('td');
        td.className = 'vt-td';

        if (isPrimary && merge) {
          if (merge.rowspan > 1) td.rowSpan = merge.rowspan;
          if (merge.colspan > 1) td.colSpan = merge.colspan;
        }

        applyFixedStyle(td, col);

        const align = col.align ?? this._options.align;
        if (align) td.style.textAlign = align;

        const cellText = fData[row]?.[ci];
        if (cellText != null && cellText !== '') {
          td.textContent = String(cellText);
        }

        tr.appendChild(td);
      }

      if (row === 0) {
        const heightTd = document.createElement('td');
        heightTd.className = 'vt-cell-h';
        if (rowCount > 1) heightTd.rowSpan = rowCount;
        tr.appendChild(heightTd);
      }

      this._tfootEl.appendChild(tr);
    }
  }

  private _clearItemPool(): void {
    this._itemPool.forEach((el) => {
      this._core.resizeObserver?.unobserve(el);
      el.remove();
    });
    this._itemPool.clear();
    this._rowDataMap.clear();
    this._renderedKeys = [];
  }

  // --------------- incremental DOM patching ---------------

  private _patch(renderList: T[], reactiveData: ReactiveData): void {
    if (this._needsTheadRebuild) {
      this._rebuildThead();
      this._needsTheadRebuild = false;
    }

    const { itemKey } = this._options;
    const { listTotalSize, virtualSize } = reactiveData;
    const listLen = this._options.list?.length ?? 0;
    this._emptyEl.style.display = listLen === 0 ? '' : 'none';

    this._skeletonEl.style.height = `${listTotalSize}px`;
    this._paddingTr.style.height = `${virtualSize}px`;

    const newKeys: string[] = [];
    for (const item of renderList) {
      newKeys.push(String(item[itemKey]));
    }

    const newKeySet = new Set(newKeys);
    for (const key of this._renderedKeys) {
      if (!newKeySet.has(key)) {
        const el = this._itemPool.get(key);
        if (el) {
          this._options.onRowRemoved?.(el);
          this._core.resizeObserver?.unobserve(el);
          el.remove();
          this._itemPool.delete(key);
        }
        this._rowDataMap.delete(key);
      }
    }

    if (renderList.length === 0) {
      this._renderedKeys = [];
      return;
    }

    const renderBegin = reactiveData.renderBegin;

    let prevNode: ChildNode = this._paddingTr;
    for (let i = 0; i < renderList.length; i++) {
      const item = renderList[i]!;
      const key = String(item[itemKey]);

      this._rowDataMap.set(key, { item, rowIndex: renderBegin + i });

      let tr = this._itemPool.get(key);
      if (!tr) {
        tr = this._createRow(item, renderBegin + i);
        this._core.resizeObserver?.observe(tr);
        this._itemPool.set(key, tr);
      } else if (this._needsRowCellsRebuild) {
        const rowType = (item as any)._rowType as string | undefined;
        if (rowType !== 'expand' && rowType !== 'group') {
          this._updateCenterCells(tr, item, renderBegin + i);
        }
      }

      const nextSibling = prevNode.nextSibling;
      if (nextSibling !== tr) {
        this._tbodyEl.insertBefore(tr, nextSibling);
      }
      prevNode = tr;
    }

    this._renderedKeys = newKeys;
    this._needsRowCellsRebuild = false;
  }

  private _createRow(item: T, rowIndex: number): HTMLTableRowElement {
    const tr = document.createElement('tr');
    const key = String(item[this._options.itemKey]);
    const rowType = (item as any)._rowType as string | undefined;
    tr.className = 'vt-tr';
    tr.dataset.id = key;
    tr.dataset.rowKey = key;

    if (rowType === 'expand') {
      tr.classList.add('vt-tr--expand');
      this._fillExpandRow(tr, item);
      return tr;
    }
    if (rowType === 'group') {
      tr.classList.add('vt-tr--group');
      this._fillGroupRow(tr, item);
      return tr;
    }

    if (this._options.stripe && rowIndex % 2 === 1) {
      tr.classList.add('is-striped');
    }
    if (this._selectRowKey === key) {
      tr.classList.add('current-row');
    }

    const { rowClass, rowStyle } = this._options;
    if (rowClass) {
      const cls =
        typeof rowClass === 'function' ? rowClass(item, rowIndex) : rowClass;
      if (cls) tr.className += ` ${cls}`;
    }
    if (rowStyle) {
      const style =
        typeof rowStyle === 'function' ? rowStyle(item, rowIndex) : rowStyle;
      if (style) tr.style.cssText = style;
    }

    this._fillRowCells(tr, item, rowIndex);
    return tr;
  }

  private _applyCellContent(
    td: HTMLTableCellElement,
    col: VirtTableColumn<T>,
    item: T,
    rowIndex: number,
  ): void {
    td.dataset.colKey = col.key;
    if (this._selectColKey === col.key) {
      td.classList.add('current-column');
    }

    const align = col.align ?? this._options.align;
    if (align) td.style.textAlign = align;

    const vAlign = col.verticalAlign ?? this._options.verticalAlign;
    if (vAlign) td.style.verticalAlign = vAlign;

    const textOverflow = col.textOverflow ?? this._options.textOverflow;
    if (textOverflow === 'ellipsis') {
      td.classList.add('vt-td--text-ellipsis');
    }

    const { cellClass, cellStyle } = this._options;
    if (cellClass) {
      const cls =
        typeof cellClass === 'function' ? cellClass(col, item) : cellClass;
      if (cls) td.className += ` ${cls}`;
    }
    if (cellStyle) {
      const style =
        typeof cellStyle === 'function' ? cellStyle(col, item) : cellStyle;
      if (style) td.style.cssText += `;${style}`;
    }

    if (col.type === 'index') {
      td.textContent = String(rowIndex + 1);
      return;
    }

    if (col.type === 'expand') {
      const key = String(item[this._options.itemKey]);
      const isOpen = !!this._expandMap[key];
      const icon = document.createElement('span');
      icon.className = 'vt-expand-icon' + (isOpen ? ' vt-expand-icon--open' : '');
      icon.innerHTML = '&#9654;';
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleExpand(key);
      });
      td.appendChild(icon);
      return;
    }

    if (col.type === 'tree') {
      const groupLevel = ((item as any)._groupLevel as number) || 0;
      const treeLevel = ((item as any)._treeLevel as number) || 1;
      const hasKids = !!(item as any)._hasChildren;
      const key = String(item[this._options.itemKey]);
      const isFolded = !!this._foldMap[key];

      for (let l = 1; l < groupLevel; l++) {
        const sp = document.createElement('span');
        sp.className = 'vt-group-indent';
        td.appendChild(sp);
      }
      for (let l = 1; l < treeLevel; l++) {
        const sp = document.createElement('span');
        sp.className = 'vt-tree-indent';
        td.appendChild(sp);
      }

      const toggle = document.createElement('span');
      if (hasKids) {
        toggle.className = 'vt-tree-toggle' + (isFolded ? '' : ' vt-tree-toggle--open');
        toggle.innerHTML = '&#9654;';
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFold(key);
        });
      } else {
        toggle.className = 'vt-tree-toggle vt-tree-toggle--leaf';
      }
      td.appendChild(toggle);

      const textSpan = document.createElement('span');
      const cellValue = item[col.key] != null ? String(item[col.key]) : '';
      if (col.render) {
        const content = col.render(item[col.key], item, rowIndex);
        if (typeof content === 'string') {
          textSpan.innerHTML = content;
        } else {
          textSpan.appendChild(content);
        }
      } else {
        textSpan.textContent = cellValue;
      }
      td.appendChild(textSpan);
      return;
    }

    if (col.type === 'checkbox') {
      const key = String(item[this._options.itemKey]);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'vt-checkbox';
      cb.checked = this._checkedRows.has(key);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          this._checkedRows.add(key);
        } else {
          this._checkedRows.delete(key);
        }
        this._updateHeaderCheckbox();
        this._options.onCheckChange?.(cb.checked, item);
      });
      td.appendChild(cb);
      return;
    }

    const groupLevel = ((item as any)._groupLevel as number) || 0;
    if (
      groupLevel > 1 &&
      !this._hasTreeCol &&
      col === this._options.columns[0]
    ) {
      for (let l = 1; l < groupLevel; l++) {
        const sp = document.createElement('span');
        sp.className = 'vt-group-indent';
        td.appendChild(sp);
      }
    }

    const cellValue = item[col.key] != null ? String(item[col.key]) : '';
    if (col.render) {
      const content = col.render(item[col.key], item, rowIndex);
      if (typeof content === 'string') {
        const wrap = document.createElement('span');
        wrap.innerHTML = content;
        td.appendChild(wrap);
      } else {
        td.appendChild(content);
      }
    } else {
      const textNode = document.createTextNode(cellValue);
      td.appendChild(textNode);
    }

    if (textOverflow === 'title') {
      td.title = cellValue;
    }
  }

  /**
   * Build the center section (left pad + visible center tds + right pad)
   * as a DocumentFragment. Does NOT include fixed cols or height td.
   */
  private _buildCenterFragment(item: T, rowIndex: number): DocumentFragment {
    const frag = document.createDocumentFragment();
    const plan = planRowCells(
      this._renderMerges,
      rowIndex,
      this._renderColBegin,
      this._renderColEnd,
      this._centerCols.length,
    );

    for (const cell of plan) {
      const td = document.createElement('td');
      if (cell.type === 'pad') {
        td.className = 'vt-cell-pad';
        td.colSpan = cell.colSpan;
      } else {
        td.className = 'vt-td';
        (td as any)._ci = cell.colIndex;
        if (cell.rowSpan > 1) td.rowSpan = cell.rowSpan;
        if (cell.colSpan > 1) td.colSpan = cell.colSpan;
        this._applyCellContent(td, this._centerCols[cell.colIndex], item, rowIndex);
      }
      frag.appendChild(td);
    }

    return frag;
  }

  /**
   * Full build of all td cells for a row (initial creation).
   * Structure: leftFixed → centerFragment → rightFixed → heightTd
   */
  private _fillRowCells(
    tr: HTMLTableRowElement,
    item: T,
    rowIndex: number,
  ): void {
    tr.innerHTML = '';
    const rowH = this._core.getItemSize(
      String(item[this._options.itemKey]),
    );

    for (let i = 0; i < this._leftFixedCols.length; i++) {
      const col = this._leftFixedCols[i];
      const td = document.createElement('td');
      td.className = 'vt-td vt-fixed-left';
      td.style.left = `${this._leftFixedOffsets[i]}px`;
      this._applyCellContent(td, col, item, rowIndex);
      tr.appendChild(td);
    }

    tr.appendChild(this._buildCenterFragment(item, rowIndex));

    for (let i = 0; i < this._rightFixedCols.length; i++) {
      const col = this._rightFixedCols[i];
      const td = document.createElement('td');
      td.className = 'vt-td vt-fixed-right';
      td.style.right = `${this._rightFixedOffsets[i]}px`;
      this._applyCellContent(td, col, item, rowIndex);
      tr.appendChild(td);
    }

    const hTd = document.createElement('td');
    hTd.className = 'vt-cell-h';
    hTd.style.height = `${rowH}px`;
    tr.appendChild(hTd);
  }

  /**
   * Replace only the center section of a row, keeping fixed cols and
   * height td stable. Used during horizontal scrolling for DOM reuse.
   *
   * Row DOM layout: [leftFixed * L] [center section] [rightFixed * R] [heightTd]
   */
  private _updateCenterCells(
    tr: HTMLTableRowElement,
    item: T,
    rowIndex: number,
  ): void {
    const L = this._leftFixedCols.length;
    const R = this._rightFixedCols.length;
    const centerCount = tr.children.length - L - R - 1;

    const pool = new Map<number, HTMLTableCellElement>();
    for (let i = 0; i < centerCount; i++) {
      const td = tr.children[L + i] as HTMLTableCellElement;
      const ci = (td as any)._ci as number | undefined;
      if (ci !== undefined) {
        pool.set(ci, td);
      }
    }

    const plan = planRowCells(
      this._renderMerges,
      rowIndex,
      this._renderColBegin,
      this._renderColEnd,
      this._centerCols.length,
    );

    const neededCols = new Set<number>();
    for (const cell of plan) {
      if (cell.type !== 'pad') neededCols.add(cell.colIndex);
    }

    for (let i = centerCount - 1; i >= 0; i--) {
      const td = tr.children[L + i] as HTMLTableCellElement;
      const ci = (td as any)._ci as number | undefined;
      if (ci === undefined || !neededCols.has(ci)) {
        td.remove();
        if (ci !== undefined) pool.delete(ci);
      }
    }

    let prevNode: ChildNode | null = L > 0 ? tr.children[L - 1] : null;
    for (const cell of plan) {
      let td: HTMLTableCellElement;

      if (cell.type === 'pad') {
        td = document.createElement('td');
        td.className = 'vt-cell-pad';
        td.colSpan = cell.colSpan;
      } else {
        const existing = pool.get(cell.colIndex);
        if (existing) {
          td = existing;
          td.rowSpan = cell.rowSpan;
          td.colSpan = cell.colSpan;
        } else {
          td = document.createElement('td');
          td.className = 'vt-td';
          (td as any)._ci = cell.colIndex;
          if (cell.rowSpan > 1) td.rowSpan = cell.rowSpan;
          if (cell.colSpan > 1) td.colSpan = cell.colSpan;
          this._applyCellContent(
            td,
            this._centerCols[cell.colIndex],
            item,
            rowIndex,
          );
        }
      }

      const next = prevNode ? prevNode.nextSibling : tr.firstChild;
      if (td !== next) {
        tr.insertBefore(td, next);
      }
      prevNode = td;
    }

    const hTd = tr.lastElementChild as HTMLElement;
    if (hTd?.classList.contains('vt-cell-h')) {
      const rowH = this._core.getItemSize(
        String(item[this._options.itemKey]),
      );
      hTd.style.height = `${rowH}px`;
    }
  }

  private _fillExpandRow(tr: HTMLTableRowElement, item: T): void {
    tr.innerHTML = '';
    const totalCols =
      this._leftFixedCols.length +
      this._centerCols.length +
      this._rightFixedCols.length +
      1; // +1 for height placeholder
    const td = document.createElement('td');
    td.className = 'vt-td vt-expand-content';
    td.colSpan = totalCols;

    const parentId = (item as any)._parentId as string;
    const expandCol = this._getExpandCol();
    let parent: T | undefined;
    const findItem = (items: T[]): T | undefined => {
      for (const it of items) {
        if (String(it[this._options.itemKey]) === parentId) return it;
        const ch = (it as any).children as T[] | undefined;
        if (ch) { const r = findItem(ch); if (r) return r; }
      }
      return undefined;
    };
    parent = findItem(this._originList);
    if (expandCol?.expandRender && parent) {
      const content = expandCol.expandRender(expandCol, parent);
      if (typeof content === 'string') {
        td.innerHTML = content;
      } else {
        td.appendChild(content);
      }
    }
    tr.appendChild(td);
  }

  private _fillGroupRow(tr: HTMLTableRowElement, item: T): void {
    tr.innerHTML = '';
    const totalCols =
      this._leftFixedCols.length +
      this._centerCols.length +
      this._rightFixedCols.length +
      1;
    const groupLevel = ((item as any)._groupLevel as number) || 1;
    const hasKids = !!(item as any)._hasChildren;
    const key = String(item[this._options.itemKey]);
    const isFolded = !!this._foldMap[key];
    const groupName = (item as any)._groupName as string ?? key;

    const td = document.createElement('td');
    td.className = 'vt-td vt-group-cell';
    td.colSpan = totalCols;

    for (let l = 1; l < groupLevel; l++) {
      const sp = document.createElement('span');
      sp.className = 'vt-group-indent';
      td.appendChild(sp);
    }

    if (hasKids) {
      const toggle = document.createElement('span');
      toggle.className = 'vt-group-toggle' + (isFolded ? '' : ' vt-group-toggle--open');
      toggle.innerHTML = '&#9654;';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFold(key);
      });
      td.appendChild(toggle);
    }

    const label = document.createElement('span');
    label.className = 'vt-group-label';
    label.textContent = groupName;
    td.appendChild(label);

    tr.appendChild(td);
  }

  // --------------- highlight selection ---------------

  private _onBodyClick(e: MouseEvent): void {
    const td = (e.target as HTMLElement).closest('td.vt-td') as HTMLElement | null;
    const tr = td?.closest('tr.vt-tr') as HTMLElement | null;
    if (!tr) return;

    const rowKey = tr.dataset.rowKey ?? null;
    const colKey = td?.dataset.colKey ?? null;

    if (this._selectRowKey !== rowKey) {
      if (this._selectRowKey) {
        const prev = this._tbodyEl.querySelector(`tr[data-row-key="${this._selectRowKey}"]`);
        prev?.classList.remove('current-row');
      }
      this._selectRowKey = rowKey;
      if (rowKey) tr.classList.add('current-row');
    }

    if (this._selectColKey !== colKey) {
      this._tbodyEl.querySelectorAll('.current-column').forEach((el) =>
        el.classList.remove('current-column'),
      );
      this._selectColKey = colKey;
      if (colKey) {
        this._tbodyEl.querySelectorAll(`td[data-col-key="${colKey}"]`).forEach((el) =>
          el.classList.add('current-column'),
        );
      }
    }
  }

  // --------------- checkbox helpers ---------------

  private _updateHeaderCheckbox(): void {
    if (!this._headerCheckbox) return;
    const total = this._options.list?.length ?? 0;
    const checked = this._checkedRows.size;
    this._headerCheckbox.checked = total > 0 && checked === total;
    this._headerCheckbox.indeterminate = checked > 0 && checked < total;
  }

  private _refreshCheckboxes(): void {
    this._itemPool.forEach((tr, key) => {
      const cb = tr.querySelector<HTMLInputElement>('input.vt-checkbox');
      if (cb) cb.checked = this._checkedRows.has(key);
    });
  }

  // --------------- column resize ---------------

  private _startResize(e: MouseEvent, col: VirtTableColumn<T>, th: HTMLElement): void {
    const startX = e.clientX;
    const startWidth = th.getBoundingClientRect().width;
    const rootRect = this._rootEl.getBoundingClientRect();
    const scrollTop = this._clientEl.scrollTop;
    const colLeft = th.getBoundingClientRect().left - rootRect.left + this._clientEl.scrollLeft;

    this._resizeLine = document.createElement('div');
    this._resizeLine.className = 'vt-resize-line';
    this._resizeLine.style.top = `${scrollTop}px`;
    this._resizeLine.style.transform = `translateX(${colLeft + startWidth}px)`;
    this._rootEl.appendChild(this._resizeLine);

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const delta = ev.clientX - startX;
      const newW = this._clampWidth(col, startWidth + delta);
      if (this._resizeLine) {
        this._resizeLine.style.transform = `translateX(${colLeft + newW}px)`;
      }
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this._removeResizeLine();
      const delta = ev.clientX - startX;
      const newW = this._clampWidth(col, startWidth + delta);
      col.width = newW;
      this.setColumns([...this._columns]);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
  }

  private _clampWidth(col: VirtTableColumn<T>, w: number): number {
    const min = col.minWidth ?? 40;
    const max = col.maxWidth ?? Infinity;
    return Math.max(min, Math.min(max, w));
  }

  private _removeResizeLine(): void {
    if (this._resizeLine) {
      this._resizeLine.remove();
      this._resizeLine = null;
    }
  }

  // --------------- column filter ---------------

  private _toggleFilterDropdown(col: VirtTableColumn<T>, anchor: HTMLElement): void {
    if (this._filterDropdownCol === col && this._filterDropdown) {
      this._dismissFilterDropdown();
      return;
    }
    this._dismissFilterDropdown();
    this._filterDropdownCol = col;

    const multiple = col.filterMultiple !== false;
    const activeVals = this._activeFilters.get(col.key);
    const selected = activeVals
      ? new Set<any>(activeVals)
      : new Set<any>(col.filters!.filter((f) => f.checked).map((f) => f.value));

    const panel = document.createElement('div');
    panel.className = 'vt-filter-panel';

    const list = document.createElement('div');
    list.className = 'vt-filter-list';

    const inputs: Array<{ input: HTMLInputElement; value: any }> = [];

    for (const opt of col.filters!) {
      const label = document.createElement('label');
      label.className = 'vt-filter-item';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'vt-filter-checkbox';
      input.checked = selected.has(opt.value);
      inputs.push({ input, value: opt.value });

      if (!multiple) {
        input.addEventListener('change', () => {
          if (input.checked) {
            for (const item of inputs) {
              if (item.input !== input) item.input.checked = false;
            }
          }
        });
      }

      const span = document.createElement('span');
      span.textContent = opt.label;

      label.appendChild(input);
      label.appendChild(span);
      list.appendChild(label);
    }

    const actions = document.createElement('div');
    actions.className = 'vt-filter-actions';

    const btnReset = document.createElement('button');
    btnReset.className = 'vt-filter-btn';
    btnReset.textContent = '重置';
    btnReset.addEventListener('click', () => {
      this._applyFilter(col, []);
      this._dismissFilterDropdown();
    });

    const btnConfirm = document.createElement('button');
    btnConfirm.className = 'vt-filter-btn vt-filter-btn--primary';
    btnConfirm.textContent = '确认';
    btnConfirm.addEventListener('click', () => {
      const vals = inputs.filter((i) => i.input.checked).map((i) => i.value);
      this._syncFilterChecked(col, vals);
      this._applyFilter(col, vals);
      this._dismissFilterDropdown();
    });

    actions.appendChild(btnReset);
    actions.appendChild(btnConfirm);
    panel.appendChild(list);
    panel.appendChild(actions);

    const anchorRect = anchor.getBoundingClientRect();
    const rootRect = this._rootEl.getBoundingClientRect();
    panel.style.top = `${anchorRect.bottom - rootRect.top + 4}px`;
    const idealLeft = anchorRect.right - rootRect.left - 160;
    panel.style.left = `${Math.max(0, Math.min(idealLeft, rootRect.width - 164))}px`;

    this._rootEl.appendChild(panel);
    this._filterDropdown = panel;

    this._boundDismissFilter = (e: MouseEvent) => {
      if (
        !panel.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest?.('.vt-filter-icon')
      ) {
        this._dismissFilterDropdown();
      }
    };
    setTimeout(() => {
      document.addEventListener('mousedown', this._boundDismissFilter!);
    }, 0);
  }

  private _initFiltersFromChecked(): void {
    let hasInitial = false;
    for (const col of this._columns) {
      if (!col.filters) continue;
      const checkedVals = col.filters.filter((f) => f.checked).map((f) => f.value);
      if (checkedVals.length > 0) {
        this._activeFilters.set(col.key, checkedVals);
        hasInitial = true;
      }
    }
    if (hasInitial) {
      this._applyAllFilters();
      this._rebuildThead();
    }
  }

  private _syncFilterChecked(col: VirtTableColumn<T>, values: any[]): void {
    if (!col.filters) return;
    const valSet = new Set(values);
    for (const f of col.filters) {
      f.checked = valSet.has(f.value);
    }
  }

  private _dismissFilterDropdown(): void {
    if (this._filterDropdown) {
      this._filterDropdown.remove();
      this._filterDropdown = null;
    }
    this._filterDropdownCol = null;
    if (this._boundDismissFilter) {
      document.removeEventListener('mousedown', this._boundDismissFilter);
      this._boundDismissFilter = null;
    }
  }

  private _applyFilter(col: VirtTableColumn<T>, values: any[]): void {
    this._syncFilterChecked(col, values);
    if (values.length === 0) {
      this._activeFilters.delete(col.key);
    } else {
      this._activeFilters.set(col.key, values);
    }
    this._applyAllFilters();
    this._rebuildThead();
    this._options.onFilterChange?.(this.getActiveFilters());
  }

  private _applyAllFilters(): void {
    if (!this._unfilteredList) {
      this._unfilteredList = [...(this._options.list ?? [])];
    }

    let result = this._unfilteredList;

    for (const [key, values] of this._activeFilters) {
      if (values.length === 0) continue;
      const col = this._columns.find((c) => c.key === key);
      if (!col) continue;
      const valSet = new Set(values);
      if (col.filterMethod) {
        const method = col.filterMethod;
        result = result.filter((row) => values.some((v) => method(v, row)));
      } else {
        result = result.filter((row) => valSet.has(row[key]));
      }
    }

    this._options.list = result;
    this._core.updateOptions({ list: result });
  }

  setColumnFilter(colKey: string, values: any[]): void {
    const col = this._columns.find((c) => c.key === colKey);
    if (!col) return;
    this._syncFilterChecked(col, values);
    if (values.length === 0) {
      this._activeFilters.delete(colKey);
    } else {
      this._activeFilters.set(colKey, values);
    }
    this._applyAllFilters();
    this._rebuildThead();
    this._options.onFilterChange?.(this.getActiveFilters());
  }

  clearAllFilters(): void {
    for (const col of this._columns) {
      if (col.filters) {
        for (const f of col.filters) f.checked = false;
      }
    }
    this._activeFilters.clear();
    this._applyAllFilters();
    this._rebuildThead();
    this._options.onFilterChange?.(this.getActiveFilters());
  }

  getActiveFilters(): Record<string, any[]> {
    const result: Record<string, any[]> = {};
    for (const [key, values] of this._activeFilters) {
      if (values.length > 0) result[key] = [...values];
    }
    return result;
  }

  // --------------- cell cover overlay ---------------

  private _initCellCover(): void {
    const hasCoverCol = this._columns.some((c) => c.cellCoverRender);
    if (!hasCoverCol) return;

    this._coverOverlayEl = document.createElement('div');
    this._coverOverlayEl.className = 'vt-cell-cover';
    this._coverOverlayEl.style.display = 'none';
    this._rootEl.appendChild(this._coverOverlayEl);

    const onCellClick = (e: MouseEvent) => {
      const td = (e.target as HTMLElement).closest('td.vt-td') as HTMLElement | null;
      if (!td) { this._dismissCellCover(); return; }
      const tr = td.closest('tr.vt-tr') as HTMLElement | null;
      if (!tr) { this._dismissCellCover(); return; }

      const rowKey = tr.dataset.rowKey;
      const colKey = td.dataset.colKey;
      if (!rowKey || !colKey) { this._dismissCellCover(); return; }

      const rd = this._rowDataMap.get(rowKey);
      if (!rd) { this._dismissCellCover(); return; }

      const col = this._columns.find((c) => c.key === colKey);
      if (!col?.cellCoverRender) { this._dismissCellCover(); return; }

      if (
        this._coverActiveCell &&
        this._coverActiveCell.rowIndex === rd.rowIndex &&
        this._coverActiveCell.colIndex === this._columns.indexOf(col)
      ) return;

      this._dismissCellCover();
      const value = rd.item[col.key];
      const content = col.cellCoverRender(value, rd.item, rd.rowIndex, col);
      if (!content) return;

      this._coverActiveCell = {
        rowIndex: rd.rowIndex,
        colIndex: this._columns.indexOf(col),
        td,
      };

      this._coverOverlayEl!.innerHTML = '';
      this._coverOverlayEl!.appendChild(content);
      this._positionCoverOverlay(td);
      this._coverOverlayEl!.style.display = '';
    };
    this._tbodyEl.addEventListener('click', onCellClick);

    const onScroll = () => {
      if (this._coverActiveCell) {
        const { td } = this._coverActiveCell;
        if (td.isConnected) {
          this._positionCoverOverlay(td);
        } else {
          this._dismissCellCover();
        }
      }
    };
    this._clientEl.addEventListener('scroll', onScroll);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this._coverActiveCell) {
        this._dismissCellCover();
      }
    };
    this._rootEl.addEventListener('keydown', onKeyDown);

    const onOutsideClick = (e: MouseEvent) => {
      if (
        this._coverActiveCell &&
        this._coverOverlayEl &&
        !this._coverOverlayEl.contains(e.target as Node) &&
        !this._tbodyEl.contains(e.target as Node)
      ) {
        this._dismissCellCover();
      }
    };
    document.addEventListener('mousedown', onOutsideClick);

    this._coverCleanup = () => {
      this._tbodyEl.removeEventListener('click', onCellClick);
      this._clientEl.removeEventListener('scroll', onScroll);
      this._rootEl.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onOutsideClick);
    };
  }

  private _positionCoverOverlay(td: HTMLElement): void {
    if (!this._coverOverlayEl) return;
    const rootRect = this._rootEl.getBoundingClientRect();
    const tdRect = td.getBoundingClientRect();
    this._coverOverlayEl.style.top = `${tdRect.top - rootRect.top}px`;
    this._coverOverlayEl.style.left = `${tdRect.left - rootRect.left}px`;
    this._coverOverlayEl.style.width = `${tdRect.width}px`;
    this._coverOverlayEl.style.height = `${tdRect.height}px`;
  }

  private _dismissCellCover(): void {
    if (!this._coverOverlayEl) return;
    this._coverOverlayEl.style.display = 'none';
    this._coverOverlayEl.innerHTML = '';
    this._coverActiveCell = null;
  }

  private _destroyCellCover(): void {
    this._coverCleanup?.();
    this._coverCleanup = null;
    this._coverOverlayEl?.remove();
    this._coverOverlayEl = null;
    this._coverActiveCell = null;
  }

  // --------------- cell range selection ---------------

  private _cellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null {
    const td = document.elementFromPoint(clientX, clientY)?.closest('td.vt-td') as HTMLElement | null;
    if (!td) return null;
    const tr = td.closest('tr.vt-tr') as HTMLElement | null;
    if (!tr) return null;
    const rowKey = tr.dataset.rowKey;
    const colKey = td.dataset.colKey;
    if (rowKey == null || colKey == null) return null;
    const rowData = this._rowDataMap.get(rowKey);
    if (!rowData) return null;
    const col = this._columns.findIndex((c) => c.key === colKey);
    if (col < 0) return null;
    return { row: rowData.rowIndex, col };
  }

  private _initCellSelection(): void {
    this._selOverlayEl = document.createElement('div');
    this._selOverlayEl.className = 'vt-cell-selection-overlay';
    this._selOverlayEl.style.display = 'none';
    this._rootEl.appendChild(this._selOverlayEl);

    const EDGE_ZONE = 40;
    const SCROLL_SPEED = 8;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const cell = this._cellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      e.preventDefault();
      this._cellSelecting = true;
      this._cellSelStart = cell;
      this._cellSelEnd = cell;
      this._lastSelMouseX = e.clientX;
      this._lastSelMouseY = e.clientY;
      this._updateSelOverlay();

      this._boundSelMove = (ev: MouseEvent) => {
        this._lastSelMouseX = ev.clientX;
        this._lastSelMouseY = ev.clientY;
        const c = this._cellFromPoint(ev.clientX, ev.clientY);
        if (c) {
          this._cellSelEnd = c;
          this._updateSelOverlay();
        }
        this._calcAutoScrollDeltas(ev.clientX, ev.clientY, EDGE_ZONE, SCROLL_SPEED);
      };
      this._boundSelUp = () => {
        this._cellSelecting = false;
        this._stopAutoScroll();
        document.removeEventListener('mousemove', this._boundSelMove!);
        document.removeEventListener('mouseup', this._boundSelUp!);
        this._boundSelMove = null;
        this._boundSelUp = null;
        this._options.onCellSelectionChange?.(this.getCellSelection());
      };
      document.addEventListener('mousemove', this._boundSelMove);
      document.addEventListener('mouseup', this._boundSelUp);
    };
    this._tbodyEl.addEventListener('mousedown', onMouseDown);
    (this as any)._boundSelDown = onMouseDown;

    const onScroll = () => {
      if (this._cellSelStart && this._cellSelEnd) {
        if (this._cellSelecting) {
          const c = this._cellFromPoint(this._lastSelMouseX, this._lastSelMouseY);
          if (c) this._cellSelEnd = c;
        }
        this._updateSelOverlay();
      }
    };
    this._clientEl.addEventListener('scroll', onScroll);
    (this as any)._boundSelScroll = onScroll;
  }

  private _calcAutoScrollDeltas(clientX: number, clientY: number, zone: number, speed: number): void {
    const rect = this._clientEl.getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (clientY < rect.top + zone) {
      dy = -speed * Math.max(1, (rect.top + zone - clientY) / zone);
    } else if (clientY > rect.bottom - zone) {
      dy = speed * Math.max(1, (clientY - (rect.bottom - zone)) / zone);
    }
    if (clientX < rect.left + zone) {
      dx = -speed * Math.max(1, (rect.left + zone - clientX) / zone);
    } else if (clientX > rect.right - zone) {
      dx = speed * Math.max(1, (clientX - (rect.right - zone)) / zone);
    }

    this._autoScrollDx = dx;
    this._autoScrollDy = dy;

    if ((dx !== 0 || dy !== 0) && !this._autoScrollRaf) {
      this._startAutoScroll();
    } else if (dx === 0 && dy === 0) {
      this._stopAutoScroll();
    }
  }

  private _startAutoScroll(): void {
    const tick = () => {
      if (!this._cellSelecting) { this._stopAutoScroll(); return; }
      if (this._autoScrollDx !== 0) {
        this._clientEl.scrollLeft += this._autoScrollDx;
      }
      if (this._autoScrollDy !== 0) {
        this._clientEl.scrollTop += this._autoScrollDy;
      }
      const c = this._cellFromPoint(this._lastSelMouseX, this._lastSelMouseY);
      if (c) {
        this._cellSelEnd = c;
        this._updateSelOverlay();
      }
      this._autoScrollRaf = requestAnimationFrame(tick);
    };
    this._autoScrollRaf = requestAnimationFrame(tick);
  }

  private _stopAutoScroll(): void {
    if (this._autoScrollRaf) {
      cancelAnimationFrame(this._autoScrollRaf);
      this._autoScrollRaf = 0;
    }
    this._autoScrollDx = 0;
    this._autoScrollDy = 0;
  }

  private _updateSelOverlay(): void {
    if (!this._selOverlayEl || !this._cellSelStart || !this._cellSelEnd) return;

    const r0 = Math.min(this._cellSelStart.row, this._cellSelEnd.row);
    const r1 = Math.max(this._cellSelStart.row, this._cellSelEnd.row);
    const c0 = Math.min(this._cellSelStart.col, this._cellSelEnd.col);
    const c1 = Math.max(this._cellSelStart.col, this._cellSelEnd.col);

    const rootRect = this._rootEl.getBoundingClientRect();
    const clientRect = this._clientEl.getBoundingClientRect();

    let topPx = Infinity, leftPx = Infinity, bottomPx = -Infinity, rightPx = -Infinity;
    let found = false;

    const trs = this._tbodyEl.querySelectorAll<HTMLElement>('tr.vt-tr');
    for (const tr of trs) {
      const rowKey = tr.dataset.rowKey;
      if (!rowKey) continue;
      const rd = this._rowDataMap.get(rowKey);
      if (!rd) continue;
      if (rd.rowIndex < r0 || rd.rowIndex > r1) continue;

      const tds = tr.querySelectorAll<HTMLElement>('td.vt-td');
      for (const td of tds) {
        const colKey = td.dataset.colKey;
        if (!colKey) continue;
        const ci = this._columns.findIndex((col) => col.key === colKey);
        if (ci < c0 || ci > c1) continue;

        const rect = td.getBoundingClientRect();
        topPx = Math.min(topPx, rect.top);
        leftPx = Math.min(leftPx, rect.left);
        bottomPx = Math.max(bottomPx, rect.bottom);
        rightPx = Math.max(rightPx, rect.right);
        found = true;
      }
    }

    if (!found) {
      this._selOverlayEl.style.display = 'none';
      return;
    }

    const top = Math.max(topPx - rootRect.top, clientRect.top - rootRect.top);
    const left = Math.max(leftPx - rootRect.left, clientRect.left - rootRect.left);
    const bottom = Math.min(bottomPx - rootRect.top, clientRect.bottom - rootRect.top);
    const right = Math.min(rightPx - rootRect.left, clientRect.right - rootRect.left);

    if (bottom <= top || right <= left) {
      this._selOverlayEl.style.display = 'none';
      return;
    }

    this._selOverlayEl.style.display = '';
    this._selOverlayEl.style.top = `${top}px`;
    this._selOverlayEl.style.left = `${left}px`;
    this._selOverlayEl.style.width = `${right - left}px`;
    this._selOverlayEl.style.height = `${bottom - top}px`;
  }

  getCellSelection(): { startRow: number; startCol: number; endRow: number; endCol: number } | null {
    if (!this._cellSelStart || !this._cellSelEnd) return null;
    return {
      startRow: Math.min(this._cellSelStart.row, this._cellSelEnd.row),
      startCol: Math.min(this._cellSelStart.col, this._cellSelEnd.col),
      endRow: Math.max(this._cellSelStart.row, this._cellSelEnd.row),
      endCol: Math.max(this._cellSelStart.col, this._cellSelEnd.col),
    };
  }

  clearCellSelection(): void {
    this._cellSelStart = null;
    this._cellSelEnd = null;
    if (this._selOverlayEl) this._selOverlayEl.style.display = 'none';
    this._options.onCellSelectionChange?.(null);
  }

  private _destroyCellSelection(): void {
    this._stopAutoScroll();
    if ((this as any)._boundSelDown) {
      this._tbodyEl.removeEventListener('mousedown', (this as any)._boundSelDown);
    }
    if ((this as any)._boundSelScroll) {
      this._clientEl.removeEventListener('scroll', (this as any)._boundSelScroll);
    }
    if (this._boundSelMove) {
      document.removeEventListener('mousemove', this._boundSelMove);
    }
    if (this._boundSelUp) {
      document.removeEventListener('mouseup', this._boundSelUp);
    }
    this._selOverlayEl?.remove();
    this._selOverlayEl = null;
  }

  // --------------- search ---------------

  private _initSearch(): void {
    this._buildSearchBox();
    this._boundKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === 'f') {
        e.preventDefault();
        this._showSearchBox();
      }
    };
    this._rootEl.setAttribute('tabindex', '-1');
    this._rootEl.addEventListener('keydown', this._boundKeyDown);
  }

  private _buildSearchBox(): void {
    const box = document.createElement('div');
    box.className = 'vt-search-box';
    box.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'vt-search-input';
    input.placeholder = '搜索...';

    const counter = document.createElement('span');
    counter.className = 'vt-search-counter';
    counter.textContent = '0/0';

    const btnPrev = document.createElement('button');
    btnPrev.className = 'vt-search-btn';
    btnPrev.textContent = '▲';
    btnPrev.title = '上一个';

    const btnNext = document.createElement('button');
    btnNext.className = 'vt-search-btn';
    btnNext.textContent = '▼';
    btnNext.title = '下一个';

    const btnClose = document.createElement('button');
    btnClose.className = 'vt-search-btn vt-search-close';
    btnClose.textContent = '✕';
    btnClose.title = '关闭';

    box.appendChild(input);
    box.appendChild(counter);
    box.appendChild(btnPrev);
    box.appendChild(btnNext);
    box.appendChild(btnClose);
    this._rootEl.appendChild(box);

    this._searchBoxEl = box;
    this._searchInput = input;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    input.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this._performSearch(input.value);
        this._updateSearchCounter(counter);
      }, 200);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) this._prevMatch();
        else this._nextMatch();
        this._updateSearchCounter(counter);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this._hideSearchBox();
      }
    });

    btnPrev.addEventListener('click', () => {
      this._prevMatch();
      this._updateSearchCounter(counter);
    });
    btnNext.addEventListener('click', () => {
      this._nextMatch();
      this._updateSearchCounter(counter);
    });
    btnClose.addEventListener('click', () => this._hideSearchBox());
  }

  private _showSearchBox(): void {
    if (!this._searchBoxEl || !this._searchInput) return;
    this._searchBoxEl.style.display = '';
    this._searchInput.focus();
    this._searchInput.select();
  }

  private _hideSearchBox(): void {
    if (!this._searchBoxEl) return;
    this._searchBoxEl.style.display = 'none';
    this._clearSearchHighlights();
    this._searchMatches = [];
    this._searchCurrentIdx = -1;
    this._searchTerm = '';
    if (this._searchInput) this._searchInput.value = '';
  }

  private _performSearch(term: string): void {
    this._clearSearchHighlights();
    this._searchTerm = term;
    this._searchMatches = [];
    this._searchCurrentIdx = -1;

    if (!term) return;

    const lowerTerm = term.toLowerCase();
    const list = this._options.list ?? [];
    for (let r = 0; r < list.length; r++) {
      const row = list[r];
      for (let c = 0; c < this._columns.length; c++) {
        const val = row[this._columns[c].key];
        if (val != null && String(val).toLowerCase().includes(lowerTerm)) {
          this._searchMatches.push({ rowIndex: r, colIndex: c });
        }
      }
    }

    if (this._searchMatches.length > 0) {
      this._searchCurrentIdx = 0;
      this._navigateToMatch();
    }
  }

  private _nextMatch(): void {
    if (this._searchMatches.length === 0) return;
    this._searchCurrentIdx = (this._searchCurrentIdx + 1) % this._searchMatches.length;
    this._navigateToMatch();
  }

  private _prevMatch(): void {
    if (this._searchMatches.length === 0) return;
    this._searchCurrentIdx = (this._searchCurrentIdx - 1 + this._searchMatches.length) % this._searchMatches.length;
    this._navigateToMatch();
  }

  private _navigateToMatch(): void {
    this._clearSearchHighlights();
    if (this._searchCurrentIdx < 0 || this._searchCurrentIdx >= this._searchMatches.length) return;
    const match = this._searchMatches[this._searchCurrentIdx];
    this.scrollToCell(match.rowIndex, match.colIndex);
    requestAnimationFrame(() => this._highlightCurrentMatch());
  }

  private _highlightCurrentMatch(): void {
    if (this._searchCurrentIdx < 0) return;
    const match = this._searchMatches[this._searchCurrentIdx];
    const colKey = this._columns[match.colIndex]?.key;
    if (!colKey) return;

    const trs = this._tbodyEl.querySelectorAll<HTMLElement>('tr.vt-tr');
    for (const tr of trs) {
      const rk = tr.dataset.rowKey;
      if (!rk) continue;
      const rd = this._rowDataMap.get(rk);
      if (!rd || rd.rowIndex !== match.rowIndex) continue;
      const td = tr.querySelector<HTMLElement>(`td[data-col-key="${colKey}"]`);
      if (td) td.classList.add('vt-search-match-active');
      break;
    }
  }

  private _clearSearchHighlights(): void {
    this._tbodyEl.querySelectorAll('.vt-search-match-active').forEach((el) =>
      el.classList.remove('vt-search-match-active'),
    );
  }

  private _updateSearchCounter(counter: HTMLElement): void {
    if (this._searchMatches.length === 0) {
      counter.textContent = this._searchTerm ? '0/0' : '0/0';
    } else {
      counter.textContent = `${this._searchCurrentIdx + 1}/${this._searchMatches.length}`;
    }
  }

  private _destroySearch(): void {
    if (this._boundKeyDown) {
      this._rootEl.removeEventListener('keydown', this._boundKeyDown);
      this._boundKeyDown = null;
    }
    this._searchBoxEl?.remove();
    this._searchBoxEl = null;
    this._searchInput = null;
    this._searchMatches = [];
    this._searchCurrentIdx = -1;
  }
}
