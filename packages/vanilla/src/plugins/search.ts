/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import './search.css';

export interface SearchMatch {
  rowIndex: number;
  colIndex: number;
}

export interface SearchOptions<T = any> {
  /** 输入防抖（ms，默认 200） */
  debounce?: number;
  /**
   * 自定义匹配：返回该行该列是否命中。默认按 `String(value).toLowerCase().includes(term)`。
   * 服务端搜索场景下可返回 false 关掉本地匹配，只让搜索词进 `RemoteQuery.search`。
   */
  matcher?: (value: unknown, term: string, row: T, colKey: string) => boolean;
  /** 命中项变化时触发（跳转前） */
  onMatchChange?: (current: SearchMatch | null, matches: SearchMatch[]) => void;
}

const ACTIVE_CLASS = 'vt-search-match-active';

function defaultMatcher(value: unknown, lowerTerm: string): boolean {
  return value != null && String(value).toLowerCase().includes(lowerTerm);
}

/**
 * 表内搜索插件：Ctrl/Cmd+F 唤出搜索框，命中项高亮并自动滚动到位。
 *
 * ```ts
 * new VirtTable(el, { columns, plugins: [vtSearch()] })
 * ```
 *
 * 搜索词会写回核心（`table.setSearchTerm`），因此服务端模式下它会进
 * `RemoteQuery.search`；但**不会**自动触发重新取数，需要时自行 `reload()`。
 *
 * 暴露 API：`openSearch()` / `closeSearch()` / `search(term)` /
 * `nextMatch()` / `prevMatch()` / `getSearchMatches()`
 */
export function vtSearch<T extends Record<string, any> = any>(
  options: SearchOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtSearch',
    setup(ctx: PluginContext<T>) {
      let boxEl: HTMLDivElement | null = null;
      let inputEl: HTMLInputElement | null = null;
      let counterEl: HTMLElement | null = null;
      let matches: SearchMatch[] = [];
      let currentIdx = -1;
      let term = '';
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      // ---------- 高亮 ----------

      const clearHighlights = (): void => {
        ctx.tbodyEl
          .querySelectorAll(`.${ACTIVE_CLASS}`)
          .forEach((el) => el.classList.remove(ACTIVE_CLASS));
      };

      /**
       * 给当前命中项加高亮。命中行可能不在渲染窗口内（虚拟滚动），
       * 因此只能遍历已渲染的行去找 rowIndex 对得上的那一行。
       */
      const highlightCurrent = (): void => {
        if (currentIdx < 0) return;
        const match = matches[currentIdx];
        const colKey = ctx.getColumns()[match.colIndex]?.key;
        if (!colKey) return;

        for (const tr of ctx.tbodyEl.querySelectorAll<HTMLElement>('tr.vt-tr')) {
          const rk = tr.dataset.rowKey;
          if (!rk) continue;
          const rd = ctx.getRowData(rk);
          if (!rd || rd.rowIndex !== match.rowIndex) continue;
          tr.querySelector<HTMLElement>(`td[data-col-key="${colKey}"]`)?.classList.add(ACTIVE_CLASS);
          break;
        }
      };

      const updateCounter = (): void => {
        if (!counterEl) return;
        counterEl.textContent =
          matches.length === 0 ? '0/0' : `${currentIdx + 1}/${matches.length}`;
      };

      // ---------- 跳转 ----------

      const navigateToMatch = (): void => {
        clearHighlights();
        options.onMatchChange?.(matches[currentIdx] ?? null, matches);
        if (currentIdx < 0 || currentIdx >= matches.length) return;
        const match = matches[currentIdx];
        ctx.table.scrollToCell(match.rowIndex, match.colIndex);
        // 滚动会重建行 DOM，等下一帧再打高亮
        requestAnimationFrame(highlightCurrent);
      };

      const nextMatch = (): void => {
        if (matches.length === 0) return;
        currentIdx = (currentIdx + 1) % matches.length;
        navigateToMatch();
        updateCounter();
      };

      const prevMatch = (): void => {
        if (matches.length === 0) return;
        currentIdx = (currentIdx - 1 + matches.length) % matches.length;
        navigateToMatch();
        updateCounter();
      };

      // ---------- 匹配 ----------

      const performSearch = (next: string): void => {
        clearHighlights();
        term = next;
        // 搜索词是查询状态，交回核心（服务端模式下会进 RemoteQuery.search）
        ctx.table.setSearchTerm(next);
        matches = [];
        currentIdx = -1;

        if (!next) {
          updateCounter();
          options.onMatchChange?.(null, matches);
          return;
        }

        const lowerTerm = next.toLowerCase();
        const list = ctx.getList();
        const columns = ctx.getColumns();
        for (let r = 0; r < list.length; r++) {
          const row = list[r];
          for (let c = 0; c < columns.length; c++) {
            const colKey = columns[c].key;
            const value = row[colKey];
            const hit = options.matcher
              ? options.matcher(value, next, row, colKey)
              : defaultMatcher(value, lowerTerm);
            if (hit) matches.push({ rowIndex: r, colIndex: c });
          }
        }

        if (matches.length > 0) {
          currentIdx = 0;
          navigateToMatch();
        } else {
          options.onMatchChange?.(null, matches);
        }
        updateCounter();
      };

      // ---------- 搜索框 ----------

      const buildBox = (): void => {
        const locale = ctx.getLocale();
        const box = document.createElement('div');
        box.className = 'vt-search-box';
        box.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'vt-search-input';
        input.placeholder = locale.search.placeholder;

        const counter = document.createElement('span');
        counter.className = 'vt-search-counter';
        counter.textContent = '0/0';

        const btnPrev = document.createElement('button');
        btnPrev.className = 'vt-search-btn';
        btnPrev.textContent = '▲';
        btnPrev.title = locale.search.prev;

        const btnNext = document.createElement('button');
        btnNext.className = 'vt-search-btn';
        btnNext.textContent = '▼';
        btnNext.title = locale.search.next;

        const btnClose = document.createElement('button');
        btnClose.className = 'vt-search-btn vt-search-close';
        btnClose.textContent = '✕';
        btnClose.title = locale.search.close;

        box.append(input, counter, btnPrev, btnNext, btnClose);
        ctx.rootEl.appendChild(box);

        boxEl = box;
        inputEl = input;
        counterEl = counter;

        input.addEventListener('input', () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => performSearch(input.value), options.debounce ?? 200);
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) prevMatch();
            else nextMatch();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            closeBox();
          }
        });

        btnPrev.addEventListener('click', prevMatch);
        btnNext.addEventListener('click', nextMatch);
        btnClose.addEventListener('click', closeBox);
      };

      const openBox = (): void => {
        if (!boxEl || !inputEl) return;
        boxEl.style.display = '';
        inputEl.focus();
        inputEl.select();
      };

      const closeBox = (): void => {
        if (!boxEl) return;
        boxEl.style.display = 'none';
        clearHighlights();
        matches = [];
        currentIdx = -1;
        term = '';
        ctx.table.setSearchTerm('');
        if (inputEl) inputEl.value = '';
        updateCounter();
      };

      buildBox();

      const onKeyDown = (e: KeyboardEvent): void => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
          e.preventDefault();
          openBox();
        }
      };
      ctx.rootEl.setAttribute('tabindex', '-1');
      ctx.rootEl.addEventListener('keydown', onKeyDown);

      // 数据变了，之前算出的命中索引就失效了——重算而不是留着错的
      ctx.on('onDataChanged', () => {
        if (term) performSearch(term);
      });

      // 文案变了要重建搜索框（placeholder / 按钮 title 都在构建时写死）
      ctx.on('onLocaleChanged', () => {
        const wasOpen = boxEl?.style.display === '';
        const keepTerm = inputEl?.value ?? '';
        boxEl?.remove();
        boxEl = null;
        inputEl = null;
        counterEl = null;
        buildBox();
        if (inputEl) (inputEl as HTMLInputElement).value = keepTerm;
        updateCounter();
        if (wasOpen) openBox();
      });

      return {
        api: {
          /** 打开搜索框并聚焦 */
          openSearch: () => openBox(),
          /** 关闭搜索框并清空命中态与搜索词 */
          closeSearch: () => closeBox(),
          /** 直接以某个词搜索（会打开搜索框并同步输入内容） */
          search: (nextTerm: string) => {
            openBox();
            if (inputEl) inputEl.value = nextTerm;
            performSearch(nextTerm);
          },
          nextMatch: () => nextMatch(),
          prevMatch: () => prevMatch(),
          /** 当前全部命中项（副本） */
          getSearchMatches: () => matches.slice(),
        },
        destroy: () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          ctx.rootEl.removeEventListener('keydown', onKeyDown);
          clearHighlights();
          boxEl?.remove();
          boxEl = null;
          inputEl = null;
          counterEl = null;
          matches = [];
        },
      };
    },
  };
}
