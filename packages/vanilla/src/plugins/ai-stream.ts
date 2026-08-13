/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { VirtTableColumn } from '../index';
import { inferColumns, type InferColumnsOptions } from '../infer-columns';
import './ai-stream.css';

/**
 * 流式表格：一边收数据一边渲染。
 *
 * 现有表格库都隐含两条假设 —— 「列是预先定义好的」「数据一次性给全」。AI 应用的输出
 * 恰好两条都违反：agent 抓回来的数据事前不知道 schema，模型在逐行往外吐，量还可能很大。
 * 这个插件补的就是这两件事：
 *
 * | 缺口 | 处理 |
 * | --- | --- |
 * | 逐行 `appendRows` = 逐行走一遍数据管线 | 攒进缓冲，一帧只落一次（`flushInterval` 可改成定时） |
 * | 收到新行时视口该不该跟着走 | stick-to-bottom：在底部就跟随，用户一上滚就脱离，滚回底部自动恢复 |
 * | 列不知道长什么样 | 首批数据到达时 `inferColumns()` 推断（`autoColumns`） |
 *
 * ```ts
 * const table = new VirtTable(el, { columns: [], itemKey: 'id', plugins: [vtAIStream()] });
 *
 * // 吃任何 AsyncIterable：SSE、ReadableStream、生成器都行
 * await table.consumeAIStream(rowsFromSSE());
 *
 * // 或者手动推
 * table.startAIStream();
 * table.pushAIStreamRows([row1, row2]);
 * table.endAIStream();
 * ```
 *
 * 暴露 API：`consumeAIStream(source, opts?)` / `startAIStream()` / `pushAIStreamRows(rows)` /
 * `endAIStream()` / `abortAIStream(err?)` / `getAIStreamState()` /
 * `isAIStreamFollowingBottom()` / `setAIStreamFollowBottom(on)`
 */

export type AIStreamStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface AIStreamState {
  status: AIStreamStatus;
  /** 本轮已落到表格里的行数（不含仍在缓冲里的） */
  received: number;
  /** 仍在缓冲、等下一帧落地的行数 */
  buffered: number;
  /** 是否正跟随底部 */
  following: boolean;
  error: unknown;
}

export interface AIStreamOptions<T = any> {
  /**
   * 缓冲落地的节奏。`'raf'`（默认）= 每帧一次；给数字则按毫秒定时。
   * 一帧一次已经足够——模型吐得再快，人眼也只看得见 60fps。
   */
  flushInterval?: 'raf' | number;
  /**
   * 单次落地的行数上限，默认 500。防止一批塞进来两万行时把一帧撑爆；
   * 超出的留到下一次 flush。
   */
  maxRowsPerFlush?: number;
  /**
   * 是否在首批数据到达时推断列，默认 `'ifEmpty'`（表格当前没有列才推断）。
   * `true` = 每轮 `startAIStream()` 后的首批都重新推断；`false` = 从不推断。
   */
  autoColumns?: boolean | 'ifEmpty';
  /** 传给 `inferColumns()` 的选项（`itemKey` 会自动带上表格的） */
  inferOptions?: InferColumnsOptions;
  /** 是否自动跟随底部，默认 true */
  followBottom?: boolean;
  /**
   * 判定「在底部」的容差（px），默认 40（约一行）。
   * 动态行高下总高会被 ResizeObserver 持续修正，判定得留余量。
   */
  followThreshold?: number;
  /** 是否显示右下角的接收指示，默认 true */
  indicator?: boolean;
  /** 每次落地后触发 */
  onFlush?: (rows: T[], state: AIStreamState) => void;
  /** 状态变化时触发 */
  onStateChange?: (state: AIStreamState) => void;
}

/** `consumeAIStream` 的每个 yield 单位：一行或一批 */
export type AIStreamChunk<T> = T | T[];

export interface AIStreamConsumeOptions {
  /** 外部取消；abort 后 `consumeAIStream` 以 `AbortError` reject */
  signal?: AbortSignal;
  /** 消费完是否自动 `endAIStream()`，默认 true */
  autoEnd?: boolean;
}

export function vtAIStream<T extends Record<string, any> = any>(
  options: AIStreamOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtAIStream',
    setup(ctx: PluginContext<T>) {
      const {
        flushInterval = 'raf',
        maxRowsPerFlush = 500,
        autoColumns = 'ifEmpty',
        followBottom = true,
        followThreshold = 40,
        indicator = true,
      } = options;

      let buffer: T[] = [];
      let received = 0;
      let status: AIStreamStatus = 'idle';
      let error: unknown = null;
      let following = followBottom;
      /** 本轮是否已经推断过列 */
      let columnsInferred = false;
      let scheduled: number | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let indicatorEl: HTMLDivElement | null = null;

      const snapshot = (): AIStreamState => ({
        status,
        received,
        buffered: buffer.length,
        following,
        error,
      });

      const emitState = (): void => {
        options.onStateChange?.(snapshot());
        renderIndicator();
      };

      // ---------- 跟随底部 ----------

      /**
       * 是否停在底部。纵向滚动归 JS（见 AGENTS.md §7.13），`clientEl.scrollTop` 恒为 0，
       * 所以位置要问 `getOffset()`；总高看 `.vt-skeleton` 撑出来的 `scrollHeight`。
       */
      const atBottom = (): boolean => {
        const total = ctx.clientEl.scrollHeight;
        const view = ctx.clientEl.clientHeight;
        if (total <= view) return true; // 还没撑满一屏，永远算在底部
        return ctx.table.getOffset() + view >= total - followThreshold;
      };

      ctx.on('onScroll', () => {
        if (!followBottom) return;
        // 我们自己 scrollToBottom 触发的这次回调同样走这里 —— 那时正在底部，
        // 判定结果是 true，不会误关跟随。所以不需要额外的「是我滚的」标志位。
        const next = atBottom();
        if (next !== following) {
          following = next;
          emitState();
        }
      });

      // ---------- 落地 ----------

      const inferIfNeeded = (rows: T[]): void => {
        if (autoColumns === false || columnsInferred) return;
        if (autoColumns === 'ifEmpty' && ctx.table.getAllColumns().length > 0) {
          columnsInferred = true; // 已有列，本轮不再尝试
          return;
        }
        const cols = inferColumns(rows, {
          itemKey: ctx.getOptions().itemKey,
          ...options.inferOptions,
        }) as VirtTableColumn<T>[];
        columnsInferred = true;
        if (cols.length > 0) ctx.table.setColumns(cols);
      };

      const flush = (): void => {
        scheduled = null;
        timer = null;
        if (buffer.length === 0) return;

        const batch = buffer.length > maxRowsPerFlush ? buffer.slice(0, maxRowsPerFlush) : buffer;
        buffer = buffer.length > maxRowsPerFlush ? buffer.slice(maxRowsPerFlush) : [];

        // 列必须在数据之前就位：先 appendRows 再 setColumns 的话，首帧会拿旧列渲染一遍
        inferIfNeeded(batch);

        ctx.table.appendRows(batch);
        received += batch.length;

        if (following) ctx.table.scrollToBottom();

        options.onFlush?.(batch, snapshot());
        emitState();

        // 一批超过上限时剩下的接着排，别等下一次 push 才落
        if (buffer.length > 0) schedule();
      };

      const schedule = (): void => {
        if (scheduled !== null || timer !== null) return;
        if (flushInterval === 'raf') {
          if (typeof requestAnimationFrame === 'undefined') {
            timer = setTimeout(flush, 16);
          } else {
            scheduled = requestAnimationFrame(flush);
          }
        } else {
          timer = setTimeout(flush, flushInterval);
        }
      };

      const cancelScheduled = (): void => {
        if (scheduled !== null && typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(scheduled);
        }
        if (timer !== null) clearTimeout(timer);
        scheduled = null;
        timer = null;
      };

      // ---------- 生命周期 ----------

      const startAIStream = (): void => {
        cancelScheduled();
        buffer = [];
        received = 0;
        error = null;
        status = 'streaming';
        columnsInferred = false;
        following = followBottom;
        emitState();
      };

      const pushAIStreamRows = (rows: AIStreamChunk<T>): void => {
        const arr = Array.isArray(rows) ? rows : [rows];
        if (arr.length === 0) return;
        // 没显式 start 就直接 push 也算开始 —— 少一步仪式
        if (status !== 'streaming') {
          startAIStream();
        }
        buffer.push(...arr);
        schedule();
      };

      const endAIStream = (): void => {
        cancelScheduled();
        flush(); // 落掉尾巴，别让最后几行卡在缓冲里
        status = 'done';
        emitState();
      };

      const abortAIStream = (err?: unknown): void => {
        cancelScheduled();
        // 已经收到的行保留 —— 半截数据也是数据，清掉反而更糟
        buffer = [];
        error = err ?? null;
        status = 'error';
        emitState();
      };

      const consumeAIStream = async (
        source: AsyncIterable<AIStreamChunk<T>> | Iterable<AIStreamChunk<T>>,
        opts: AIStreamConsumeOptions = {},
      ): Promise<void> => {
        startAIStream();
        try {
          for await (const chunk of source as AsyncIterable<AIStreamChunk<T>>) {
            if (opts.signal?.aborted) {
              const e = new Error('aborted');
              e.name = 'AbortError';
              throw e;
            }
            pushAIStreamRows(chunk);
          }
          if (opts.autoEnd !== false) endAIStream();
        } catch (err) {
          abortAIStream(err);
          throw err;
        }
      };

      // ---------- 指示器 ----------

      function renderIndicator(): void {
        if (!indicator) return;
        if (status !== 'streaming' && status !== 'error') {
          indicatorEl?.remove();
          indicatorEl = null;
          return;
        }
        if (!indicatorEl) {
          indicatorEl = document.createElement('div');
          indicatorEl.className = 'vt-stream-indicator';
          ctx.rootEl.appendChild(indicatorEl);
        }
        indicatorEl.classList.toggle('vt-stream-indicator--error', status === 'error');
        indicatorEl.classList.toggle('vt-stream-indicator--paused', status === 'streaming' && !following);
        const locale = ctx.getLocale();
        if (status === 'error') {
          indicatorEl.textContent = locale.aiStream.failed;
        } else {
          indicatorEl.textContent = following
            ? locale.aiStream.receiving(received)
            : locale.aiStream.paused(received);
        }
      }

      return {
        api: {
          consumeAIStream: (source: any, opts?: AIStreamConsumeOptions) => consumeAIStream(source, opts),
          startAIStream: () => startAIStream(),
          pushAIStreamRows: (rows: AIStreamChunk<T>) => pushAIStreamRows(rows),
          endAIStream: () => endAIStream(),
          abortAIStream: (err?: unknown) => abortAIStream(err),
          getAIStreamState: () => snapshot(),
          isAIStreamFollowingBottom: () => following,
          setAIStreamFollowBottom: (on: boolean) => {
            following = on;
            if (on) ctx.table.scrollToBottom();
            emitState();
          },
        },
        destroy: () => {
          cancelScheduled();
          buffer = [];
          indicatorEl?.remove();
          indicatorEl = null;
        },
      };
    },
  };
}
