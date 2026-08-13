/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { VirtTableColumn } from '../index';
import './ai-column.css';

/**
 * AI 列：一列的值由模型从同行其他列算出来，边算边写。
 *
 * **虚拟化在这件事上是决定性优势**：一列 AI 值在 10 万行表上全量跑一遍，是 10 万次模型
 * 调用；而屏幕上同时只有二十来行。所以这个插件默认**只为渲染窗口内的行付钱**，滚到哪
 * 算到哪，滚走了还没开始的直接出队、已在途的 abort。不虚拟化的表格做不到这个优化 ——
 * 它们的 DOM 里所有行都在，没有「可见」这个概念可用。
 *
 * ```ts
 * const table = new VirtTable(el, {
 *   columns,
 *   plugins: [
 *     vtAIColumn({
 *       column: { key: 'summary', title: 'AI 摘要', width: 260 },
 *       async compute(row, { signal }) {
 *         const r = await fetch('/api/summarize', {
 *           method: 'POST',
 *           body: JSON.stringify({ text: row.content }),
 *           signal,
 *         });
 *         return (await r.json()).text;
 *       },
 *     }),
 *   ],
 * });
 * ```
 *
 * `compute` 也可以返回 `AsyncIterable<string>`，逐段写进单元格（模型流式输出时
 * 一个字一个字往外冒，比转圈等着好看得多）。
 *
 * 值**不写回行数据**，存在插件自己的缓存里。行数据是使用方的，AI 生成的东西混进去
 * 之后分不清哪些是原始数据（导出、提交、对比都会踩坑）。要取用调 `getAIColumnValues()`。
 *
 * 暴露 API：`computeAIColumn(rowKeys?)` / `recomputeAIColumn(rowKey)` /
 * `clearAIColumn(rowKey?)` / `getAIColumnState(rowKey)` / `getAIColumnValues()` /
 * `getAIColumnStats()`
 */

export type AIColumnCellStatus = 'pending' | 'computing' | 'done' | 'error';

export interface AIColumnCellState {
  status: AIColumnCellStatus;
  /** 已产出的文本（流式时是「到目前为止」的片段） */
  text: string;
  error: unknown;
}

export interface AIColumnComputeContext<T> {
  /** 滚出视口或插件销毁时 abort，请透传给 fetch */
  signal: AbortSignal;
  rowKey: string;
  rowIndex: number;
  /** 当前叶子列，拼 prompt 时可能用得上 */
  columns: VirtTableColumn<T>[];
}

export interface AIColumnOptions<T extends Record<string, any> = any> {
  /**
   * 要插入的列。插件会把它追加到列树末尾；已存在同 key 的列则直接接管那一列的渲染
   * （想把 AI 列放在中间就自己在 `columns` 里先占好位置）。
   */
  column: VirtTableColumn<T>;
  /** 算一格的值。返回字符串或 `AsyncIterable<string>`（流式逐段写入） */
  compute: (row: T, ctx: AIColumnComputeContext<T>) => Promise<string> | string | AsyncIterable<string>;
  /** 同时在途的最大请求数，默认 4。模型 API 基本都有并发限制 */
  concurrency?: number;
  /**
   * 是否只算渲染窗口内的行，默认 true。
   * 设 false 则一次把当前视图的所有行排进队列 —— 只在数据量小、或你确实要全量生成时用。
   */
  visibleOnly?: boolean;
  /**
   * 是否自动开算，默认 true。设 false 则只有手动调 `computeAIColumn()` 才动
   * —— 一格一次模型调用，有些场景不该在用户只是滚过去时就花钱。
   */
  auto?: boolean;
  /** 行滚出视口时是否中止在途请求，默认 true */
  abortOnHide?: boolean;
  /** 失败的格子是否可点击重试，默认 true */
  retryable?: boolean;
  /** 单格状态变化时触发 */
  onCellChange?: (rowKey: string, state: AIColumnCellState) => void;
}

export function vtAIColumn<T extends Record<string, any> = any>(
  options: AIColumnOptions<T>,
): VirtTablePlugin<T> {
  return {
    name: 'vtAIColumn',
    setup(ctx: PluginContext<T>) {
      const {
        column,
        compute,
        concurrency = 4,
        visibleOnly = true,
        auto = true,
        abortOnHide = true,
        retryable = true,
      } = options;

      if (!column?.key || typeof compute !== 'function') {
        console.warn('[VirtTable] vtAIColumn 需要 column.key 与 compute。');
        return;
      }
      const colKey = String(column.key);

      const cells = new Map<string, AIColumnCellState>();
      const inflight = new Map<string, AbortController>();
      /** 排队中的 rowKey，按入队顺序 */
      const queue: string[] = [];
      /** 当前渲染窗口里的 rowKey，onRendered 时刷新 */
      let visible = new Set<string>();
      /**
       * 窗口外行的按 key 索引。`ctx.getRowData()` 只覆盖**渲染窗口内**的行，而
       * `visibleOnly: false` 与显式 `computeAIColumn(keys)` 要算窗口外的行，
       * 只能自己从 `getList()` 建一次索引（懒建，数据一变就失效）。
       */
      let listIndex: Map<string, { item: T; rowIndex: number }> | null = null;
      let destroyed = false;
      /**
       * 宿主构造完成前不发起任何计算。
       *
       * 首帧的 `onRendered` 在 `new VirtTable()` **还没返回**时就派发了，那时使用方的
       * `const table = new VirtTable(...)` 还在 TDZ 里 —— 回调里碰 `table` 直接
       * `Cannot access 'table' before initialization`。更要紧的是这是**花钱的调用**，
       * 不该在使用方拿到实例、有机会取消之前就发出去。
       * 所以首帧只入队，等 `onMounted`（构造函数末尾）再真正开泵。
       */
      let mounted = false;

      /** 取行数据：优先走核心的渲染窗口映射，拿不到再查全表索引 */
      const rowOf = (rowKey: string): { item: T; rowIndex: number } | undefined => {
        const rd = ctx.getRowData(rowKey);
        if (rd) return rd;
        if (!listIndex) {
          listIndex = new Map();
          const itemKey = ctx.getOptions().itemKey;
          ctx.getList().forEach((item, i) => {
            listIndex!.set(String((item as any)[itemKey]), { item, rowIndex: i });
          });
        }
        return listIndex.get(rowKey);
      };

      // ---------- 建列 ----------

      const all = ctx.table.getAllColumns();
      if (!all.some((c) => String(c.key) === colKey)) {
        ctx.table.setColumns([...all, column]);
      }

      // ---------- 渲染 ----------

      /** 找到某行该列当前的 td（行可能不在渲染窗口内 → null） */
      const tdOf = (rowKey: string): HTMLElement | null =>
        ctx.tbodyEl.querySelector<HTMLElement>(
          `tr[data-row-key="${CSS.escape(rowKey)}"] td[data-col-key="${CSS.escape(colKey)}"]`,
        );

      const paint = (td: HTMLElement, rowKey: string): void => {
        const state = cells.get(rowKey);
        const locale = ctx.getLocale();
        td.classList.remove('vt-ai-cell--computing', 'vt-ai-cell--error');
        td.removeAttribute('title');

        if (!state || state.status === 'pending') {
          td.textContent = auto ? locale.aiColumn.computing : '';
          if (auto) td.classList.add('vt-ai-cell--computing');
          return;
        }
        if (state.status === 'computing') {
          td.classList.add('vt-ai-cell--computing');
          // 流式已经吐了一部分就显示片段，否则显示占位
          td.textContent = state.text || locale.aiColumn.computing;
          return;
        }
        if (state.status === 'error') {
          td.classList.add('vt-ai-cell--error');
          td.textContent = locale.aiColumn.failed;
          const msg = state.error instanceof Error ? state.error.message : String(state.error ?? '');
          td.title = retryable ? `${msg}\n${locale.aiColumn.retry}` : msg;
          return;
        }
        td.textContent = state.text;
      };

      /** 状态变了 → 只重画那一格（整帧 forceUpdate 在流式逐字更新时开销无法接受） */
      const update = (rowKey: string, patch: Partial<AIColumnCellState>): void => {
        const prev = cells.get(rowKey) ?? { status: 'pending' as AIColumnCellStatus, text: '', error: null };
        const next = { ...prev, ...patch };
        cells.set(rowKey, next);
        const td = tdOf(rowKey);
        if (td) paint(td, rowKey);
        options.onCellChange?.(rowKey, next);
      };

      // ---------- 调度 ----------

      const pump = (): void => {
        if (!mounted) return; // 首帧只攒队列，等 onMounted 再开泵（见上）
        while (!destroyed && inflight.size < concurrency && queue.length > 0) {
          const rowKey = queue.shift()!;
          // 出队时再检查一次可见性：排队期间可能已经滚走了
          if (visibleOnly && !visible.has(rowKey)) continue;
          const state = cells.get(rowKey);
          if (state && state.status !== 'pending') continue;
          run(rowKey);
        }
      };

      const run = (rowKey: string): void => {
        const rd = rowOf(rowKey);
        if (!rd) return; // 行已不在当前视图（被筛掉了 / 数据换了）

        const controller = new AbortController();
        inflight.set(rowKey, controller);
        update(rowKey, { status: 'computing', text: '', error: null });

        const finish = (): void => {
          inflight.delete(rowKey);
          if (!destroyed) pump();
        };

        void (async () => {
          try {
            const out = compute(rd.item, {
              signal: controller.signal,
              rowKey,
              rowIndex: rd.rowIndex,
              columns: ctx.getColumns(),
            });

            if (out && typeof (out as any)[Symbol.asyncIterator] === 'function') {
              let acc = '';
              for await (const piece of out as AsyncIterable<string>) {
                if (controller.signal.aborted) return;
                acc += piece;
                update(rowKey, { status: 'computing', text: acc });
              }
              if (controller.signal.aborted) return;
              update(rowKey, { status: 'done', text: acc });
            } else {
              const text = await (out as Promise<string> | string);
              if (controller.signal.aborted) return;
              update(rowKey, { status: 'done', text: String(text ?? '') });
            }
          } catch (err) {
            if (controller.signal.aborted) return; // 主动取消不算失败
            update(rowKey, { status: 'error', text: '', error: err });
          } finally {
            finish();
          }
        })();
      };

      const enqueue = (rowKey: string): void => {
        const state = cells.get(rowKey);
        if (state && state.status !== 'pending') return; // 算过/在算/失败过都不重排
        if (inflight.has(rowKey) || queue.includes(rowKey)) return;
        cells.set(rowKey, { status: 'pending', text: '', error: null });
        queue.push(rowKey);
      };

      // ---------- 钩子 ----------

      ctx.on('onCellRendered', (td, col, item) => {
        if (String(col.key) !== colKey) return;
        const rowKey = String(item[ctx.getOptions().itemKey]);
        paint(td, rowKey);
      });

      /**
       * 整帧渲染完成：刷新可见集合，把新进来的行排进队列、把滚走的行退出去。
       * 用 `onRendered` 而不是 `onCellRendered` 逐格入队，是因为要的是**整屏的差集**
       * ——退出逻辑需要知道「谁不见了」。
       */
      ctx.on('onRendered', () => {
        if (destroyed) return;
        const next = new Set<string>();
        for (const tr of ctx.tbodyEl.querySelectorAll<HTMLElement>('tr.vt-tr')) {
          const rk = tr.dataset.rowKey;
          if (rk) next.add(rk);
        }
        const prev = visible;
        visible = next;

        if (abortOnHide) {
          for (const rowKey of prev) {
            if (next.has(rowKey)) continue;
            // 滚走了：在途的中止、排队的作废，都退回 pending 等下次进屏
            const c = inflight.get(rowKey);
            if (c) {
              c.abort();
              inflight.delete(rowKey);
              cells.delete(rowKey);
            }
            const qi = queue.indexOf(rowKey);
            if (qi >= 0) {
              queue.splice(qi, 1);
              cells.delete(rowKey);
            }
          }
        }

        if (!auto) return;
        for (const rowKey of next) enqueue(rowKey);
        pump();
      });

      // 数据换了（排序/筛选/新数据）→ 缓存里的行可能已不在，但值仍按 rowKey 有效，
      // 所以不清缓存，只重新调度
      ctx.on('onDataChanged', () => {
        listIndex = null; // 行集合变了，索引作废
        if (!destroyed && auto) pump();
      });

      ctx.on('onLocaleChanged', () => {
        for (const rowKey of visible) {
          const td = tdOf(rowKey);
          if (td) paint(td, rowKey);
        }
      });

      ctx.on('onMounted', () => {
        // 用微任务而不是直接开泵：`onMounted` 本身也是在构造函数**末尾同步**派发的，
        // 那时 `new VirtTable()` 还没返回，使用方的 `const table = ...` 依旧在 TDZ 里。
        // 微任务排在这一整段同步代码之后，赋值一定已经完成。
        queueMicrotask(() => {
          if (destroyed) return;
          mounted = true;
          pump();
        });
      });

      // 失败格点击重试
      const onClick = (e: MouseEvent): void => {
        if (!retryable) return;
        const td = (e.target as HTMLElement).closest<HTMLElement>('td.vt-ai-cell--error');
        if (!td || td.dataset.colKey !== colKey) return;
        const rowKey = td.closest<HTMLElement>('tr.vt-tr')?.dataset.rowKey;
        if (!rowKey) return;
        cells.delete(rowKey);
        enqueue(rowKey);
        pump();
      };
      ctx.tbodyEl.addEventListener('click', onClick);

      return {
        api: {
          /** 手动开算：不传就是当前渲染窗口内的行 */
          computeAIColumn: (rowKeys?: string[]) => {
            const targets = rowKeys ?? [...visible];
            for (const rowKey of targets) enqueue(rowKey);
            pump();
          },
          /** 强制重算一格（忽略缓存） */
          recomputeAIColumn: (rowKey: string) => {
            inflight.get(rowKey)?.abort();
            inflight.delete(rowKey);
            cells.delete(rowKey);
            enqueue(rowKey);
            pump();
          },
          /** 清缓存；不传 rowKey 则清全部并中止在途 */
          clearAIColumn: (rowKey?: string) => {
            if (rowKey) {
              inflight.get(rowKey)?.abort();
              inflight.delete(rowKey);
              cells.delete(rowKey);
              const td = tdOf(rowKey);
              if (td) paint(td, rowKey);
              return;
            }
            for (const c of inflight.values()) c.abort();
            inflight.clear();
            queue.length = 0;
            cells.clear();
            ctx.table.forceUpdate();
          },
          getAIColumnState: (rowKey: string): AIColumnCellState | undefined => {
            const s = cells.get(rowKey);
            return s ? { ...s } : undefined;
          },
          /** 已算出的值（rowKey → 文本），只含 done 的格子 */
          getAIColumnValues: (): Record<string, string> => {
            const out: Record<string, string> = {};
            for (const [k, v] of cells) if (v.status === 'done') out[k] = v.text;
            return out;
          },
          getAIColumnStats: () => {
            let done = 0;
            let error = 0;
            for (const v of cells.values()) {
              if (v.status === 'done') done++;
              else if (v.status === 'error') error++;
            }
            return { done, error, inflight: inflight.size, queued: queue.length };
          },
        },
        destroy: () => {
          destroyed = true;
          ctx.tbodyEl.removeEventListener('click', onClick);
          for (const c of inflight.values()) c.abort();
          inflight.clear();
          queue.length = 0;
          cells.clear();
          visible.clear();
        },
      };
    },
  };
}
