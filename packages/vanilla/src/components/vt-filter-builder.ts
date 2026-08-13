/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTable, VirtTableColumn } from '../index';
import './vt-filter-builder.css';
import {
  type FilterCondition,
  type FilterGroup,
  type FilterModel,
  type FilterNode,
  type FilterOperator,
  cloneFilterModel,
  countConditions,
  createFilterGroup,
  inferValueKind,
  operandCount,
  operatorsForColumn,
} from '../filter-model';
import { type VtFilterBuilderTexts, zhCN } from '../locale';

/**
 * 筛选管理器（高级筛选条件构建器）。
 *
 * 挂载在**表格之外**由使用方指定的容器里，产出一棵 AND/OR 条件树
 * （见 filter-model.ts），通过 `table.setFilterModel()` 作用到表格。
 * 与表头快捷筛选各自独立，最终 AND 组合。
 *
 * 按需引入，不引入则不产生任何运行时开销（它 400 多行 CSS 也因此单独成入口）：
 * ```ts
 * import { VtFilterBuilder } from '@virt-table/vanilla/components';
 * import '@virt-table/vanilla/components/vt-filter-builder.css';
 * const fb = new VtFilterBuilder({ el: '#filter-bar', table, autoApply: true });
 * ```
 */

// VtFilterBuilderTexts 的定义已迁移到 locale.ts（作为 VirtTableLocale.filterBuilder），
// 这里 re-export 以兼容既有引用。默认文案取 zhCN.filterBuilder，单一事实源。
export type { VtFilterBuilderTexts } from '../locale';

export interface VtFilterBuilderOptions<T extends Record<string, any> = any> {
  /** 挂载容器（元素或选择器）；内容会被本组件接管 */
  el: HTMLElement | string;
  /** 关联的表格实例：传入则自动取列，且应用时调 table.setFilterModel() */
  table?: VirtTable<T>;
  /** 手动指定可筛选列（不传 table 时必须提供） */
  columns?: VirtTableColumn<T>[];
  /** 初始模型 */
  model?: FilterModel;
  /** 每次改动即时应用（默认 false，需点「应用筛选」） */
  autoApply?: boolean;
  /** 是否显示底部操作栏（默认 true；autoApply 时仅保留「清空」） */
  showFooter?: boolean;
  /** 主题：不传则跟随 .dark / [data-theme='dark'] 祖先自动判断 */
  theme?: 'light' | 'dark';
  /** 文案覆盖 */
  texts?: Partial<VtFilterBuilderTexts>;
  /** 模型变化（含编辑中的半成品） */
  onChange?: (model: FilterModel) => void;
  /** 应用到表格后触发 */
  onApply?: (model: FilterModel) => void;
}

export class VtFilterBuilder<T extends Record<string, any> = any> {
  private _el: HTMLElement;
  private _opts: VtFilterBuilderOptions<T>;
  private _texts: VtFilterBuilderTexts;
  private _operatorLabels: Record<FilterOperator, string>;
  private _model: FilterGroup;
  private _columns: VirtTableColumn<T>[] = [];
  private _summaryEl: HTMLElement | null = null;

  constructor(opts: VtFilterBuilderOptions<T>) {
    const el = typeof opts.el === 'string' ? document.querySelector<HTMLElement>(opts.el) : opts.el;
    if (!el) throw new Error('[VtFilterBuilder] 挂载容器不存在');
    this._el = el;
    this._opts = opts;
    // 默认文案跟随关联表格的 locale（构造时读取一次）；显式 texts 最高优先
    const tableLocale = opts.table?.getLocale();
    this._texts = { ...(tableLocale?.filterBuilder ?? zhCN.filterBuilder), ...(opts.texts ?? {}) };
    this._operatorLabels = tableLocale?.operators ?? zhCN.operators;
    this._model = opts.model ? (cloneFilterModel(opts.model) as FilterGroup) : createFilterGroup('and');
    this._columns = this._resolveColumns();
    this._el.classList.add('vt-fb');
    if (opts.theme) this.setTheme(opts.theme);
    this.render();
  }

  /** 切换主题（不调用则跟随暗色祖先自动适配） */
  setTheme(theme: 'light' | 'dark'): void {
    this._el.classList.toggle('vt-fb--dark', theme === 'dark');
    this._el.classList.toggle('vt-fb--light', theme === 'light');
  }

  // --------------- public API ---------------

  /** 当前模型（深拷贝）；无生效条件时返回 null */
  getModel(): FilterModel {
    return countConditions(this._model) > 0 ? cloneFilterModel(this._model) : null;
  }

  /** 受控设置模型（不会自动应用到表格） */
  setModel(model: FilterModel): void {
    this._model = model ? (cloneFilterModel(model) as FilterGroup) : createFilterGroup('and');
    this.render();
  }

  /** 更新可筛选列（表格列变化后调用） */
  setColumns(columns: VirtTableColumn<T>[]): void {
    this._opts.columns = columns;
    this._columns = this._resolveColumns();
    this.render();
  }

  /** 重新读取列并重绘（列显隐变化后调用） */
  refresh(): void {
    this._columns = this._resolveColumns();
    this.render();
  }

  /** 应用当前模型到表格 */
  apply(): void {
    const model = this.getModel();
    this._opts.table?.setFilterModel(model);
    this._opts.onApply?.(model);
  }

  /** 清空所有条件（并同步清掉表格上的高级筛选） */
  clear(): void {
    this._model = createFilterGroup('and');
    this.render();
    this._emitChange();
    this._opts.table?.clearFilterModel();
    this._opts.onApply?.(null);
  }

  /** 卸载：清空容器内容与 class */
  destroy(): void {
    this._el.innerHTML = '';
    this._el.classList.remove('vt-fb');
    this._summaryEl = null;
  }

  /** 整树重绘（结构性改动后调用；纯文本输入不走这里以免掉焦点） */
  render(): void {
    this._el.innerHTML = '';
    const body = document.createElement('div');
    body.className = 'vt-fb-body';
    body.appendChild(this._renderGroup(this._model, null, 0));
    this._el.appendChild(body);

    if (this._opts.showFooter !== false) {
      this._el.appendChild(this._renderFooter());
    }
  }

  // --------------- internals ---------------

  /** 可筛选列：优先手动 columns，其次表格可见列；排除功能列与无标题列 */
  private _resolveColumns(): VirtTableColumn<T>[] {
    const raw = this._opts.columns ?? this._opts.table?.getVisibleColumns() ?? [];
    const skip = new Set(['index', 'checkbox', 'radio', 'drag', 'expand']);
    return raw.filter((c) => !!c.title && !(c.type && skip.has(c.type)));
  }

  private _colOf(key: string): VirtTableColumn<T> | undefined {
    return this._columns.find((c) => c.key === key);
  }

  private _emitChange(): void {
    const model = this.getModel();
    this._opts.onChange?.(model);
    this._refreshSummary();
    if (this._opts.autoApply) {
      this._opts.table?.setFilterModel(model);
      this._opts.onApply?.(model);
    }
  }

  /** 底部条件计数（有生效条件时点亮） */
  private _refreshSummary(): void {
    if (!this._summaryEl) return;
    const n = countConditions(this._model);
    this._summaryEl.textContent = this._texts.summary(n);
    this._summaryEl.classList.toggle('vt-fb-summary--active', n > 0);
  }

  /** 结构性改动：重绘 + 触发变更 */
  private _mutate(fn: () => void): void {
    fn();
    this.render();
    this._emitChange();
  }

  private _renderGroup(group: FilterGroup, parent: FilterGroup | null, depth: number): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'vt-fb-group';
    if (depth > 0) wrap.classList.add('vt-fb-group--nested');
    wrap.dataset.logic = group.logic;

    // 「且 / 或」压在组的左侧括号线上：既是当前逻辑的回显，也是切换按钮
    const other = group.logic === 'and' ? 'or' : 'and';
    const labelOf = (logic: 'and' | 'or') => (logic === 'and' ? this._texts.and : this._texts.or);
    const logicBtn = document.createElement('button');
    logicBtn.type = 'button';
    logicBtn.className = `vt-fb-logic vt-fb-logic--${group.logic}`;
    logicBtn.textContent = labelOf(group.logic);
    logicBtn.title = this._texts.switchLogic(labelOf(other));
    logicBtn.setAttribute('aria-label', logicBtn.title);
    logicBtn.addEventListener('click', () =>
      this._mutate(() => {
        group.logic = other;
      }),
    );
    wrap.appendChild(logicBtn);

    const nodes = document.createElement('div');
    nodes.className = 'vt-fb-nodes';
    if (group.children.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vt-fb-empty';
      empty.textContent = this._texts.empty;
      nodes.appendChild(empty);
    }
    for (const child of group.children) {
      const item = document.createElement('div');
      item.className = 'vt-fb-node';
      item.appendChild(
        child.kind === 'group'
          ? this._renderGroup(child, group, depth + 1)
          : this._renderCondition(child, group),
      );
      nodes.appendChild(item);
    }

    // 组内操作条：新增条件 / 新增子组 /（非根组）删除本组
    const actions = document.createElement('div');
    actions.className = 'vt-fb-group-actions';
    const btnCond = this._mkTextBtn(this._texts.addCondition, () =>
      this._mutate(() => group.children.push(this._newCondition())),
    );
    btnCond.classList.add('vt-fb-btn--add');
    const btnGroup = this._mkTextBtn(this._texts.addGroup, () =>
      this._mutate(() => group.children.push(createFilterGroup(other))),
    );
    btnGroup.classList.add('vt-fb-btn--add');
    actions.appendChild(btnCond);
    actions.appendChild(btnGroup);
    if (parent) {
      const btnDel = this._mkTextBtn(this._texts.removeGroup, () =>
        this._mutate(() => {
          const i = parent.children.indexOf(group);
          if (i >= 0) parent.children.splice(i, 1);
        }),
      );
      btnDel.classList.add('vt-fb-btn--danger');
      actions.appendChild(btnDel);
    }
    nodes.appendChild(actions);

    wrap.appendChild(nodes);
    return wrap;
  }

  private _renderCondition(cond: FilterCondition, parent: FilterGroup): HTMLElement {
    const row = document.createElement('div');
    row.className = 'vt-fb-row';

    // 列选择
    const colSel = document.createElement('select');
    colSel.className = 'vt-fb-select';
    if (!this._colOf(cond.colKey)) {
      const orphan = document.createElement('option');
      orphan.value = cond.colKey;
      orphan.textContent = `${cond.colKey} ${this._texts.invalidColumn}`;
      colSel.appendChild(orphan);
      row.classList.add('vt-fb-row--invalid');
    }
    for (const col of this._columns) {
      const opt = document.createElement('option');
      opt.value = col.key;
      opt.textContent = col.title;
      colSel.appendChild(opt);
    }
    colSel.value = cond.colKey;
    colSel.addEventListener('change', () => {
      this._mutate(() => {
        cond.colKey = colSel.value;
        const col = this._colOf(cond.colKey);
        const ops = col ? operatorsForColumn(col) : (['contains'] as FilterOperator[]);
        // 换列后算子可能不再可用，回落到首个候选并清值
        if (!ops.includes(cond.operator)) cond.operator = ops[0];
        cond.value = undefined;
        cond.value2 = undefined;
      });
    });
    row.appendChild(colSel);

    // 算子选择
    const col = this._colOf(cond.colKey);
    const opSel = document.createElement('select');
    opSel.className = 'vt-fb-select vt-fb-select--op';
    const ops = col ? operatorsForColumn(col) : [cond.operator];
    for (const op of ops) {
      const opt = document.createElement('option');
      opt.value = op;
      opt.textContent = this._operatorLabels[op];
      opSel.appendChild(opt);
    }
    opSel.value = cond.operator;
    opSel.addEventListener('change', () => {
      this._mutate(() => {
        const prev = operandCount(cond.operator);
        cond.operator = opSel.value as FilterOperator;
        // 操作数形态变了就清值，避免残留 [] / {} 之类脏值
        if (operandCount(cond.operator) !== prev) {
          cond.value = undefined;
          cond.value2 = undefined;
        }
      });
    });
    row.appendChild(opSel);

    // 值输入
    const valueBox = document.createElement('div');
    valueBox.className = 'vt-fb-value';
    this._renderValueInputs(valueBox, cond, col);
    row.appendChild(valueBox);

    row.appendChild(
      this._mkIconBtn(this._texts.removeNode, () =>
        this._mutate(() => {
          const i = parent.children.indexOf(cond);
          if (i >= 0) parent.children.splice(i, 1);
        }),
      ),
    );
    return row;
  }

  /** 按算子的操作数形态渲染输入控件 */
  private _renderValueInputs(
    box: HTMLElement,
    cond: FilterCondition,
    col: VirtTableColumn<T> | undefined,
  ): void {
    const arity = operandCount(cond.operator);
    if (arity === 0) {
      // isEmpty / isNotEmpty 无需输入，给个占位说明避免行显得残缺
      const hint = document.createElement('span');
      hint.className = 'vt-fb-value-none';
      hint.textContent = this._texts.noValueHint;
      box.appendChild(hint);
      return;
    }

    const kind = col ? inferValueKind(col) : 'text';
    const inputType = kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text';

    if (arity === 'multi') {
      // 枚举多选：候选来自列的 filters；无候选时回落成逗号分隔文本
      const options = col?.filters ?? [];
      const selected = new Set(Array.isArray(cond.value) ? cond.value : []);
      if (options.length === 0) {
        const input = this._mkInput('text', selected.size ? [...selected].join(',') : '', (v) => {
          cond.value = v === '' ? [] : v.split(',').map((s) => s.trim());
        });
        input.placeholder = '多个值用英文逗号分隔';
        box.appendChild(input);
        return;
      }
      const list = document.createElement('div');
      list.className = 'vt-fb-enum';
      for (const opt of options) {
        const label = document.createElement('label');
        label.className = 'vt-fb-enum-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'vt-filter-checkbox';
        cb.checked = selected.has(opt.value);
        label.classList.toggle('vt-fb-enum-item--checked', cb.checked);
        cb.addEventListener('change', () => {
          if (cb.checked) selected.add(opt.value);
          else selected.delete(opt.value);
          label.classList.toggle('vt-fb-enum-item--checked', cb.checked);
          cond.value = [...selected];
          this._emitChange();
        });
        const span = document.createElement('span');
        span.textContent = opt.label;
        label.appendChild(cb);
        label.appendChild(span);
        list.appendChild(label);
      }
      box.appendChild(list);
      return;
    }

    // 单值：枚举列用下拉，其余按值域用对应 input
    const mkSingle = (
      current: unknown,
      onInput: (v: string) => void,
      placeholder?: string,
    ): HTMLElement => {
      if (kind === 'enum' && col?.filters?.length) {
        const sel = document.createElement('select');
        sel.className = 'vt-fb-select';
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '请选择';
        sel.appendChild(blank);
        for (const opt of col.filters) {
          const o = document.createElement('option');
          o.value = String(opt.value);
          o.textContent = opt.label;
          sel.appendChild(o);
        }
        sel.value = current == null ? '' : String(current);
        sel.addEventListener('change', () => {
          // 从候选里回填原始值，保持类型（数字列不会被字符串化）
          const hit = col.filters!.find((f) => String(f.value) === sel.value);
          cond.value = sel.value === '' ? undefined : hit ? hit.value : sel.value;
          this._emitChange();
        });
        return sel;
      }
      const input = this._mkInput(inputType, current == null ? '' : String(current), onInput);
      if (placeholder) input.placeholder = placeholder;
      return input;
    };

    if (arity === 2) {
      box.classList.add('vt-fb-value--range');
      box.appendChild(
        mkSingle(cond.value, (v) => {
          cond.value = this._parse(v, kind);
        }, kind === 'number' ? '最小值' : '开始'),
      );
      const sep = document.createElement('span');
      sep.className = 'vt-fb-sep';
      sep.textContent = this._texts.betweenSep;
      box.appendChild(sep);
      box.appendChild(
        mkSingle(cond.value2, (v) => {
          cond.value2 = this._parse(v, kind);
        }, kind === 'number' ? '最大值' : '结束'),
      );
      return;
    }

    box.appendChild(
      mkSingle(cond.value, (v) => {
        cond.value = this._parse(v, kind);
      }),
    );
  }

  /** 文本/数字/日期输入：只写模型不重绘，避免打字时掉焦点 */
  private _mkInput(type: string, value: string, onInput: (v: string) => void): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.className = 'vt-fb-input';
    input.value = value;
    input.addEventListener('input', () => {
      onInput(input.value);
      this._emitChange();
    });
    return input;
  }

  private _parse(v: string, kind: string): unknown {
    if (v === '') return undefined;
    if (kind === 'number') {
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    }
    return v;
  }

  private _newCondition(): FilterCondition {
    const col = this._columns[0];
    const ops = col ? operatorsForColumn(col) : (['contains'] as FilterOperator[]);
    return { kind: 'condition', colKey: col?.key ?? '', operator: ops[0] };
  }

  private _mkTextBtn(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vt-fb-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private _mkIconBtn(title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vt-fb-btn vt-fb-btn--icon';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 7h16"/><path d="M10 4h4"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/></svg>';
    btn.addEventListener('click', onClick);
    return btn;
  }

  private _renderFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'vt-fb-footer';

    const summary = document.createElement('span');
    summary.className = 'vt-fb-summary';
    this._summaryEl = summary;
    footer.appendChild(summary);
    this._refreshSummary();

    const btnClear = document.createElement('button');
    btnClear.type = 'button';
    btnClear.className = 'vt-fb-action';
    btnClear.textContent = this._texts.clear;
    btnClear.addEventListener('click', () => this.clear());
    footer.appendChild(btnClear);

    if (!this._opts.autoApply) {
      const btnApply = document.createElement('button');
      btnApply.type = 'button';
      btnApply.className = 'vt-fb-action vt-fb-action--primary';
      btnApply.textContent = this._texts.apply;
      btnApply.addEventListener('click', () => this.apply());
      footer.appendChild(btnApply);
    }
    return footer;
  }
}

export type { FilterModel, FilterNode, FilterGroup, FilterCondition, FilterOperator };
