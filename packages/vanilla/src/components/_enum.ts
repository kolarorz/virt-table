/**
 * 枚举选择列的**公共内核**（`VtSelect` / `VtTag` / `VtMultiSelect` / `VtPerson` 共用）。
 *
 * 起因是一次架构审查：这四个组件被问「本质上是不是一套组件的不同参数」。拉出差异矩阵后
 * 结论是**真轴只有两个** —— 元数（单选 / 多选）× 展示形态（纯文本 / 彩色胶囊 / 头像胶囊）。
 * 其余差异全是同一件事取了不同名字（`maxTagCount` vs `maxCount`），或者**能力分布不均**：
 *
 * | | 搜索 | ↑↓/Enter | 折叠 +N | 锚点回显 |
 * | --- | --- | --- | --- | --- |
 * | 重构前 `VtSelect` | ✗ | ✓ | — | 文本 |
 * | 重构前 `VtMultiSelect` | ✗ | **✗** | ✓ | 文本（与常态的胶囊不一致） |
 * | 重构前 `VtPerson` | ✓ | ✓ | ✓ | 胶囊 |
 *
 * 缺口不是设计决定，纯粹是**三份独立的面板实现**（`createSelectEditor` 170 行 +
 * VtMultiSelect 自己的 90 行 + VtPerson 自己的 200 行）各自长歪的结果。收成一份之后
 * 能力自动拉平，以后加东西只改一处。
 *
 * **公开 API 刻意不合并**（不做一个万能的 `VtEnum`）：
 *   1. 列定义要读得懂 —— `VtSelect({key,title,options})` 一眼是什么，
 *      `VtEnum({…, multiple:false, display:'text'})` 要读三个参数才知道；
 *   2. 类型能管住互斥选项 —— 合成一个之后 `avatarOnly` / `variant` / `checkStrictly`
 *      会挤进同一个 options 类型，`display:'text'` 却传 `avatarOnly` 编译器不会拦；
 *   3. 四个都是已发布导出。
 * 于是变成「一个内核 + 四个薄预设」，各预设只提供三件事：**值形状**（parse/serialize）、
 * **面板项长什么样**（renderItem）、**常态一项长什么样**（chip）。
 *
 * | | 纯文本 | 彩色胶囊 | 头像胶囊 |
 * | --- | --- | --- | --- |
 * | **单值** | `VtSelect` | `VtTag` | `VtPerson` |
 * | **多值** | `VtSelect({ multiple })` | `VtMultiSelect` | `VtPerson({ multiple })` |
 *
 * ⚠️ **每格只留一种拼法**。第一版给 `VtTag` 也加了 `multiple`（"内核已经支持了，不如暴露
 * 出来"），于是 `VtTag({ editable: true, multiple: true })` 与 `VtMultiSelect` 成了同一个
 * 东西的两种写法 —— 用户第一眼就问「这俩怎么完全一样」。**合内核是为了消掉重复实现，
 * 不是为了增加同义拼法**：`VtTag` 收回单值、多值一律走 `VtMultiSelect`，两者共用
 * `createTagChip`（外观与配色规则因此必然一致）。给新预设加参数时先问一句：
 * 这个组合是不是已经有名字了？
 *
 * `VtCascader` 不进这一家（树形面板是分栏的，只共享锚点 / 清除 × / 浮层基元），
 * `VtAutocomplete` 也不进（值不受候选集约束，是「自由输入 + 建议」）。
 */
import { type PopupHandle, createPopup } from './_popup';
import {
  type BaseColumnOptions,
  type CommitTarget,
  type VtOption,
  CHECK_SVG,
  commitValue,
  makeAnchor,
  makeCellWrap,
  scrollItemIntoView,
} from './shared';

/** 面板里一项的当前状态，交给 `renderItem` 决定怎么画 */
export interface EnumItemState {
  /** 已选中 */
  selected: boolean;
  /** 键盘高亮（不是 hover —— 键盘移动时鼠标并不在项上） */
  active: boolean;
  index: number;
}

export interface EnumCodec {
  /** 行值 → 选中的标识数组。单选也走数组，好让面板只有一条路径 */
  parse: (value: unknown) => (string | number)[];
  /** 选中的标识数组 → 写回行数据的值 */
  serialize: (picked: (string | number)[]) => unknown;
}

/**
 * 三种值形状的标准编解码：单选存标量、多选存数组、多选存分隔符字符串。
 *
 * 四个预设的 `valueType` / `separator` 语义完全一致，收在这里就不会再出现
 * 「A 组件按逗号 trim、B 组件不 trim」这种说不清的差别。
 */
export function enumCodec(cfg: {
  multiple?: boolean;
  valueType?: 'array' | 'string';
  separator?: string;
}): EnumCodec {
  const sep = cfg.separator ?? ',';
  const asString = cfg.valueType === 'string';
  return {
    parse: (value) => {
      if (Array.isArray(value)) return value as (string | number)[];
      if (value == null || value === '') return [];
      if (cfg.multiple && typeof value === 'string') {
        return value.split(sep).map((s) => s.trim());
      }
      return [value as string | number];
    },
    serialize: (picked) => {
      if (!cfg.multiple) return picked[0] ?? '';
      return asString ? picked.join(sep) : picked;
    },
  };
}

export interface EnumEditorConfig<O extends VtOption = VtOption> {
  options: readonly O[];
  multiple: boolean;
  /** 面板顶部给搜索框。默认 **false** —— 枚举列常常只有 3~8 项，多一行搜索框是噪音 */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** 搜索命中判定。默认匹配 `label` 与 `value`（`VtPerson` 额外加副标题） */
  match?: (option: O, query: string) => boolean;
  emptyText?: string;
  /** 多选面板底部的「清空 / 全选」，默认 true。单选没有这一栏（清除走锚点上的 ×） */
  showActions?: boolean;
  /** 面板项追加类名（`VtPerson` 用它调两行文案的排布） */
  itemClass?: string;
  /** 面板里一项的内容。默认一个装 `label` 的 `<span>` */
  renderItem?: (option: O, state: EnumItemState) => Node | Node[] | string;
  /** 锚点回显。返回节点数组则走 `setNodes`（常态是胶囊的组件用），字符串走 `setText` */
  renderAnchor?: (picked: O[]) => HTMLElement[] | string;
  codec: EnumCodec;
}

/**
 * 造一个枚举选择编辑器：单元格里是锚点，候选面板在自绘浮层里。
 *
 * 单选：选中即写回并关面板。多选：勾选**即时写回**（没有「确定」按钮）—— 这一列的编辑
 * 是多次点击的过程，让底部的「清空 / 全选」与逐项勾选走同一条路，省掉一份
 * 「暂存态 vs 已提交态」的状态机。
 *
 * 键盘：`↑` / `↓` 移动高亮（跳过禁用项）、`Enter` 选中 / 勾选、`Esc` 关闭（浮层基元管）。
 */
export function createEnumEditor<T, O extends VtOption = VtOption>(
  opts: BaseColumnOptions<T>,
  ctx: CommitTarget<T> & { value: unknown; el: HTMLElement },
  cfg: EnumEditorConfig<O>,
): HTMLElement {
  const optionMap = new Map(cfg.options.map((o) => [o.value, o]));
  let picked = cfg.codec.parse(ctx.value);

  const commit = (): void => {
    syncAnchor();
    commitValue(opts, ctx, cfg.codec.serialize(picked));
  };

  /** 找不到的标识退化成「值本身当 label」——`options` 变过时不至于整列空白 */
  const asOption = (v: string | number): O =>
    optionMap.get(v) ?? ({ value: v, label: String(v) } as O);

  const anchor = makeAnchor(
    opts.placeholder,
    opts.clearable
      ? () => {
          picked = [];
          commit();
          if (popup) paintList();
        }
      : undefined,
  );

  function syncAnchor(): void {
    const items = picked.map(asOption);
    const shown = cfg.renderAnchor
      ? cfg.renderAnchor(items)
      : items.map((o) => o.label).join('、');
    if (typeof shown === 'string') anchor.setText(shown);
    else anchor.setNodes(shown);
  }

  let popup: PopupHandle | null = null;
  let listEl: HTMLElement | null = null;
  let searchEl: HTMLInputElement | null = null;
  let query = '';
  let activeIndex = -1;

  const defaultMatch = (o: O, q: string): boolean =>
    o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q);

  /** 当前可见候选（搜索过滤后的） */
  const visible = (): readonly O[] => {
    const q = query.trim().toLowerCase();
    if (!q) return cfg.options;
    const match = cfg.match ?? defaultMatch;
    return cfg.options.filter((o) => match(o, q));
  };

  const close = (): void => {
    popup?.destroy();
    popup = null;
    listEl = null;
    searchEl = null;
  };

  const toggle = (option: O): void => {
    if (option.disabled) return;
    if (!cfg.multiple) {
      picked = [option.value];
      commit();
      close();
      anchor.el.focus();
      return;
    }
    picked = picked.includes(option.value)
      ? picked.filter((v) => v !== option.value)
      : [...picked, option.value];
    commit();
    paintList();
  };

  /**
   * 只重画列表，不重建搜索框 —— 后者一重建就丢焦点与光标位置，边打字边过滤会断。
   *
   * 多选也整列重画（而不是只改那一个勾选框）：`is-selected` 高亮、对勾、批量操作后的
   * 全量复位都要跟着变，一处重画比三处同步可靠。判定一律读 `picked` 而不是 DOM 的
   * `checked`，所以拿着重画前的旧元素派发 change 也仍然正确。
   */
  function paintList(): void {
    if (!popup || !listEl) return;
    listEl.innerHTML = '';
    const items = visible();

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vt-comp-popup-empty';
      empty.textContent = cfg.emptyText ?? '无匹配项';
      listEl.appendChild(empty);
      popup.update();
      return;
    }

    let activeEl: HTMLElement | null = null;

    items.forEach((option, i) => {
      // 多选用 <label> 包原生勾选框（点整行即切换）；单选用 role="option" + 对勾
      const item = document.createElement(cfg.multiple ? 'label' : 'div');
      item.className = 'vt-filter-item';
      if (cfg.itemClass) item.classList.add(cfg.itemClass);

      const selected = picked.includes(option.value);
      if (!cfg.multiple) {
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', selected ? 'true' : 'false');
      }
      if (selected) item.classList.add('is-selected');
      if (i === activeIndex) {
        item.classList.add('is-active');
        activeEl = item;
      }
      if (option.disabled) item.setAttribute('aria-disabled', 'true');

      if (cfg.multiple) {
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'vt-filter-checkbox';
        box.checked = selected;
        box.disabled = !!option.disabled;
        box.addEventListener('change', () => toggle(option));
        item.appendChild(box);
      }

      const content = cfg.renderItem
        ? cfg.renderItem(option, { selected, active: i === activeIndex, index: i })
        : option.label;
      if (typeof content === 'string') {
        const span = document.createElement('span');
        span.textContent = content;
        item.appendChild(span);
      } else if (Array.isArray(content)) {
        item.append(...content);
      } else {
        item.appendChild(content);
      }

      if (!cfg.multiple) {
        // 选中态不能只靠颜色（色觉障碍看不见）；未选中时元素仍在、占位，
        // 免得勾选让文案左右跳动
        const mark = document.createElement('span');
        mark.className = 'vt-comp-check';
        if (selected) mark.innerHTML = CHECK_SVG;
        item.appendChild(mark);

        if (!option.disabled) {
          // 用 mousedown 而不是 click：click 之前的 blur/mousedown 阶段，
          // cell-editor 的 outside-click 已经在判定了，早一步落地更稳
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            toggle(option);
          });
        }
      }

      listEl!.appendChild(item);
    });

    popup.update();
    if (activeEl) scrollItemIntoView(listEl, activeEl);
  }

  const buildPanel = (): void => {
    if (!popup) return;
    popup.el.innerHTML = '';

    if (cfg.searchable) {
      // 搜索框在 `.vt-filter-list` **外面**：列表滚动时它固定在面板顶部
      // （`.vt-comp-popup` 是 flex column + overflow hidden）
      const box = document.createElement('div');
      box.className = 'vt-comp-search';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'vt-filter-text';
      input.placeholder = cfg.searchPlaceholder ?? '搜索';
      input.autocomplete = 'off';
      input.addEventListener('input', () => {
        query = input.value;
        activeIndex = -1;
        paintList();
      });
      input.addEventListener('keydown', onKeyNav);
      box.appendChild(input);
      popup.el.appendChild(box);
      searchEl = input;
    }

    listEl = document.createElement('div');
    listEl.className = 'vt-filter-list';
    listEl.setAttribute('role', cfg.multiple ? 'group' : 'listbox');
    popup.el.appendChild(listEl);

    // 批量操作只给多选：单选的「清除」在锚点右侧那个 × 上（面板底部按钮要先展开才点得到）
    if (cfg.multiple && cfg.showActions !== false) {
      const actions = document.createElement('div');
      actions.className = 'vt-filter-actions';

      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'vt-filter-btn';
      clear.textContent = '清空';
      clear.addEventListener('click', () => {
        picked = [];
        commit();
        paintList();
      });

      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'vt-filter-btn vt-filter-btn--primary';
      all.textContent = '全选';
      all.addEventListener('click', () => {
        // 只全选**当前可见**的：面板带搜索时，「全选」在筛过之后指的就是筛出来这批
        picked = visible()
          .filter((o) => !o.disabled)
          .map((o) => o.value);
        commit();
        paintList();
      });

      actions.append(clear, all);
      popup.el.appendChild(actions);
    }

    paintList();
  };

  const open = (): void => {
    if (popup) return;
    query = '';
    activeIndex = cfg.multiple ? -1 : cfg.options.findIndex((o) => picked.includes(o.value));
    popup = createPopup({
      anchor: anchor.el,
      // anchor 此刻还没挂进文档，宿主从编辑浮层去找（见 _popup.ts 的 owner）
      owner: ctx.el,
      // 几何基准取单元格盒子，不取锚点（锚点在 cover 的 2px 边框内侧，会错开 4px）
      geometry: ctx.el,
      onClose: close,
    });
    buildPanel();
  };

  /** 移动高亮，跳过禁用项 */
  const move = (delta: number): void => {
    const items = visible();
    const n = items.length;
    if (n === 0) return;
    let i = activeIndex;
    for (let step = 0; step < n; step++) {
      i = (i + delta + n) % n;
      if (!items[i]!.disabled) break;
    }
    activeIndex = i;
    paintList();
  };

  function onKeyNav(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // 不拦的话 vtKeyboardNav 会把上下键当成「换单元格」
      e.stopPropagation();
      if (!popup) open();
      else move(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!popup) return open();
      const option = visible()[activeIndex];
      if (option) toggle(option);
      return;
    }
    // 空格也能开合，与原生 select 的手感一致
    if (e.key === ' ' && !popup) {
      e.preventDefault();
      open();
    }
  }

  anchor.el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (popup) close();
    else open();
  });
  anchor.el.addEventListener('keydown', onKeyNav);

  syncAnchor();
  // 点开单元格就直接把候选列表展开 —— 少一次点击。**同步**创建而不是等 rAF：
  // 此刻锚点还没进文档，`_popup` 会先 visibility: hidden，等锚定循环量到真实位置再显形
  open();
  // focus 必须等元素进了文档才有效。有搜索框就把焦点给它（打开即可打字搜）
  requestAnimationFrame(() => (searchEl ?? anchor.el).focus());

  return anchor.el;
}

/* -------------------------------------------------------------------------- *
 * 常态：一排 chip + 超出折叠
 * -------------------------------------------------------------------------- */

export interface ChipsConfig<I> {
  /** 最多画几个，超出折叠成 `+N`。默认 3；给 0 表示不折叠 */
  maxCount?: number;
  chip: (item: I, index: number) => HTMLElement;
}

/**
 * 把一串项画成 chip 序列（含末尾的 `+N`）。
 *
 * 折叠计数一律用 `.vt-comp-tag-more`：标签列与人员列都是「还有 N 个」，不该长得不一样。
 */
export function buildChips<I>(items: readonly I[], cfg: ChipsConfig<I>): HTMLElement[] {
  const max = cfg.maxCount ?? 3;
  const shown = max > 0 ? items.slice(0, max) : items;
  const nodes = shown.map((item, i) => cfg.chip(item, i));
  if (items.length > shown.length) {
    const more = document.createElement('span');
    more.className = 'vt-comp-tag-more';
    more.textContent = `+${items.length - shown.length}`;
    nodes.push(more);
  }
  return nodes;
}

/** 常态外层 + chip 序列。空列表返回 `null`，由调用方回落 placeholder */
export function renderChipCell<I>(
  items: readonly I[],
  cfg: ChipsConfig<I> & { modifier: string },
): HTMLElement | null {
  if (items.length === 0) return null;
  const wrap = makeCellWrap(cfg.modifier, true);
  wrap.append(...buildChips(items, cfg));
  return wrap;
}
