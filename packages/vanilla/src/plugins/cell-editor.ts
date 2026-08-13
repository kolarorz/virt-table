/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import './cell-editor.css';

export interface CellEditorOptions {
  /** 进入编辑的触发方式（默认 click） */
  trigger?: 'click' | 'dblclick';
  /**
   * 浮层要不要替编辑器画外观（边框、focus 环），默认 `true`。这是全表默认值，
   * 列上的 `editorChrome` 优先。
   *
   * 整张表都用第三方组件库（Element Plus / Ant Design 等）时设 `false` 最省事：
   * 那些组件自带完整外观，浮层再画一层就是两层框。详见 `VirtTableColumn.editorChrome`。
   */
  chrome?: boolean;
  /**
   * 点开一格时是否同时把它标成**激活态**（当前单元格描边）。
   *
   * 默认**开**，但装了 `vtCellSelection` 时默认**关**（见下）。显式给值一律优先。
   *
   * 为什么默认开：编辑态是会话，会消失 —— 组件选完值就关面板（单选下拉、日历），
   * 点到别处更是整个浮层收掉。此时如果单元格上什么痕迹都不留，用户看着一表数据
   * 想不起「刚改的是哪一格」。描边留在那儿就是那条痕迹。
   *
   * 为什么装了框选就默认关：那张表已经有一圈「当前单元格」了（`vtCellSelection` 的选区
   * overlay 跟着点击与键盘移动走），再画一圈的结果是**两个框都自称当前单元格**，而且它们
   * 会分家 —— 选区移到 B2，编辑留下的描边还钉在 A1。
   *
   * 开着的时候复用核心的 `.vt-active-cell-overlay`（与 `highlightSelectCell` 同一份状态、
   * 同一个浮层），所以和那个选项一起开也不会叠出两层框。
   *
   * 另一个适合显式 `false` 的场合：整表走第三方组件的裸模式（`chrome: false`）—— 那种模式
   * 刻意把外观全交给组件，再加一圈主色描边可能违背初衷。
   */
  activeCell?: boolean;
}

/** `vtCellEditor` 通过 `provide('cellEditor')` 暴露的服务（`vtKeyboardNav` 的 F2 会用） */
export interface CellEditorService {
  /** 当前是否有单元格处于编辑态 */
  isEditing(): boolean;
  /** 以编程方式打开某单元格的编辑器 */
  openAt(rowIndex: number, colIndex: number): void;
  /** 关闭编辑浮层 */
  close(): void;
}

/**
 * 单元格编辑浮层：点击（或双击）带 `renderEditor` 的单元格，在其上方盖一层编辑控件。
 *
 * ```ts
 * new VirtTable(el, {
 *   columns: [{ key: 'name', title: '姓名', width: 160, renderEditor: (ctx) => input }],
 *   plugins: [vtCellEditor()],                      // 默认单击进入
 *   // plugins: [vtCellEditor({ trigger: 'dblclick' })]
 * })
 * ```
 *
 * 关闭时机：点到别处（含表格内其它单元格）、按 Esc。
 * 关闭后会 `forceUpdate()` 让单元格显示写回后的值。
 *
 * **点开一格会同时给它打上激活态**（当前单元格描边，走核心的 `setActiveCell`）——
 * 编辑态是会消失的会话，描边留下来才回答得了「刚改的是哪一格」。见 `activeCell` 选项。
 *
 * **被编辑的行滚出渲染窗口不算关闭**：浮层只是藏起来，滚回来会带着未提交的输入原样显形
 * （并把焦点还回去）。编辑态按 `rowKey` + `colKey` 记，不绑 `<td>` 元素 —— 行 DOM 是池化
 * 复用的，绑元素会让浮层在滚动后贴到别的行上，详见下面 `active` 的注释。
 *
 * 迁成插件顺带修掉了一处浪费：以前无论列上有没有 `renderEditor`，核心都会无条件创建
 * 这个 overlay 并绑 4 个监听；现在不装插件就完全没有开销。
 *
 * 暴露 API：`openCellEditor(row, col)` / `closeCellEditor()` / `isCellEditing()`
 */
export function vtCellEditor<T extends Record<string, any> = any>(
  options: CellEditorOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtCellEditor',
    setup(ctx: PluginContext<T>) {
      const trigger = options.trigger ?? 'click';
      const defaultChrome = options.chrome ?? true;
      /**
       * 激活态归核心（`.vt-active-cell-overlay`，与 `highlightSelectCell` 共用一份状态），
       * 这里只负责「什么时候算激活」：点到哪一格就是哪一格，**与那一格能不能编辑无关**。
       *
       * 后半句是必需的：只在有 `renderEditor` 的格子上标记的话，用户点一下旁边的只读格子，
       * 描边会赖在上一格不动 —— 看起来像「激活态卡住了」。
       *
       * `inject` 放在每次触发时查、不在 setup 里定：`vtCellSelection` 可能声明在本插件
       * **之后**（两者都没声明 `requires`，安装顺序就是声明顺序），setup 阶段问会问空。
       */
      const setActive = (rowKey: string | null, colKey: string | null): void => {
        if (options.activeCell === false) return;
        // 默认值让位给框选：那张表已经有一圈会跟着走的「当前单元格」了
        if (options.activeCell === undefined && ctx.inject('cellSelection')) return;
        ctx.table.setActiveCell(rowKey, colKey);
      };

      let overlayEl: HTMLDivElement | null = document.createElement('div');
      overlayEl.className = 'vt-cell-cover';
      overlayEl.style.display = 'none';
      ctx.clientEl.appendChild(overlayEl);

      /**
       * 当前编辑态。**按 `rowKey` + `colKey` 记，不能记 `<td>` 元素**。
       *
       * 踩过的坑：原来存的是 td 元素，而行 DOM 是**池化复用**的 —— `<tr>` 会被留用、
       * `data-row-key` 被重写成另一行。于是滚动之后那个 td 已经属于别的行，浮层却还
       * 贴着它（编辑的是第 2 行的数据，框却盖在第 20 行上）；行离开渲染窗口时更糟，
       * 浮层要么被关掉、要么冻结在一个屏幕外的旧 `top`，**滚回来也回不来**。
       *
       * 按 key 记就没有这个问题：每帧按 key 重新查 td，查不到就只是「暂时不可见」。
       */
      let active: { rowKey: string; colKey: string; colIndex: number } | null = null;
      /** 被编辑的格子当前是否在渲染窗口外（浮层藏着但编辑态还在） */
      let offscreen = false;

      const cssEscape = (v: string): string =>
        typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : v.replace(/["\\]/g, '\\$&');

      /** 按 key 查承载某个单元格的 td（不在渲染窗口里就是 null） */
      const findTdBy = (rowKey: string, colKey: string): HTMLElement | null =>
        ctx.tbodyEl.querySelector(
          `tr[data-row-key="${cssEscape(rowKey)}"] td[data-col-key="${cssEscape(colKey)}"]`,
        ) as HTMLElement | null;

      /** 按 key 查当前承载被编辑单元格的 td（不在渲染窗口里就是 null） */
      const findTd = (): HTMLElement | null =>
        active ? findTdBy(active.rowKey, active.colKey) : null;

      const position = (td: HTMLElement): void => {
        if (!overlayEl) return;
        const clientRect = ctx.clientEl.getBoundingClientRect();
        const tdRect = td.getBoundingClientRect();
        // 纵向不加 scrollTop：容器的 overflow-y 是 hidden，它恒为 0；两个 rect 之差
        // 本来就是「相对容器可视区上缘」的距离。横向仍要加 —— 那边是原生 scrollport，
        // 浮层作为绝对定位子节点会随内容一起横向滚动，left 必须是内容坐标
        overlayEl.style.top = `${tdRect.top - clientRect.top}px`;
        overlayEl.style.left = `${tdRect.left - clientRect.left + ctx.clientEl.scrollLeft}px`;
        overlayEl.style.width = `${tdRect.width}px`;
        overlayEl.style.height = `${tdRect.height}px`;
      };

      /**
       * 把浮层同步到被编辑单元格的当前位置。每帧渲染完与每次滚动都要跑。
       *
       * 查不到 td 说明那一行滚出了渲染窗口 —— **只藏起来，不关闭编辑态**，滚回来还能接着编。
       * 用 `display: none` 而不是 `visibility`：前者让浮层的 rect 归零，挂在浮层里的
       * 二级弹层（`VtTextarea` 的编辑框走 `components/_popup.ts`）据此一并隐藏。
       */
      const sync = (): void => {
        if (!active || !overlayEl) return;
        const td = findTd();
        if (!td) {
          if (!offscreen) {
            offscreen = true;
            overlayEl.style.display = 'none';
          }
          return;
        }
        position(td);
        if (offscreen) {
          offscreen = false;
          overlayEl.style.display = '';
          // 藏起来时焦点已经丢了。回到视口还不还焦点决定了「看起来在编辑但打字没反应」，
          // 所以显形时补回来 —— 编辑态还开着就意味着用户正在编这一格
          const focusable = overlayEl.querySelector(
            'input, textarea, select, [contenteditable]',
          ) as HTMLElement | null;
          focusable?.focus();
        }
      };

      const dismiss = (): void => {
        if (!overlayEl) return;
        overlayEl.style.display = 'none';
        overlayEl.innerHTML = '';
        active = null;
        offscreen = false;
      };

      /** 关闭并刷新：让单元格显示写回后的新值 */
      const dismissAndRefresh = (): void => {
        if (!active) return;
        dismiss();
        ctx.table.forceUpdate();
      };

      const onCellTrigger = (e: MouseEvent): void => {
        const td = (e.target as HTMLElement).closest('td.vt-td') as HTMLElement | null;
        if (!td) { dismissAndRefresh(); return; }
        const tr = td.closest('tr.vt-tr') as HTMLElement | null;
        if (!tr) { dismissAndRefresh(); return; }

        const rowKey = tr.dataset.rowKey;
        const colKey = td.dataset.colKey;
        if (!rowKey || !colKey) { dismissAndRefresh(); return; }

        // 先落激活态：这是「用户点了哪一格」这个事实，与后面能不能开编辑器无关
        setActive(rowKey, colKey);

        const rd = ctx.getRowData(rowKey);
        if (!rd) { dismissAndRefresh(); return; }

        const columns = ctx.getColumns();
        const col = columns.find((c) => c.key === colKey);
        if (!col) { dismissAndRefresh(); return; }

        // 优先级（单元格级 > 列级）只在核心实现一次，这里不要自己读 `_cellRenders`
        const renderEditorFn = ctx.resolveCellRender(rowKey, colKey).renderEditor;
        if (!renderEditorFn) { dismissAndRefresh(); return; }

        const colIndex = columns.indexOf(col);
        // 已经在编辑同一格 → 不重建（否则会打断正在输入的内容）。
        // 按 key 比而不是按 rowIndex：排序/筛选后同一行的 rowIndex 会变
        if (active && active.rowKey === rowKey && active.colKey === colKey) return;

        /**
         * **从别的格子切过来时，那一格必须立刻重绘**。
         *
         * 用户报的 bug：在 A 格选完值、不点空白直接去点 B 格，A 格还显示旧值，要等
         * 所有编辑态都消失才更新。原因是这里以前只调 `dismiss()`（清空浮层、不刷新），
         * 只有彻底关闭走的 `dismissAndRefresh()` 才 `forceUpdate()` —— 而组件的写回
         * （`commitValue`）只改行数据、刻意不触发渲染（编辑期间格子被浮层盖着，
         * 逐次按键都重绘整帧是纯浪费）。于是「谁负责在离开一格时刷新它」这件事漏了。
         */
        const hadActive = active !== null;
        dismiss();
        if (hadActive) ctx.table.forceUpdate();

        // forceUpdate 之后这一格的内容被重填过（行 DOM 是池化复用的，元素大概率还是
        // 同一个，但不能假定），按 key 重查一次再拿它定位
        const targetTd = findTdBy(rowKey, colKey) ?? td;

        /**
         * 外观归属，**必须在调 `renderEditorFn` 之前定**：裸模式会改掉浮层子元素的高度约束
         * （`height: 100%` → `auto`），而组件常在挂载时测自己的尺寸（Element Plus 的
         * select 要算下拉宽度）。晚一步设，组件量到的就是另一套盒模型。
         */
        overlayEl!.classList.toggle(
          'vt-cell-cover--bare',
          (col.editorChrome ?? defaultChrome) === false,
        );

        const content = renderEditorFn({
          value: rd.item[col.key],
          row: rd.item,
          rowIndex: rd.rowIndex,
          column: col,
          el: overlayEl!,
        });
        if (content === null) return;

        active = { rowKey, colKey, colIndex };

        if (content instanceof HTMLElement) {
          overlayEl!.innerHTML = '';
          overlayEl!.appendChild(content);
        }
        position(targetTd);
        overlayEl!.style.display = '';
      };

      const onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && active) dismissAndRefresh();
      };

      const onOutsideClick = (e: MouseEvent): void => {
        if (!active || !overlayEl) return;
        const target = e.target as HTMLElement;
        if (overlayEl.contains(target)) return;
        if (ctx.tbodyEl.contains(target)) return;
        // 内置组件的自绘浮层（VtMultiSelect / VtAutocomplete / VtCascader）挂在 .vt-client
        // 上（与本插件的 overlay 同层，定位公式也同一套）——不在 overlay 里也不在 tbody 里，
        // 不放行的话点一下下拉项就把编辑器关掉，连锚点一起清空。
        // 基元统一打这个标记，见 components/_popup.ts
        if (target.closest?.('[data-vt-popup]')) return;
        // 第三方下拉浮层（Element Plus 等）挂在 body 上，点它不算点到外面
        if (target.closest?.('[data-popper-placement]')) return;
        if (target.closest?.('.el-popper')) return;
        dismissAndRefresh();
      };

      ctx.tbodyEl.addEventListener(trigger, onCellTrigger);
      ctx.rootEl.addEventListener('keydown', onKeyDown);
      document.addEventListener('mousedown', onOutsideClick);

      /**
       * 浮层跟随。两个钩子都要订阅，覆盖的是不同的事：
       *   - `onScroll` —— 滚动。纵向已经没有原生 scroll 事件了（见核心的 `_onVScroll`），
       *     这是唯一通知渠道。
       *   - `onRendered` —— 整帧渲染完。滚动之外还有一堆事情会换掉行 DOM（排序、筛选、
       *     `setList`、折叠展开、列宽变化），只订阅 `onScroll` 的话那些路径下浮层会留在旧位置。
       *
       * 两者都只做「按 key 重查 + 定位/隐藏」，重复调用无副作用。
       */
      ctx.on('onScroll', sync);
      ctx.on('onRendered', sync);

      const openAt = (rowIndex: number, colIndex: number): void => {
        const col = ctx.getColumns()[colIndex];
        if (!col) return;
        const row = ctx.getList()[rowIndex];
        if (!row) return;
        const rowKey = String(row[ctx.getOptions().itemKey]);
        const td = ctx.tbodyEl.querySelector(
          `tr[data-row-key="${rowKey}"] td[data-col-key="${col.key}"]`,
        ) as HTMLElement | null;
        // 复用 click 路径：派发一次触发事件，省一份重复的打开逻辑
        td?.dispatchEvent(new MouseEvent(trigger, { bubbles: true }));
      };

      const service: CellEditorService = {
        isEditing: () => active !== null,
        openAt,
        close: dismissAndRefresh,
      };
      ctx.provide('cellEditor', service);

      return {
        api: {
          openCellEditor: (rowIndex: number, colIndex: number) => openAt(rowIndex, colIndex),
          closeCellEditor: () => dismissAndRefresh(),
          isCellEditing: () => active !== null,
        },
        destroy: () => {
          ctx.tbodyEl.removeEventListener(trigger, onCellTrigger);
          ctx.rootEl.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('mousedown', onOutsideClick);
          overlayEl?.remove();
          overlayEl = null;
          active = null;
        },
      };
    },
  };
}
