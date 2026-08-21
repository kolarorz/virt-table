import type { VirtTableColumn } from '../index';
import { type PopupHandle, createPopup } from './_popup';
import { buildChips, createEnumEditor, enumCodec, renderChipCell } from './_enum';
import {
  type BaseColumnOptions,
  type VtSemanticType,
  clearableOn,
  pickColumnProps,
  semanticColor,
} from './shared';

/** 人员候选项 */
export interface VtPersonOption {
  /** 人员标识；写回行数据的就是它 */
  value: string | number;
  /** 姓名（常态与面板里显示的文案） */
  label: string;
  /** 头像图片 URL。不给、或加载失败时退到「姓名首字 + 派生色」的色块 */
  avatar?: string;
  /** 色块颜色。默认按 `value` 稳定哈希从语义色板里取一个 */
  color?: string;
  /** 副标题（部门 / 职位）。在选人面板与悬停名片里显示 —— 单元格里只放头像 + 姓名 */
  desc?: string;
  /** 邮箱。只在悬停名片里显示 */
  email?: string;
  /** 电话。只在悬停名片里显示 */
  phone?: string;
  /** 名片里的自定义字段（工号、直属上级…），按顺序排在邮箱/电话之后 */
  fields?: Array<{ label: string; value: string }>;
  disabled?: boolean;
}

export interface VtPersonOptions<T = any> extends BaseColumnOptions<T> {
  /**
   * 可选人员。**不给就是纯展示列**（不提供 `renderEditor`）：此时常态直接读行值，
   * 行值可以是姓名字符串，也可以是 `{ value/id, label/name, avatar, color }` 对象。
   */
  options?: VtPersonOption[];
  /** 多选（选多人），默认 `false`（选单人） */
  multiple?: boolean;
  /**
   * `multiple` 时值的存储形式：
   *   - `'array'`（默认）—— 行数据里存 `['u1', 'u2']`
   *   - `'string'` —— 存 `'u1,u2'`，用 `separator` 拆/拼
   *
   * 单选恒为标量（清空写 `''`）。
   */
  valueType?: 'array' | 'string';
  /** `valueType: 'string'` 时的分隔符，默认 `','` */
  separator?: string;
  /** 常态最多画几个人，超出折叠成 `+N`。默认 3；给 0 表示不折叠 */
  maxCount?: number;
  /** 只画头像不画姓名（列很窄时用），姓名进 `title`。默认 false */
  avatarOnly?: boolean;
  /** 面板顶部给搜索框，默认 true —— 人员列表通常比枚举长得多 */
  searchable?: boolean;
  /** 搜索框占位文案，默认「搜索姓名」 */
  searchPlaceholder?: string;
  /** 搜不到时的提示文案，默认「无匹配人员」 */
  emptyText?: string;
  /** `multiple` 时面板底部是否给「清空 / 全选」，默认 true */
  showActions?: boolean;
  /**
   * 悬停在人身上时弹一张名片（头像放大 + 姓名 + 副标题 + 邮箱/电话/自定义字段），
   * 默认 true。
   *
   * 只有**确实有东西可看**时才弹：候选项带了 `desc` / `email` / `phone` / `fields`，
   * 或者姓名在单元格里被藏起来（`avatarOnly`）/ 被截断。一张只重复单元格里已有内容的
   * 名片是纯噪音。
   */
  hoverCard?: boolean;
  /** 自定义名片内容。返回 `null` 表示这个人不弹名片 */
  renderCard?: (person: VtPersonOption, row: T, rowIndex: number) => HTMLElement | null;
}

/**
 * 头像色块的派生色板。
 *
 * 刻意只取核心语义色令牌（不引入新颜色）：换主色 / 切暗色时头像跟着走，
 * 也不用为「人员」这一个组件维护一套专属调色板。
 */
const AVATAR_PALETTE: VtSemanticType[] = [
  'primary',
  'success',
  'warning',
  'danger',
  'default',
];

/**
 * 按标识稳定地挑一个色块颜色。
 *
 * 必须是**稳定**的（同一个人在任何行、任何表格里都是同一色）—— 随机或按行号取色的话，
 * 虚拟滚动复用行 DOM 时同一个人的颜色会随滚动跳变。
 */
function avatarColor(value: string | number): string {
  const s = String(value);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return semanticColor(AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]!)!;
}

/**
 * 姓名 → 色块里的字。
 *
 * 中日韩取**最后一个字**（「张伟」→「伟」，与国内 IM 的头像习惯一致，也避免一屏全是「张」）；
 * 拉丁字母取前两段的首字母（`John Doe` → `JD`）。
 */
function initialsOf(name: string): string {
  const s = name.trim();
  if (!s) return '';
  // 码点区间：CJK 扩展 A + 统一表意文字 + 日文假名 + 韩文音节
  if (/[㐀-䶿一-鿿぀-ヿ가-힯]/.test(s)) return s.slice(-1);
  return s
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

/**
 * 头像：一个圆形色块，有图就把图盖在上面。
 *
 * 图挂了（离职销号、外链失效、防盗链）就把 `<img>` 摘掉，露出下面的首字色块 ——
 * 断图占位符比首字更难看，而人员头像的外链失效是常态。
 */
function makeAvatar(person: VtPersonOption): HTMLElement {
  const el = document.createElement('span');
  el.className = 'vt-comp-avatar';
  el.style.setProperty('--vt-avatar-color', person.color ?? avatarColor(person.value));
  el.textContent = initialsOf(person.label);
  // 头像整体是装饰：姓名要么就在旁边（`.vt-comp-person-name`），要么挂在外层的
  // `aria-label` 上（avatarOnly）。不藏起来读屏会念成「娜 李娜」
  el.setAttribute('aria-hidden', 'true');

  if (person.avatar) {
    const img = document.createElement('img');
    img.className = 'vt-comp-avatar-img';
    img.src = person.avatar;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => img.remove());
    el.appendChild(img);
  }
  return el;
}

/* -------------------------------------------------------------------------- *
 * 悬停名片
 * -------------------------------------------------------------------------- */

/** 悬停多久才弹。与核心 tooltip 的 150ms 同源：再短会在横扫单元格时闪 */
const CARD_DELAY = 200;

/**
 * 指针离开后多久才收名片。
 *
 * 不能是 0：名片挂在胶囊下方、与它隔着 `_popup.ts` 的 4px 空隙，指针从胶囊移进名片
 * 必然先在空隙里触发胶囊的 `mouseleave`。立刻收掉的话名片永远进不去（也就没法选中复制）。
 */
const CARD_CLOSE_DELAY = 160;

/** 同时只留一张名片（鼠标只能停在一个人身上） */
let activeCard: PopupHandle | null = null;

function closeCard(): void {
  activeCard?.destroy();
  activeCard = null;
}

/** 这个人有没有「单元格里看不到」的信息 */
function hasCardBody(person: VtPersonOption): boolean {
  return !!(person.desc || person.email || person.phone || person.fields?.length);
}

/** 默认名片：放大的头像 + 姓名 + 副标题，下面是字段行 */
function defaultCard(person: VtPersonOption): HTMLElement {
  const card = document.createElement('div');
  card.className = 'vt-comp-card';

  const head = document.createElement('div');
  head.className = 'vt-comp-card-head';
  const avatar = makeAvatar(person);
  avatar.classList.add('vt-comp-avatar--lg');
  head.appendChild(avatar);

  const title = document.createElement('div');
  title.className = 'vt-comp-card-title';
  const name = document.createElement('div');
  name.className = 'vt-comp-card-name';
  name.textContent = person.label;
  title.appendChild(name);
  if (person.desc) {
    const desc = document.createElement('div');
    desc.className = 'vt-comp-card-desc';
    desc.textContent = person.desc;
    title.appendChild(desc);
  }
  head.appendChild(title);
  card.appendChild(head);

  const rows: Array<{ label: string; value: string }> = [];
  if (person.email) rows.push({ label: '邮箱', value: person.email });
  if (person.phone) rows.push({ label: '电话', value: person.phone });
  if (person.fields) rows.push(...person.fields);

  if (rows.length) {
    const body = document.createElement('div');
    body.className = 'vt-comp-card-fields';
    for (const f of rows) {
      const row = document.createElement('div');
      row.className = 'vt-comp-card-row';
      const label = document.createElement('span');
      label.className = 'vt-comp-card-label';
      label.textContent = f.label;
      const value = document.createElement('span');
      value.className = 'vt-comp-card-value';
      value.textContent = f.value;
      row.append(label, value);
      body.appendChild(row);
    }
    card.appendChild(body);
  }

  return card;
}

/**
 * 给一枚胶囊挂上悬停名片。
 *
 * **为什么这里可以逐个绑监听**（核心 tooltip 特意用的是 tbody 事件委托，见 §7.2）：
 * 那条约束针对的是 `<td>` —— 行 DOM 池化复用，同一批 td 会被反复重填，逐格绑就会
 * 不断累积。而胶囊是每次 `render` 新建的元素，单元格重填时连元素一起丢掉，监听跟着
 * 走，不存在累积。这也是同目录其他组件（`VtActions` 的按钮、`VtSwitch` 的勾选框）
 * 一直在用的模式。
 *
 * 名片本体走 `_popup.ts`：挂 `.vt-client`（与 `.vt-cell-cover` 同层，继承 `--vt-*`、
 * 横滚时与单元格一起被 scrollport 搬走）、随锚点移动、锚点被虚拟滚动回收时自毁。
 *
 * **名片是可交互的**（能把指针移进去选中复制里面的邮箱/电话），所以「还在 hover 吗」
 * 是胶囊与名片两块区域的**并集**：任一块被指针进入就取消收起，两块都离开才收。
 * 少了这条桥接就会：指针刚要移进名片 → 先在两者之间的 4px 空隙里触发胶囊的
 * `mouseleave` → 名片收掉 → 永远选不中里面的文字。
 */
function attachHoverCard(
  el: HTMLElement,
  build: () => HTMLElement | null,
  shouldShow: () => boolean,
): void {
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let overAnchor = false;
  let overCard = false;
  /** 这枚胶囊自己开出来的那张名片（用来分辨「名片位」现在是不是还归自己） */
  let mine: PopupHandle | null = null;

  const cancelClose = (): void => clearTimeout(closeTimer);

  const scheduleClose = (): void => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (overAnchor || overCard) return;
      // 只收自己那张：这段延迟里指针可能已经移到别人身上、开出了新名片
      if (mine && activeCard === mine) closeCard();
      mine = null;
    }, CARD_CLOSE_DELAY);
  };

  const open = (): void => {
    if (!el.isConnected || !shouldShow()) return;
    // 先收掉上一张：这枚胶囊已经接管了名片位，`build()` 返回 null（`renderCard` 说
    // 这个人不弹）时也不该把别人的名片留在屏幕上
    closeCard();
    const body = build();
    if (!body) return;

    overCard = false;
    const popup = createPopup({
      anchor: el,
      owner: el,
      className: 'vt-comp-card-popup',
      minWidth: 220,
      onClose: () => {
        // 点到别处（含框选、进编辑）就收。指针状态要一起复位，否则「名片被销毁时
        // 指针正在它上面」会把 overCard 永久钉在 true，后面的名片再也收不掉
        overCard = false;
        if (!mine) return;
        if (activeCard === mine) closeCard();
        else mine.destroy();
        mine = null;
      },
    });
    popup.el.appendChild(body);
    popup.el.addEventListener('mouseenter', () => {
      overCard = true;
      cancelClose();
    });
    popup.el.addEventListener('mouseleave', () => {
      overCard = false;
      scheduleClose();
    });
    popup.update();
    activeCard = popup;
    mine = popup;
  };

  el.addEventListener('mouseenter', () => {
    overAnchor = true;
    cancelClose();
    clearTimeout(openTimer);
    // 从名片挪回胶囊：自己那张还开着，别重建（重建会丢掉用户已经选中的文字）
    if (mine && activeCard === mine) return;
    // 判定推到计时器里做：`shouldShow` 可能要读 `scrollWidth`（强制刷新布局），
    // 横扫一排单元格时不该每格都付这个代价（与核心 tooltip 同一条理由）
    openTimer = setTimeout(open, CARD_DELAY);
  });

  el.addEventListener('mouseleave', () => {
    overAnchor = false;
    clearTimeout(openTimer);
    scheduleClose();
  });

  // 点下去要么进编辑态、要么在框选，名片留着挡视线
  el.addEventListener('mousedown', () => {
    overAnchor = false;
    overCard = false;
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    if (mine && activeCard === mine) closeCard();
    mine = null;
  });
}

/**
 * 人员列：头像 + 姓名，可选单人 / 多人。
 *
 * ```ts
 * const MEMBERS = [
 *   { value: 'u1', label: '张伟', avatar: '/avatar/u1.png', desc: '技术部' },
 *   { value: 'u2', label: '李娜', desc: '产品部' },          // 无图 → 首字色块
 * ];
 * // 单人
 * VtPerson({ key: 'owner', title: '负责人', width: 180, options: MEMBERS })
 * // 多人（存数组，超过 2 个折叠成 +N）
 * VtPerson({ key: 'members', title: '参与人', width: 260, options: MEMBERS,
 *            multiple: true, maxCount: 2 })
 * // 纯展示：不给 options，行值直接是 { name, avatar }
 * VtPerson({ key: 'creator', title: '创建人', width: 160 })
 * ```
 *
 * 编辑态是**选人面板**（`_popup.ts` 的 below 浮层，挂 `.vt-client`、带 `data-vt-popup`），
 * 外壳与列表项复用 `_panel.css` —— 与列头筛选下拉、`VtMultiSelect` 同一套外观。
 * 面板顶部默认带搜索框（姓名 / 副标题 / 标识都能搜），键盘 `↑↓` 移动、`Enter` 选中、
 * `Esc` 关闭。
 *
 * 单人：选中即写回并关闭面板。多人：勾选**即时写回**（没有「确定」按钮），与
 * `VtMultiSelect` 一致 —— 面板底部的「清空 / 全选」和逐项勾选走同一条路。
 *
 * `clearable` 与 `VtSelect` 同档、**默认开**：锚点上一个 `×`，`Delete` / `Backspace` 同效
 * （焦点在搜索框里时要求搜索词为空）。
 */
export function VtPerson<T = any>(opts: VtPersonOptions<T>): VirtTableColumn<T> {
  const options = opts.options ?? [];
  const optionMap = new Map(options.map((o) => [o.value, o]));
  const multiple = !!opts.multiple;
  /** 值形状（标量 / 数组 / 分隔符字符串）与三个兄弟组件共用同一份编解码 */
  const codec = enumCodec(opts);

  /**
   * 原始项 → 候选项。
   *
   * 三种来源都要接：`options` 里的标识、行数据里直接放的对象（`{ id, name, avatar }`
   * 这种接口原样落库的形状很常见）、以及找不到时把值本身当姓名。
   */
  const toPerson = (raw: unknown): VtPersonOption | null => {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'object') {
      const o = raw as Record<string, any>;
      const value = o.value ?? o.id ?? o.label ?? o.name;
      if (value == null) return null;
      const hit = optionMap.get(value as string | number);
      return {
        value: value as string | number,
        label: String(o.label ?? o.name ?? hit?.label ?? value),
        avatar: o.avatar ?? o.avatarUrl ?? hit?.avatar,
        color: o.color ?? hit?.color,
        desc: o.desc ?? hit?.desc,
      };
    }
    const key = raw as string | number;
    return optionMap.get(key) ?? { value: key, label: String(key) };
  };

  /** 行值 → 人（codec 只管拆形状，认对象值是 `toPerson` 的事） */
  const parsePeople = (value: unknown): VtPersonOption[] =>
    (codec.parse(value) as unknown[])
      .map(toPerson)
      .filter((p): p is VtPersonOption => p !== null);

  /**
   * 一枚人员胶囊。
   *
   * **常态与编辑态共用这一个构造**：点开单元格时锚点里回显的必须是同样的胶囊，
   * 否则头像会变成一串纯文字姓名，看起来像换了一列（第一版就是这样）。
   *
   * @param withCard 是否挂悬停名片。编辑态不挂 —— 选人面板已经盖在下方，再弹一张名片是打架
   */
  const makeChip = (
    person: VtPersonOption,
    row: T,
    rowIndex: number,
    withCard: boolean,
  ): HTMLElement => {
    const el = document.createElement('span');
    // 有姓名就套胶囊（把头像与姓名圈成一块）；只有头像时不套，免得右边空一截
    el.className = opts.avatarOnly
      ? 'vt-comp-person vt-comp-person--bare'
      : 'vt-comp-person';
    el.appendChild(makeAvatar(person));

    let nameEl: HTMLElement | null = null;
    if (opts.avatarOnly) {
      // 姓名不在 DOM 里，得有别的路子读到它（悬停 + 读屏）
      el.title = person.label;
      el.setAttribute('aria-label', person.label);
    } else {
      nameEl = document.createElement('span');
      nameEl.className = 'vt-comp-person-name';
      nameEl.textContent = person.label;
      el.appendChild(nameEl);
    }

    if (withCard && opts.hoverCard !== false) {
      attachHoverCard(
        el,
        () => (opts.renderCard ? opts.renderCard(person, row, rowIndex) : defaultCard(person)),
        () =>
          // 有 renderCard 说明使用方明确要弹；否则只在「名片里有单元格看不到的东西」时弹：
          // 额外字段、姓名被藏起来（avatarOnly）、或姓名被列宽截断
          !!opts.renderCard ||
          hasCardBody(person) ||
          !nameEl ||
          nameEl.scrollWidth - nameEl.clientWidth > 1,
      );
    }
    return el;
  };

  /** 选人面板里一项的内容：头像 + （姓名 / 副标题）两行 */
  const itemContent = (person: VtPersonOption): Node[] => {
    const meta = document.createElement('span');
    meta.className = 'vt-comp-person-meta';
    const name = document.createElement('span');
    name.className = 'vt-comp-person-name';
    name.textContent = person.label;
    meta.appendChild(name);
    if (person.desc) {
      const desc = document.createElement('span');
      desc.className = 'vt-comp-person-desc';
      desc.textContent = person.desc;
      meta.appendChild(desc);
    }
    return [makeAvatar(person), meta];
  };

  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: ({ value, row, rowIndex }) =>
      renderChipCell(parsePeople(value), {
        modifier: 'persons',
        maxCount: opts.maxCount,
        chip: (person) => makeChip(person, row, rowIndex, true),
      }) ?? (opts.placeholder ?? ''),
  };

  // 没有候选人就没法选人 —— 退化成纯展示列（与 `VtTag` 不配 `options` 时同理）
  if (opts.disabled || options.length === 0) return col;

  col.renderEditor = (ctx) =>
    createEnumEditor<T, VtPersonOption>(opts, ctx, {
      options,
      multiple,
      // 人员列表通常比枚举长得多，所以这一个预设**默认开**搜索（其余三个默认关）
      searchable: opts.searchable !== false,
      searchPlaceholder: opts.searchPlaceholder ?? '搜索姓名',
      emptyText: opts.emptyText ?? '无匹配人员',
      showActions: opts.showActions,
      // 与 `VtSelect` 同一条规则：锚点类默认给 ×（见 `clearableOn`）
      clearable: clearableOn(opts),
      itemClass: 'vt-comp-person-item',
      codec: {
        // 行值可能是对象，得先过 `toPerson` 才拿得到标识
        parse: (value) => parsePeople(value).map((p) => p.value),
        serialize: codec.serialize,
      },
      // 副标题也能搜（部门 / 职位往往比姓名更好记）
      match: (person, q) =>
        person.label.toLowerCase().includes(q) ||
        (person.desc ?? '').toLowerCase().includes(q) ||
        String(person.value).toLowerCase().includes(q),
      renderItem: (person) => itemContent(person),
      renderAnchor: (people) =>
        people.length === 0
          ? ''
          : buildChips(people, {
              // 单人就一个，不需要折叠计数
              maxCount: multiple ? opts.maxCount : 0,
              chip: (person) => makeChip(person, ctx.row, ctx.rowIndex, false),
            }),
    });

  return col;
}
