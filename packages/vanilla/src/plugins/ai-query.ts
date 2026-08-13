/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { VirtTableState } from '../index';
import {
  type AIQuery,
  type AIQueryIssue,
  type AITableSchema,
  type AITableSchemaOptions,
  aiQueryToState,
  buildAIPromptContext,
  buildAITableSchema,
  toAIToolJsonSchema,
  validateAIQuery,
} from '../ai-query';
import './ai-query.css';

/**
 * 自然语言查询插件：一句话 → 筛选 / 排序 / 列显隐。
 *
 * **本插件不发网络请求，也不认识任何模型厂商。** 它做两端：
 * 把表格能被怎么查描述成 schema（`resolve` 的入参），再把模型吐回来的 JSON
 * 校验、纠错、经 `setState()` 一次性落地。中间那步调模型由你实现：
 *
 * ```ts
 * new VirtTable(el, {
 *   columns,
 *   plugins: [
 *     vtAIQuery({
 *       async resolve({ text, prompt, jsonSchema, signal }) {
 *         // 打到你自己的后端，别把 key 放前端
 *         const r = await fetch('/api/table-query', {
 *           method: 'POST',
 *           headers: { 'content-type': 'application/json' },
 *           body: JSON.stringify({ text, prompt, jsonSchema }),
 *           signal,
 *         });
 *         return r.json();   // 形状见 AIQuery
 *       },
 *     }),
 *   ],
 * });
 * ```
 *
 * 这么切分的理由和 `remote.ts` 做成受控层一致：key 不该落前端，企业自研网关、
 * 服务端代理、本地模型都得能接，插件也就不该绑任何 SDK。
 *
 * 暴露 API：`askAITable(text)` / `applyAIQuery(query)` / `undoAIQuery()` /
 * `getAITableSchema()` / `getAIPromptContext()` / `getAIToolSchema()` /
 * `openAIQueryBar()` / `closeAIQueryBar()` / `toggleAIQueryBar()`
 */

/** `resolve` 的入参：一次查询所需的全部上下文 */
export interface AIQueryResolveInput {
  /** 用户输入的自然语言 */
  text: string;
  /** 结构化的表格描述（列、值域、算子、枚举候选） */
  schema: AITableSchema;
  /** 拼好的 prompt 上下文，可直接塞进 system message */
  prompt: string;
  /** 可直接用作 tool / function calling `input_schema` 的 JSON Schema */
  jsonSchema: Record<string, unknown>;
  /** 输入条被关闭或发起新一轮查询时会 abort，请透传给 fetch */
  signal: AbortSignal;
}

export interface AIQueryResult {
  /** 校验规范化后的查询 */
  query: AIQuery;
  /** 校验诊断；`error` 级表示对应片段已被丢弃 */
  issues: AIQueryIssue[];
  /** 是否真的改动了表格 */
  applied: boolean;
  /** 模型返回的原始内容，排查时用 */
  raw: unknown;
}

export interface AIQueryOptions {
  /** 把自然语言交给模型，返回符合 `AIQuery` 形状的对象（或其 JSON 字符串） */
  resolve: (input: AIQueryResolveInput) => Promise<unknown>;
  /** 是否挂载输入条 UI，默认 `true`。关掉则只能用 `askAITable()` 命令式调用 */
  ui?: boolean;
  /**
   * 唤出输入条的快捷键，默认 `'mod+k'`（`mod` = Cmd/Ctrl）；传 `null` 关闭。
   * 与 `vtSearch` 的 Ctrl/Cmd+F 不冲突。
   */
  hotkey?: string | null;
  /** 生成 schema 的选项（可注入 `now` 让相对时间可测、限制枚举候选条数） */
  schema?: AITableSchemaOptions;
  /**
   * 应用前的确认。返回 `false` 则不应用（可用于先给用户看 `explanation` 再决定）。
   * 默认直接应用。
   */
  confirm?: (result: Omit<AIQueryResult, 'applied'>) => boolean | Promise<boolean>;
  /** 每次解析完成后触发，无论是否应用 */
  onResult?: (result: AIQueryResult) => void;
  /** `resolve` 抛错时触发（`AbortError` 不会触发） */
  onError?: (err: unknown) => void;
}

/** 应用前的现场快照，供撤销 */
interface Snapshot {
  state: VirtTableState;
  searchTerm: string;
}

/** 解析 `'mod+k'` 这类快捷键描述；`mod` 同时匹配 Cmd 与 Ctrl */
function matchHotkey(e: KeyboardEvent, spec: string): boolean {
  const parts = spec.toLowerCase().split('+').map((p) => p.trim());
  const key = parts[parts.length - 1];
  if (e.key.toLowerCase() !== key) return false;
  const need = new Set(parts.slice(0, -1));
  if (need.has('mod') && !(e.metaKey || e.ctrlKey)) return false;
  if (need.has('ctrl') && !e.ctrlKey) return false;
  if (need.has('meta') && !e.metaKey) return false;
  if (need.has('shift') !== e.shiftKey) return false;
  if (need.has('alt') !== e.altKey) return false;
  return true;
}

export function vtAIQuery<T extends Record<string, any> = any>(options: AIQueryOptions): VirtTablePlugin<T> {
  return {
    name: 'vtAIQuery',
    setup(ctx: PluginContext<T>) {
      if (typeof options?.resolve !== 'function') {
        console.warn('[VirtTable] vtAIQuery 需要 resolve 回调（把自然语言交给你自己的模型服务）。');
      }

      let panelEl: HTMLDivElement | null = null;
      let inputEl: HTMLInputElement | null = null;
      let submitEl: HTMLButtonElement | null = null;
      let feedbackEl: HTMLDivElement | null = null;
      let snapshot: Snapshot | null = null;
      let pending: AbortController | null = null;

      // ---------- schema ----------

      const schemaOf = (): AITableSchema =>
        buildAITableSchema(ctx.table.getLeafColumns(), options.schema ?? {});

      // ---------- 应用与撤销 ----------

      /**
       * 落地查询。整趟只调一次 `setState`——它内部已经批量提交（一次列重建 +
       * 一次管线重算），拆成多个 setter 会白白多算几遍。
       */
      const apply = (query: AIQuery): boolean => {
        const current = ctx.table.getState();
        const next = aiQueryToState(query, ctx.table.getLeafColumns(), current.version);
        // 除 version 外没有任何字段 = 只有 search，不必走 setState
        const hasViewChange = Object.keys(next).length > 1;
        if (!hasViewChange && query.search === undefined) return false;

        snapshot = { state: current, searchTerm: ctx.table.getSearchTerm() };
        if (hasViewChange) ctx.table.setState(next);
        // search 不是可持久化视图状态，不在 VirtTableState 里，单独落
        if (query.search !== undefined) ctx.table.setSearchTerm(query.search);
        return true;
      };

      const undo = (): boolean => {
        if (!snapshot) return false;
        ctx.table.setState(snapshot.state);
        ctx.table.setSearchTerm(snapshot.searchTerm);
        snapshot = null;
        renderFeedback(null);
        return true;
      };

      // ---------- 主流程 ----------

      const ask = async (text: string): Promise<AIQueryResult> => {
        // 新一轮查询作废上一轮：用户改了主意，旧请求的结果落下来只会打架
        pending?.abort();
        const controller = new AbortController();
        pending = controller;

        setBusy(true);
        try {
          const schema = schemaOf();
          const raw = await options.resolve({
            text,
            schema,
            prompt: buildAIPromptContext(schema),
            jsonSchema: toAIToolJsonSchema(schema),
            signal: controller.signal,
          });

          // 请求回来时可能已经被下一轮作废
          if (controller.signal.aborted) {
            return { query: {}, issues: [], applied: false, raw };
          }

          const { query, issues, actionable } = validateAIQuery(
            raw,
            ctx.table.getLeafColumns(),
            options.schema ?? {},
          );

          let applied = false;
          if (actionable) {
            const ok = options.confirm ? await options.confirm({ query, issues, raw }) : true;
            if (ok && !controller.signal.aborted) applied = apply(query);
          }

          const result: AIQueryResult = { query, issues, applied, raw };
          options.onResult?.(result);
          renderFeedback(result);
          return result;
        } catch (err) {
          if (controller.signal.aborted) {
            return { query: {}, issues: [], applied: false, raw: null };
          }
          options.onError?.(err);
          renderError(err);
          throw err;
        } finally {
          if (pending === controller) {
            pending = null;
            setBusy(false);
          }
        }
      };

      // ---------- UI ----------

      const setBusy = (busy: boolean): void => {
        if (!submitEl || !inputEl) return;
        submitEl.disabled = busy;
        submitEl.textContent = busy ? ctx.getLocale().aiQuery.thinking : ctx.getLocale().aiQuery.submit;
        inputEl.readOnly = busy;
        panelEl?.classList.toggle('vt-ai-panel--busy', busy);
      };

      const renderError = (err: unknown): void => {
        if (!feedbackEl) return;
        const msg = err instanceof Error ? err.message : String(err);
        feedbackEl.className = 'vt-ai-feedback vt-ai-feedback--error';
        feedbackEl.textContent = ctx.getLocale().aiQuery.failed + msg;
      };

      const renderFeedback = (result: AIQueryResult | null): void => {
        if (!feedbackEl) return;
        feedbackEl.className = 'vt-ai-feedback';
        feedbackEl.textContent = '';
        if (!result) return;

        const locale = ctx.getLocale();

        if (!result.applied && !result.query.explanation) {
          feedbackEl.classList.add('vt-ai-feedback--error');
          feedbackEl.textContent = locale.aiQuery.noResult;
          return;
        }

        if (result.query.explanation) {
          const say = document.createElement('span');
          say.className = 'vt-ai-explanation';
          say.textContent = result.query.explanation;
          feedbackEl.appendChild(say);
        }

        if (result.issues.length > 0) {
          const details = document.createElement('details');
          details.className = 'vt-ai-issues';
          const summary = document.createElement('summary');
          summary.textContent = locale.aiQuery.issues(result.issues.length);
          details.appendChild(summary);
          const ul = document.createElement('ul');
          for (const issue of result.issues) {
            const li = document.createElement('li');
            li.className = `vt-ai-issue vt-ai-issue--${issue.level}`;
            li.textContent = issue.path ? `${issue.path}：${issue.message}` : issue.message;
            ul.appendChild(li);
          }
          details.appendChild(ul);
          feedbackEl.appendChild(details);
        }

        if (result.applied) {
          const undoBtn = document.createElement('button');
          undoBtn.type = 'button';
          undoBtn.className = 'vt-ai-undo';
          undoBtn.textContent = locale.aiQuery.undo;
          undoBtn.addEventListener('click', undo);
          feedbackEl.appendChild(undoBtn);
        }
      };

      const submit = (): void => {
        const text = inputEl?.value.trim();
        if (!text) return;
        // 输入条里的失败已经渲染进反馈区，不必再冒泡成未捕获的 rejection
        ask(text).catch(() => {});
      };

      const buildPanel = (): void => {
        const locale = ctx.getLocale();
        const panel = document.createElement('div');
        panel.className = 'vt-ai-panel';
        panel.style.display = 'none';

        const row = document.createElement('div');
        row.className = 'vt-ai-row';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'vt-ai-input';
        input.placeholder = locale.aiQuery.placeholder;

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'vt-ai-submit';
        submitBtn.textContent = locale.aiQuery.submit;

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'vt-ai-btn';
        closeBtn.textContent = '✕';
        closeBtn.title = locale.aiQuery.close;

        const feedback = document.createElement('div');
        feedback.className = 'vt-ai-feedback';

        row.append(input, submitBtn, closeBtn);
        panel.append(row, feedback);
        ctx.rootEl.appendChild(panel);

        panelEl = panel;
        inputEl = input;
        submitEl = submitBtn;
        feedbackEl = feedback;

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        });
        submitBtn.addEventListener('click', submit);
        closeBtn.addEventListener('click', close);
      };

      const open = (): void => {
        if (!panelEl || !inputEl) return;
        panelEl.style.display = '';
        inputEl.focus();
        inputEl.select();
      };

      const close = (): void => {
        // 关掉输入条等于放弃这一轮，在途请求没有落点了
        pending?.abort();
        pending = null;
        setBusy(false);
        if (!panelEl) return;
        panelEl.style.display = 'none';
        renderFeedback(null);
      };

      if (options.ui !== false) buildPanel();

      const hotkey = options.hotkey === undefined ? 'mod+k' : options.hotkey;
      const onKeyDown = (e: KeyboardEvent): void => {
        if (!hotkey || !panelEl) return;
        if (!matchHotkey(e, hotkey)) return;
        e.preventDefault();
        if (panelEl.style.display === 'none') open();
        else close();
      };
      if (hotkey && options.ui !== false) {
        ctx.rootEl.setAttribute('tabindex', '-1');
        ctx.rootEl.addEventListener('keydown', onKeyDown);
      }

      // 文案变了要重建：placeholder 与按钮文字都是构建时写死的（同 vtSearch）
      ctx.on('onLocaleChanged', () => {
        if (!panelEl) return;
        const wasOpen = panelEl.style.display === '';
        const keep = inputEl?.value ?? '';
        panelEl.remove();
        panelEl = inputEl = submitEl = feedbackEl = null as any;
        buildPanel();
        if (inputEl) (inputEl as HTMLInputElement).value = keep;
        if (wasOpen) open();
      });

      return {
        api: {
          askAITable: (text: string) => ask(text),
          applyAIQuery: (query: AIQuery) => {
            const validation = validateAIQuery(query, ctx.table.getLeafColumns(), options.schema ?? {});
            const applied = validation.actionable ? apply(validation.query) : false;
            const result: AIQueryResult = { ...validation, applied, raw: query };
            renderFeedback(result);
            return result;
          },
          undoAIQuery: () => undo(),
          getAITableSchema: () => schemaOf(),
          getAIPromptContext: () => buildAIPromptContext(schemaOf()),
          getAIToolSchema: () => toAIToolJsonSchema(schemaOf()),
          openAIQueryBar: () => open(),
          closeAIQueryBar: () => close(),
          toggleAIQueryBar: () => {
            if (!panelEl) return;
            if (panelEl.style.display === 'none') open();
            else close();
          },
        },
        destroy: () => {
          pending?.abort();
          pending = null;
          ctx.rootEl.removeEventListener('keydown', onKeyDown);
          panelEl?.remove();
          panelEl = inputEl = submitEl = feedbackEl = null as any;
          snapshot = null;
        },
      };
    },
  };
}
