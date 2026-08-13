/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import {
  RemoteController,
  deriveHasMore,
  deriveHasPrev,
  infiniteBarView,
  channelOf,
  runLoadData,
  settleControlled,
  TOTAL_UNKNOWN,
  type LoadMoreContext,
  type RemoteState,
  type CommitMode,
  type DataRequest,
  type DataResponse,
} from './remote';

interface Row extends Record<string, any> {
  id: number;
}

const rows = (from: number, count: number): Row[] =>
  Array.from({ length: count }, (_, i) => ({ id: from + i }));

/** 建一个受控 host：请求不自动完成，测试里手动 done/fail，便于观察竞态 */
function setup(opts: { pageSize?: number; enablePrev?: boolean; total?: number } = {}) {
  const pending: LoadMoreContext<Row>[] = [];
  const commits: Array<{ rows: Row[]; mode: CommitMode; reason: string }> = [];
  const states: RemoteState[] = [];
  let query = {
    sort: [] as any[],
    filters: {} as Record<string, unknown[]>,
    filterModel: null as any,
    search: '',
  };

  const ctrl = new RemoteController<Row>(
    {
      request: (ctx) => pending.push(ctx),
      commit: (r, mode, _res, reason) => commits.push({ rows: r, mode, reason }),
      onStateChange: (s) => states.push(s),
      getQuery: () => query,
    },
    { pageSize: opts.pageSize ?? 10, enablePrev: opts.enablePrev, total: opts.total },
  );

  return {
    ctrl,
    pending,
    commits,
    states,
    setQuery: (q: Partial<typeof query>) => {
      query = { ...query, ...q };
    },
    /** 取出第 n 个在途请求 */
    at: (i: number) => pending[i],
    last: () => pending[pending.length - 1],
  };
}

describe('deriveHasMore', () => {
  it('显式 hasMore 优先级最高', () => {
    expect(deriveHasMore({ rows: [], hasMore: true }, 10, 0, 100)).toBe(true);
    expect(deriveHasMore({ rows: rows(0, 10), hasMore: false }, 10, 10, TOTAL_UNKNOWN)).toBe(false);
  });

  it('游标为 null 即到底', () => {
    expect(deriveHasMore({ rows: rows(0, 10), cursor: 'abc' }, 10, 10, TOTAL_UNKNOWN)).toBe(true);
    expect(deriveHasMore({ rows: rows(0, 10), cursor: null }, 10, 10, TOTAL_UNKNOWN)).toBe(false);
  });

  it('按总数判定（含响应内 total 与已知 total 两种来源）', () => {
    expect(deriveHasMore({ rows: rows(0, 10), total: 25 }, 10, 10, TOTAL_UNKNOWN)).toBe(true);
    expect(deriveHasMore({ rows: rows(0, 10), total: 10 }, 10, 10, TOTAL_UNKNOWN)).toBe(false);
    expect(deriveHasMore({ rows: rows(0, 10) }, 10, 10, 30)).toBe(true);
    expect(deriveHasMore({ rows: rows(0, 5) }, 10, 30, 30)).toBe(false);
    // total 为 0 也是「已知」，不能退化到满页启发式
    expect(deriveHasMore({ rows: [], total: 0 }, 10, 0, TOTAL_UNKNOWN)).toBe(false);
  });

  it('无任何元信息时用满页启发式', () => {
    expect(deriveHasMore({ rows: rows(0, 10) }, 10, 10, TOTAL_UNKNOWN)).toBe(true);
    expect(deriveHasMore({ rows: rows(0, 7) }, 10, 7, TOTAL_UNKNOWN)).toBe(false);
    expect(deriveHasMore({ rows: [] }, 10, 0, TOTAL_UNKNOWN)).toBe(false);
  });
});

describe('deriveHasPrev', () => {
  it('显式 > 游标 > 满页', () => {
    expect(deriveHasPrev({ rows: [], hasPrev: true }, 10)).toBe(true);
    expect(deriveHasPrev({ rows: rows(0, 10), prevCursor: null }, 10)).toBe(false);
    expect(deriveHasPrev({ rows: rows(0, 10), prevCursor: 'p' }, 10)).toBe(true);
    expect(deriveHasPrev({ rows: rows(0, 3) }, 10)).toBe(false);
  });
});

describe('channelOf', () => {
  it('append/prepend 各走独立通道，其余走 main', () => {
    expect(channelOf('append')).toBe('more');
    expect(channelOf('prepend')).toBe('prev');
    for (const r of ['init', 'reload', 'refresh', 'page', 'sort', 'filter'] as const) {
      expect(channelOf(r)).toBe('main');
    }
  });
});

describe('RemoteController 基础取数', () => {
  it('init 请求参数正确，交付后落 replace 并进入 initialized', () => {
    const h = setup({ pageSize: 10 });
    expect(h.ctrl.load('init')).toBe(true);
    const ctx = h.at(0);
    expect(ctx.page).toBe(1);
    expect(ctx.pageSize).toBe(10);
    expect(ctx.offset).toBe(0);
    expect(ctx.reason).toBe('init');
    expect(ctx.channel).toBe('main');
    expect(h.ctrl.getState().loading).toBe(true);

    ctx.done(rows(1, 10), { total: 30 });
    const s = h.ctrl.getState();
    expect(s.loading).toBe(false);
    expect(s.initialized).toBe(true);
    expect(s.loadedCount).toBe(10);
    expect(s.total).toBe(30);
    expect(s.hasMore).toBe(true);
    expect(h.commits).toEqual([{ rows: rows(1, 10), mode: 'replace', reason: 'init' }]);
  });

  it('append 用已加载条数算 offset/page，落 append 模式', () => {
    const h = setup({ pageSize: 10 });
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { total: 30 });

    expect(h.ctrl.loadMore()).toBe(true);
    const ctx = h.at(1);
    expect(ctx.reason).toBe('append');
    expect(ctx.channel).toBe('more');
    expect(ctx.offset).toBe(10);
    expect(ctx.page).toBe(2);
    expect(h.ctrl.getState().loadingMore).toBe(true);
    expect(h.ctrl.getState().loading).toBe(false); // 追加不点亮全屏遮罩

    ctx.done(rows(11, 10));
    const s = h.ctrl.getState();
    expect(s.loadedCount).toBe(20);
    expect(s.page).toBe(2);
    expect(s.loadingMore).toBe(false);
    expect(h.commits[1]).toEqual({ rows: rows(11, 10), mode: 'append', reason: 'append' });
  });

  it('首屏未取数就触发 toBottom 时退化为 init', () => {
    const h = setup();
    expect(h.ctrl.loadMore()).toBe(true);
    expect(h.at(0).reason).toBe('init');
    expect(h.pending).toHaveLength(1);
  });
});

describe('RemoteController 重复触发去重（toBottom 每次滚动都会 emit）', () => {
  it('在途时重复 loadMore 全部忽略', () => {
    const h = setup();
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10));

    expect(h.ctrl.loadMore()).toBe(true);
    for (let i = 0; i < 20; i++) expect(h.ctrl.loadMore()).toBe(false);
    expect(h.pending).toHaveLength(2);

    h.at(1).done(rows(11, 10));
    expect(h.ctrl.loadMore()).toBe(true); // 解锁后可继续
    expect(h.pending).toHaveLength(3);
  });

  it('hasMore=false 后不再发请求', () => {
    const h = setup({ pageSize: 10 });
    h.ctrl.load('init');
    h.at(0).done(rows(1, 4)); // 不满页 → 到底
    expect(h.ctrl.getState().hasMore).toBe(false);
    expect(h.ctrl.loadMore()).toBe(false);
    expect(h.pending).toHaveLength(1);
  });

  it('done 幂等：重复交付只生效一次', () => {
    const h = setup();
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10));
    h.at(0).done(rows(99, 10));
    h.at(0).fail(new Error('late'));
    expect(h.commits).toHaveLength(1);
    expect(h.ctrl.getState().error).toBeNull();
  });
});

describe('RemoteController 竞态', () => {
  it('快速切筛选：只有最后一次响应被采用，先前的响应被丢弃', () => {
    const h = setup();
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { total: 100 });

    h.setQuery({ filters: { a: [1] } });
    h.ctrl.reload('filter');
    h.setQuery({ filters: { a: [2] } });
    h.ctrl.reload('filter');

    // 第一次 filter 请求迟到 → 必须被丢弃
    h.at(1).done(rows(500, 10));
    expect(h.commits).toHaveLength(1);

    h.at(2).done(rows(200, 10));
    expect(h.commits).toHaveLength(2);
    expect(h.commits[1].rows[0].id).toBe(200);
  });

  it('main 抢占 append：换参后旧的追加响应作废', () => {
    const h = setup();
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { total: 100 });
    h.ctrl.loadMore();
    expect(h.ctrl.getState().loadingMore).toBe(true);

    h.ctrl.reload('sort'); // 抢占
    expect(h.ctrl.getState().loadingMore).toBe(false);
    expect(h.at(1).signal.aborted).toBe(true);

    h.at(1).done(rows(11, 10)); // 迟到的追加
    expect(h.commits).toHaveLength(1);

    h.at(2).done(rows(50, 10));
    expect(h.commits[1].mode).toBe('replace');
    expect(h.ctrl.getState().loadedCount).toBe(10);
  });

  it('抢占会 abort 旧请求的 signal', () => {
    const h = setup();
    h.ctrl.load('init');
    const first = h.at(0);
    h.ctrl.reload('reload');
    expect(first.signal.aborted).toBe(true);
    expect(h.at(1).signal.aborted).toBe(false);
  });

  it('销毁后所有响应都不再写状态', () => {
    const h = setup();
    h.ctrl.load('init');
    const ctx = h.at(0);
    h.ctrl.destroy();
    expect(ctx.signal.aborted).toBe(true);
    ctx.done(rows(1, 10));
    expect(h.commits).toHaveLength(0);
    expect(h.ctrl.load('init')).toBe(false);
  });
});

describe('RemoteController 错误与重试', () => {
  it('失败保留已加载数据，retry 复用同一动因', () => {
    const h = setup();
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { total: 100 });
    h.ctrl.loadMore();
    const err = new Error('boom');
    h.at(1).fail(err);

    const s = h.ctrl.getState();
    expect(s.error).toBe(err);
    expect(s.loadingMore).toBe(false);
    expect(s.loadedCount).toBe(10); // 数据没丢

    expect(h.ctrl.retry()).toBe(true);
    expect(h.at(2).reason).toBe('append');
    expect(h.at(2).offset).toBe(10);

    h.at(2).done(rows(11, 10));
    expect(h.ctrl.getState().error).toBeNull();
    expect(h.ctrl.getState().loadedCount).toBe(20);
  });

  it('没有失败记录时 retry 不发请求', () => {
    const h = setup();
    expect(h.ctrl.retry()).toBe(false);
    expect(h.pending).toHaveLength(0);
  });

  it('fail 时未指定错误也会置位 error', () => {
    const h = setup();
    h.ctrl.load('init');
    h.at(0).fail();
    expect(h.ctrl.getState().error).toBeInstanceOf(Error);
  });
});

describe('RemoteController 分页语义', () => {
  it('goToPage 走 main 通道并给出正确 offset', () => {
    const h = setup({ pageSize: 20, total: 100 });
    h.ctrl.load('init');
    h.at(0).done(rows(1, 20), { total: 100 });

    h.ctrl.goToPage(3);
    const ctx = h.at(1);
    expect(ctx.reason).toBe('page');
    expect(ctx.page).toBe(3);
    expect(ctx.offset).toBe(40);
    ctx.done(rows(41, 20), { total: 100 });
    const s = h.ctrl.getState();
    expect(s.page).toBe(3);
    expect(s.loadedCount).toBe(20); // replace 语义
  });

  it('setPageSize 回到第一页并清空计数', () => {
    const h = setup({ pageSize: 10 });
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { total: 100 });
    h.ctrl.loadMore();
    h.at(1).done(rows(11, 10));
    expect(h.ctrl.getState().loadedCount).toBe(20);

    expect(h.ctrl.setPageSize(50)).toBe(true);
    expect(h.ctrl.getState().loadedCount).toBe(0);
    expect(h.ctrl.getState().page).toBe(1);
    expect(h.last().pageSize).toBe(50);
    expect(h.last().offset).toBe(0);

    expect(h.ctrl.setPageSize(50)).toBe(false); // 同值不重取
  });

  it('refresh 一次性重取已加载区间且保持页码', () => {
    const h = setup({ pageSize: 10 });
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { total: 100 });
    h.ctrl.loadMore();
    h.at(1).done(rows(11, 10));

    h.ctrl.refresh();
    const ctx = h.last();
    expect(ctx.reason).toBe('refresh');
    expect(ctx.pageSize).toBe(20); // = max(pageSize, loadedCount)
    expect(ctx.offset).toBe(0);
    ctx.done(rows(1, 20), { total: 100 });
    expect(h.ctrl.getState().page).toBe(2);
    expect(h.ctrl.getState().loadedCount).toBe(20);
  });

  it('setTotal / syncLoadedCount 外部同步', () => {
    const h = setup();
    h.ctrl.setTotal(42);
    expect(h.ctrl.getState().total).toBe(42);
    h.ctrl.setTotal(-1);
    expect(h.ctrl.getState().total).toBe(TOTAL_UNKNOWN);
    h.ctrl.syncLoadedCount(7);
    expect(h.ctrl.getState().loadedCount).toBe(7);
  });
});

describe('RemoteController 向上加载', () => {
  it('未启用时 loadPrev 无效', () => {
    const h = setup();
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10));
    expect(h.ctrl.loadPrev()).toBe(false);
  });

  it('启用后 prepend 与 append 可并发，互不加锁', () => {
    const h = setup({ enablePrev: true, pageSize: 10 });
    h.ctrl.load('init');
    h.at(0).done(rows(11, 10), { cursor: 'c2', prevCursor: 'p0' });

    expect(h.ctrl.loadMore()).toBe(true);
    expect(h.ctrl.loadPrev()).toBe(true);
    expect(h.pending).toHaveLength(3);
    expect(h.at(1).cursor).toBe('c2');
    expect(h.at(2).prevCursor).toBe('p0');
    expect(h.at(2).offset).toBe(0);

    const s1 = h.ctrl.getState();
    expect(s1.loadingMore).toBe(true);
    expect(s1.loadingPrev).toBe(true);

    h.at(2).done(rows(1, 10), { prevCursor: null });
    h.at(1).done(rows(21, 10), { cursor: null });

    const s2 = h.ctrl.getState();
    expect(s2.loadedCount).toBe(30);
    expect(s2.hasPrev).toBe(false);
    expect(s2.hasMore).toBe(false);
    expect(h.commits.map((c) => c.mode)).toEqual(['replace', 'prepend', 'append']);
  });

  it('到顶后不再重复请求', () => {
    const h = setup({ enablePrev: true });
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { hasPrev: false });
    expect(h.ctrl.loadPrev()).toBe(false);
  });

  it('setHasMore / setCursor 手动控制两个方向的闸门与游标', () => {
    const h = setup({ enablePrev: true });
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10));

    h.ctrl.setHasMore(false);
    expect(h.ctrl.getState().hasMore).toBe(false);
    expect(h.ctrl.loadMore()).toBe(false);
    h.ctrl.setHasMore(true);
    expect(h.ctrl.loadMore()).toBe(true);

    h.ctrl.setHasMore(false, 'up');
    expect(h.ctrl.getState().hasPrev).toBe(false);
    expect(h.ctrl.loadPrev()).toBe(false);

    h.ctrl.setCursor('c9');
    h.ctrl.setCursor('p9', 'up');
    expect(h.ctrl.getState().cursor).toBe('c9');
    expect(h.ctrl.getState().prevCursor).toBe('p9');
  });

  it('setEnablePrev(false) 关闭向上加载', () => {
    const h = setup({ enablePrev: true });
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { prevCursor: 'p' });
    h.ctrl.setEnablePrev(false);
    expect(h.ctrl.getState().hasPrev).toBe(false);
    expect(h.ctrl.loadPrev()).toBe(false);
  });
});

describe('RemoteController 仅解锁交付', () => {
  it('done() 不带数据时只解锁，不动 commit 与游标', () => {
    const h = setup();
    h.ctrl.load('init');
    h.at(0).done(rows(1, 10), { cursor: 'c1' });
    h.ctrl.loadMore();
    h.at(1).done(); // 用户自行 setList

    const s = h.ctrl.getState();
    expect(s.loadingMore).toBe(false);
    expect(s.cursor).toBe('c1');
    expect(s.loadedCount).toBe(10);
    expect(h.commits).toHaveLength(1);
    expect(h.ctrl.loadMore()).toBe(true); // 已解锁
  });
});

describe('状态变更通知', () => {
  it('仅在状态真正变化时通知', () => {
    const h = setup();
    const before = h.states.length;
    h.ctrl.syncLoadedCount(0); // 同值
    expect(h.states.length).toBe(before);
    h.ctrl.syncLoadedCount(5);
    expect(h.states.length).toBe(before + 1);
  });
});

describe('infiniteBarView 状态条形态', () => {
  const base = {
    loading: false,
    hasMore: true,
    error: false,
    empty: false,
    manual: false,
    showNoMore: true,
  };

  it('加载中优先于一切', () => {
    expect(infiniteBarView({ ...base, loading: true, error: true })).toBe('loading');
  });

  it('失败态优先于「还有更多」', () => {
    expect(infiniteBarView({ ...base, error: true })).toBe('error');
  });

  it('自动模式下「还有更多」无需提示，手动模式给按钮', () => {
    expect(infiniteBarView(base)).toBe('hidden');
    expect(infiniteBarView({ ...base, manual: true })).toBe('button');
  });

  it('到底了显示「没有更多」，可关闭', () => {
    expect(infiniteBarView({ ...base, hasMore: false })).toBe('done');
    expect(infiniteBarView({ ...base, hasMore: false, showNoMore: false })).toBe('hidden');
  });

  it('首屏空数据不显示「没有更多」（避免与空态叠加）', () => {
    expect(infiniteBarView({ ...base, hasMore: false, empty: true })).toBe('hidden');
  });
});

describe('runLoadData 糖层适配', () => {
  it('Promise resolve → done(rows, meta)', async () => {
    const h = setup();
    const loadData = vi.fn(
      async (req: DataRequest): Promise<DataResponse<Row>> => ({
        rows: rows(req.offset + 1, 10),
        total: 100,
        cursor: 'next',
      }),
    );
    const ctrl = new RemoteController<Row>(
      {
        request: (ctx) => runLoadData(loadData, ctx),
        commit: (r, mode) => h.commits.push({ rows: r, mode, reason: 'x' }),
        onStateChange: () => { },
        getQuery: () => ({ sort: [], filters: {}, filterModel: null, search: '' }),
      },
      { pageSize: 10 },
    );

    ctrl.load('init');
    await vi.waitFor(() => expect(h.commits).toHaveLength(1));
    expect(ctrl.getState().total).toBe(100);
    expect(ctrl.getState().cursor).toBe('next');
    // loadData 拿到的是纯 DataRequest（无 done/fail）
    expect(loadData.mock.calls[0][0]).not.toHaveProperty('done');
  });

  it('Promise reject → fail', async () => {
    const states: RemoteState[] = [];
    const ctrl = new RemoteController<Row>(
      {
        request: (ctx) => runLoadData(() => Promise.reject(new Error('net')), ctx),
        commit: () => { },
        onStateChange: (s) => states.push(s),
        getQuery: () => ({ sort: [], filters: {}, filterModel: null, search: '' }),
      },
      {},
    );
    ctrl.load('init');
    await vi.waitFor(() => expect(ctrl.getState().error).toBeInstanceOf(Error));
    expect(ctrl.getState().loading).toBe(false);
  });

  it('同步抛错 → fail', () => {
    const ctrl = new RemoteController<Row>(
      {
        request: (ctx) =>
          runLoadData(() => {
            throw new Error('sync');
          }, ctx),
        commit: () => { },
        onStateChange: () => { },
        getQuery: () => ({ sort: [], filters: {}, filterModel: null, search: '' }),
      },
      {},
    );
    ctrl.load('init');
    expect(ctrl.getState().error).toBeInstanceOf(Error);
  });

  it('同步返回响应对象也支持', () => {
    const commits: CommitMode[] = [];
    const ctrl = new RemoteController<Row>(
      {
        request: (ctx) => runLoadData(() => ({ rows: rows(1, 3) }), ctx),
        commit: (_r, mode) => commits.push(mode),
        onStateChange: () => { },
        getQuery: () => ({ sort: [], filters: {}, filterModel: null, search: '' }),
      },
      {},
    );
    ctrl.load('init');
    expect(commits).toEqual(['replace']);
  });
});

describe('settleControlled 受控层收口', () => {
  it('返回的 Promise resolve 但未交付 → 自动解锁', async () => {
    const h = setup();
    const ctrl = new RemoteController<Row>(
      {
        request: (ctx) => settleControlled(Promise.resolve(), ctx),
        commit: (r, mode) => h.commits.push({ rows: r, mode, reason: 'y' }),
        onStateChange: () => { },
        getQuery: () => ({ sort: [], filters: {}, filterModel: null, search: '' }),
      },
      {},
    );
    ctrl.load('init');
    await vi.waitFor(() => expect(ctrl.getState().loading).toBe(false));
    expect(ctrl.getState().initialized).toBe(true);
    expect(h.commits).toHaveLength(0);
  });

  it('返回的 Promise reject → 自动 fail', async () => {
    const ctrl = new RemoteController<Row>(
      {
        request: (ctx) => settleControlled(Promise.reject(new Error('x')), ctx),
        commit: () => { },
        onStateChange: () => { },
        getQuery: () => ({ sort: [], filters: {}, filterModel: null, search: '' }),
      },
      {},
    );
    ctrl.load('init');
    await vi.waitFor(() => expect(ctrl.getState().error).toBeInstanceOf(Error));
  });

  it('返回 void（用户同步调 done）时不干预', () => {
    const commits: CommitMode[] = [];
    const ctrl = new RemoteController<Row>(
      {
        request: (ctx) => {
          ctx.done(rows(1, 2));
          settleControlled(undefined, ctx);
        },
        commit: (_r, mode) => commits.push(mode),
        onStateChange: () => { },
        getQuery: () => ({ sort: [], filters: {}, filterModel: null, search: '' }),
      },
      {},
    );
    ctrl.load('init');
    expect(commits).toEqual(['replace']);
  });
});
