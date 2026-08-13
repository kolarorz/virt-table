// @vitest-environment happy-dom
/**
 * 内置单元格组件的 DOM 层测试。
 *
 * 这些组件是**纯工厂函数**：给一份 options，返回一个带 `render` / `renderEditor` 的列。
 * 所以不需要造 `VirtTable` 实例（也就绕开了 §5.1 里 `renderControl` 钉窗口那套），
 * 直接手工调 `render(ctx)` / `renderEditor(ctx)` 断言产出的 DOM 与写回结果。
 *
 * happy-dom 的两处限制影响了断言写法，不是疏漏：
 *   - **没有布局引擎**：`getBoundingClientRect()` 全返 0，所以浮层的定位数值测不了
 *     （只断言它被挂到了 `.vt-client` 里、带着 `data-vt-popup`），`VtRate` 的半星**点选**
 *     也测不了（判定依赖点击点落在星宽的哪一半），改测半星的**显示**。
 *   - **`renderEditor` 返回的元素要自己挂进 DOM**：真实路径里是 cell-editor 挂的，而
 *     `_popup.ts` 的锚定循环会在锚点离开 DOM 时自毁 —— 不挂就什么都测不到。
 *     `openEdit()` 帮忙做了这件事。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VirtTableColumn } from '../index';
import { asCell } from './shared';
import { VtCheckbox } from './vt-checkbox';
import { VtSwitch } from './vt-switch';
import { VtTag } from './vt-tag';
import { VtSelect } from './vt-select';
import { VtActions } from './vt-actions';
import { VtProgress } from './vt-progress';
import { VtRate } from './vt-rate';
import { VtLink } from './vt-link';
import { VtTextarea } from './vt-textarea';
import { VtTimePicker } from './vt-time-picker';
import { VtDatePicker } from './vt-date-picker';
import { VtDateRangePicker } from './vt-date-range-picker';
import { VtAutocomplete } from './vt-autocomplete';
import { VtCascader } from './vt-cascader';
import { VtPerson } from './vt-person';

type Row = Record<string, any>;

/** 浮层的宿主 `.vt-client`（真实骨架里 `.vt-cell-cover` 也挂这层） */
let client: HTMLElement;

beforeEach(() => {
  /**
   * 照搬真实骨架的两层：浮层靠 `closest('.vt-client')` 找宿主 —— 那是 `.vt-cell-cover`
   * 所在的层，两者同一套定位（见 `_popup.ts` 顶部）。外面还得套一层 `.vt-root`，
   * `--vt-*` 只声明在它上面。
   */
  const root = document.createElement('div');
  root.className = 'vt-root';
  client = document.createElement('div');
  client.className = 'vt-client';
  root.appendChild(client);
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
});

const ctxOf = (col: VirtTableColumn<Row>, row: Row, rowIndex = 0) => ({
  value: row[col.key],
  row,
  rowIndex,
  column: col,
});

/** 调常态渲染，返回产出的元素（组件都返回 HTMLElement 或字符串） */
const renderCell = (col: VirtTableColumn<Row>, row: Row, rowIndex = 0): HTMLElement | string => {
  const out = col.render!(ctxOf(col, row, rowIndex) as any);
  return out as HTMLElement | string;
};

/** 调编辑态渲染，并把产出挂进 `.vt-cell-cover`（浮层的锚定循环依赖它连在 DOM 上） */
const openEdit = (col: VirtTableColumn<Row>, row: Row, rowIndex = 0): HTMLElement => {
  const cover = document.createElement('div');
  cover.className = 'vt-cell-cover';
  client.appendChild(cover);
  const out = col.renderEditor!({ ...ctxOf(col, row, rowIndex), el: cover } as any);
  const el = out as HTMLElement;
  cover.appendChild(el);
  return el;
};

const popupEl = (): HTMLElement | null => client.querySelector('[data-vt-popup]');

describe('VtCheckbox', () => {
  it('常态就是可点的勾选框，change 直接写回', () => {
    const col = VtCheckbox<Row>({ key: 'enabled', title: '启用' });
    const row: Row = { enabled: false };
    const el = renderCell(col, row) as HTMLElement;

    const box = el.querySelector('input.vt-checkbox') as HTMLInputElement;
    expect(box).toBeTruthy();
    expect(box.checked).toBe(false);

    box.checked = true;
    box.dispatchEvent(new Event('change'));
    expect(row.enabled).toBe(true);
  });

  it('不提供 renderEditor（点一下就改，不该再弹编辑浮层）', () => {
    const col = VtCheckbox<Row>({ key: 'enabled', title: '启用' });
    expect(col.renderEditor).toBeUndefined();
  });

  it('trueValue / falseValue 映射非布尔值', () => {
    const col = VtCheckbox<Row>({ key: 'vip', title: 'VIP', trueValue: 'Y', falseValue: 'N' });
    const row: Row = { vip: 'Y' };
    const box = (renderCell(col, row) as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(box.checked).toBe(true);

    box.checked = false;
    box.dispatchEvent(new Event('change'));
    expect(row.vip).toBe('N');
  });

  it('配了 trueValue 就只认它 —— 否则 "N" 会被 JS 真值判断当成勾选', () => {
    const loose = VtCheckbox<Row>({ key: 'vip', title: 'VIP' });
    const strict = VtCheckbox<Row>({ key: 'vip', title: 'VIP', trueValue: 'Y' });
    const row: Row = { vip: 'N' };

    expect(
      ((renderCell(loose, row) as HTMLElement).querySelector('input') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      ((renderCell(strict, row) as HTMLElement).querySelector('input') as HTMLInputElement).checked,
    ).toBe(false);
  });

  it('disabled 只回显、不写回', () => {
    const col = VtCheckbox<Row>({ key: 'locked', title: '锁定', disabled: true });
    const row: Row = { locked: true };
    const box = (renderCell(col, row) as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(box.disabled).toBe(true);

    box.checked = false;
    box.dispatchEvent(new Event('change'));
    expect(row.locked).toBe(true);
  });
});

describe('VtSwitch', () => {
  it('点击翻转 aria-checked、写回、并同步文案', () => {
    const onChange = vi.fn();
    const col = VtSwitch<Row>({
      key: 'enabled',
      title: '启用',
      activeText: '已开启',
      inactiveText: '已关闭',
      onChange,
    });
    const row: Row = { enabled: false };
    const el = renderCell(col, row) as HTMLElement;

    const track = el.querySelector('.vt-comp-switch-track') as HTMLButtonElement;
    const text = el.querySelector('.vt-comp-switch-text') as HTMLElement;
    expect(track.getAttribute('aria-checked')).toBe('false');
    expect(text.textContent).toBe('已关闭');

    track.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.enabled).toBe(true);
    expect(track.getAttribute('aria-checked')).toBe('true');
    expect(text.textContent).toBe('已开启');
    expect(onChange).toHaveBeenCalledWith(true, row, 0);
  });

  it('trueValue 下写回的是映射值', () => {
    const col = VtSwitch<Row>({ key: 's', title: 'S', trueValue: 'on', falseValue: 'off' });
    const row: Row = { s: 'off' };
    const track = (renderCell(col, row) as HTMLElement).querySelector(
      '.vt-comp-switch-track',
    ) as HTMLButtonElement;
    track.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.s).toBe('on');
  });

  it('disabled 时按钮禁用且点击无效', () => {
    const col = VtSwitch<Row>({ key: 's', title: 'S', disabled: true });
    const row: Row = { s: false };
    const track = (renderCell(col, row) as HTMLElement).querySelector(
      '.vt-comp-switch-track',
    ) as HTMLButtonElement;
    expect(track.disabled).toBe(true);
    track.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.s).toBe(false);
  });
});

describe('VtTag', () => {
  const STATUS = [
    { value: 'active', label: '活跃', variant: 'success' as const },
    { value: 'banned', label: '封禁', color: '#ff0000' },
  ];

  it('按 options 映射标签文案，复用核心 .vt-cell-option 皮肤', () => {
    const col = VtTag<Row>({ key: 'status', title: '状态', options: STATUS });
    const el = renderCell(col, { status: 'active' }) as HTMLElement;
    expect(el.classList.contains('vt-cell-option')).toBe(true);
    expect(el.textContent).toBe('活跃');
  });

  it('配色优先级：选项 color > 选项 variant > 列级', () => {
    const col = VtTag<Row>({ key: 'status', title: '状态', options: STATUS, variant: 'primary' });
    const banned = renderCell(col, { status: 'banned' }) as HTMLElement;
    expect(banned.style.getPropertyValue('--vt-cell-option-color')).toBe('#ff0000');

    const active = renderCell(col, { status: 'active' }) as HTMLElement;
    expect(active.style.getPropertyValue('--vt-cell-option-color')).toBe(
      'var(--vt-color-success)',
    );
  });

  it('不配 options 时把原值当标签文案；空值走 placeholder', () => {
    const col = VtTag<Row>({ key: 'level', title: '级别', placeholder: '未设置' });
    expect((renderCell(col, { level: '高' }) as HTMLElement).textContent).toBe('高');
    expect(renderCell(col, { level: '' })).toBe('未设置');
  });

  /**
   * `VtTag` 是**纯展示**列 —— 它没有候选集，值本身就是内容。
   *
   * 走过的弯路：这里曾经有 `editable`（内部走枚举选择内核），于是「单值彩色标签」是
   * `VtTag({ editable: true })`、「多值彩色标签」是 `VtMultiSelect` —— 元数换了组件名、
   * 样式也换了组件名，同一件事有了多种拼法。现在「从候选集里选」只有 `VtSelect` 一个
   * 入口，样式是它的 `display` 参数。
   */
  it('纯展示：不提供 renderEditor（要可选的标签列用 VtSelect({ display: "tag" })）', () => {
    expect(VtTag<Row>({ key: 's', title: 'S', options: STATUS }).renderEditor).toBeUndefined();
    expect(VtTag<Row>({ key: 's', title: 'S' }).renderEditor).toBeUndefined();
  });

  it('与 VtSelect 的胶囊共用同一个工厂 —— 只读标签和选出来的标签长得必须一样', () => {
    const readOnly = VtTag<Row>({ key: 'status', title: '状态', options: STATUS });
    const selectable = VtSelect<Row>({
      key: 'status',
      title: '状态',
      options: STATUS,
      display: 'tag',
    });

    const a = renderCell(readOnly, { status: 'active' }) as HTMLElement;
    const b = renderCell(selectable, { status: 'active' }) as HTMLElement;

    expect(a.className).toBe(b.className);
    expect(a.textContent).toBe(b.textContent);
    expect(a.style.getPropertyValue('--vt-cell-option-color')).toBe(
      b.style.getPropertyValue('--vt-cell-option-color'),
    );
  });
});

describe('VtSelect', () => {
  const STATUS = [
    { value: 'active', label: '活跃' },
    { value: 'pending', label: '待审' },
    { value: 'banned', label: '封禁', disabled: true },
  ];

  it('常态用候选项的 label；查不到就回落到原值，空值走 placeholder', () => {
    const col = VtSelect<Row>({
      key: 's',
      title: 'S',
      options: STATUS,
      placeholder: '请选择',
    });
    expect(renderCell(col, { s: 'pending' })).toBe('待审');
    expect(renderCell(col, { s: 'unknown' })).toBe('unknown');
    expect(renderCell(col, { s: '' })).toBe('请选择');
  });

  it('编辑态是锚点 + 自绘面板，不是原生 select', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS });
    const anchor = openEdit(col, { s: 'active' });

    expect(anchor.classList.contains('vt-comp-anchor')).toBe(true);
    // 锚点要能聚焦，键盘操作（↑↓/Enter）挂在它上面
    expect(anchor.tabIndex).toBe(0);
    expect(anchor.querySelector('.vt-comp-anchor-text')?.textContent).toBe('活跃');
    expect(anchor.querySelector('.vt-comp-anchor-caret')).toBeTruthy();

    const popup = popupEl();
    expect(popup, '候选面板应挂在 .vt-client 上（与 .vt-cell-cover 同层）').toBeTruthy();
    expect(popup!.querySelector('select')).toBeNull();
    expect(popup!.classList.contains('vt-filter-panel'), '复用共享面板皮肤').toBe(true);
  });

  it('选中项带 is-selected 与对勾（不只靠颜色表达选中）', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS });
    openEdit(col, { s: 'pending' });

    const items = [...popupEl()!.querySelectorAll('.vt-filter-item')] as HTMLElement[];
    expect(items.findIndex((i) => i.classList.contains('is-selected'))).toBe(1);
    expect(items[1]!.querySelector('.vt-comp-check')!.innerHTML).toContain('<svg');
    expect(items[0]!.querySelector('.vt-comp-check')!.innerHTML).toBe('');
  });

  it('点选项写回并关闭面板，锚点回显新 label', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS });
    const row: Row = { s: 'active' };
    const anchor = openEdit(col, row);

    const items = [...popupEl()!.querySelectorAll('.vt-filter-item')] as HTMLElement[];
    items[1]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(row.s).toBe('pending');
    expect(anchor.querySelector('.vt-comp-anchor-text')?.textContent).toBe('待审');
    expect(popupEl(), '选中后面板应关闭').toBeNull();
  });

  it('禁用项点不动', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS });
    const row: Row = { s: 'active' };
    openEdit(col, row);

    const items = [...popupEl()!.querySelectorAll('.vt-filter-item')] as HTMLElement[];
    expect(items[2]!.getAttribute('aria-disabled')).toBe('true');
    items[2]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(row.s).toBe('active');
  });

  it('键盘：↓ 移动高亮（跳过禁用项）、Enter 选中', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS });
    const row: Row = { s: 'active' };
    const anchor = openEdit(col, row);

    const press = (key: string) =>
      anchor.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    // 当前是 active（index 0）→ ↓ 到 pending（1）
    press('ArrowDown');
    let items = [...popupEl()!.querySelectorAll('.vt-filter-item')] as HTMLElement[];
    expect(items.findIndex((i) => i.classList.contains('is-active'))).toBe(1);

    // 再 ↓ 本该到 banned（2），但它 disabled → 跳过，回到 0
    press('ArrowDown');
    items = [...popupEl()!.querySelectorAll('.vt-filter-item')] as HTMLElement[];
    expect(items.findIndex((i) => i.classList.contains('is-active'))).toBe(0);

    press('ArrowDown');
    press('Enter');
    expect(row.s).toBe('pending');
  });

  it('clearable 时清除按钮是控件右侧那个「×」，不在面板底部', () => {
    const withClear = VtSelect<Row>({ key: 's', title: 'S', options: STATUS, clearable: true });
    const row: Row = { s: 'active' };
    const anchor = openEdit(withClear, row);

    // 面板底部不再放按钮：那要先展开面板才点得到
    expect(popupEl()!.querySelector('.vt-filter-btn')).toBeNull();

    const btn = anchor.querySelector('.vt-comp-clear') as HTMLElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe('×');
    // 排在文案与箭头之间
    expect([...anchor.children].map((c) => c.className)).toEqual([
      'vt-comp-anchor-text',
      'vt-comp-clear',
      'vt-comp-anchor-caret',
    ]);

    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(row.s).toBe('');
    // 清空之后没什么可清的，叉自己藏起来
    expect(btn.style.display).toBe('none');

    // 不配 clearable 就没有叉
    const noClear = VtSelect<Row>({ key: 's', title: 'S', options: STATUS });
    expect(openEdit(noClear, { s: 'active' }).querySelector('.vt-comp-clear')).toBeNull();
  });

  it('空值时不显示「×」（没什么可清的）', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS, clearable: true });
    const anchor = openEdit(col, { s: '' });
    expect((anchor.querySelector('.vt-comp-clear') as HTMLElement).style.display).toBe('none');
  });

  it('disabled 列不给编辑态', () => {
    expect(
      VtSelect<Row>({ key: 's', title: 'S', options: STATUS, disabled: true }).renderEditor,
    ).toBeUndefined();
  });

  it('枚举列默认不给搜索框（3~8 项时多一行搜索框是噪音）', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS });
    openEdit(col, { s: '' });
    expect(popupEl()!.querySelector('.vt-comp-search')).toBeNull();
  });

  it('searchable 打开后能按 label / value 过滤，搜不到给空态', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS, searchable: true });
    openEdit(col, { s: '' });
    const popup = popupEl()!;
    const input = popup.querySelector('.vt-comp-search input') as HTMLInputElement;
    const labels = () => [...popup.querySelectorAll('.vt-filter-item')].map((i) => i.textContent);

    input.value = '待';
    input.dispatchEvent(new Event('input'));
    expect(labels()).toEqual(['待审']);

    input.value = 'banned';
    input.dispatchEvent(new Event('input'));
    expect(labels()).toEqual(['封禁']);

    input.value = '查无';
    input.dispatchEvent(new Event('input'));
    expect((popup.querySelector('.vt-comp-popup-empty') as HTMLElement).textContent).toBe(
      '无匹配项',
    );
  });

  it('multiple：常态按「、」拼文本，编辑态是勾选面板', () => {
    const col = VtSelect<Row>({ key: 's', title: 'S', options: STATUS, multiple: true });
    const row: Row = { s: ['active', 'pending'] };
    expect(renderCell(col, row)).toBe('活跃、待审');

    openEdit(col, row);
    const boxes = [...popupEl()!.querySelectorAll('input.vt-filter-checkbox')] as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([true, true, false]);
    boxes[1]!.dispatchEvent(new Event('change'));
    expect(row.s).toEqual(['active']);
  });

  it('multiple + valueType: string —— 按分隔符拆和拼', () => {
    const col = VtSelect<Row>({
      key: 's',
      title: 'S',
      options: STATUS,
      multiple: true,
      valueType: 'string',
      separator: '|',
    });
    const row: Row = { s: 'active|pending' };
    expect(renderCell(col, row)).toBe('活跃、待审');

    openEdit(col, row);
    const boxes = [...popupEl()!.querySelectorAll('input.vt-filter-checkbox')] as HTMLInputElement[];
    boxes[1]!.dispatchEvent(new Event('change'));
    expect(row.s).toBe('active');
  });
});

describe('VtActions', () => {
  it('hidden 的按钮不渲染，disabled 的渲染但禁用', () => {
    const col = VtActions<Row>({
      key: 'ops',
      title: '操作',
      items: [
        { text: '编辑', onClick: () => {} },
        { text: '停用', hidden: (row) => !row.enabled, onClick: () => {} },
        { text: '重置', disabled: () => true, onClick: () => {} },
      ],
    });

    const el = renderCell(col, { enabled: false }) as HTMLElement;
    const btns = [...el.querySelectorAll('button')] as HTMLButtonElement[];
    expect(btns.map((b) => b.textContent)).toEqual(['编辑', '重置']);
    expect(btns[1]!.disabled).toBe(true);
  });

  it('onClick 拿到 row 与 rowIndex', () => {
    const onClick = vi.fn();
    const col = VtActions<Row>({ key: 'ops', title: '操作', items: [{ text: '删除', onClick }] });
    const row: Row = { id: 7 };
    const btn = (renderCell(col, row, 3) as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledWith(row, 3);
  });

  it('variant 写进 --vt-comp-action-color', () => {
    const col = VtActions<Row>({
      key: 'ops',
      title: '操作',
      items: [{ text: '删除', variant: 'danger', onClick: () => {} }],
    });
    const btn = (renderCell(col, {}) as HTMLElement).querySelector('button') as HTMLElement;
    expect(btn.style.getPropertyValue('--vt-comp-action-color')).toBe('var(--vt-color-danger)');
  });

  it('confirm：先弹气泡，点「确认」才执行；气泡挂在 .vt-client 里并带 data-vt-popup', () => {
    const onClick = vi.fn();
    const col = VtActions<Row>({
      key: 'ops',
      title: '操作',
      items: [{ text: '删除', confirm: '确定删除？', onClick }],
    });
    const el = renderCell(col, {}) as HTMLElement;
    client.appendChild(el);

    const btn = el.querySelector('button') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const popup = popupEl();
    expect(popup, '确认气泡应挂在 .vt-client 里').toBeTruthy();
    expect(popup!.textContent).toContain('确定删除？');
    expect(onClick).not.toHaveBeenCalled();

    const ok = popup!.querySelector('.vt-filter-btn--primary') as HTMLButtonElement;
    ok.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(popupEl()).toBeNull();
  });

  it('confirm：点「取消」关掉气泡且不执行', () => {
    const onClick = vi.fn();
    const col = VtActions<Row>({
      key: 'ops',
      title: '操作',
      items: [{ text: '删除', confirm: { text: '确定？', cancelText: '算了' }, onClick }],
    });
    const el = renderCell(col, {}) as HTMLElement;
    client.appendChild(el);
    (el.querySelector('button') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );

    const cancel = popupEl()!.querySelector('.vt-filter-btn') as HTMLButtonElement;
    expect(cancel.textContent).toBe('算了');
    cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(popupEl()).toBeNull();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('VtProgress', () => {
  it('按 max 折算百分比，文字默认显示整数百分比', () => {
    const col = VtProgress<Row>({ key: 'p', title: '进度', max: 200 });
    const el = renderCell(col, { p: 50 }) as HTMLElement;
    expect((el.querySelector('.vt-comp-progress-bar') as HTMLElement).style.width).toBe('25%');
    expect((el.querySelector('.vt-comp-progress-text') as HTMLElement).textContent).toBe('25%');
  });

  it('超出范围会夹取到 0~100', () => {
    const col = VtProgress<Row>({ key: 'p', title: '进度' });
    const over = renderCell(col, { p: 150 }) as HTMLElement;
    const under = renderCell(col, { p: -20 }) as HTMLElement;
    expect((over.querySelector('.vt-comp-progress-bar') as HTMLElement).style.width).toBe('100%');
    expect((under.querySelector('.vt-comp-progress-bar') as HTMLElement).style.width).toBe('0%');
  });

  it('非数字值：条画成 0，但文字显示原值/短横，不冒充「真的是 0」', () => {
    const col = VtProgress<Row>({ key: 'p', title: '进度' });
    const empty = renderCell(col, { p: null }) as HTMLElement;
    expect((empty.querySelector('.vt-comp-progress-text') as HTMLElement).textContent).toBe('-');

    const text = renderCell(col, { p: '待评估' }) as HTMLElement;
    expect((text.querySelector('.vt-comp-progress-text') as HTMLElement).textContent).toBe(
      '待评估',
    );
  });

  it('thresholds 按顺序命中第一条', () => {
    const col = VtProgress<Row>({
      key: 'p',
      title: '进度',
      thresholds: [
        { lte: 30, variant: 'danger' },
        { lte: 70, variant: 'warning' },
      ],
    });
    const bar = (v: number) =>
      (renderCell(col, { p: v }) as HTMLElement).querySelector(
        '.vt-comp-progress-bar',
      ) as HTMLElement;

    expect(bar(10).style.getPropertyValue('--vt-comp-progress-color')).toBe(
      'var(--vt-color-danger)',
    );
    expect(bar(50).style.getPropertyValue('--vt-comp-progress-color')).toBe(
      'var(--vt-color-warning)',
    );
    expect(bar(90).style.getPropertyValue('--vt-comp-progress-color')).toBe('');
  });

  it('format 收到原值与百分比', () => {
    const col = VtProgress<Row>({
      key: 'p',
      title: '得分',
      max: 5,
      format: (v, pct) => `${v}分 / ${pct}%`,
    });
    const el = renderCell(col, { p: 4 }) as HTMLElement;
    expect((el.querySelector('.vt-comp-progress-text') as HTMLElement).textContent).toBe(
      '4分 / 80%',
    );
  });
});

describe('VtRate', () => {
  it('半星靠填充宽度表达（布局测不了，测的是 style.width）', () => {
    const col = VtRate<Row>({ key: 's', title: '评分', allowHalf: true });
    const el = renderCell(col, { s: 3.5 }) as HTMLElement;
    const widths = [...el.querySelectorAll('.vt-comp-rate-fill')].map(
      (f) => (f as HTMLElement).style.width,
    );
    expect(widths).toEqual(['100%', '100%', '100%', '50%', '0%']);
  });

  it('点第 N 颗星写回 N（happy-dom 里星宽为 0，落在整星分支）', () => {
    const col = VtRate<Row>({ key: 's', title: '评分', showText: true });
    const row: Row = { s: 1 };
    const el = renderCell(col, row) as HTMLElement;
    const stars = [...el.querySelectorAll('.vt-comp-rate-star')] as HTMLElement[];

    stars[3]!.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0 }));
    expect(row.s).toBe(4);
    expect((el.querySelector('.vt-comp-rate-text') as HTMLElement).textContent).toBe('4');
    expect(el.getAttribute('aria-label')).toBe('4 / 5');
  });

  it('disabled 时不加可编辑类、点击不写回', () => {
    const col = VtRate<Row>({ key: 's', title: '评分', disabled: true });
    const row: Row = { s: 2 };
    const el = renderCell(col, row) as HTMLElement;
    expect(el.classList.contains('vt-comp-rate--editable')).toBe(false);
    (el.querySelector('.vt-comp-rate-star') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(row.s).toBe(2);
  });

  it('count 决定星数', () => {
    const col = VtRate<Row>({ key: 's', title: '评分', count: 3 });
    expect((renderCell(col, { s: 0 }) as HTMLElement).querySelectorAll('.vt-comp-rate-star')).toHaveLength(3);
  });
});

describe('VtLink', () => {
  it('有 href 渲染 <a>；_blank 自动补 rel', () => {
    const col = VtLink<Row>({
      key: 'site',
      title: '主页',
      href: (row) => row.site,
      target: '_blank',
    });
    const el = renderCell(col, { site: 'https://example.com' }) as HTMLAnchorElement;
    expect(el.tagName).toBe('A');
    expect(el.getAttribute('href')).toBe('https://example.com');
    expect(el.rel).toBe('noopener noreferrer');
  });

  it('没有 href 渲染 <button>（无 href 的 <a> 聚焦不到、也不报链接语义）', () => {
    const onClick = vi.fn();
    const col = VtLink<Row>({ key: 'name', title: '名称', onClick });
    const row: Row = { name: '张三' };
    const el = renderCell(col, row) as HTMLButtonElement;
    expect(el.tagName).toBe('BUTTON');
    expect(el.type).toBe('button');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledWith(row, 0);
  });

  it('protocol 糖直接用单元格值拼 href', () => {
    const col = VtLink<Row>({ key: 'mail', title: '邮箱', protocol: 'mailto' });
    const el = renderCell(col, { mail: 'a@b.com' }) as HTMLAnchorElement;
    expect(el.getAttribute('href')).toBe('mailto:a@b.com');
  });

  it('空值走 placeholder；disabled 关掉指针事件', () => {
    expect(renderCell(VtLink<Row>({ key: 'n', title: 'N', placeholder: '-' }), { n: '' })).toBe('-');

    const disabled = renderCell(
      VtLink<Row>({ key: 'n', title: 'N', disabled: true, onClick: () => {} }),
      { n: '张三' },
    ) as HTMLElement;
    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    expect(disabled.style.pointerEvents).toBe('none');
  });

  it('对象值 { text, url } 直接渲染成链接（文案取 text、地址取 url）', () => {
    const col = VtLink<Row>({ key: 'ref', title: '参考', editable: true });
    const el = renderCell(col, {
      ref: { text: '需求文档', url: 'https://example.com/doc' },
    }) as HTMLAnchorElement;
    expect(el.tagName).toBe('A');
    expect(el.textContent).toBe('需求文档');
    expect(el.getAttribute('href')).toBe('https://example.com/doc');
  });

  it('只有地址没有文案时拿地址当文案（否则是个看不见的格子）', () => {
    const col = VtLink<Row>({ key: 'ref', title: '参考', editable: true });
    const el = renderCell(col, { ref: { url: 'https://example.com' } }) as HTMLElement;
    expect(el.textContent).toBe('https://example.com');
  });

  it('危险协议按「没有地址」处理 —— 不给一个 javascript: 的 <a>', () => {
    const col = VtLink<Row>({ key: 'u', title: 'U', href: (row) => row.u as string });
    // 夹了制表符的变体也要拦：浏览器解析 href 时会忽略控制字符，`java\tscript:` 照样执行
    for (const bad of ['javascript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x']) {
      const el = renderCell(col, { u: bad, n: '点我' }) as HTMLElement;
      expect(el.tagName, bad).toBe('BUTTON');
      expect(el.getAttribute('href'), bad).toBeNull();
    }
    // 相对地址与白名单协议照常放行
    expect((renderCell(col, { u: '/detail/1' }) as HTMLElement).tagName).toBe('A');
    expect((renderCell(col, { u: 'HTTPS://a.com' }) as HTMLElement).tagName).toBe('A');
  });

  it('只读列（默认）不提供 renderEditor；editable 才有', () => {
    expect(VtLink<Row>({ key: 'n', title: 'N' }).renderEditor).toBeUndefined();
    expect(VtLink<Row>({ key: 'n', title: 'N', editable: true }).renderEditor).toBeTypeOf('function');
    // disabled 压倒 editable（只读回显，与其他组件一致）
    expect(
      VtLink<Row>({ key: 'n', title: 'N', editable: true, disabled: true }).renderEditor,
    ).toBeUndefined();
  });

  it('编辑态：面板里两栏分别改文案与链接，确定才写回', () => {
    const onChange = vi.fn();
    const col = VtLink<Row>({ key: 'ref', title: '参考', editable: true, onChange });
    const row: Row = { ref: { text: '旧文案', url: 'https://old.com' } };
    const anchor = openEdit(col, row);

    // 锚点回显与常态同款（同一个 .vt-comp-link 外观），但不是 <a> —— 编辑中点它不该跳转
    const shown = anchor.querySelector('.vt-comp-link') as HTMLElement;
    expect(shown.tagName).toBe('SPAN');
    expect(shown.textContent).toBe('旧文案');

    // 激活即展开面板，不用再点一次
    const popup = popupEl()!;
    expect(popup).toBeTruthy();
    const [textInput, urlInput] = [
      ...popup.querySelectorAll('.vt-comp-link-field input'),
    ] as HTMLInputElement[];
    expect(textInput!.value).toBe('旧文案');
    expect(urlInput!.value).toBe('https://old.com');

    textInput!.value = '新文案';
    urlInput!.value = 'https://new.com';
    // 改了输入框但还没确定 —— 行数据必须没动
    expect(row.ref).toEqual({ text: '旧文案', url: 'https://old.com' });

    const [, confirm] = [...popup.querySelectorAll('.vt-filter-btn')] as HTMLElement[];
    confirm!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(row.ref).toEqual({ text: '新文案', url: 'https://new.com' });
    expect(onChange).toHaveBeenCalledWith({ text: '新文案', url: 'https://new.com' }, row, 0);
    expect(popupEl(), '确定之后面板关闭').toBeNull();
  });

  it('编辑态：取消不写回；地址清空则退回纯字符串', () => {
    const col = VtLink<Row>({ key: 'ref', title: '参考', editable: true });

    const row: Row = { ref: { text: 'A', url: 'https://a.com' } };
    openEdit(col, row);
    const cancelPanel = popupEl()!;
    (cancelPanel.querySelector('.vt-comp-link-field input') as HTMLInputElement).value = 'B';
    const [cancel] = [...cancelPanel.querySelectorAll('.vt-filter-btn')] as HTMLElement[];
    cancel!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.ref).toEqual({ text: 'A', url: 'https://a.com' });
    expect(popupEl()).toBeNull();

    // 有文案没地址 → 写回标量，而不是 { text, url: '' }：这一列的值还要被排序/复制消费
    const plain: Row = { ref: { text: 'A', url: 'https://a.com' } };
    openEdit(col, plain);
    const panel = popupEl()!;
    const inputs = [...panel.querySelectorAll('.vt-comp-link-field input')] as HTMLInputElement[];
    inputs[1]!.value = '';
    const [, confirm] = [...panel.querySelectorAll('.vt-filter-btn')] as HTMLElement[];
    confirm!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(plain.ref).toBe('A');
  });

  it('编辑态：输入框里按 Enter 等于确定，Esc 关面板但不写回', () => {
    const col = VtLink<Row>({ key: 'ref', title: '参考', editable: true });

    const row: Row = { ref: '旧' };
    openEdit(col, row);
    const inputs = [
      ...popupEl()!.querySelectorAll('.vt-comp-link-field input'),
    ] as HTMLInputElement[];
    inputs[0]!.value = '新';
    inputs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(row.ref).toBe('新');
    expect(popupEl()).toBeNull();

    const kept: Row = { ref: '旧' };
    openEdit(col, kept);
    const escInput = popupEl()!.querySelector('.vt-comp-link-field input') as HTMLInputElement;
    escInput.value = '改了但要撤';
    escInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(kept.ref).toBe('旧');
    expect(popupEl()).toBeNull();
  });

  it('可编辑列按文案排序（对象值走默认比较等于永远相等）', () => {
    const col = VtLink<Row>({ key: 'ref', title: '参考', editable: true, sortable: true });
    const rows: Row[] = [
      { ref: { text: 'c', url: 'https://c.com' } },
      { ref: 'a' },
      { ref: { text: 'b', url: 'https://b.com' } },
    ];
    const sorted = [...rows].sort(col.sortMethod!);
    expect(sorted.map((r) => (typeof r.ref === 'string' ? r.ref : r.ref.text))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('可编辑列放 dblclick 冒泡过去（否则铺满单元格的链接没法进编辑态）', () => {
    const row: Row = { ref: { text: 'A', url: 'https://a.com' } };
    for (const [editable, expected] of [
      [true, 1],
      [false, 0],
    ] as const) {
      const col = VtLink<Row>({ key: 'ref', title: '参考', editable } as any);
      const el = renderCell(col, row) as HTMLElement;
      const host = document.createElement('div');
      host.appendChild(el);
      const seen = vi.fn();
      host.addEventListener('dblclick', seen);
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(seen, `editable: ${editable}`).toHaveBeenCalledTimes(expected);

      // mousedown / click 两边都必须拦掉（点链接不该起框选、不该开编辑器）
      const swallowed = vi.fn();
      host.addEventListener('mousedown', swallowed);
      host.addEventListener('click', swallowed);
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(swallowed).not.toHaveBeenCalled();
    }
  });
});

describe('VtTextarea', () => {
  it('编辑态：编辑框在 .vt-client 的 cover 浮层里，单元格内只留存活探针', () => {
    const col = VtTextarea<Row>({ key: 'remark', title: '备注' });
    const row: Row = { remark: '原始内容' };
    const anchor = openEdit(col, row);

    // 探针不显示内容 —— 真正的输入框在浮层里，它只负责「被清掉时让浮层自毁」
    expect(anchor.classList.contains('vt-comp-textarea-anchor')).toBe(true);
    expect(anchor.textContent).toBe('');

    const popup = popupEl();
    expect(popup, '编辑框应在浮层里（cover 高度恒等于单元格，塞进去长不高）').toBeTruthy();
    // cover 模式不套面板皮肤：它是盖住单元格的内联编辑框，不是弹出面板
    expect(popup!.classList.contains('vt-comp-popup--cover')).toBe(true);
    expect(popup!.classList.contains('vt-filter-panel')).toBe(false);

    const ta = popup!.querySelector('textarea') as HTMLTextAreaElement;
    expect(ta.value).toBe('原始内容');
    // 高度全由 autoGrow 算，不许用 resize 手柄跟它打架
    expect(ta.style.resize === '' || ta.style.resize === 'none').toBe(true);
  });

  it('输入实时写回行数据', () => {
    const col = VtTextarea<Row>({ key: 'remark', title: '备注' });
    const row: Row = { remark: '' };
    openEdit(col, row);
    const ta = popupEl()!.querySelector('textarea') as HTMLTextAreaElement;

    ta.value = '多行\n文本';
    ta.dispatchEvent(new Event('input'));
    expect(row.remark).toBe('多行\n文本');
  });

  it('autoGrow 每次都先把高度塌回 0 再量（否则删内容时只增不减）', () => {
    const col = VtTextarea<Row>({ key: 'remark', title: '备注' });
    openEdit(col, { remark: '' });
    const ta = popupEl()!.querySelector('textarea') as HTMLTextAreaElement;

    // happy-dom 没有布局，scrollHeight 恒 0 → 量不了真实增长（那部分靠 CDP 实测）。
    // 这里守的是「高度确实被 JS 接管了」这个契约
    ta.dispatchEvent(new Event('input'));
    expect(ta.style.height).toMatch(/px$/);
  });
});

describe('VtTimePicker', () => {
  it('编辑态是 input[type=time]，change 写回原始字符串', () => {
    const col = VtTimePicker<Row>({ key: 't', title: '时间', step: 1, min: '08:00' });
    const row: Row = { t: '09:30' };
    const el = openEdit(col, row);
    const input = (el.tagName === 'INPUT' ? el : el.querySelector('input')) as HTMLInputElement;

    expect(input.type).toBe('time');
    expect(input.value).toBe('09:30');
    expect(input.min).toBe('08:00');
    expect(input.step).toBe('1');

    input.value = '10:15:30';
    input.dispatchEvent(new Event('change'));
    expect(row.t).toBe('10:15:30');
  });
});

/**
 * `native: true` 支路 —— 也就是改造成自绘面板**之前**的那套原生控件实现。
 *
 * 这一组用例是原生支路的回归网：它同时钉住 `.vt-comp-date-range` / `-sep` 与
 * `.vt-comp-date::-webkit-calendar-picker-indicator` 那几条 CSS 还有消费者（不是孤儿规则），
 * 以及 clearable 的 `×` 留白仍然只由外壳负责。
 */
describe('VtDatePicker / VtTimePicker：native 原生控件支路', () => {
  it('编辑态是 input[type=date]，change 写回原始字符串', () => {
    const col = VtDatePicker<Row>({ key: 'd', title: '日期', native: true, min: '2020-01-01' });
    const row: Row = { d: '2026-08-11' };
    const el = openEdit(col, row);
    const input = (el.tagName === 'INPUT' ? el : el.querySelector('input')) as HTMLInputElement;

    expect(input.type).toBe('date');
    expect(input.value).toBe('2026-08-11');
    expect(input.min).toBe('2020-01-01');
    // 原生支路不开浮层
    expect(popupEl()).toBeNull();

    input.value = '2026-09-01';
    input.dispatchEvent(new Event('change'));
    expect(row.d).toBe('2026-09-01');
  });

  /**
   * `×` 的留白扣在外壳上（`.vt-comp-wrap { padding-right }`，见 components.css §1），
   * 不是给输入框加 `padding-right` —— 输入框的 padding 来自内联的 `INPUT_CSS`。
   * 这里只守结构：外壳带 `.vt-comp-wrap`、输入框在里面、`×` 是它的直接子节点。
   * 留白本身由 `components-contract.test.ts` 在 CSS 文本上守（happy-dom 无布局引擎）。
   */
  it('clearable 时套 .vt-comp-wrap 外壳，× 挂在外壳上而不是输入框里', () => {
    for (const col of [
      VtDatePicker<Row>({ key: 'd', title: '日期', native: true, clearable: true }),
      VtTimePicker<Row>({ key: 'd', title: '时间', clearable: true }),
    ]) {
      const wrap = openEdit(col, { d: '' });
      expect(wrap.classList.contains('vt-comp-wrap')).toBe(true);
      expect(wrap.querySelector(':scope > input.vt-comp-input')).not.toBeNull();
      expect(wrap.querySelector(':scope > .vt-comp-clear')).not.toBeNull();
    }
  });

  it('不 clearable 时不套外壳，直接就是 input', () => {
    const col = VtDatePicker<Row>({ key: 'd', title: '日期', native: true });
    const el = openEdit(col, { d: '' });
    expect(el.tagName).toBe('INPUT');
    expect(el.querySelector('.vt-comp-clear')).toBeNull();
  });

  it('VtDateRangePicker 的 native 支路仍是两个 date input 夹一个分隔符', () => {
    const col = VtDateRangePicker<Row>({
      key: 'p',
      title: '周期',
      native: true,
      separator: ' 至 ',
    });
    const row: Row = { p: ['2026-08-01', '2026-08-31'] };
    const wrap = openEdit(col, row);

    expect(wrap.classList.contains('vt-comp-date-range')).toBe(true);
    const inputs = wrap.querySelectorAll('input[type=date]');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('2026-08-01');
    expect((inputs[1] as HTMLInputElement).value).toBe('2026-08-31');
    expect(wrap.querySelector('.vt-comp-date-range-sep')!.textContent).toBe(' 至 ');
    expect(popupEl()).toBeNull();

    (inputs[1] as HTMLInputElement).value = '2026-09-15';
    inputs[1]!.dispatchEvent(new Event('change'));
    expect(row.p).toEqual(['2026-08-01', '2026-09-15']);
  });
});

/**
 * 自绘日历面板（默认支路）。
 *
 * happy-dom 没有布局引擎，所以**不断言**面板位置、格子尺寸、双月并排的像素、以及
 * `relayout()` 的窄容器降级（`clientWidth` / `offsetWidth` 恒 0 → 走「量不出就不降级」那条
 * 分支，正好让「双月」这批断言稳定）。这些留给 CDP 实测。这里验的是结构、状态机与写回。
 */
describe('VtDateRangePicker：自绘双月面板', () => {
  // 「今天」钉死：面板打开时看哪个月、快捷项算出什么区间都以它为基准
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 11)); // 2026-08-11，周二
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * 同一个用例里开第二个编辑器之前要清掉上一个 —— `popupEl()` 取的是 client 里**第一个**
   * 浮层，不清理会一直断言到上一个面板上（这个坑真踩过：空 shortcuts 的面板留在前面，
   * 后面那条断言永远是 0 颗）。
   */
  const resetRoot = (): void => {
    client.innerHTML = '';
  };

  /** 面板里某一天的格子（双月下同一天可能有两个节点，取第一个够用） */
  const cellOf = (day: string): HTMLElement =>
    popupEl()!.querySelector(`[data-day="${day}"]`) as HTMLElement;

  const cellsWith = (modifier: string): HTMLElement[] =>
    Array.from(popupEl()!.querySelectorAll(`.vt-comp-calendar-cell--${modifier}`));

  const down = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  };
  const over = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  };
  const key = (el: Element, k: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
    el.dispatchEvent(e);
    return e;
  };

  const RANGE: [string, string] = ['2026-08-05', '2026-08-20'];

  it('编辑态是锚点 + 挂在 .vt-client 上的面板（不是两个 input）', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    const anchor = openEdit(col, { p: RANGE });

    expect(anchor.classList.contains('vt-comp-anchor')).toBe(true);
    expect(anchor.querySelector('input')).toBeNull();

    const popup = popupEl()!;
    expect(popup).toBeTruthy();
    // 皮肤复用面板样式，不是 cover 模式的内联编辑框
    expect(popup.classList.contains('vt-filter-panel')).toBe(true);
    expect(popup.classList.contains('vt-comp-popup--cover')).toBe(false);
    expect(popup.querySelector('.vt-comp-calendar')).toBeTruthy();
  });

  it('锚点回显与常态 render 逐字一致', () => {
    for (const sep of [undefined, ' 至 ']) {
      resetRoot();
      const col = VtDateRangePicker<Row>({ key: 'p', title: '周期', separator: sep });
      const row: Row = { p: RANGE };
      const shown = renderCell(col, row) as string;
      const anchor = openEdit(col, row);
      expect(anchor.querySelector('.vt-comp-anchor-text')!.textContent).toBe(shown);
    }
  });

  it('默认双月并排，标题是相邻的两个月', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    openEdit(col, { p: RANGE });

    expect(popupEl()!.querySelectorAll('.vt-comp-calendar-month')).toHaveLength(2);
    const titles = Array.from(popupEl()!.querySelectorAll('.vt-comp-calendar-title')).map(
      (t) => t.textContent,
    );
    // 值落在 8 月 → 左 8 月、右 9 月
    expect(titles).toEqual(['2026 年 8 月', '2026 年 9 月']);
  });

  it('panels: 1 只画一个月', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期', panels: 1 });
    openEdit(col, { p: RANGE });
    expect(popupEl()!.querySelectorAll('.vt-comp-calendar-month')).toHaveLength(1);
  });

  it('‹ › 翻月一次一个月', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    openEdit(col, { p: RANGE });
    const titleOf = (): string =>
      popupEl()!.querySelector('.vt-comp-calendar-title')!.textContent!;

    down(popupEl()!.querySelector('[data-nav="1"]')!);
    expect(titleOf()).toBe('2026 年 9 月');
    down(popupEl()!.querySelector('[data-nav="-1"]')!);
    down(popupEl()!.querySelector('[data-nav="-1"]')!);
    expect(titleOf()).toBe('2026 年 7 月');
  });

  it('已有值时开面板画出区间带：两个端点 + 中间 in-range', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    openEdit(col, { p: RANGE });

    expect(cellOf('2026-08-05').classList.contains('vt-comp-calendar-cell--start')).toBe(true);
    expect(cellOf('2026-08-20').classList.contains('vt-comp-calendar-cell--end')).toBe(true);
    // 8/6 ~ 8/19 共 14 天，双月下 8 月的格子只出现一次（不跨月边界）
    expect(cellsWith('in-range')).toHaveLength(14);
    // 端点自己不叠 in-range（否则方角会盖掉圆角）
    expect(cellOf('2026-08-05').classList.contains('vt-comp-calendar-cell--in-range')).toBe(false);
  });

  it('区间三步：点起点不写回 → hover 出预览 → 点终点写回并关面板', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    // 旧值就在 8 月（面板打开时看的是值所在的月份，给 2020 年的值会翻到 2020 年去）
    const row: Row = { p: ['2026-08-25', '2026-08-28'] };
    const anchor = openEdit(col, row);

    // 第一下：旧区间消失、只剩一个端点，值还没动
    down(cellOf('2026-08-05'));
    expect(row.p).toEqual(['2026-08-25', '2026-08-28']);
    expect(popupEl()).toBeTruthy();
    expect(cellsWith('in-range')).toHaveLength(0);
    expect(cellOf('2026-08-05').classList.contains('vt-comp-calendar-cell--start')).toBe(true);

    // hover：预览带出现，值仍未动
    over(cellOf('2026-08-10'));
    expect(cellsWith('in-range')).toHaveLength(4); // 8/6~8/9
    expect(cellOf('2026-08-10').classList.contains('vt-comp-calendar-cell--end')).toBe(true);
    expect(row.p).toEqual(['2026-08-25', '2026-08-28']);

    // 第二下：写回并关面板，锚点回显同步
    down(cellOf('2026-08-20'));
    expect(row.p).toEqual(RANGE);
    expect(popupEl()).toBeNull();
    expect(anchor.querySelector('.vt-comp-anchor-text')!.textContent).toBe('2026-08-05 ~ 2026-08-20');
  });

  it('反向选择自动归一（先点晚的再点早的）', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    const row: Row = { p: ['', ''] };
    openEdit(col, row);

    down(cellOf('2026-08-20'));
    down(cellOf('2026-08-05'));
    expect(row.p).toEqual(RANGE);
  });

  it('同一天点两次 = 一天的区间', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    const row: Row = { p: ['', ''] };
    openEdit(col, row);

    down(cellOf('2026-08-05'));
    down(cellOf('2026-08-05'));
    expect(row.p).toEqual(['2026-08-05', '2026-08-05']);
  });

  it('min/max 之外的格子禁用：点不动、也不进拾取态', () => {
    const col = VtDateRangePicker<Row>({
      key: 'p',
      title: '周期',
      min: '2026-08-10',
      max: '2026-08-20',
    });
    const row: Row = { p: ['2026-08-12', '2026-08-15'] };
    openEdit(col, row);

    const bad = cellOf('2026-08-05');
    expect(bad.classList.contains('vt-comp-calendar-cell--disabled')).toBe(true);
    expect(bad.getAttribute('aria-disabled')).toBe('true');

    down(bad);
    expect(row.p).toEqual(['2026-08-12', '2026-08-15']); // 没写回
    // 也没进拾取态：原区间还画着
    expect(cellOf('2026-08-12').classList.contains('vt-comp-calendar-cell--start')).toBe(true);

    // 边界日本身可选
    expect(cellOf('2026-08-10').classList.contains('vt-comp-calendar-cell--disabled')).toBe(false);
  });

  it('翻月按钮在越过 min/max 时禁用', () => {
    const col = VtDateRangePicker<Row>({
      key: 'p',
      title: '周期',
      min: '2026-08-01',
      max: '2026-09-30',
    });
    openEdit(col, { p: ['2026-08-05', '2026-08-20'] });
    // 左 8 月、右 9 月：往前整月都在 min 之前、往后整月都在 max 之后
    expect((popupEl()!.querySelector('[data-nav="-1"]') as HTMLButtonElement).disabled).toBe(true);
    expect((popupEl()!.querySelector('[data-nav="1"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('快捷项：区间模式 7 颗，点一下即写回并关面板', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    const row: Row = { p: ['', ''] };
    openEdit(col, row);

    const btns = Array.from(popupEl()!.querySelectorAll('.vt-comp-calendar-shortcut'));
    expect(btns.map((b) => b.textContent)).toEqual([
      '今天',
      '昨天',
      '本周',
      '本月',
      '本季度',
      '最近 7 天',
      '最近 30 天',
    ]);

    down(btns[3]!); // 本月
    expect(row.p).toEqual(['2026-08-01', '2026-08-31']);
    expect(popupEl()).toBeNull();
  });

  it('shortcuts: [] 一颗都不给', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期', shortcuts: [] });
    openEdit(col, { p: ['', ''] });
    expect(popupEl()!.querySelectorAll('.vt-comp-calendar-shortcut')).toHaveLength(0);
    expect(popupEl()!.querySelector('.vt-comp-calendar-value')).toBeTruthy(); // 回显还在
  });

  it('shortcuts 函数式追加同名项是就地覆盖，不排两颗', () => {
    const col = VtDateRangePicker<Row>({
      key: 'p',
      title: '周期',
      shortcuts: (builtin) => [...builtin, { label: '今天', value: (t) => [t, t] }],
    });
    openEdit(col, { p: ['', ''] });
    expect(popupEl()!.querySelectorAll('.vt-comp-calendar-shortcut')).toHaveLength(7);
  });

  it('键盘：面板认领的键都被拦下（不冒泡给 vtKeyboardNav），Esc 留给 _popup', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    const anchor = openEdit(col, { p: RANGE });

    // defaultPrevented 是「没被键盘导航插件抢走」的可断言代理
    for (const k of [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'PageUp',
      'PageDown',
      'Home',
      'End',
      'Enter',
    ]) {
      expect(key(anchor, k).defaultPrevented, k).toBe(true);
    }
    expect(key(anchor, 'Escape').defaultPrevented).toBe(false);
    expect(key(anchor, 'a').defaultPrevented).toBe(false);
  });

  it('键盘选区间：Enter 第一下定起点不写回，第二下才写回', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    const row: Row = { p: ['2026-08-05', '2026-08-05'] };
    const anchor = openEdit(col, row);

    // 光标起点是值的 start（8/5）：→ 三次到 8/8
    key(anchor, 'ArrowRight');
    key(anchor, 'ArrowRight');
    key(anchor, 'ArrowRight');
    key(anchor, 'Enter');
    expect(row.p).toEqual(['2026-08-05', '2026-08-05']); // 第一下不写回

    // ↓ 一次跨一周到 8/15，Enter 收尾
    key(anchor, 'ArrowDown');
    key(anchor, 'Enter');
    expect(row.p).toEqual(['2026-08-08', '2026-08-15']);
    expect(popupEl()).toBeNull();
  });

  it('PageDown 让光标跨月；双月下目标月已可见就不翻页，单月下才翻', () => {
    const titleOf = (): string =>
      popupEl()!.querySelector('.vt-comp-calendar-title')!.textContent!;

    // 双月：视野是 8+9 月，光标跨到 9 月仍在视野内 → 不翻
    const col2 = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    const a2 = openEdit(col2, { p: RANGE });
    key(a2, 'PageDown');
    expect(titleOf()).toBe('2026 年 8 月');
    // 再跨一个月就出视野了 → 跟随
    key(a2, 'PageDown');
    expect(titleOf()).toBe('2026 年 9 月');

    // 单月：一下就出视野
    resetRoot();
    const col1 = VtDateRangePicker<Row>({ key: 'p', title: '周期', panels: 1 });
    const a1 = openEdit(col1, { p: RANGE });
    key(a1, 'PageDown');
    expect(titleOf()).toBe('2026 年 9 月');
  });

  it('clearable：× 在锚点内，点它清空但面板不关', () => {
    const col = VtDateRangePicker<Row>({
      key: 'p',
      title: '周期',
      clearable: true,
      placeholder: '未设置',
    });
    const row: Row = { p: RANGE };
    const anchor = openEdit(col, row);

    const clear = anchor.querySelector(':scope > .vt-comp-clear') as HTMLElement;
    expect(clear).toBeTruthy();

    down(clear);
    expect(row.p).toEqual(['', '']); // 沿用老的空形状，不是 null
    expect(anchor.querySelector('.vt-comp-anchor-text')!.textContent).toBe('未设置');
    expect(popupEl()).toBeTruthy(); // 清空后往往紧接着重选
    expect(cellsWith('start')).toHaveLength(0);
  });

  it('texts 是浅合并：只覆盖月份名不会把星期名一起丢掉', () => {
    const col = VtDateRangePicker<Row>({
      key: 'p',
      title: '周期',
      texts: { months: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'] },
    });
    openEdit(col, { p: RANGE });

    expect(popupEl()!.querySelector('.vt-comp-calendar-title')!.textContent).toBe('2026 年 八');
    const weekdays = Array.from(popupEl()!.querySelectorAll('.vt-comp-calendar-weekday')).map(
      (w) => w.textContent,
    );
    // 默认周一起 + 默认星期名
    expect(weekdays.slice(0, 7)).toEqual(['一', '二', '三', '四', '五', '六', '日']);
  });

  it('firstDayOfWeek: 0 把周日排到第一列', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期', firstDayOfWeek: 0 });
    openEdit(col, { p: RANGE });
    const weekdays = Array.from(popupEl()!.querySelectorAll('.vt-comp-calendar-weekday')).map(
      (w) => w.textContent,
    );
    expect(weekdays.slice(0, 7)).toEqual(['日', '一', '二', '三', '四', '五', '六']);
  });

  it('firstDayOfWeek: 0 之外的默认周首日是周一（中国习惯）', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期' });
    openEdit(col, { p: RANGE });
    expect(
      popupEl()!.querySelector('.vt-comp-calendar-weekday')!.textContent,
    ).toBe('一');
  });

  it('常态：空值回落 placeholder，separator 生效', () => {
    const col = VtDateRangePicker<Row>({ key: 'p', title: '周期', placeholder: '未设置' });
    expect(renderCell(col, { p: ['', ''] })).toBe('未设置');
    expect(renderCell(col, { p: null })).toBe('未设置');
    expect(renderCell(col, { p: RANGE })).toBe('2026-08-05 ~ 2026-08-20');

    const col2 = VtDateRangePicker<Row>({ key: 'p', title: '周期', separator: ' 至 ' });
    expect(renderCell(col2, { p: RANGE })).toBe('2026-08-05 至 2026-08-20');
  });

  it('disabled 不给 renderEditor', () => {
    expect(VtDateRangePicker<Row>({ key: 'p', title: '周期', disabled: true }).renderEditor).toBeUndefined();
    expect(
      VtDateRangePicker<Row>({ key: 'p', title: '周期', native: true, disabled: true }).renderEditor,
    ).toBeUndefined();
  });

  /** 判别联合 + `?: never` 占位是否真的让 asCell 两支都编译得过（类型层冒烟） */
  it('asCell 对两支选项都成立', () => {
    expect(asCell(VtDateRangePicker, { native: true, separator: ' 至 ' })).toBeTruthy();
    expect(asCell(VtDateRangePicker, { panels: 1, firstDayOfWeek: 0 })).toBeTruthy();
    expect(asCell(VtDatePicker, { native: true })).toBeTruthy();
    expect(asCell(VtDatePicker, { shortcuts: [] })).toBeTruthy();
  });
});

describe('VtDatePicker：自绘单月面板', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 11));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const cellOf = (day: string): HTMLElement =>
    popupEl()!.querySelector(`[data-day="${day}"]`) as HTMLElement;
  const down = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  };

  it('单月 + 点一下即写回并关面板', () => {
    const col = VtDatePicker<Row>({ key: 'd', title: '日期' });
    const row: Row = { d: '2026-08-11' };
    const anchor = openEdit(col, row);

    expect(popupEl()!.querySelectorAll('.vt-comp-calendar-month')).toHaveLength(1);
    expect(popupEl()!.querySelector('.vt-comp-calendar')!.classList.contains('vt-comp-calendar--single')).toBe(true);

    down(cellOf('2026-08-20'));
    // 值是字符串，不是数组
    expect(row.d).toBe('2026-08-20');
    expect(popupEl()).toBeNull();
    expect(anchor.querySelector('.vt-comp-anchor-text')!.textContent).toBe('2026-08-20');
  });

  it('选中的那天是端点态（start 与 end 同时在 → 四角都圆）', () => {
    const col = VtDatePicker<Row>({ key: 'd', title: '日期' });
    openEdit(col, { d: '2026-08-11' });
    const cell = cellOf('2026-08-11');
    expect(cell.classList.contains('vt-comp-calendar-cell--start')).toBe(true);
    expect(cell.classList.contains('vt-comp-calendar-cell--end')).toBe(true);
  });

  it('快捷项退化成「今天 / 昨天」两颗', () => {
    const col = VtDatePicker<Row>({ key: 'd', title: '日期' });
    openEdit(col, { d: '' });
    const labels = Array.from(popupEl()!.querySelectorAll('.vt-comp-calendar-shortcut')).map(
      (b) => b.textContent,
    );
    expect(labels).toEqual(['今天', '昨天']);
  });

  it('快捷项写回的是单个日期字符串', () => {
    const col = VtDatePicker<Row>({ key: 'd', title: '日期' });
    const row: Row = { d: '' };
    openEdit(col, row);
    down(popupEl()!.querySelectorAll('.vt-comp-calendar-shortcut')[0]!); // 今天
    expect(row.d).toBe('2026-08-11');
  });

  it('clearable 清空写回空串（不是 null）', () => {
    const col = VtDatePicker<Row>({ key: 'd', title: '日期', clearable: true, placeholder: '—' });
    const row: Row = { d: '2026-08-11' };
    const anchor = openEdit(col, row);
    down(anchor.querySelector(':scope > .vt-comp-clear')!);
    expect(row.d).toBe('');
    expect(anchor.querySelector('.vt-comp-anchor-text')!.textContent).toBe('—');
  });

  it('常态：合法值原样、空值回落 placeholder、非法串显示空', () => {
    const col = VtDatePicker<Row>({ key: 'd', title: '日期', placeholder: '—' });
    expect(renderCell(col, { d: '2026-08-11' })).toBe('2026-08-11');
    expect(renderCell(col, { d: '' })).toBe('—');
    expect(renderCell(col, { d: null })).toBe('—');
    // 非法日期串不再原样透出（改造前核心走 String(value) 会显示 '2026-2-3'）
    expect(renderCell(col, { d: '2026-2-3' })).toBe('—');
  });
});

/**
 * 「多值 + 彩色胶囊」不再有自己的组件名（原 `VtMultiSelect`）——
 * 元数与样式都是 `VtSelect` 的参数。这一组用例原样搬过来，行为必须一字不差。
 */
describe("VtSelect({ display: 'tag', multiple: true })", () => {
  /** 原 VtMultiSelect 的等价写法 */
  const VtTagSelect = <T,>(o: Record<string, any>) =>
    VtSelect<T>({ display: 'tag', multiple: true, ...o } as any);

  const TAGS = [
    { value: 'vip', label: 'VIP' },
    { value: 'new', label: '新客' },
    { value: 'old', label: '老客' },
    { value: 'ban', label: '黑名单', disabled: true },
  ];

  it('常态：超过 maxCount 折叠成 +N', () => {
    const col = VtTagSelect<Row>({ key: 'tags', title: '标签', options: TAGS, maxCount: 2 });
    const el = renderCell(col, { tags: ['vip', 'new', 'old'] }) as HTMLElement;
    expect([...el.querySelectorAll('.vt-cell-option')].map((t) => t.textContent)).toEqual([
      'VIP',
      '新客',
    ]);
    expect((el.querySelector('.vt-comp-tag-more') as HTMLElement).textContent).toBe('+1');
  });

  it('valueType: string —— 按分隔符解析，也按分隔符写回', () => {
    const col = VtTagSelect<Row>({
      key: 'tags',
      title: '标签',
      options: TAGS,
      valueType: 'string',
    });
    const row: Row = { tags: 'vip,new' };
    const el = renderCell(col, row) as HTMLElement;
    expect([...el.querySelectorAll('.vt-cell-option')]).toHaveLength(2);

    openEdit(col, row);
    const boxes = [...popupEl()!.querySelectorAll('input.vt-filter-checkbox')] as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([true, true, false, false]);

    boxes[2]!.checked = true;
    boxes[2]!.dispatchEvent(new Event('change'));
    expect(row.tags).toBe('vip,new,old');
  });

  it('勾选即时写回数组，取消也是', () => {
    const col = VtTagSelect<Row>({ key: 'tags', title: '标签', options: TAGS });
    const row: Row = { tags: ['vip'] };
    openEdit(col, row);
    const boxes = [...popupEl()!.querySelectorAll('input.vt-filter-checkbox')] as HTMLInputElement[];

    boxes[1]!.checked = true;
    boxes[1]!.dispatchEvent(new Event('change'));
    expect(row.tags).toEqual(['vip', 'new']);

    boxes[0]!.checked = false;
    boxes[0]!.dispatchEvent(new Event('change'));
    expect(row.tags).toEqual(['new']);
  });

  it('搜索框（需开）与 ↑↓/Enter 键盘操作 —— 内核统一后这些能力对所有预设一致', () => {
    const col = VtTagSelect<Row>({
      key: 'tags',
      title: '标签',
      options: TAGS,
      searchable: true,
    });
    const row: Row = { tags: [] };
    const anchor = openEdit(col, row);
    const popup = popupEl()!;

    const input = popup.querySelector('.vt-comp-search input') as HTMLInputElement;
    input.value = '客';
    input.dispatchEvent(new Event('input'));
    expect([...popup.querySelectorAll('.vt-filter-item')].map((i) => i.textContent)).toEqual([
      '新客',
      '老客',
    ]);

    // ↑↓ 高亮 + Enter 勾选（重构前 VtMultiSelect 完全没有键盘操作）
    const press = (key: string) =>
      anchor.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    press('ArrowDown');
    press('Enter');
    expect(row.tags).toEqual(['new']);
    expect(popupEl(), '多值选完不关面板').not.toBeNull();
  });

  it('锚点回显是标签胶囊（与常态一致），含 +N 折叠', () => {
    const col = VtTagSelect<Row>({
      key: 'tags',
      title: '标签',
      options: TAGS,
      maxCount: 2,
    });
    const anchor = openEdit(col, { tags: ['vip', 'new', 'old'] });
    expect([...anchor.querySelectorAll('.vt-cell-option')].map((t) => t.textContent)).toEqual([
      'VIP',
      '新客',
    ]);
    expect((anchor.querySelector('.vt-comp-tag-more') as HTMLElement).textContent).toBe('+1');
  });

  it('全选跳过 disabled 项；清空置空', () => {
    const col = VtTagSelect<Row>({ key: 'tags', title: '标签', options: TAGS });
    const row: Row = { tags: [] };
    openEdit(col, row);
    const popup = popupEl()!;

    (popup.querySelector('.vt-filter-btn--primary') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(row.tags).toEqual(['vip', 'new', 'old']);

    (popup.querySelector('.vt-filter-btn') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(row.tags).toEqual([]);
  });
});

describe('VtAutocomplete', () => {
  const CITIES = [
    { value: 'hz', label: '杭州' },
    { value: 'nb', label: '宁波' },
    { value: 'wz', label: '温州' },
  ];

  it('聚焦即请求建议，列表渲染在浮层里', async () => {
    const col = VtAutocomplete<Row>({
      key: 'city',
      title: '城市',
      debounce: 0,
      fetchSuggestions: (q) => CITIES.filter((c) => c.label.includes(q)),
    });
    const input = openEdit(col, { city: '' }) as HTMLInputElement;

    input.dispatchEvent(new Event('input'));
    await Promise.resolve();

    const items = [...popupEl()!.querySelectorAll('.vt-filter-item')];
    expect(items.map((i) => i.textContent)).toEqual(['杭州', '宁波', '温州']);
  });

  it('↓ 移动高亮，Enter 选中并写回 value', async () => {
    const col = VtAutocomplete<Row>({
      key: 'city',
      title: '城市',
      debounce: 0,
      fetchSuggestions: () => CITIES,
    });
    const row: Row = { city: '' };
    const input = openEdit(col, row) as HTMLInputElement;

    input.dispatchEvent(new Event('input'));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(popupEl()!.querySelectorAll('.vt-filter-item.is-active')).toHaveLength(1);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(row.city).toBe('nb');
    expect(input.value).toBe('宁波');
    expect(popupEl()).toBeNull();
  });

  it('emit: label 时写回标签文本', async () => {
    const col = VtAutocomplete<Row>({
      key: 'city',
      title: '城市',
      debounce: 0,
      emit: 'label',
      fetchSuggestions: () => CITIES,
    });
    const row: Row = { city: '' };
    const input = openEdit(col, row) as HTMLInputElement;
    input.dispatchEvent(new Event('input'));
    await Promise.resolve();

    (popupEl()!.querySelector('.vt-filter-item') as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true }),
    );
    expect(row.city).toBe('杭州');
  });

  it('自由输入也写回（不强制从建议里选）', async () => {
    const col = VtAutocomplete<Row>({
      key: 'city',
      title: '城市',
      debounce: 0,
      fetchSuggestions: () => [],
    });
    const row: Row = { city: '' };
    const input = openEdit(col, row) as HTMLInputElement;
    input.value = '自定义';
    input.dispatchEvent(new Event('input'));
    expect(row.city).toBe('自定义');

    await Promise.resolve();
    expect(popupEl()!.querySelector('.vt-comp-popup-empty')).toBeTruthy();
  });

  it('慢请求后到不会盖掉新结果（按 seq 丢弃）', async () => {
    let call = 0;
    const col = VtAutocomplete<Row>({
      key: 'city',
      title: '城市',
      debounce: 0,
      triggerOnFocus: false,
      fetchSuggestions: () => {
        call++;
        // 第一次故意晚一拍解析
        return call === 1
          ? new Promise((r) => setTimeout(() => r([{ value: 'stale', label: '旧结果' }]), 10))
          : Promise.resolve([{ value: 'fresh', label: '新结果' }]);
      },
    });
    const input = openEdit(col, { city: '' }) as HTMLInputElement;

    input.dispatchEvent(new Event('input')); // 慢
    input.dispatchEvent(new Event('input')); // 快
    await new Promise((r) => setTimeout(r, 30));

    const items = [...popupEl()!.querySelectorAll('.vt-filter-item')].map((i) => i.textContent);
    expect(items).toEqual(['新结果']);
  });
});

describe('VtCascader', () => {
  const TREE = [
    {
      value: 'zj',
      label: '浙江',
      children: [
        { value: 'hz', label: '杭州', children: [{ value: 'xh', label: '西湖' }] },
        { value: 'nb', label: '宁波' },
      ],
    },
    { value: 'js', label: '江苏', children: [{ value: 'nj', label: '南京' }] },
  ];

  it('常态把路径按分隔符拼起来', () => {
    const col = VtCascader<Row>({ key: 'area', title: '区域', options: TREE });
    expect(renderCell(col, { area: ['zj', 'hz', 'xh'] })).toBe('浙江 / 杭州 / 西湖');
  });

  it('valueType: leaf —— 只存叶子值，展示时反查整条路径', () => {
    const col = VtCascader<Row>({
      key: 'area',
      title: '区域',
      options: TREE,
      valueType: 'leaf',
      separator: '>',
    });
    expect(renderCell(col, { area: 'xh' })).toBe('浙江>杭州>西湖');
  });

  it('options 变过、路径对不上时只展示能匹配的前缀（不整列崩）', () => {
    const col = VtCascader<Row>({ key: 'area', title: '区域', options: TREE });
    expect(renderCell(col, { area: ['zj', 'gone', 'xh'] })).toBe('浙江');
    expect(renderCell(col, { area: [] })).toBe('');
  });

  it('点父级只展开下一栏、不写回；点叶子写回并关闭浮层', () => {
    const col = VtCascader<Row>({ key: 'area', title: '区域', options: TREE });
    const row: Row = { area: [] };
    openEdit(col, row);

    const cols = () => [...popupEl()!.querySelectorAll('.vt-comp-cascader-col')];
    expect(cols()).toHaveLength(1);

    // 浙江 → 展开第二栏
    (cols()[0]!.querySelectorAll('.vt-filter-item')[0] as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(row.area).toEqual([]);
    expect(cols()).toHaveLength(2);

    // 宁波是叶子 → 写回并关闭
    (cols()[1]!.querySelectorAll('.vt-filter-item')[1] as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(row.area).toEqual(['zj', 'nb']);
    expect(popupEl()).toBeNull();
  });

  it('checkStrictly 下点父级也写回，并且面板仍然展开', () => {
    const col = VtCascader<Row>({
      key: 'area',
      title: '区域',
      options: TREE,
      checkStrictly: true,
    });
    const row: Row = { area: [] };
    openEdit(col, row);

    (popupEl()!.querySelector('.vt-filter-item') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(row.area).toEqual(['zj']);
    expect(popupEl()!.querySelectorAll('.vt-comp-cascader-col')).toHaveLength(2);
  });

  it('禁用节点点不动', () => {
    const col = VtCascader<Row>({
      key: 'area',
      title: '区域',
      options: [{ value: 'x', label: 'X', disabled: true }],
    });
    const row: Row = { area: [] };
    openEdit(col, row);
    const item = popupEl()!.querySelector('.vt-filter-item') as HTMLElement;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.area).toEqual([]);
  });
});

describe('VtPerson', () => {
  const MEMBERS = [
    {
      value: 'u1',
      label: '张伟',
      desc: '技术部',
      avatar: 'https://x/u1.png',
      email: 'zhangwei@example.com',
      phone: '138-0001',
      fields: [{ label: '工号', value: 'E1' }],
    },
    { value: 'u2', label: '李娜', desc: '产品部' },
    { value: 'u3', label: 'John Doe', desc: 'QA' },
    { value: 'u4', label: '陈冬', desc: '已离职', disabled: true },
  ];

  const names = (el: HTMLElement): string[] =>
    [...el.querySelectorAll('.vt-comp-person-name')].map((n) => n.textContent!);

  it('常态：头像 + 姓名；有图片时把 img 盖在色块上', () => {
    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
    const el = renderCell(col, { owner: 'u1' }) as HTMLElement;

    expect(names(el)).toEqual(['张伟']);
    // 头像与姓名套在同一枚胶囊里（.vt-comp-person），不是各自散排
    const person = el.querySelector('.vt-comp-person') as HTMLElement;
    expect(person.classList.contains('vt-comp-person--bare')).toBe(false);
    expect(person.querySelector('.vt-comp-avatar')).toBeTruthy();
    expect(person.querySelector('.vt-comp-person-name')).toBeTruthy();
    const avatar = el.querySelector('.vt-comp-avatar') as HTMLElement;
    // 首字仍在色块里 —— 图加载失败时把 img 摘掉就自动露出来
    expect(avatar.textContent).toContain('伟');
    expect((avatar.querySelector('img') as HTMLImageElement).src).toBe('https://x/u1.png');
    // 头像是装饰，读屏别把首字连姓名念两遍
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
  });

  it('无头像图 → 首字色块：中文取末字、拉丁取首字母，颜色按 value 稳定派生', () => {
    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });

    const cn = (renderCell(col, { owner: 'u2' }) as HTMLElement).querySelector(
      '.vt-comp-avatar',
    ) as HTMLElement;
    expect(cn.textContent).toBe('娜');
    expect(cn.querySelector('img')).toBeNull();

    const en = (renderCell(col, { owner: 'u3' }) as HTMLElement).querySelector(
      '.vt-comp-avatar',
    ) as HTMLElement;
    expect(en.textContent).toBe('JD');

    // 同一个人两次渲染必须同色（按行号取色的话，滚动复用行 DOM 时颜色会跳）
    const again = (renderCell(col, { owner: 'u2' }, 77) as HTMLElement).querySelector(
      '.vt-comp-avatar',
    ) as HTMLElement;
    const colorOf = (e: HTMLElement): string => e.style.getPropertyValue('--vt-avatar-color');
    expect(colorOf(again)).toBe(colorOf(cn));
    expect(colorOf(cn)).toMatch(/^var\(--vt-/);
  });

  it('常态：多人超过 maxCount 折叠成 +N', () => {
    const col = VtPerson<Row>({
      key: 'members',
      title: '参与人',
      options: MEMBERS,
      multiple: true,
      maxCount: 2,
    });
    const el = renderCell(col, { members: ['u1', 'u2', 'u3'] }) as HTMLElement;
    expect(names(el)).toEqual(['张伟', '李娜']);
    expect((el.querySelector('.vt-comp-tag-more') as HTMLElement).textContent).toBe('+1');
  });

  it('avatarOnly：不画姓名，姓名进 title / aria-label', () => {
    const col = VtPerson<Row>({
      key: 'owner',
      title: '负责人',
      options: MEMBERS,
      avatarOnly: true,
    });
    const el = renderCell(col, { owner: 'u1' }) as HTMLElement;
    expect(names(el)).toEqual([]);
    const person = el.querySelector('.vt-comp-person') as HTMLElement;
    expect(person.title).toBe('张伟');
    expect(person.getAttribute('aria-label')).toBe('张伟');
    // 没有姓名要圈起来 → 不套胶囊（否则是一枚右边空 8px 的怪胶囊）
    expect(person.classList.contains('vt-comp-person--bare')).toBe(true);
  });

  it('不给 options 也能展示：行值是 { name, avatar } 对象，且退化成纯展示列', () => {
    const col = VtPerson<Row>({ key: 'creator', title: '创建人' });
    const el = renderCell(col, {
      creator: { id: 'x9', name: '赵敏', avatar: 'https://x/x9.png' },
    }) as HTMLElement;
    expect(names(el)).toEqual(['赵敏']);
    expect(el.querySelector('.vt-comp-avatar img')).toBeTruthy();
    // 没有候选人就没法选人
    expect(col.renderEditor).toBeUndefined();
  });

  it('空值给 placeholder', () => {
    const col = VtPerson<Row>({
      key: 'owner',
      title: '负责人',
      options: MEMBERS,
      placeholder: '未指派',
    });
    expect(renderCell(col, { owner: '' })).toBe('未指派');
    expect(renderCell(col, { owner: null })).toBe('未指派');
  });

  it('单人：点一个人写回标量并关闭面板', () => {
    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
    const row: Row = { owner: 'u1' };
    openEdit(col, row);

    const items = [...popupEl()!.querySelectorAll('.vt-comp-person-item')] as HTMLElement[];
    expect(items).toHaveLength(4);
    // 当前值高亮，且选中态有对勾（不只靠颜色）
    expect(items[0]!.classList.contains('is-selected')).toBe(true);
    expect(items[0]!.querySelector('.vt-comp-check')!.innerHTML).not.toBe('');
    expect(items[1]!.querySelector('.vt-comp-check')!.innerHTML).toBe('');

    items[1]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(row.owner).toBe('u2');
    expect(popupEl()).toBeNull();
  });

  it('单人：clearable 的清除是锚点右侧那个「×」，清空写回空串', () => {
    const col = VtPerson<Row>({
      key: 'owner',
      title: '负责人',
      options: MEMBERS,
      clearable: true,
    });
    const row: Row = { owner: 'u1' };
    const anchor = openEdit(col, row);
    expect(popupEl()!.querySelector('.vt-filter-btn')).toBeNull();

    const btn = anchor.querySelector('.vt-comp-clear') as HTMLElement;
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(row.owner).toBe('');
    // 胶囊回显清空，回落 placeholder；叉也藏起来
    expect(anchor.querySelector('.vt-comp-person')).toBeNull();
    expect(btn.style.display).toBe('none');
  });

  it('多人：clearable 的「×」清空整列选择（面板底部的「清空」照旧和「全选」成对）', () => {
    const col = VtPerson<Row>({
      key: 'members',
      title: '参与人',
      options: MEMBERS,
      multiple: true,
      clearable: true,
    });
    const row: Row = { members: ['u1', 'u2'] };
    const anchor = openEdit(col, row);

    (anchor.querySelector('.vt-comp-clear') as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true }),
    );
    expect(row.members).toEqual([]);
    // 勾选框跟着复位
    expect(
      [...popupEl()!.querySelectorAll('input.vt-filter-checkbox')].map(
        (b) => (b as HTMLInputElement).checked,
      ),
    ).toEqual([false, false, false, false]);
    expect(popupEl()!.querySelector('.vt-filter-btn')).toBeTruthy();
  });

  it('多人：勾选即时写回数组，取消也是，面板不关', () => {
    const col = VtPerson<Row>({
      key: 'members',
      title: '参与人',
      options: MEMBERS,
      multiple: true,
    });
    const row: Row = { members: ['u1'] };
    openEdit(col, row);

    const boxes = () =>
      [...popupEl()!.querySelectorAll('input.vt-filter-checkbox')] as HTMLInputElement[];
    expect(boxes().map((b) => b.checked)).toEqual([true, false, false, false]);
    expect(boxes()[3]!.disabled).toBe(true);

    boxes()[1]!.checked = true;
    boxes()[1]!.dispatchEvent(new Event('change'));
    expect(row.members).toEqual(['u1', 'u2']);
    expect(popupEl()).not.toBeNull();

    // 重画后拿到的是新元素，所以每次都重新查
    boxes()[0]!.checked = false;
    boxes()[0]!.dispatchEvent(new Event('change'));
    expect(row.members).toEqual(['u2']);
  });

  it('多人 valueType: string —— 按分隔符拆，也按分隔符拼回去', () => {
    const col = VtPerson<Row>({
      key: 'cc',
      title: '抄送',
      options: MEMBERS,
      multiple: true,
      valueType: 'string',
    });
    const row: Row = { cc: 'u1,u2' };
    expect(names(renderCell(col, row) as HTMLElement)).toEqual(['张伟', '李娜']);

    openEdit(col, row);
    const boxes = [...popupEl()!.querySelectorAll('input.vt-filter-checkbox')] as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([true, true, false, false]);

    boxes[2]!.checked = true;
    boxes[2]!.dispatchEvent(new Event('change'));
    expect(row.cc).toBe('u1,u2,u3');
  });

  it('搜索：姓名 / 副标题 / 标识都能命中，搜不到给空态', () => {
    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
    openEdit(col, { owner: '' });
    const popup = popupEl()!;
    const search = popup.querySelector('.vt-comp-search input') as HTMLInputElement;

    const type = (v: string): void => {
      search.value = v;
      search.dispatchEvent(new Event('input'));
    };

    type('李');
    expect(names(popup)).toEqual(['李娜']);
    type('产品');
    expect(names(popup)).toEqual(['李娜']);
    type('u3');
    expect(names(popup)).toEqual(['John Doe']);
    type('查无此人');
    expect(names(popup)).toEqual([]);
    expect((popup.querySelector('.vt-comp-popup-empty') as HTMLElement).textContent).toBe(
      '无匹配人员',
    );
  });

  it('全选只作用于当前搜索结果，且跳过 disabled；清空置空', () => {
    const col = VtPerson<Row>({
      key: 'members',
      title: '参与人',
      options: MEMBERS,
      multiple: true,
    });
    const row: Row = { members: [] };
    openEdit(col, row);
    const popup = popupEl()!;

    const all = popup.querySelector('.vt-filter-btn--primary') as HTMLButtonElement;
    all.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.members).toEqual(['u1', 'u2', 'u3']);

    const search = popup.querySelector('.vt-comp-search input') as HTMLInputElement;
    search.value = '技术部';
    search.dispatchEvent(new Event('input'));
    all.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.members).toEqual(['u1']);

    (popup.querySelector('.vt-filter-btn') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(row.members).toEqual([]);
  });

  it('键盘：↑↓ 移动高亮（跳过 disabled）、Enter 选中；事件不冒泡给键盘导航插件', () => {
    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
    const row: Row = { owner: '' };
    openEdit(col, row);
    const search = popupEl()!.querySelector('.vt-comp-search input') as HTMLInputElement;

    const press = (key: string): KeyboardEvent => {
      const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      search.dispatchEvent(e);
      return e;
    };

    const active = (): string | null =>
      popupEl()!.querySelector('.vt-comp-person-item.is-active .vt-comp-person-name')!
        .textContent;

    const down = press('ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(active()).toBe('张伟');
    press('ArrowDown');
    expect(active()).toBe('李娜');
    press('ArrowUp');
    expect(active()).toBe('张伟');

    press('Enter');
    expect(row.owner).toBe('u1');
    expect(popupEl()).toBeNull();
  });

  it('键盘：末尾回绕时跳过 disabled 的人', () => {
    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
    openEdit(col, { owner: '' });
    const search = popupEl()!.querySelector('.vt-comp-search input') as HTMLInputElement;
    const press = (key: string): void => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    };
    const active = (): string | null =>
      popupEl()!.querySelector('.vt-comp-person-item.is-active .vt-comp-person-name')!
        .textContent;

    // 张伟 → 李娜 → John Doe →（陈冬 disabled，跳过）→ 张伟
    press('ArrowDown');
    press('ArrowDown');
    press('ArrowDown');
    expect(active()).toBe('John Doe');
    press('ArrowDown');
    expect(active()).toBe('张伟');
  });

  it('disabled 列不给 renderEditor；面板挂在 .vt-client 内并带 data-vt-popup', () => {
    expect(
      VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS, disabled: true })
        .renderEditor,
    ).toBeUndefined();

    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
    openEdit(col, { owner: 'u1' });
    const popup = popupEl()!;
    expect(popup.parentElement).toBe(client);
    expect(popup.classList.contains('vt-filter-panel')).toBe(true);
  });

  it('searchable: false 时没有搜索框', () => {
    const col = VtPerson<Row>({
      key: 'owner',
      title: '负责人',
      options: MEMBERS,
      searchable: false,
    });
    openEdit(col, { owner: '' });
    expect(popupEl()!.querySelector('.vt-comp-search')).toBeNull();
  });

  it('编辑态锚点回显的是同一串胶囊（不是拿「、」拼出来的纯文字）', () => {
    const col = VtPerson<Row>({
      key: 'members',
      title: '参与人',
      options: MEMBERS,
      multiple: true,
      maxCount: 2,
    });
    const anchor = openEdit(col, { members: ['u1', 'u2', 'u3'] });

    const chips = [...anchor.querySelectorAll('.vt-comp-person')] as HTMLElement[];
    expect(chips).toHaveLength(2);
    expect(names(anchor)).toEqual(['张伟', '李娜']);
    expect(chips[0]!.querySelector('.vt-comp-avatar')).toBeTruthy();
    // 折叠计数也照常态那样给
    expect((anchor.querySelector('.vt-comp-tag-more') as HTMLElement).textContent).toBe('+1');
    // 容器要横排，否则块级 flex 的胶囊会竖着堆
    expect(
      (anchor.querySelector('.vt-comp-anchor-text') as HTMLElement).classList.contains(
        'vt-comp-anchor-text--nodes',
      ),
    ).toBe(true);
  });

  it('空值时锚点回落 placeholder', () => {
    const col = VtPerson<Row>({
      key: 'owner',
      title: '负责人',
      options: MEMBERS,
      placeholder: '未指派',
    });
    const anchor = openEdit(col, { owner: '' });
    expect(anchor.querySelector('.vt-comp-person')).toBeNull();
    expect((anchor.querySelector('.vt-comp-anchor-text') as HTMLElement).textContent).toBe(
      '未指派',
    );
    expect(anchor.classList.contains('vt-comp-anchor--placeholder')).toBe(true);
  });

  it('选中后锚点里的胶囊跟着换', () => {
    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
    const anchor = openEdit(col, { owner: 'u1' });
    expect(names(anchor)).toEqual(['张伟']);

    const items = [...popupEl()!.querySelectorAll('.vt-comp-person-item')] as HTMLElement[];
    items[1]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(names(anchor)).toEqual(['李娜']);
  });

  describe('悬停名片', () => {
    const cardEl = (): HTMLElement | null => client.querySelector('.vt-comp-card-popup');
    const hover = (el: HTMLElement): void => {
      el.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(250);
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('悬停 200ms 后弹名片：放大头像 + 姓名 + 副标题 + 邮箱/电话/自定义字段', () => {
      const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
      const el = renderCell(col, { owner: 'u1' }) as HTMLElement;
      client.appendChild(el);
      const chip = el.querySelector('.vt-comp-person') as HTMLElement;

      chip.dispatchEvent(new MouseEvent('mouseenter'));
      expect(cardEl()).toBeNull(); // 还在等 delay，横扫单元格不该弹
      vi.advanceTimersByTime(250);

      const card = cardEl()!;
      expect(card.parentElement).toBe(client);
      expect((card.querySelector('.vt-comp-card-name') as HTMLElement).textContent).toBe('张伟');
      expect((card.querySelector('.vt-comp-card-desc') as HTMLElement).textContent).toBe('技术部');
      expect(card.querySelector('.vt-comp-avatar--lg')).toBeTruthy();
      expect(
        [...card.querySelectorAll('.vt-comp-card-row')].map((r) => r.textContent),
      ).toEqual(['邮箱zhangwei@example.com', '电话138-0001', '工号E1']);
    });

    it('鼠标离开后过一段宽限期才关；按下立刻关', () => {
      const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
      const el = renderCell(col, { owner: 'u1' }) as HTMLElement;
      client.appendChild(el);
      const chip = el.querySelector('.vt-comp-person') as HTMLElement;

      hover(chip);
      expect(cardEl()).not.toBeNull();
      chip.dispatchEvent(new MouseEvent('mouseleave'));
      // 宽限期内还在（这段时间正是给「指针跨过 4px 空隙移进名片」用的）
      vi.advanceTimersByTime(60);
      expect(cardEl()).not.toBeNull();
      vi.advanceTimersByTime(200);
      expect(cardEl()).toBeNull();

      hover(chip);
      expect(cardEl()).not.toBeNull();
      chip.dispatchEvent(new MouseEvent('mousedown'));
      expect(cardEl()).toBeNull();
    });

    it('指针移进名片不消失 —— 里面的内容要能选中复制', () => {
      const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
      const el = renderCell(col, { owner: 'u1' }) as HTMLElement;
      client.appendChild(el);
      const chip = el.querySelector('.vt-comp-person') as HTMLElement;

      hover(chip);
      const card = cardEl()!;

      // 指针跨空隙：先离开胶囊，再进名片
      chip.dispatchEvent(new MouseEvent('mouseleave'));
      card.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(500);
      expect(cardEl()).toBe(card); // 还是同一张，没被重建（重建会丢掉已选中的文字）

      // 在名片里按下（划选起手）不该把它关掉
      card.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      vi.advanceTimersByTime(500);
      expect(cardEl()).toBe(card);

      // 从名片挪回胶囊也还是同一张
      card.dispatchEvent(new MouseEvent('mouseleave'));
      chip.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(500);
      expect(cardEl()).toBe(card);

      // 两块都离开 → 收
      chip.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(500);
      expect(cardEl()).toBeNull();
    });

    it('离开名片后又移回名片：宽限期内取消收起', () => {
      const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
      const el = renderCell(col, { owner: 'u1' }) as HTMLElement;
      client.appendChild(el);
      const chip = el.querySelector('.vt-comp-person') as HTMLElement;

      hover(chip);
      const card = cardEl()!;
      chip.dispatchEvent(new MouseEvent('mouseleave'));
      card.dispatchEvent(new MouseEvent('mouseenter'));
      card.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(60);
      card.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(500);
      expect(cardEl()).toBe(card);
    });

    it('名片被销毁时指针正在它上面，也不会把后面的名片钉住不关', () => {
      const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
      const el = renderCell(col, { owner: 'u1' }) as HTMLElement;
      client.appendChild(el);
      const chip = el.querySelector('.vt-comp-person') as HTMLElement;

      hover(chip);
      cardEl()!.dispatchEvent(new MouseEvent('mouseenter'));
      // 点到表格别处 → _popup 的 outside-click 把名片收掉，此刻 overCard 还是 true
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(cardEl()).toBeNull();

      // 再悬停一次，离开后必须还能正常收起（overCard 没被永久钉在 true）
      chip.dispatchEvent(new MouseEvent('mouseleave'));
      hover(chip);
      expect(cardEl()).not.toBeNull();
      chip.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(500);
      expect(cardEl()).toBeNull();
    });

    it('单元格里已经看得全的人不弹 —— 名片不该只是重复一遍姓名', () => {
      const col = VtPerson<Row>({
        key: 'owner',
        title: '负责人',
        // 只有姓名，没有部门/邮箱/电话/自定义字段
        options: [{ value: 'u9', label: '孤例' }],
      });
      const el = renderCell(col, { owner: 'u9' }) as HTMLElement;
      client.appendChild(el);
      hover(el.querySelector('.vt-comp-person') as HTMLElement);
      expect(cardEl()).toBeNull();
    });

    it('avatarOnly 下即使没有额外信息也弹 —— 姓名本来就看不见', () => {
      const col = VtPerson<Row>({
        key: 'owner',
        title: '负责人',
        options: [{ value: 'u9', label: '孤例' }],
        avatarOnly: true,
      });
      const el = renderCell(col, { owner: 'u9' }) as HTMLElement;
      client.appendChild(el);
      hover(el.querySelector('.vt-comp-person') as HTMLElement);
      expect((cardEl()!.querySelector('.vt-comp-card-name') as HTMLElement).textContent).toBe(
        '孤例',
      );
    });

    it('hoverCard: false 关掉；renderCard 可整块替换，返回 null 则不弹', () => {
      const off = VtPerson<Row>({
        key: 'owner',
        title: '负责人',
        options: MEMBERS,
        hoverCard: false,
      });
      const a = renderCell(off, { owner: 'u1' }) as HTMLElement;
      client.appendChild(a);
      hover(a.querySelector('.vt-comp-person') as HTMLElement);
      expect(cardEl()).toBeNull();

      const custom = VtPerson<Row>({
        key: 'owner',
        title: '负责人',
        options: MEMBERS,
        renderCard: (person, row) => {
          if (person.value === 'u2') return null;
          const div = document.createElement('div');
          div.className = 'my-card';
          div.textContent = `${person.label}@${(row as Row).dept}`;
          return div;
        },
      });
      const b = renderCell(custom, { owner: 'u1', dept: '技术部' }) as HTMLElement;
      client.appendChild(b);
      hover(b.querySelector('.vt-comp-person') as HTMLElement);
      expect((cardEl()!.querySelector('.my-card') as HTMLElement).textContent).toBe('张伟@技术部');

      const c = renderCell(custom, { owner: 'u2', dept: '产品部' }) as HTMLElement;
      client.appendChild(c);
      hover(c.querySelector('.vt-comp-person') as HTMLElement);
      expect(cardEl()).toBeNull();
    });

    it('编辑态锚点里的胶囊不挂名片（选人面板已经盖在下方，两个浮层会打架）', () => {
      const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
      const anchor = openEdit(col, { owner: 'u1' });
      hover(anchor.querySelector('.vt-comp-person') as HTMLElement);
      expect(cardEl()).toBeNull();
    });
  });

  it('行值是对象、但通过面板改值时写回标量 value', () => {
    const col = VtPerson<Row>({ key: 'owner', title: '负责人', options: MEMBERS });
    const row: Row = { owner: { id: 'u1', name: '张伟' } };
    openEdit(col, row);
    // 对象形状也能对上候选项 → 高亮正确
    const items = [...popupEl()!.querySelectorAll('.vt-comp-person-item')] as HTMLElement[];
    expect(items[0]!.classList.contains('is-selected')).toBe(true);

    items[1]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(row.owner).toBe('u2');
  });
});

/**
 * `asCell`：把组件装到**单个格子**上（配 `table.setCellRender`）。
 *
 * 这里守的是三件事，全都是「列级用法看不出来、单元格级才会露馅」的：
 *   ① 不用编造 `key` / `title` / `width`；
 *   ② 写回落到**真实列键**（来自 `ctx.column.key`），不是工厂里那个占位空串；
 *   ③ `render` 与 `renderEditor` 成对交付，不会只给一半。
 */
describe('asCell（单元格级装载）', () => {
  it('不用给 key / title / width，产出的是一份 CellRenderConfig', () => {
    const cfg = asCell(VtSelect, { options: [{ value: 'a', label: 'A' }] });
    expect(typeof cfg.render).toBe('function');
    expect(typeof cfg.renderEditor).toBe('function');
    // 列外壳被丢掉了：配置里只剩内容与编辑器三个字段
    expect(Object.keys(cfg).sort()).toEqual(['cellType', 'render', 'renderEditor']);
  });

  it('写回用真实列键，而不是工厂里的占位 key', () => {
    const cfg = asCell(VtSelect, { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] });
    const row: Row = { status: 'a' };
    const column = { key: 'status', title: '状态', width: 120 } as VirtTableColumn<Row>;
    const cover = document.createElement('div');
    cover.className = 'vt-cell-cover';
    client.appendChild(cover);
    const anchor = cfg.renderEditor!({ value: row.status, row, rowIndex: 0, column, el: cover } as any);
    cover.appendChild(anchor as HTMLElement);

    // 面板在 renderEditor 里就已经打开（与 VtSelect 列级用法同一条路径）
    const items = [...popupEl()!.querySelectorAll('.vt-filter-item')] as HTMLElement[];
    items[1]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(row.status).toBe('b');
    expect(row['']).toBeUndefined();
  });

  it('常态照常渲染（与列级同一个 render）', () => {
    const cfg = asCell(VtProgress, { max: 100 });
    const column = { key: 'pct', title: '进度', width: 120 } as VirtTableColumn<Row>;
    const out = cfg.render!({ value: 40, row: { pct: 40 }, rowIndex: 0, column } as any);
    expect((out as HTMLElement).querySelector('.vt-comp-progress-bar')).not.toBeNull();
  });

  it('纯展示组件只有 render，没有 renderEditor（成对交付不等于凭空造编辑态）', () => {
    const cfg = asCell(VtLink, { href: (row: Row) => `/u/${row.id}` });
    expect(typeof cfg.render).toBe('function');
    expect(cfg.renderEditor).toBeUndefined();
  });
});
