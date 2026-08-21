import type { CellRenderConfig, VirtTableColumn } from '../index';
import './components.css';

export type BaseColumnOptions<T> = Omit<VirtTableColumn<T>, 'render' | 'renderEditor'> & {
  placeholder?: string;
  disabled?: boolean;
  /**
   * 控件右侧给一个「×」清除按钮（只在有值时出现）。
   *
   * **默认值按「这一格能不能用键盘删空」分两档**（见 `clearableOn` 的注释）：
   *   - 锚点类（`VtSelect` / `VtCascader` / `VtPerson` / 日期时间那三个）**默认开**，
   *     传 `false` 关掉；
   *   - 输入类（`VtInput` / `VtNumberInput` / `VtAutocomplete`）**默认关**，要传 `true`。
   */
  clearable?: boolean;
  /**
   * 值写回行数据之后触发。所有单元格组件的写回都走 `commitValue`，所以这个回调对
   * 每个组件的语义都一样：**先改 row，再通知**。
   *
   * 需要「拦下修改」或「异步提交失败回滚」的场景请自己在回调里改回 row 并
   * `forceUpdate()` —— 单元格组件不做受控模式（那需要把值的所有权交给使用方，
   * 与 `renderEditor` 直接改 row 的既有契约冲突）。
   */
  onChange?: (value: any, row: T, rowIndex: number) => void;
};

/** 选项项：`VtSelect` / `VtTag` / `VtMultiSelect` / `VtCascader` 共用 */
export interface VtOption {
  value: string | number;
  label: string;
  /** 标签主色（`VtTag` / `VtMultiSelect` 用，覆盖 `type` 色板） */
  color?: string;
  disabled?: boolean;
}

/** 语义色板：标签 / 按钮共用，值取核心 token */
export type VtSemanticType = 'default' | 'primary' | 'success' | 'warning' | 'danger';

const SEMANTIC_TOKEN: Record<VtSemanticType, string> = {
  default: 'var(--vt-text-secondary)',
  primary: 'var(--vt-color-primary)',
  success: 'var(--vt-color-success)',
  warning: 'var(--vt-color-warning)',
  danger: 'var(--vt-color-danger)',
};

/** 语义类型 → 颜色表达式（给 `--vt-cell-option-color` 之类的自定义属性用） */
export function semanticColor(type: VtSemanticType | undefined): string | undefined {
  return type ? SEMANTIC_TOKEN[type] : undefined;
}

/** 选项数组 → value→选项 的映射（单元格组件在工厂里建一次，render 里只查） */
export function buildOptionMap(options: readonly VtOption[]): Map<string | number, VtOption> {
  return new Map(options.map((o) => [o.value, o]));
}

/* 尺寸/字号走 --vt-* 变量，随主题与密度联动 */
export const INPUT_CSS =
  'width:100%;height:100%;border:none;outline:none;padding:0 var(--vt-cell-padding-x, 12px);' +
  'font-family:inherit;font-size:var(--vt-font-size, 14px);color:var(--vt-text-color, inherit);' +
  'box-sizing:border-box;background:transparent;';

/**
 * 小图标。与核心 `index.css` 里那批（排序箭头、树形箭头）同款：`currentColor` 描边 +
 * `1em` 尺寸，所以颜色跟着文字走、大小跟着字号走，暗色主题自动跟随。
 */
const CHEVRON_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M9 6l6 6-6 6"/></svg>';

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M5 13l4 4L19 7"/></svg>';

export { CHECK_SVG };

/**
 * 锚点类组件的 `clearable` 取值：**默认开**，只有显式 `false` 才关。
 *
 * 为什么这一档默认开、输入类不是 —— 分界线是**这一格能不能用键盘删空**：
 * `VtInput` / `VtNumberInput` / `VtAutocomplete` 的编辑态是真正的文本框，全选 + Backspace
 * 本来就清得掉，`×` 只是顺手；而下拉 / 级联 / 人员 / 日期的编辑态是一个**锚点**
 * （`makeAnchor`，不是文本框），一旦有了值，界面上就再没有任何「变回空」的手段 ——
 * 面板里只能换选另一项。所以默认不给 `×` 等于「这一列一旦填过就填不回空」，
 * 用户反馈的正是这件事（「下拉选择没有清空按钮」「级联/日期也加上」）。
 *
 * 同一条分界线也决定了 `Delete` / `Backspace` 只在锚点上清空（见 `makeAnchor`）：
 * 文本框里那两个键有自己的语义，抢过来会把「删一个字符」变成「清空整格」。
 *
 * 需要「这一列不许清空」时显式传 `clearable: false`（连带 `Delete` 一起没有）。
 */
export function clearableOn(opts: Pick<BaseColumnOptions<any>, 'clearable'>): boolean {
  return opts.clearable !== false;
}

export function makeClearBtn(onClear: () => void): HTMLElement {
  const btn = document.createElement('span');
  btn.className = 'vt-comp-clear';
  btn.textContent = '\u00d7';
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClear();
  });
  return btn;
}

/**
 * 给控件套一层带 `×` 的外壳。
 *
 * `×` 的落位全在 CSS 里（`.vt-comp-wrap` 自己扣出右侧那条留白，见 components.css §1）
 * —— 不能靠给 `inner` 加 `padding-right` 解决：`INPUT_CSS` 的 padding 是**内联**的，
 * 样式表里的规则压不过它（同 AGENTS.md 里 `vAlign` 那个坑）。
 */
export function wrapWithClear(
  inner: HTMLElement,
  clearable: boolean,
  onClear: () => void,
): HTMLElement {
  if (!clearable) return inner;
  const wrap = document.createElement('div');
  wrap.className = 'vt-comp-wrap';
  wrap.appendChild(inner);
  wrap.appendChild(makeClearBtn(onClear));
  return wrap;
}

export function pickColumnProps<T>(opts: BaseColumnOptions<T>): Partial<VirtTableColumn<T>> {
  const picked: Partial<VirtTableColumn<T>> = {};
  if (opts.fixed !== undefined) picked.fixed = opts.fixed;
  if (opts.align !== undefined) picked.align = opts.align;
  if (opts.vAlign !== undefined) picked.vAlign = opts.vAlign;
  if (opts.textOverflow !== undefined) picked.textOverflow = opts.textOverflow;
  if (opts.resizable !== undefined) picked.resizable = opts.resizable;
  if (opts.minWidth !== undefined) picked.minWidth = opts.minWidth;
  if (opts.maxWidth !== undefined) picked.maxWidth = opts.maxWidth;
  if (opts.type !== undefined) picked.type = opts.type;
  if (opts.renderHeader !== undefined) picked.renderHeader = opts.renderHeader;
  if (opts.renderExpandRow !== undefined) picked.renderExpandRow = opts.renderExpandRow;
  if (opts.filters !== undefined) picked.filters = opts.filters;
  if (opts.filterMultiple !== undefined) picked.filterMultiple = opts.filterMultiple;
  if (opts.filterMethod !== undefined) picked.filterMethod = opts.filterMethod;
  if (opts.sortable !== undefined) picked.sortable = opts.sortable;
  if (opts.sortMethod !== undefined) picked.sortMethod = opts.sortMethod;
  if (opts.filterType !== undefined) picked.filterType = opts.filterType;
  if (opts.filterValueKind !== undefined) picked.filterValueKind = opts.filterValueKind;
  if (opts.filterOperators !== undefined) picked.filterOperators = opts.filterOperators;
  if (opts.validator !== undefined) picked.validator = opts.validator;
  return picked;
}

/**
 * `asCell` 接受的选项：把**列专属**的那些剔掉。
 *
 * 单元格级只吃 `render` / `cellType` / `renderEditor` 三个字段（见 `CellRenderConfig`），
 * 所以 `pickColumnProps` 抄到列外壳上的 `fixed` / `sortable` / `filters` / `align` …
 * 在这里全都会被丢掉 —— 类型上直接不许传，比运行时静默失效好。
 *
 * `validator` 是唯一的例外：它虽然也在 `VirtTableColumn` 上，但组件是**自己读
 * `opts.validator`** 用的（`markValidity`），在单元格级照样生效。
 */
export type CellOnlyOptions<O> = Omit<
  O,
  Exclude<keyof VirtTableColumn<any>, 'validator'>
>;

/**
 * 把一个单元格组件装到**单个格子**上：`table.setCellRender(rowKey, colKey, asCell(...))`。
 *
 * ```ts
 * table.setCellRender('42', 'status', asCell(VtSelect, { options: STATUS }));
 * ```
 *
 * 三件事收在这里：
 *
 * 1. **不用编造 `key` / `title` / `width`**。工厂签名要它们（列级必填，漏了就该报错），
 *    但单元格级毫无意义 —— 真正的列键来自 `setCellRender` 的 `colKey`，组件内部写回走的是
 *    `ctx.column.key`（`commitValue`），从不读 `opts.key`。这里塞占位值再丢掉列外壳。
 * 2. **整对写入 `render` + `renderEditor`**。`renderEditor` 在核心里是独立回落的
 *    （见 `resolveCellRender`），手写单元格级配置很容易只给 `render`，结果这一格展示是
 *    进度条、点开却是列上的下拉。走工厂就不可能配出这种错配。
 * 3. **列专属选项在类型上被拒**（`CellOnlyOptions`），不再静默失效。
 *
 * 要让 `onChange` / `validator` 的 `row` 有类型，用实例化表达式把行类型传给工厂：
 * `asCell(VtSelect<Row>, { options, onChange: (v, row) => … })`。
 */
export function asCell<F extends (opts: any) => VirtTableColumn<any>>(
  factory: F,
  opts: CellOnlyOptions<Parameters<F>[0]>,
): CellRenderConfig<any> {
  // 泛型参数取**整个函数类型**再 `Parameters<F>[0]`，不能写成 `(opts: O) => …`：
  // 工厂本身是泛型函数（`VtSelect<T = any>`），后一种写法推断不出 O，会静默落回约束
  // `BaseColumnOptions<any>` —— 于是 `options` / `max` 这些组件自己的选项全被判成
  // 「未知属性」。这条是编译器实测出来的，别改回去。
  const col = factory({ key: '', title: '', width: 0, ...opts });
  return { render: col.render, cellType: col.cellType, renderEditor: col.renderEditor };
}

/** 根据校验结果标记编辑器控件的错误态；返回是否通过 */
export function markValidity(el: HTMLElement, result: true | string): boolean {
  if (result === true) {
    el.classList.remove('vt-comp-input--invalid');
    el.removeAttribute('title');
    return true;
  }
  el.classList.add('vt-comp-input--invalid');
  el.setAttribute('title', result);
  return false;
}

/** 写回时用得到的上下文子集（`CellRenderContext` / `CellEditContext` 都满足） */
export interface CommitTarget<T> {
  row: T;
  rowIndex: number;
  column: { key: string };
}

/**
 * 统一写回：改行数据 + 通知 `onChange`。
 *
 * 每个组件都散着写 `(row as any)[column.key] = v` 的话，加 `onChange` 就得改十几处，
 * 漏一处就是「这个组件不触发回调」这种说不清的不一致。收口在这里。
 */
export function commitValue<T>(
  opts: Pick<BaseColumnOptions<T>, 'onChange'>,
  ctx: CommitTarget<T>,
  value: unknown,
): void {
  (ctx.row as any)[ctx.column.key] = value;
  opts.onChange?.(value, ctx.row, ctx.rowIndex);
}

/**
 * 让 `render` 里的可交互控件吃掉自己的指针事件，不再冒泡到表格身上。
 *
 * 必需，否则装了插件就会**双重响应**：`vtCellEditor`（默认 `trigger: 'click'`）会把
 * 点击当成「进入编辑」，`vtCellSelection` 会把 `mousedown` 当成框选起点 —— 用户点一下
 * 开关，得到的是一个盖住开关的编辑浮层 + 一块选区。
 *
 * 只 `stopPropagation`，**不** `preventDefault`：勾选框的原生切换、按钮的原生聚焦都还要。
 */
export function stopCellInterference(el: HTMLElement): void {
  for (const type of ['mousedown', 'click', 'dblclick'] as const) {
    el.addEventListener(type, (e) => e.stopPropagation());
  }
}

/** 可以写成常量或 `(row, rowIndex) => 值` 的选项 */
export type Dynamic<V, T> = V | ((row: T, rowIndex: number) => V);

/** 解析 `Dynamic<V, T>` */
export function resolveDynamic<V, T>(v: Dynamic<V, T>, row: T, rowIndex: number): V {
  return typeof v === 'function' ? (v as (r: T, i: number) => V)(row, rowIndex) : v;
}

/**
 * 展示型组件的外层容器。
 *
 * 存在的唯一理由是**行高不变量**：内容元素一律锁高在 `--vt-line-height` 上并
 * `vertical-align: top`（见 components.css 文件头）。收在一个类里，契约测试只要守
 * `.vt-comp-cell` 一处，新组件也不会各自发明一套撑高方式把 40px 的行顶成 42px。
 *
 * @param modifier 追加的修饰类（不带 `vt-comp-cell--` 前缀），如 `'progress'`
 * @param fill     是否撑满单元格宽度（进度条、标签行要）
 */
export function makeCellWrap(modifier?: string, fill = false): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'vt-comp-cell';
  if (fill) wrap.classList.add('vt-comp-cell--fill');
  if (modifier) wrap.classList.add(`vt-comp-${modifier}`);
  return wrap;
}

/* -------------------------------------------------------------------------- *
 * 布尔语义（VtCheckbox / VtSwitch 共用）
 *
 * 真实数据里布尔列常常不是 `true` / `false`，而是 `1/0`、`'Y'/'N'`、`'on'/'off'`。
 * 两个组件对这件事必须给出同一个答案，所以解析与写回都收在这里。
 * -------------------------------------------------------------------------- */

export interface BoolValueOptions {
  /** 勾选时写回的值，默认 `true` */
  trueValue?: unknown;
  /** 取消时写回的值，默认 `false` */
  falseValue?: unknown;
}

/**
 * 判定当前值是否为「真」。
 *
 * 配了 `trueValue` 就**只认它**（严格相等），否则退回 JS 真值判断 —— 后者会把
 * `'N'`、`'0'` 这种非空字符串判成真，所以用字符串枚举的列必须显式配 `trueValue`。
 */
export function isBoolChecked(value: unknown, opts: BoolValueOptions): boolean {
  return opts.trueValue !== undefined ? value === opts.trueValue : !!value;
}

/** 勾选状态 → 要写回行数据的值 */
export function boolWriteBack(checked: boolean, opts: BoolValueOptions): unknown {
  if (checked) return opts.trueValue !== undefined ? opts.trueValue : true;
  return opts.falseValue !== undefined ? opts.falseValue : false;
}

/* -------------------------------------------------------------------------- *
 * 面板类组件的单元格内锚点（VtSelect / VtMultiSelect / VtCascader 共用）
 * -------------------------------------------------------------------------- */

export interface AnchorHandle {
  /** 锚点元素本身，`renderEditor` 直接把它返回给核心 */
  readonly el: HTMLElement;
  /** 设置回显文案；传空串则显示 placeholder（灰色） */
  setText(text: string): void;
  /**
   * 用**节点**回显，而不是文字。
   *
   * 给「常态不是纯文本」的组件用（`VtPerson` 的头像胶囊）：编辑态的回显必须和
   * 常态长得一样，否则点一下单元格，头像变成一串名字，看起来像换了一列。
   * 传空数组回落到 placeholder。
   */
  setNodes(nodes: HTMLElement[]): void;
}

/**
 * 造一个「看起来就是个下拉控件」的锚点：左边回显当前选择，右边一个朝下的小箭头。
 *
 * 三个面板类组件原先各写一份 `.vt-comp-anchor` + `syncAnchor`，差别只在文案怎么拼。
 * 收口在这里之后，箭头、placeholder 灰度、可聚焦（`tabindex`）这些一处改全部生效。
 *
 * `tabIndex = 0` 是必需的：面板的键盘操作（↑↓ 选、Enter 确认）挂在锚点上，
 * 不可聚焦就收不到 keydown。
 *
 * @param onClear 传了就在文案与箭头之间放一个「×」清除按钮（`clearable` 的组件用），
 *   同时**锚点上的 `Delete` / `Backspace` 也走同一个回调**。
 *   按钮只在**有值**时出现 —— 空值没什么可清的，常驻一个灰叉只会让人以为能点。
 *   清除动作放在控件上、而不是面板底部的「清除」按钮：那要先展开面板才点得到，
 *   而「清空这一格」是个一步动作，输入类组件（`VtInput` / `VtDatePicker` …）也一直是
 *   右侧一个 `×`（`wrapWithClear`），下拉类没理由自成一套。
 */
export function makeAnchor(placeholder?: string, onClear?: () => void): AnchorHandle {
  const el = document.createElement('div');
  el.className = 'vt-comp-anchor';
  el.tabIndex = 0;
  el.setAttribute('role', 'combobox');
  el.setAttribute('aria-haspopup', 'listbox');

  const text = document.createElement('span');
  text.className = 'vt-comp-anchor-text';
  el.appendChild(text);

  // `makeClearBtn` 已经处理了 mousedown 的 preventDefault + stopPropagation
  // （不拦的话点一下叉会顺手把面板开合一次）
  const clearBtn = onClear ? makeClearBtn(onClear) : null;
  if (clearBtn) {
    clearBtn.setAttribute('aria-label', '清除');
    el.appendChild(clearBtn);
  }

  /**
   * 键盘上的同一个动作：**激活这一格后按 `Delete` / `Backspace` 就清空**。
   *
   * 锚点不是文本框，这两个键在它身上本来没有任何语义 —— 而「选中一格按 Delete 清掉」
   * 是表格用户的肌肉记忆（Excel / Sheets 都是）。只在有 `onClear`（即 `clearable`）时挂：
   * 「能不能按 Delete 清」和「有没有那个 ×」必须是同一件事，否则同一列出现「叉没有但键
   * 能清」这种解释不通的差别。
   *
   * `preventDefault()`：`Backspace` 在部分环境是「浏览器后退」。
   * `stopPropagation()`：不让键冒到 `vtKeyboardNav` / 宿主页面上再被解释一次。
   *
   * 面板带搜索框时焦点在输入框里、事件到不了这里 —— 那一支由 `_enum.ts` 自己接
   * （搜索词为空才清，否则 `Backspace` 要正常删字）。
   */
  if (onClear) {
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      e.preventDefault();
      e.stopPropagation();
      onClear();
    });
  }

  const caret = document.createElement('span');
  caret.className = 'vt-comp-anchor-caret';
  caret.innerHTML = CHEVRON_SVG;
  el.appendChild(caret);

  const setPlaceholder = (empty: boolean): void => {
    el.classList.toggle('vt-comp-anchor--placeholder', empty);
    if (clearBtn) clearBtn.style.display = empty ? 'none' : '';
  };

  return {
    el,
    setText(value: string) {
      const empty = value === '';
      text.classList.remove('vt-comp-anchor-text--nodes');
      text.textContent = empty ? (placeholder ?? '') : value;
      setPlaceholder(empty);
    },
    setNodes(nodes: HTMLElement[]) {
      const empty = nodes.length === 0;
      text.textContent = '';
      // 节点是块级 flex（如头像胶囊），塞进默认的 inline 容器会竖着堆叠 —— 得让容器横排
      text.classList.toggle('vt-comp-anchor-text--nodes', !empty);
      if (empty) text.textContent = placeholder ?? '';
      else for (const node of nodes) text.appendChild(node);
      setPlaceholder(empty);
    },
  };
}

/** 把列表项滚进可视范围（面板里的 `.vt-filter-list` 有 max-height + overflow） */
export function scrollItemIntoView(list: HTMLElement, item: HTMLElement): void {
  const top = item.offsetTop;
  const bottom = top + item.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = top;
  else if (bottom > list.scrollTop + list.clientHeight) {
    list.scrollTop = bottom - list.clientHeight;
  }
}

/* -------------------------------------------------------------------------- *
 * 单选 / 多选面板的实现搬走了
 *
 * 原来这里有一份 `createSelectEditor`（VtSelect / VtTag[editable] 共用），而
 * `VtMultiSelect` / `VtPerson` 各自还有一份自己的面板 —— 三份实现导致能力分布不均
 * （谁有搜索、谁有键盘导航全凭当时写没写）。现在统一成 `_enum.ts` 的
 * `createEnumEditor`，四个组件都是它的薄预设，见那个文件的头注。
 * -------------------------------------------------------------------------- */
