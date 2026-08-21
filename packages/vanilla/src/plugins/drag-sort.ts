/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { VirtTableColumn } from '../index';
import { startDrag, swallowNextClick, isPrimaryPointer } from '../internal/drag';
import { createAutoScroll } from '../internal/auto-scroll';
import { isDataColumn } from '../internal/column';

/**
 * 拖拽排序：列拖拽（`vtColumnDrag`）与行拖拽（`vtRowDrag`）。
 *
 * 两者都只负责**手势、跟随光标的 ghost、落点指示线**；真正的重排交给核心的
 * `moveColumn()` / `moveRow()`（它们依赖列树与 `_originList` 原始顺序）。
 *
 * 样式在 `drag-sort.css`。注：`.vt-drag-handle`（`type:'drag'` 列里的手柄图标）
 * 由核心渲染、样式也在核心——它是列内容，不是拖拽交互的一部分。
 */
import './drag-sort.css';

/**
 * 拖拽进行中屏蔽触摸滚动输入。
 *
 * 一根手指同时产生 touch 与 pointer 两套事件：拖拽吃 pointer，而底下的 `touchmove`
 * 会冒泡给 `InputController`（表头与表体都是它的输入源）—— 于是拖拽的同时表格还在滚。
 * 挂在 `document` 的**捕获**阶段 `stopPropagation`，事件就到不了表头与视口；
 * 只拦不 `preventDefault`（那是 `touch-action` 的活）。
 *
 * 两个拖拽都要：列拖拽横滑会横滚表格，行拖拽**横移是用来改插入层级的**，同样不能顺带横滚。
 */
function createTouchGuard(): { hold: () => void; release: () => void } {
  let swallow: ((e: Event) => void) | null = null;
  return {
    hold: () => {
      if (swallow) return;
      swallow = (ev: Event): void => ev.stopPropagation();
      document.addEventListener('touchmove', swallow, { capture: true, passive: true });
    },
    release: () => {
      if (!swallow) return;
      document.removeEventListener('touchmove', swallow, { capture: true });
      swallow = null;
    },
  };
}

/**
 * 拖拽时跟随光标的标签。
 *
 * ⚠️ 必须挂在 `.vt-root` 里，**不能挂 body**：ghost 的样式全走 `--vt-*` 变量，
 * 而这些变量只声明在 `.vt-root` / `.vt-fb` 上，body 的子节点继承不到 —— 那几条
 * 声明会整条失效，ghost 变成「透明底 + 16px 黑字」（实测过）。
 * `position: fixed` 挂在 root 里依然按视口定位，也不会被 root 的 `overflow: hidden`
 * 裁掉（没有 transform 之类的祖先建立定位上下文），所以拖到表格外面照样可见。
 */
function createGhost(parent: HTMLElement, className: string, label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = label;
  parent.appendChild(el);
  return el;
}

// ============================================================================
// 列拖拽
// ============================================================================

export interface ColumnDragOptions {
  /** 从表头发起拖拽时要忽略的元素选择器（默认排除列宽手柄、筛选/排序图标、输入框） */
  ignoreSelector?: string;
}

const DEFAULT_IGNORE = '.vt-resize-trigger, .vt-filter-icon, .vt-sort-icon, input';

/**
 * 列拖拽排序：按住表头拖动换列序。
 *
 * ```ts
 * new VirtTable(el, { columns, plugins: [vtColumnDrag()] })
 * ```
 *
 * 限制（与核心 `moveColumn` 一致）：
 * - 有合并单元格（`merges`）时整体禁用——合并按绝对列号，换序会错位
 * - 多级分组表头下只允许**同一父分组内**换位，跨分组会改变表头结构
 */
export function vtColumnDrag<T extends Record<string, any> = any>(
  options: ColumnDragOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtColumnDrag',
    setup(ctx: PluginContext<T>) {
      const ignore = options.ignoreSelector ?? DEFAULT_IGNORE;
      let ghost: HTMLElement | null = null;
      let line: HTMLElement | null = null;

      const touch = createTouchGuard();

      const cleanup = (): void => {
        touch.release();
        ghost?.remove();
        ghost = null;
        line?.remove();
        line = null;
      };

      /** 指针 X 处的叶子列表头格。只认带 data-col-key 的格子——正好排除分组格与留白格 */
      const columnAtPoint = (clientX: number): { colKey: string; rect: DOMRect } | null => {
        const ths = ctx.theadEl.querySelectorAll<HTMLElement>('th.vt-th[data-col-key]');
        for (const th of ths) {
          const rect = th.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right) {
            return { colKey: th.dataset.colKey!, rect };
          }
        }
        return null;
      };

      const begin = (e: PointerEvent, col: VirtTableColumn<T>): void => {
        startDrag(e, {
          /**
           * 只有横向主导的手势才是「换列序」。
           *
           * 列拖拽从整个表头单元格发起，而表头现在也能触摸滚动（它是 `InputController`
           * 的输入源）—— 不做方向门控的话，触屏上在表头纵滑会同时拽起一列并滚表格。
           * 纵滑在这里作废，正好落回滚动；横滑照旧拖列（`.vt-th--draggable` 的
           * `touch-action` 把浏览器挡在外面，滚动那边的轴锁也会判定为横向）。
           */
          axis: 'x',
          onStart: () => {
            touch.hold();
            ghost = createGhost(ctx.rootEl, 'vt-col-drag-ghost', col.title ?? col.key);
            line = document.createElement('div');
            line.className = 'vt-col-drop-line';
            line.style.display = 'none';
            ctx.rootEl.appendChild(line);
          },
          onMove: (ev) => {
            if (ghost) {
              ghost.style.left = `${ev.clientX + 8}px`;
              ghost.style.top = `${ev.clientY + 8}px`;
            }
            if (!line) return;
            const target = columnAtPoint(ev.clientX);
            // 拖回原处 → 不显示指示线
            if (!target || target.colKey === col.key) {
              line.style.display = 'none';
              return;
            }
            const rootRect = ctx.rootEl.getBoundingClientRect();
            const insertAfter = ev.clientX > target.rect.left + target.rect.width / 2;
            line.style.left = `${(insertAfter ? target.rect.right : target.rect.left) - rootRect.left}px`;
            line.style.display = 'block';
          },
          onDrop: (ev) => {
            const target = columnAtPoint(ev.clientX);
            cleanup();
            swallowNextClick(); // 否则松手那下会触发表头排序
            if (!target || target.colKey === col.key) return;
            const insertAfter = ev.clientX > target.rect.left + target.rect.width / 2;
            ctx.table.moveColumn(col.key, target.colKey, insertAfter);
          },
          onCancel: cleanup,
        });
      };

      ctx.on('onHeaderCellRendered', (th, col) => {
        // 合并单元格下禁用；功能列（勾选等）与显式关掉的列不参与换序
        if (ctx.getOptions().merges?.length) return;
        if (col.type) return;
        if (col.draggable === false) return;
        th.classList.add('vt-th--draggable');
        th.addEventListener('pointerdown', (e) => {
          if (!isPrimaryPointer(e)) return;
          if ((e.target as HTMLElement).closest(ignore)) return;
          begin(e, col as VirtTableColumn<T>);
        });
      });

      return { destroy: cleanup };
    },
  };
}

// ============================================================================
// 行拖拽
// ============================================================================

export interface RowDragOptions<T extends Record<string, any> = any> {
  /**
   * 整行可拖，默认 `false`（只有 `type:'drag'` 手柄列能发起）。
   *
   * 开了之后表体任意位置都能起拖，但有三条门槛：
   *
   * - **触屏不启用** —— 表体的单指手势语义是「滚动表格」（纵向由核心的 InputController
   *   接管）。抢这一下等于把滚动废掉；触屏要拖行仍然走手柄，所以手柄列别删。
   * - **避开交互内容**（输入框、按钮、链接、可编辑区）：在那些上面按下是要用它们。
   *   内置组件的展示层（标签、头像）不算 —— 那些格子照旧能拖，点开浮层走的是 `click`。
   * - **与 `vtCellSelection` 不宜同装**：一次表体按下要么拖行、要么框选，两个都装等于
   *   同时起手两个手势。
   *
   * 手柄仍然值得留着：它是「这一行能拖」的可见提示，也是触屏上唯一的入口。
   */
  wholeRow?: boolean;
  /**
   * 允许跨层级（默认 true）。
   *
   * `false` 时退化成「同级拖拽」：只能在**同一父级的兄弟之间**换位，落点只有上/下两档，
   * 没有「成为子节点」也没有层级箭头 —— 对应 virt-list 的 `crossLevelDraggable: false`。
   * 树的形状拖不坏，代价是搬家得靠别的手段。
   */
  crossLevel?: boolean;
  /** 悬停在折叠节点中段多久自动展开（ms，默认 500；`0` 关闭） */
  hoverExpandDelay?: number;
  /** 这一行能不能被拖起来（默认都能） */
  canDrag?: (row: T) => boolean;
  /**
   * 能不能落进这个父级。`parent` 是新父级（数据行 / 分组行），落到根层时为 `null`。
   * 返回 false 时连指示线都不画。
   */
  allowDropInto?: (parent: T | null, row: T) => boolean;
}

/**
 * 整行发起时要避开的东西：在这些上面按下是要**用**它们，不是要拖行。
 *
 * 只列真正的表单控件与链接。内置单元格组件的展示层（`VtTag` 的标签、`VtPerson` 的头像）
 * 刻意不排除 —— 它们靠 `click` 打开浮层，与「按住拖」不冲突，而把它们排掉会让「带组件的列
 * 整列拖不动」，那才是意外。
 */
const WHOLE_ROW_SKIP = 'input,textarea,select,button,a,[contenteditable="true"]';

/** 落点：父级 + 前一个兄弟（与核心 `moveRowTo` 同一套语义） */
interface DropSpot {
  parentKey: string | null;
  prevKey: string | null;
}

/**
 * 层级提示线要画的东西。`min`/`max` 是相邻两行给出的可选层级区间，`target` 是当前选中的那一层。
 *
 * 线不是「从目标层级起点画到右边」那么简单：它整条从第 1 层起点开始，分成 `max` 段，
 * 已经走过的层级（`min` ~ `target-1`）画成淡色、目标层级起点插一个箭头、之后画成实色。
 * 这样光看线就知道「现在插在第几层、还能往左往右调几格」——与 virt-list 的 `dragLine` 一致。
 */
interface LinePlan {
  /** 线的纵向位置（视口坐标） */
  y: number;
  /** 第 1 层缩进的左边缘（视口坐标） */
  originX: number;
  min: number;
  max: number;
  target: number;
}

/** 扁平列表里一行的位置 */
interface FlatRow<T> {
  item: T;
  idx: number;
}

/**
 * 行拖拽排序：拖 `type:'drag'` 手柄列换行序，**树形与分组下同样可用**。
 *
 * ```ts
 * const columns = [{ key: '_drag', title: '', width: 44, type: 'drag' }, …];
 * new VirtTable(el, { columns, plugins: [vtRowDrag()] });
 * ```
 *
 * 落点模型抄的是 virt-list 的树形拖拽（`/tree/tree-drag`）：指针在目标行内的**纵向**
 * 位置分三档 —— 上 1/3 插到它前面、下 1/3 插到它后面、中间 1/3 **成为它的子节点**；
 * 落在行与行之间时，指针的**横向**位置决定插到第几层（层级箭头跟着走，可选范围夹在
 * 相邻两行的层级之间）。悬停在折叠节点的中段会自动展开。
 *
 * 分组表里分组行也参与这套模型：落进分组 B，核心就把该行的分组字段改写成 B 的取值，
 * 行随即出现在 B 下的落点位置（分组是从字段值派生的，改字段才是改分组）。
 *
 * 真正改数据的是核心 `moveRowTo()`；本插件只负责手势、ghost、指示线与**落点归约**
 * （把「指针在哪」算成「父级 + 前一个兄弟」）。**排序 / 筛选 / 自动合并下整体停用**
 * （核心 `canReorderRows()` 判定）—— 那时视图顺序与数据顺序不是一回事。
 */
export function vtRowDrag<T extends Record<string, any> = any>(
  options: RowDragOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtRowDrag',
    setup(ctx: PluginContext<T>) {
      const crossLevel = options.crossLevel !== false;
      const hoverDelay = options.hoverExpandDelay ?? 500;

      let ghost: HTMLElement | null = null;
      let line: HTMLElement | null = null;
      /** 层级箭头，指着目标层级那一段的起点 */
      let arrow: HTMLElement | null = null;
      /** 线的分段（每层一段），`renderLine` 里按 maxLevel 复用 */
      let lineSegs: HTMLElement[] = [];
      let box: HTMLElement | null = null;
      /** 正在被拖的行 key；非拖拽期间为 null */
      let draggingKey: string | null = null;
      /** 被拖的那行数据。开拖时就抓住 —— 它会滚出渲染窗口，那时 `getRowData` 给不出来 */
      let draggingRow: T | null = null;
      /** 源行的层级与父级 key，同样开拖时定一次（同级模式每帧都要比这两样） */
      let draggingLevel = 1;
      let draggingParentKey: string | null = null;
      /** 这张表有没有层级结构（树形列 / 分组）。开拖时定一次，决定要不要给「成为子节点」那一档 */
      let structural = false;
      /** 当前落点；`null` = 放不下（指示物已隐藏，松手什么也不做） */
      let spot: DropSpot | null = null;
      let indentSize = 20;
      /** 缩进宿主列的 key：树形列，没有就首列（分组数据行的缩进画在首列） */
      let hostColKey: string | null = null;
      const touch = createTouchGuard();
      /** 悬停自动展开的定时器与它盯着的那一行 */
      let hoverTimer: ReturnType<typeof setTimeout> | null = null;
      let hoverKey: string | null = null;
      /** 最后一次指针位置：自动滚动每帧要用它重算落点 */
      let lastX = 0;
      let lastY = 0;

      const itemKeyOf = (row: T): string => String(row[ctx.getOptions().itemKey]);
      const isExpandRow = (row: T): boolean => (row as any)._rowType === 'expand';

      /**
       * 一行的层级（从 1 起）。**分组层与树层合成同一把标尺** —— 视觉上它们就是同一列
       * 缩进（`.vt-group-indent` 与 `.vt-tree-indent` 同宽），层级箭头也只能有一把。
       */
      const levelOf = (row: T): number => {
        const g = ((row as any)._groupLevel as number) || 1;
        const t = ((row as any)._treeLevel as number) || 1;
        return g - 1 + t;
      };

      // ---- 落点归约用的扁平列表游标（纯数据，不碰 DOM）----

      /** 从 `from` 起沿 `dir` 找第一个数据行（跳过 expand 附加行，它不是数据） */
      const dataAt = (list: T[], from: number, dir: 1 | -1): FlatRow<T> | null => {
        for (let k = from; k >= 0 && k < list.length; k += dir) {
          if (!isExpandRow(list[k])) return { item: list[k], idx: k };
        }
        return null;
      };

      /**
       * 前一个**兄弟**（同层同父）。没有（它是第一个）时返回 null。
       *
       * 与「前一个可见行」不是一回事：上一行可能是前一个兄弟整棵子树的末尾（更深），
       * 也可能就是父级（更浅）。同级模式要的是兄弟。
       */
      const prevSiblingAt = (list: T[], idx: number): FlatRow<T> | null => {
        const lv = levelOf(list[idx]);
        for (let k = idx - 1; k >= 0; k--) {
          if (isExpandRow(list[k])) continue;
          const l = levelOf(list[k]);
          if (l < lv) return null; // 走到父级：它就是第一个
          if (l === lv) return { item: list[k], idx: k };
        }
        return null;
      };

      /** 视觉父级：往前找第一个层级更小的行。扁平化后层级是连续的，所以这样一定对 */
      const parentAt = (list: T[], idx: number): FlatRow<T> | null => {
        const lv = levelOf(list[idx]);
        for (let k = idx - 1; k >= 0; k--) {
          if (isExpandRow(list[k])) continue;
          if (levelOf(list[k]) < lv) return { item: list[k], idx: k };
        }
        return null;
      };

      /**
       * 把「前一个兄弟候选 + 目标层级」归约成落点。照搬 virt-list `onMouseup` 的走链算法：
       * 目标层级比 prev 浅就沿父链上走对应步数，深一层就认 prev 当父级，同层就当兄弟。
       */
      const resolveSpot = (
        list: T[],
        prev: FlatRow<T> | null,
        targetLevel: number,
      ): DropSpot => {
        if (!prev) return { parentKey: null, prevKey: null };
        const prevLevel = levelOf(prev.item);
        if (prevLevel < targetLevel) {
          // 比 prev 深：深一层就是「prev 的第一个子节点」，更深做不到（中间没有节点）
          if (targetLevel - prevLevel === 1) {
            return { parentKey: itemKeyOf(prev.item), prevKey: null };
          }
          const p = parentAt(list, prev.idx);
          return {
            parentKey: p ? itemKeyOf(p.item) : null,
            prevKey: itemKeyOf(prev.item),
          };
        }
        // 比 prev 浅或同层：沿父链上走 (prevLevel - targetLevel) 步
        let node: FlatRow<T> | null = prev;
        let parent = parentAt(list, prev.idx);
        for (let d = prevLevel - targetLevel; d > 0 && node; d--) {
          node = parent;
          parent = node ? parentAt(list, node.idx) : null;
        }
        return {
          parentKey: parent ? itemKeyOf(parent.item) : null,
          prevKey: node ? itemKeyOf(node.item) : null,
        };
      };

      // ---- 指示物 ----

      /**
       * 层级换算与指示线共用的基准：**第 1 层「内容」的左边缘**。
       *
       * 不是行的左边缘，也不是第 1 层缩进块的左边缘 —— 树形行的排布是
       * `缩进 × (层级-1) + 折叠箭头 + gap + 内容`，所以第 1 层的内容已经被
       * **一个折叠箭头 + 一段 gap** 顶开了（实测 20 + 6 = 26px）。拿箭头的位置当基准，
       * 整条层级线与箭头都会比对应层级的文字左 26px，看着像少了一级。
       *
       * 也不能用「悬停行的左边缘」：分组行是一个 `colSpan` 撑满的 `.vt-group-cell`，
       * 里面根本没有 `.vt-tree-row`，行左边缘比数据行的缩进起点靠左一整个手柄列
       * （固定列 44px）—— 拿它当基准，指针一放到分组行边界上层级就恒等于最深那档。
       *
       * 做法是从**任意一个已渲染的数据行**反推：它的 `.vt-tree-content` 左边缘减去
       * 自己的层级偏移，就是第 1 层内容的位置。这样两种表都对：
       * - 树形表：`content = 基准 + (层级-1) × 缩进`，基准含箭头与 gap
       * - 纯分组表：数据行没有箭头，基准就是缩进块的起点
       * 而且**不写死 26px** —— 箭头宽度或 gap 被改样式改了，基准自动跟着变。
       */
      const indentOriginX = (tr: HTMLElement, fallback: number): number => {
        const content = ctx.tbodyEl.querySelector<HTMLElement>('tr.vt-tr .vt-tree-content');
        const host = content?.closest<HTMLElement>('tr.vt-tr');
        const hostRow = host?.dataset.rowKey ? ctx.getRowData(host.dataset.rowKey) : undefined;
        if (content && hostRow) {
          return (
            content.getBoundingClientRect().left - (levelOf(hostRow.item) - 1) * indentSize
          );
        }
        const td = hostColKey
          ? tr.querySelector<HTMLElement>(`td[data-col-key="${hostColKey}"]`)
          : null;
        if (!td) return fallback;
        return (
          td.getBoundingClientRect().left +
          (parseFloat(getComputedStyle(td).paddingLeft) || 0)
        );
      };

      const hideLine = (): void => {
        if (line) line.style.display = 'none';
      };

      /**
       * 画层级提示线。`max` 变了才重建分段（拖一次通常只有一两种取值），
       * 每帧只改分段的类名与箭头挂点 —— 每帧重建 DOM 会让箭头看着在抖。
       */
      const renderLine = (plan: LinePlan, clientRect: DOMRect): void => {
        if (!line || !arrow) return;
        if (lineSegs.length !== plan.max) {
          line.innerHTML = '';
          lineSegs = [];
          for (let i = 0; i < plan.max; i++) {
            const seg = document.createElement('div');
            seg.className = 'vt-row-drop-seg';
            // 最后一段吃掉剩余宽度，前面每段正好一格缩进（减去段间距）
            if (i === plan.max - 1) seg.classList.add('vt-row-drop-seg--tail');
            line.appendChild(seg);
            lineSegs.push(seg);
          }
        }
        for (let i = 0; i < lineSegs.length; i++) {
          const seg = lineSegs[i];
          // 只给 [min, max] 区间上色：比 min 更浅的层级根本选不到，画出来是骗人的
          const inRange = i >= plan.min - 1;
          seg.classList.toggle('vt-row-drop-seg--past', inRange && i < plan.target - 1);
          seg.classList.toggle('vt-row-drop-seg--on', inRange && i >= plan.target - 1);
        }
        lineSegs[plan.target - 1]?.appendChild(arrow);

        const left = Math.max(0, plan.originX - clientRect.left);
        line.style.display = 'flex';
        line.style.top = `${plan.y - clientRect.top}px`;
        line.style.left = `${left}px`;
        line.style.width = `${Math.max(0, clientRect.width - left)}px`;
      };
      const hideBox = (): void => {
        if (box) box.style.display = 'none';
      };
      const clearHoverTimer = (): void => {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = null;
        hoverKey = null;
      };
      /** 放不下：藏掉全部指示物 */
      const deny = (): void => {
        spot = null;
        hideLine();
        hideBox();
        clearHoverTimer();
      };

      /** 源行的半透明标记。行 DOM 会被虚拟滚动回收，所以每帧都要重新贴（见 onRendered） */
      const markSource = (): void => {
        for (const el of ctx.tbodyEl.querySelectorAll('tr.vt-tr--dragging')) {
          el.classList.remove('vt-tr--dragging');
        }
        if (!draggingKey) return;
        ctx.tbodyEl
          .querySelector(`tr[data-row-key="${draggingKey}"]`)
          ?.classList.add('vt-tr--dragging');
      };

      const cleanup = (): void => {
        autoScroll.stop();
        touch.release();
        clearHoverTimer();
        draggingKey = null;
        draggingRow = null;
        spot = null;
        markSource();
        ghost?.remove();
        ghost = null;
        line?.remove();
        line = null;
        arrow?.remove();
        arrow = null;
        lineSegs = [];
        box?.remove();
        box = null;
      };

      // 纵向必须走 scrollByY：容器的 overflow-y 是 hidden，写 scrollTop 不会动。
      // onTick 里重算落点，否则自动滚动时行在走、指示线却钉在原地
      const autoScroll = createAutoScroll(ctx.clientEl, {
        scrollByY: (dy) => ctx.table.scrollByY(dy),
        onTick: () => {
          if (draggingKey) process();
        },
      });

      /**
       * 一次落点计算：指针位置 → placement / targetLevel → `{ parentKey, prevKey }` → 指示物。
       * pointermove 与自动滚动的每一帧都会走这里。
       */
      const process = (): void => {
        if (!draggingKey) return;
        const sourceKey = draggingKey;
        const clientRect = ctx.clientEl.getBoundingClientRect();
        if (
          lastX < clientRect.left ||
          lastX > clientRect.right ||
          lastY < clientRect.top ||
          lastY > clientRect.bottom
        ) {
          deny();
          return;
        }

        const tr = (document.elementFromPoint(lastX, lastY) as HTMLElement | null)?.closest(
          'tr.vt-tr',
        ) as HTMLElement | null;
        const hoverKeyAt = tr?.dataset.rowKey;
        if (!tr || !hoverKeyAt || hoverKeyAt === sourceKey) {
          deny();
          return;
        }
        const rd = ctx.getRowData(hoverKeyAt);
        if (!rd) {
          deny();
          return;
        }

        const list = ctx.getList();

        // 悬停在 expand 附加行上：它不是数据行，只能充当「前一个数据行的尾巴」
        let anchor: FlatRow<T> = { item: rd.item, idx: rd.rowIndex };
        let forceBottom = false;
        if (isExpandRow(rd.item)) {
          const back = dataAt(list, rd.rowIndex - 1, -1);
          if (!back) {
            deny();
            return;
          }
          anchor = back;
          forceBottom = true;
        }
        if (itemKeyOf(anchor.item) === sourceKey) {
          deny();
          return;
        }

        const trRect = tr.getBoundingClientRect();
        const ratio = (lastY - trRect.top) / trRect.height;
        const originX = indentOriginX(tr, trRect.left);

        // ---- 同级模式：只在同一父级的兄弟之间换位 ----
        if (!crossLevel) {
          const parent = parentAt(list, anchor.idx);
          const parentKey = parent ? itemKeyOf(parent.item) : null;
          // 同级 = 层级相同且父级相同。两样都比**开拖时记下的**源行属性，
          // 不现查 `getRowData` —— 源行滚出渲染窗口后那个查询给不出东西
          if (levelOf(anchor.item) !== draggingLevel || parentKey !== draggingParentKey) {
            deny();
            return;
          }
          const placement = forceBottom || ratio >= 0.5 ? 'bottom' : 'top';
          const prev = placement === 'top' ? prevSiblingAt(list, anchor.idx) : anchor;
          commit(
            {
              parentKey,
              prevKey: prev ? itemKeyOf(prev.item) : null,
            },
            draggingRow,
            {
              // 落在已展开节点的下半部分：线画到它子树末尾，否则线停在父与第一个子之间，
              // 看着像插进了子级（落点其实是「整棵子树之后」）
              y:
                placement === 'top'
                  ? trRect.top
                  : (subtreeTailRect(list, anchor) ?? trRect).bottom,
              originX,
              // 同级模式没有可选区间：层级恒等于源行那一层，前面的段只占位
              min: draggingLevel,
              max: draggingLevel,
              target: draggingLevel,
            },
            clientRect,
          );
          return;
        }

        // ---- 跨层级模式 ----
        // 没有树形列也没有分组：「成为子节点」放不下（核心会拒），那就干脆不给这一档，
        // 否则每行中间 1/3 都是没有任何反馈的死区
        const canInto = !forceBottom && structural;
        const top = canInto ? 0.33 : 0.5;
        const bottom = canInto ? 0.66 : 0.5;
        const placement =
          forceBottom || ratio > bottom ? 'bottom' : ratio < top ? 'top' : 'center';

        if (placement === 'center') {
          // 成为悬停行的子节点（悬停行是分组行时 = 落进这个分组）
          commit({ parentKey: hoverKeyAt, prevKey: null }, draggingRow, null, clientRect, {
            rect: trRect,
            key: hoverKeyAt,
          });
          return;
        }

        clearHoverTimer();
        const prev = placement === 'top' ? dataAt(list, anchor.idx - 1, -1) : anchor;
        const next =
          placement === 'top' ? anchor : dataAt(list, rd.rowIndex + 1, 1);
        const minLevel = Math.min(prev ? levelOf(prev.item) : 1, next ? levelOf(next.item) : 1);
        const maxLevel = Math.max(prev ? levelOf(prev.item) : 1, next ? levelOf(next.item) : 1);
        // 指针横向位置决定插到第几层，夹在相邻两行之间（第 1 个缩进宽度内算第 1 层）
        let targetLevel = Math.floor((lastX - originX) / indentSize) + 1;
        if (targetLevel < minLevel) targetLevel = minLevel;
        if (targetLevel > maxLevel) targetLevel = maxLevel;

        commit(
          resolveSpot(list, prev, targetLevel),
          draggingRow,
          {
            y: placement === 'top' ? trRect.top : trRect.bottom,
            originX,
            min: minLevel,
            max: maxLevel,
            target: targetLevel,
          },
          clientRect,
        );
      };

      /** 节点最后一个可见后代所在的行（同级模式画线用）；不在渲染窗口内时返回 null */
      const subtreeTailRect = (list: T[], node: FlatRow<T>): DOMRect | null => {
        const lv = levelOf(node.item);
        let tailIdx = node.idx;
        for (let k = node.idx + 1; k < list.length; k++) {
          if (levelOf(list[k]) <= lv && !isExpandRow(list[k])) break;
          tailIdx = k;
        }
        if (tailIdx === node.idx) return null;
        const el = ctx.tbodyEl.querySelector<HTMLElement>(
          `tr[data-row-key="${String(list[tailIdx][ctx.getOptions().itemKey])}"]`,
        );
        return el ? el.getBoundingClientRect() : null;
      };

      /**
       * 落点定稿：核心校验 + 使用方校验，通过就画指示物、记下 `spot`。
       * `into` 有值时画覆盖框（成为子节点），否则画指示线。
       */
      const commit = (
        next: DropSpot,
        sourceRow: T | null,
        lineAt: LinePlan | null,
        clientRect: DOMRect,
        into?: { rect: DOMRect; key: string },
      ): void => {
        if (!draggingKey) return;
        if (!ctx.table.canDropRow(draggingKey, next)) {
          deny();
          return;
        }
        if (options.allowDropInto && sourceRow) {
          // 父行可能已滚出渲染窗口，退化为在展示列表里找（只有配了这个钩子才付这份代价）
          let parentRow: T | null = null;
          if (next.parentKey) {
            const itemKey = ctx.getOptions().itemKey;
            parentRow =
              ctx.getRowData(next.parentKey)?.item ??
              ctx.getList().find((r) => String(r[itemKey]) === next.parentKey) ??
              null;
          }
          if (!options.allowDropInto(parentRow, sourceRow)) {
            deny();
            return;
          }
        }
        spot = next;

        if (into) {
          hideLine();
          if (box) {
            box.style.display = 'block';
            box.style.top = `${into.rect.top - clientRect.top}px`;
            box.style.height = `${into.rect.height}px`;
          }
          // 落进折叠节点：悬停一会儿自动展开，好让人继续往里放
          if (hoverDelay > 0 && hoverKey !== into.key) {
            clearHoverTimer();
            hoverKey = into.key;
            if (ctx.table.isFolded(into.key)) {
              hoverTimer = setTimeout(() => {
                hoverTimer = null;
                if (draggingKey && ctx.table.isFolded(into.key)) ctx.table.toggleFold(into.key);
              }, hoverDelay);
            }
          }
          return;
        }

        hideBox();
        clearHoverTimer();
        if (lineAt) renderLine(lineAt, clientRect);
      };

      const begin = (e: PointerEvent, rowKey: string, row: T): void => {
        if (!ctx.table.canReorderRows()) return;
        if (options.canDrag && !options.canDrag(row)) return;

        startDrag(e, {
          onStart: () => {
            touch.hold();
            draggingKey = rowKey;
            draggingRow = row;
            spot = null;
            const flat = ctx.getList();
            const at = ctx.getRowData(rowKey);
            draggingLevel = at ? levelOf(at.item) : 1;
            const p = at ? parentAt(flat, at.rowIndex) : null;
            draggingParentKey = p ? itemKeyOf(p.item) : null;

            /*
             * 开拖先把源节点**收起**（与 virt-list `_dragStartClone` 里那句
             * `expandNode(key, false)` 一致）。三个理由，最后一个才是关键：
             *   1. 拖的是整棵子树，收起来 ghost 与落点的语义才对得上「搬走一整块」；
             *   2. 子树留在列表里会跟着一起晃，落点在自己的行之间来回跳；
             *   3. **可放区域会被自己的子树切碎** —— 落在自己子树里一律放不下，
             *      于是源节点下面一大片全是「没有指示线」的死区，用起来像坏了。
             * 收起来之后落点区域连续。拖完保持收起（同 virt-list，不还原）。
             */
            if ((row as any)._hasChildren && !ctx.table.isFolded(rowKey)) {
              ctx.table.toggleFold(rowKey);
            }
            // 与核心 `_groupIndentCol()` 一致：树形列，没有就第一个数据列（功能列画不出缩进）
            hostColKey =
              ctx.getColumns().find((c) => c.type === 'tree')?.key ??
              ctx.getColumns().find(isDataColumn)?.key ??
              ctx.getColumns()[0]?.key ??
              null;
            structural =
              ctx.getColumns().some((c) => c.type === 'tree') ||
              !!ctx.getOptions().groupConfig?.length;
            indentSize =
              parseFloat(
                getComputedStyle(ctx.rootEl).getPropertyValue('--vt-indent-size'),
              ) || 20;

            line = document.createElement('div');
            line.className = 'vt-row-drop-line';
            line.style.display = 'none';
            ctx.clientEl.appendChild(line);
            // 箭头单独建一次，按目标层级在分段之间搬（`renderLine`）
            arrow = document.createElement('div');
            arrow.className = 'vt-row-drop-arrow';
            lineSegs = [];

            box = document.createElement('div');
            box.className = 'vt-row-drop-into';
            box.style.display = 'none';
            ctx.clientEl.appendChild(box);

            /*
             * ghost 显示该行**第一个数据列**的值。
             *
             * 「数据列」要走 `isDataColumn` 而不是 `!c.type` —— `type:'tree'` 也是数据列
             * （它只加缩进与箭头，内容仍是字段值）。用 `!c.type` 会把树形列跳过去，
             * 树形表上 ghost 显示的就是第二列（「部门」而不是「名称」）。
             *
             * 取第一个**值非空**的数据列：第一列偶尔为空（占位列、图标列），
             * 那时显示下一列比显示一个空标签有用。
             */
            let label = '';
            for (const c of ctx.getColumns()) {
              if (!isDataColumn(c)) continue;
              const v = row[c.key];
              if (v !== undefined && v !== null && String(v) !== '') {
                label = String(v);
                break;
              }
            }
            ghost = createGhost(ctx.rootEl, 'vt-row-drag-ghost', label || `行 ${rowKey}`);
            markSource();
          },
          onMove: (ev) => {
            lastX = ev.clientX;
            lastY = ev.clientY;
            autoScroll.update(lastX, lastY);
            if (ghost) {
              ghost.style.left = `${lastX + 12}px`;
              ghost.style.top = `${lastY + 12}px`;
            }
            process();
          },
          onDrop: () => {
            const target = spot;
            const sourceKey = draggingKey;
            cleanup();
            if (sourceKey && target) ctx.table.moveRowTo(sourceKey, target);
          },
          onCancel: cleanup,
        });
      };

      /*
       * 手柄发起。手柄由核心渲染（它是 `type:'drag'` 列的内容），这里只挂手势。
       *
       * 逐格绑定在这条路上是安全的：手柄元素每次填内容都是**新建**的，所以行 DOM 池化复用
       * 不会让监听越绑越多。`stopPropagation` 是手柄专属的 —— 它整格的语义就是「按住我拖行」，
       * 不该再触发点击高亮之类的东西。
       */
      ctx.on('onCellRendered', (td, col, item) => {
        if (col.type !== 'drag') return;
        const handle = td.querySelector<HTMLElement>('.vt-drag-handle');
        if (!handle) return;
        const rowKey = String(item[ctx.getOptions().itemKey]);
        handle.addEventListener('pointerdown', (e) => {
          if (!isPrimaryPointer(e)) return;
          e.preventDefault();
          e.stopPropagation();
          begin(e, rowKey, item);
        });
      });

      /*
       * 整行发起（`wholeRow`）。**在 tbody 上委托一次**，不逐格绑。
       *
       * 理由是成本而不是正确性：核心复用行 DOM 时 `tr.innerHTML = ''` 后 td 全部新建
       * （所以 `onCellRendered` 不会对同一个元素派发两次，逐格绑并不会重复触发）——
       * 但那意味着**每个进入渲染窗口的格子都要付一次 `addEventListener`**，滚动时是
       * 「新行数 × 列数」的量级，而委托只需要一个监听。手柄那条留在逐格路径上是因为它
       * 一行只有一个、且必须绑在手柄元素本身（它的 `stopPropagation` 是整格语义的一部分）。
       *
       * 三条门槛只对整行发起生效（手柄那条不受影响）：
       *
       * 1. **触屏不启用**。表体上的单指手势语义是「滚动表格」（纵向由核心的 InputController
       *    接管，`.vt-client` 的 `touch-action: none` 正是为它设的）。整行拖拽要抢这一下，
       *    就等于把滚动废掉 —— `vtCellSelection` 的拖选出于同一个理由也只对鼠标/笔生效。
       * 2. **避开交互内容**（输入框、按钮、链接、可编辑区）。在这些东西上按下是要用它们。
       *    内置组件的展示层（标签、头像）不算 —— 那些格子照旧能拖，点开浮层走的是 `click`。
       * 3. **不 `stopPropagation`**。整行发起时事件必须继续冒到 tbody，否则核心的
       *    `highlightSelectRow / Col / Cell` 与激活态全部失效（它们听的就是 tbody 上的
       *    pointerdown）。也不 `preventDefault` —— 文字选中由 `startDrag` 越过阈值后在
       *    `pointermove` 里拦，那时才真的是拖拽。
       *
       * ⚠️ 与 `vtCellSelection` **不宜同装**：一次表体按下要么是拖行、要么是框选，
       * 两个都装等于同时起手两个手势。
       */
      /** 整行发起的委托监听的解绑（`cleanup` 每次拖拽结束都会调，解绑只能在 destroy 里做） */
      let unbindWholeRow: (() => void) | null = null;
      if (options.wholeRow) {
        const onBodyDown = (e: PointerEvent): void => {
          if (!isPrimaryPointer(e) || e.pointerType === 'touch') return;
          const target = e.target as HTMLElement | null;
          if (!target?.closest) return;
          if (target.closest(WHOLE_ROW_SKIP)) return;
          const tr = target.closest<HTMLElement>('tr.vt-tr');
          const rowKey = tr?.dataset.rowKey;
          if (!rowKey) return;
          const row = ctx.getRowData(rowKey)?.item;
          if (!row) return;
          begin(e, rowKey, row as T);
        };
        ctx.tbodyEl.addEventListener('pointerdown', onBodyDown);
        unbindWholeRow = () => ctx.tbodyEl.removeEventListener('pointerdown', onBodyDown);
      }

      // 行 DOM 被回收/重建后源行的标记会丢（或者粘到别的行上），每帧重贴一次
      ctx.on('onRendered', () => {
        if (draggingKey) markSource();
      });

      return {
        destroy: () => {
          unbindWholeRow?.();
          cleanup();
        },
      };
    },
  };
}
