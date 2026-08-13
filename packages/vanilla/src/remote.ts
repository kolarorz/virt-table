/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SortSpec } from './pipeline';
import type { FilterModel } from './filter-model';

/**
 * 服务端数据 / 无限滚动内核：纯状态机，不碰 DOM、不发请求。
 *
 * 设计边界（重要）：
 * - **库负责**「何时该取数、取数期间的状态、取回后按什么模式并入数据」；
 * - **用户负责**「怎么取数」（axios / fetch / GraphQL / TanStack Query 都行）。
 *   因此这里没有缓存、重试策略、HTTP 包装，只有编排。
 *
 * 两个入口，同一内核：
 * - 受控层 `onLoadMore(ctx)` / `onLoadPrev(ctx)`：用户拿 ctx 自己取数，调 `ctx.done(rows, meta)`；
 * - 糖层 `loadData(req) => Promise<DataResponse>`：库替你把 Promise 接进来。
 *
 * 三条独立请求通道（可并发、各自加锁）：
 * - main：init / reload / refresh / sort / filter / page —— 结果 replace，会抢占（abort）其余通道；
 * - more：append（向下无限滚动）—— 结果 append，忙时忽略重复触发；
 * - prev：prepend（向上加载历史）—— 结果 prepend，忙时忽略重复触发。
 *
 * 分页形态不分「模式」：状态机只维护「已加载多少 / 还有没有更多 / 游标」，
 * `page / offset / cursor` 全部下发给用户，后端认哪个用哪个，零分支支持。
 */

/** 本次取数的动因 */
export type RemoteReason =
  | 'init'
  | 'reload'
  | 'refresh'
  | 'page'
  | 'sort'
  | 'filter'
  | 'append'
  | 'prepend'
  | 'retry';

/** 请求通道 */
export type RemoteChannel = 'main' | 'more' | 'prev';

/** 当前查询条件（由表格实时提供） */
export interface RemoteQuery {
  sort: SortSpec[];
  filters: Record<string, unknown[]>;
  filterModel: FilterModel;
  search: string;
}

/** 取数请求参数（`loadData` 的入参；受控层 ctx 去掉 done/fail 后与此等价） */
export interface DataRequest {
  /** 目标页码（1 基）。append 时为「即将加载的下一页」 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 偏移量：main 为 (page-1)*pageSize，append 为已加载条数，prepend 恒为 0 */
  offset: number;
  /** 向下游标（服务端上次返回的 cursor）；append 之外为 null */
  cursor: string | null;
  /** 向上游标（prepend 用） */
  prevCursor: string | null;
  /** 已加载条数 */
  loadedCount: number;
  /** 当前排序状态（manualSorting 时才有意义） */
  sort: SortSpec[];
  /** 列头筛选（manualFiltering 时才有意义） */
  filters: Record<string, unknown[]>;
  /** 高级筛选条件树 */
  filterModel: FilterModel;
  /** 搜索关键字 */
  search: string;
  /** 取数动因 */
  reason: RemoteReason;
  /** 请求通道 */
  channel: RemoteChannel;
  /** 被新请求抢占 / 表格销毁时触发，用于中断 fetch */
  signal: AbortSignal;
}

/** 服务端返回的一批数据 */
export interface DataResponse<T> {
  rows: T[];
  /** 总条数：驱动分页条与 hasMore 判定 */
  total?: number;
  /** 向下游标；返回 null 表示到底了 */
  cursor?: string | null;
  /** 向上游标；返回 null 表示没有更早的数据了 */
  prevCursor?: string | null;
  /** 显式声明是否还有更多（优先级最高） */
  hasMore?: boolean;
  /** 显式声明是否还有更早的数据 */
  hasPrev?: boolean;
  /** 服务端聚合行：server 模式下本地合计只能算已加载数据，故允许直接注入表尾 */
  footerData?: string[][];
}

/** 受控层上下文：在 DataRequest 基础上给出交付/失败两个回调 */
export interface LoadMoreContext<T> extends DataRequest {
  /**
   * 交付数据并解锁。
   * - 传 rows：按通道模式 replace / append / prepend 并入表格；
   * - 不传 rows：仅解锁（用户已自行 setList 的场景），不改 hasMore/游标。
   */
  done: (rows?: T[], meta?: Omit<DataResponse<T>, 'rows'>) => void;
  /** 标记失败并解锁：保留已加载数据，底部状态条显示错误与重试入口 */
  fail: (err?: unknown) => void;
}

/** 对外暴露的远程状态快照 */
export interface RemoteState {
  /** 已加载到第几页（1 基） */
  page: number;
  pageSize: number;
  /** 总条数；未知时为 -1 */
  total: number;
  cursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  hasPrev: boolean;
  /** 首屏 / 换参 / 翻页中（对应全屏遮罩） */
  loading: boolean;
  /** 向下追加中（对应底部状态条） */
  loadingMore: boolean;
  /** 向上追加中（对应顶部状态条） */
  loadingPrev: boolean;
  /** 最近一次失败原因；成功后清空 */
  error: unknown | null;
  /** 已加载条数 */
  loadedCount: number;
  /** 是否已完成过首次取数 */
  initialized: boolean;
}

/** 数据落地方式 */
export type CommitMode = 'replace' | 'append' | 'prepend';

/** 控制器与表格之间的适配面（表格实现它，因此内核可脱离 DOM 单测） */
export interface RemoteHost<T> {
  /** 执行取数：内部据 options 选择受控层回调或 loadData 糖层 */
  request: (ctx: LoadMoreContext<T>) => void;
  /** 数据落地：replace 换整批、append 追加、prepend 前插（含滚动补偿） */
  commit: (rows: T[], mode: CommitMode, res: Omit<DataResponse<T>, 'rows'>, reason: RemoteReason) => void;
  /** 状态变化：驱动底部状态条 / 遮罩 / 分页条 */
  onStateChange: (state: RemoteState, prev: RemoteState) => void;
  /** 读取当前查询条件 */
  getQuery: () => RemoteQuery;
}

export interface RemoteControllerOptions {
  /** 每页/每批条数（默认 50） */
  pageSize?: number;
  /** 是否启用向上加载（direction 含 'up'） */
  enablePrev?: boolean;
  /** 初始总条数（分页场景可由 pagination.total 带入） */
  total?: number;
}

/** 未知总数的哨兵值 */
export const TOTAL_UNKNOWN = -1;

/** main 通道会抢占其余通道的动因 */
const MAIN_REASONS: ReadonlySet<RemoteReason> = new Set<RemoteReason>([
  'init',
  'reload',
  'refresh',
  'page',
  'sort',
  'filter',
]);

/** 按动因判定请求通道（retry 走上次失败的通道） */
export function channelOf(reason: RemoteReason): RemoteChannel {
  if (reason === 'append') return 'more';
  if (reason === 'prepend') return 'prev';
  return 'main';
}

/**
 * 推导「是否还有更多」。优先级：
 *   ① 显式 hasMore → ② 游标（返回 null 即到底）→ ③ 总数（已加载 >= 总数）→ ④ 满页启发式
 * 三者都无信息时按「拿满一页就可能还有」处理。
 */
export function deriveHasMore(
  res: { hasMore?: boolean; cursor?: string | null; total?: number; rows: unknown[] },
  pageSize: number,
  loadedCount: number,
  knownTotal: number,
): boolean {
  if (res.hasMore !== undefined) return res.hasMore;
  if (res.cursor !== undefined) return res.cursor !== null;
  const total = res.total !== undefined ? res.total : knownTotal;
  if (total !== TOTAL_UNKNOWN) return loadedCount < total;
  return pageSize > 0 ? res.rows.length >= pageSize : res.rows.length > 0;
}

/** 推导「是否还有更早的数据」（向上加载） */
export function deriveHasPrev(
  res: { hasPrev?: boolean; prevCursor?: string | null; rows: unknown[] },
  pageSize: number,
): boolean {
  if (res.hasPrev !== undefined) return res.hasPrev;
  if (res.prevCursor !== undefined) return res.prevCursor !== null;
  return pageSize > 0 ? res.rows.length >= pageSize : res.rows.length > 0;
}

/** 单条在途请求 */
interface Inflight {
  gen: number;
  seq: number;
  abort: AbortController;
  reason: RemoteReason;
  page: number;
}

export class RemoteController<T extends Record<string, any>> {
  private _host: RemoteHost<T>;
  private _state: RemoteState;
  private _enablePrev: boolean;

  /** 代次：每次 main 请求 / reset 自增，用于作废旧代的所有在途响应 */
  private _generation = 0;
  private _seq: Record<RemoteChannel, number> = { main: 0, more: 0, prev: 0 };
  private _inflight: Record<RemoteChannel, Inflight | null> = {
    main: null,
    more: null,
    prev: null,
  };
  /** 最近一次失败的请求，供 retry 复用同样的参数 */
  private _failed: { reason: RemoteReason; page: number } | null = null;
  private _destroyed = false;

  constructor(host: RemoteHost<T>, opts: RemoteControllerOptions = {}) {
    this._host = host;
    this._enablePrev = !!opts.enablePrev;
    this._state = {
      page: 1,
      pageSize: opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 50,
      total: opts.total !== undefined && opts.total >= 0 ? opts.total : TOTAL_UNKNOWN,
      cursor: null,
      prevCursor: null,
      hasMore: true,
      hasPrev: !!opts.enablePrev,
      loading: false,
      loadingMore: false,
      loadingPrev: false,
      error: null,
      loadedCount: 0,
      initialized: false,
    };
  }

  getState(): RemoteState {
    return { ...this._state };
  }

  get pageSize(): number {
    return this._state.pageSize;
  }

  /** 是否有任意在途请求 */
  get busy(): boolean {
    return !!(this._inflight.main || this._inflight.more || this._inflight.prev);
  }

  /**
   * 发起取数。返回 false 表示被忽略（无更多数据 / 通道忙 / 已销毁）。
   * - main 类动因：抢占（abort）全部在途请求，代次 +1；
   * - append / prepend：通道忙或已到底时直接忽略（`toBottom` 每次滚动都会触发，靠这里去重）。
   */
  load(reason: RemoteReason): boolean {
    if (this._destroyed) return false;

    let actual = reason;
    if (reason === 'retry') {
      if (!this._failed) return false;
      actual = this._failed.reason;
    }

    const channel = channelOf(actual);

    if (channel === 'main') {
      // 换参/翻页必须以最新一次为准 → 抢占
      this._abortAll();
      this._generation += 1;
    } else {
      if (this._inflight[channel]) return false;
      if (channel === 'more' && !this._state.hasMore) return false;
      if (channel === 'prev' && (!this._enablePrev || !this._state.hasPrev)) return false;
      // 首屏还没取过时，向下追加等价于首屏取数
      if (channel === 'more' && !this._state.initialized && !this._inflight.main) {
        return this.load('init');
      }
    }

    const page = this._nextPage(actual);
    const seq = (this._seq[channel] += 1);
    const abort = new AbortController();
    const gen = this._generation;
    this._inflight[channel] = { gen, seq, abort, reason: actual, page };

    this._patchState(
      channel === 'main'
        ? { loading: true, error: null }
        : channel === 'more'
          ? { loadingMore: true, error: null }
          : { loadingPrev: true, error: null },
    );

    const ctx = this._buildContext(actual, channel, page, gen, seq, abort.signal);
    // request 里用户可能同步 done/fail，也可能返回 Promise；两种都由 _settle 收口
    this._host.request(ctx);
    return true;
  }

  /** 重新取第一页并清空已加载数据（换排序/筛选/pageSize 时走它） */
  reload(reason: RemoteReason = 'reload'): boolean {
    this._resetPaging();
    return this.load(reason);
  }

  /** 重拉当前已加载区间，保留滚动位置（游标分页下退化为 reload 语义） */
  refresh(): boolean {
    return this.load('refresh');
  }

  /** 到底了（由 toBottom 驱动） */
  loadMore(): boolean {
    return this.load('append');
  }

  /** 到顶了（由 toTop 驱动，仅 direction 含 'up' 时生效） */
  loadPrev(): boolean {
    return this.load('prepend');
  }

  /** 重试上次失败的请求 */
  retry(): boolean {
    return this.load('retry');
  }

  /** 跳到指定页（分页场景）：页码写入状态后重取 */
  goToPage(page: number): boolean {
    this._resetPaging();
    this._state.page = Math.max(1, Math.floor(page));
    return this.load('page');
  }

  /** 改每页条数：回到第一页重取 */
  setPageSize(pageSize: number): boolean {
    if (pageSize <= 0 || pageSize === this._state.pageSize) return false;
    this._state.pageSize = pageSize;
    return this.reload('page');
  }

  /** 外部直接改了总数（如 setTotal） */
  setTotal(total: number): void {
    this._patchState({ total: total >= 0 ? total : TOTAL_UNKNOWN });
  }

  /** 外部直接改了数据（setList / appendRows 等）时同步已加载条数 */
  syncLoadedCount(count: number): void {
    if (count === this._state.loadedCount) return;
    this._patchState({ loadedCount: Math.max(0, count) });
  }

  /**
   * 显式设置是否还有更多数据（手动模式：用户自己 appendRows 后告知库是否到底）。
   * direction 默认 'down'。
   */
  setHasMore(hasMore: boolean, direction: 'down' | 'up' = 'down'): void {
    this._patchState(direction === 'down' ? { hasMore } : { hasPrev: hasMore });
  }

  /** 显式设置游标（手动模式下推进分页） */
  setCursor(cursor: string | null, direction: 'down' | 'up' = 'down'): void {
    this._patchState(direction === 'down' ? { cursor } : { prevCursor: cursor });
  }

  /** 是否允许向上加载 */
  setEnablePrev(enable: boolean): void {
    this._enablePrev = enable;
    if (!enable) this._patchState({ hasPrev: false });
  }

  /** 清空分页游标与计数，但不发请求 */
  private _resetPaging(): void {
    this._abortAll();
    this._generation += 1;
    this._failed = null;
    this._patchState({
      page: 1,
      cursor: null,
      prevCursor: null,
      hasMore: true,
      hasPrev: this._enablePrev,
      error: null,
      loadedCount: 0,
    });
  }

  destroy(): void {
    this._destroyed = true;
    this._abortAll();
  }

  // --------------- 内部 ---------------

  private _abortAll(): void {
    for (const ch of ['main', 'more', 'prev'] as RemoteChannel[]) {
      const cur = this._inflight[ch];
      if (cur) {
        cur.abort.abort();
        this._inflight[ch] = null;
      }
    }
    this._patchState({ loading: false, loadingMore: false, loadingPrev: false });
  }

  /** 本次请求的目标页码 */
  private _nextPage(reason: RemoteReason): number {
    switch (reason) {
      case 'append':
        // 已加载 N 条 → 下一页序号（loadedCount 为准，避免 page 与数据脱节）
        return Math.floor(this._state.loadedCount / this._state.pageSize) + 1;
      case 'prepend':
      case 'refresh':
        return this._state.page;
      case 'page':
        return this._state.page;
      default:
        return 1;
    }
  }

  private _buildContext(
    reason: RemoteReason,
    channel: RemoteChannel,
    page: number,
    gen: number,
    seq: number,
    signal: AbortSignal,
  ): LoadMoreContext<T> {
    const q = this._host.getQuery();
    const { pageSize, loadedCount } = this._state;
    // refresh 从头一次性重取已加载区间（游标分页下退化为取第一批）
    const size = reason === 'refresh' ? Math.max(pageSize, loadedCount) : pageSize;
    const offset =
      channel === 'more'
        ? loadedCount
        : channel === 'prev' || reason === 'refresh'
          ? 0
          : (page - 1) * pageSize;

    let settled = false;
    const ctx: LoadMoreContext<T> = {
      page,
      pageSize: size,
      offset,
      cursor: channel === 'more' ? this._state.cursor : null,
      prevCursor: channel === 'prev' ? this._state.prevCursor : null,
      loadedCount,
      sort: q.sort,
      filters: q.filters,
      filterModel: q.filterModel,
      search: q.search,
      reason,
      channel,
      signal,
      done: (rows, meta) => {
        if (settled) return;
        settled = true;
        this._onDone(channel, gen, seq, reason, page, size, rows, meta);
      },
      fail: (err) => {
        if (settled) return;
        settled = true;
        this._onFail(channel, gen, seq, reason, page, err);
      },
    };
    return ctx;
  }

  /** 校验响应是否仍然有效（未被抢占、未被更晚的同通道请求覆盖、未销毁） */
  private _isStale(channel: RemoteChannel, gen: number, seq: number): boolean {
    if (this._destroyed) return true;
    if (gen !== this._generation) return true;
    const cur = this._inflight[channel];
    return !cur || cur.seq !== seq;
  }

  private _onDone(
    channel: RemoteChannel,
    gen: number,
    seq: number,
    reason: RemoteReason,
    page: number,
    requestedSize: number,
    rows: T[] | undefined,
    meta: Omit<DataResponse<T>, 'rows'> | undefined,
  ): void {
    if (this._isStale(channel, gen, seq)) return;
    this._inflight[channel] = null;
    this._failed = null;

    // 未交付数据：仅解锁（用户自行 setList 的场景），不动游标与 hasMore
    if (!rows) {
      this._patchState({ ...this._loadingOff(channel), error: null, initialized: true });
      return;
    }

    const res = meta ?? {};
    const mode: CommitMode =
      channel === 'more' ? 'append' : channel === 'prev' ? 'prepend' : 'replace';
    const loadedAfter =
      mode === 'replace' ? rows.length : this._state.loadedCount + rows.length;

    const next: Partial<RemoteState> = {
      ...this._loadingOff(channel),
      error: null,
      initialized: true,
      loadedCount: loadedAfter,
    };

    if (res.total !== undefined) next.total = res.total >= 0 ? res.total : TOTAL_UNKNOWN;
    if (res.cursor !== undefined) next.cursor = res.cursor;
    if (res.prevCursor !== undefined) next.prevCursor = res.prevCursor;

    const knownTotal = next.total !== undefined ? next.total : this._state.total;
    if (channel === 'prev') {
      next.hasPrev = deriveHasPrev({ ...res, rows }, requestedSize);
    } else {
      next.hasMore = deriveHasMore({ ...res, rows }, requestedSize, loadedAfter, knownTotal);
      if (channel === 'more') {
        next.page = this._pageOf(loadedAfter);
      } else {
        // main 通道：页码以本次请求的目标页为准（refresh 保持当前页）
        next.page = reason === 'refresh' ? this._state.page : page;
        // 首屏/换参后若仍允许向上加载，重置 hasPrev
        next.hasPrev = res.hasPrev ?? this._enablePrev;
      }
    }

    this._patchState(next);
    this._host.commit(rows, mode, res, reason);
  }

  private _onFail(
    channel: RemoteChannel,
    gen: number,
    seq: number,
    reason: RemoteReason,
    page: number,
    err: unknown,
  ): void {
    if (this._isStale(channel, gen, seq)) return;
    this._inflight[channel] = null;
    this._failed = { reason, page };
    this._patchState({ ...this._loadingOff(channel), error: err ?? new Error('load failed') });
  }

  private _loadingOff(channel: RemoteChannel): Partial<RemoteState> {
    if (channel === 'main') return { loading: false };
    if (channel === 'more') return { loadingMore: false };
    return { loadingPrev: false };
  }

  private _pageOf(loadedCount: number): number {
    const { pageSize } = this._state;
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(loadedCount / pageSize));
  }

  private _patchState(patch: Partial<RemoteState>): void {
    const prev = this._state;
    let changed = false;
    for (const k of Object.keys(patch) as Array<keyof RemoteState>) {
      if (patch[k] !== undefined && prev[k] !== patch[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this._state = { ...prev, ...patch };
    this._host.onStateChange(this.getState(), prev);
  }
}

/** 状态条应呈现的形态 */
export type InfiniteBarView = 'hidden' | 'loading' | 'button' | 'error' | 'done';

/**
 * 由远程状态推导状态条形态（纯函数，DOM 只负责搬运）。优先级：
 *   加载中 > 失败 > 还有更多（自动模式无需提示 → hidden，手动模式给按钮）> 到底
 * 首屏空数据时不显示「没有更多」——空态由 `.vt-empty` 表达，两者叠加是噪音。
 */
export function infiniteBarView(o: {
  loading: boolean;
  hasMore: boolean;
  error: boolean;
  /** 已加载条数为 0 */
  empty: boolean;
  /** 手动模式（只给按钮，不自动触发） */
  manual: boolean;
  /** 是否显示「没有更多」 */
  showNoMore: boolean;
}): InfiniteBarView {
  if (o.loading) return 'loading';
  if (o.error) return 'error';
  if (o.hasMore) return o.manual ? 'button' : 'hidden';
  if (o.empty || !o.showNoMore) return 'hidden';
  return 'done';
}

/** 从受控层上下文里剥出纯请求参数（去掉 done/fail），供回调透出与 loadData 调用 */
export function toRequest<T extends Record<string, any>>(ctx: LoadMoreContext<T>): DataRequest {
  const { done, fail, ...req } = ctx as LoadMoreContext<T> & Record<string, unknown>;
  void done;
  void fail;
  return req as DataRequest;
}

/**
 * 把 `loadData(req) => Promise<DataResponse>` 糖层适配成受控层执行器。
 * Promise reject → ctx.fail；resolve 但用户没交付（返回 void）→ ctx.done() 仅解锁。
 */
export function runLoadData<T extends Record<string, any>>(
  loadData: (req: DataRequest) => Promise<DataResponse<T>> | DataResponse<T>,
  ctx: LoadMoreContext<T>,
): void {
  const { done, fail } = ctx;
  try {
    const ret = loadData(toRequest(ctx));
    if (ret && typeof (ret as Promise<DataResponse<T>>).then === 'function') {
      (ret as Promise<DataResponse<T>>).then(
        (res) => {
          if (ctx.signal.aborted) return;
          if (res && Array.isArray(res.rows)) {
            const { rows, ...meta } = res;
            done(rows, meta);
          } else {
            done();
          }
        },
        (err) => {
          if (ctx.signal.aborted) return;
          fail(err);
        },
      );
    } else if (ret && Array.isArray((ret as DataResponse<T>).rows)) {
      const { rows, ...meta } = ret as DataResponse<T>;
      done(rows, meta);
    } else {
      done();
    }
  } catch (err) {
    fail(err);
  }
}

/**
 * 把受控层回调的返回值收口：
 * - 返回 Promise 且 reject → 自动 fail；
 * - 返回 Promise 且 resolve 但用户没调 done/fail → 自动解锁（视为用户已自行落数据）。
 */
export function settleControlled<T extends Record<string, any>>(
  ret: void | Promise<void>,
  ctx: LoadMoreContext<T>,
): void {
  if (ret && typeof (ret as Promise<void>).then === 'function') {
    (ret as Promise<void>).then(
      () => {
        if (!ctx.signal.aborted) ctx.done();
      },
      (err) => {
        if (!ctx.signal.aborted) ctx.fail(err);
      },
    );
  }
}
