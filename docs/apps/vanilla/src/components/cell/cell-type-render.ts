import { VirtTable, type CellRenderConfig, type VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import {
  VtActions,
  VtAutocomplete,
  VtCascader,
  VtCheckbox,
  VtDatePicker,
  VtDateRangePicker,
  VtImage,
  VtInput,
  VtLink,
  VtNumberInput,
  VtPerson,
  VtProgress,
  VtRate,
  VtSelect,
  VtSwitch,
  VtTag,
  VtTextarea,
  VtTimePicker,
  asCell,
  type VtCascaderOption,
  type VtPersonOption,
  type VtSelectOption,
} from '@virt-table/vanilla/components';

/**
 * 单元格独立渲染 —— **同一列里每一格都不一样**。
 *
 * 这一页只证明一件事：内容与编辑器可以**逐格**指定（`setCellRenders()` 的
 * `render` / `renderEditor` / `cellType`），列上配的只是兜底。所以 A~E 五列的列定义里
 * **只有 key / title / width，一个渲染字段都没有**；每一格长什么样、点开是什么控件，
 * 全由那一格自己的配置决定。
 *
 * 分配规则是 `kinds[(行号 + 列号) % 22]` —— 往下走每格都换、往右走也每格都换，于是
 * 屏幕上是一条斜向的花纹，一眼就能看出「同一列的格子彼此无关」。
 *
 * **22 种逐格配置覆盖了全部 18 个内置单元格组件**（`VtSelect` 出现两次：单值胶囊与多值
 * 胶囊）**+ 3 个核心内容类型**（`cellType: 'option' / 'image' / 'checkbox'`）。两条来源摆在
 * 一起，好看出「组件」与「内容类型」是不同的东西：前者连编辑器一起给，后者只管画。
 * 全程没有一行自己拼的 HTML。
 *
 * 三个实现上的关键点：
 *
 * 1. **配置与值必须配对**。一格装 `VtDatePicker`，那一格的值就得是 `'YYYY-MM-DD'`；装
 *    `VtDateRangePicker` 就得是 `['YYYY-MM-DD', 'YYYY-MM-DD']`；装 `cellType: 'option'` 就得
 *    自己带 `{ label, color }`（内容类型只按值画，没有列上的字典可查）。所以 `CellKind` 把
 *    「配置」和「造一个形状匹配的值」绑在同一个对象里 —— 分开写的话，加一种 kind 必然漏一半。
 * 2. **配置对象可以共享**。`asCell()` 的产物里没有任何行状态（组件写回走 `ctx.column.key`，
 *    从不读 `opts.key`），所以 2.5 万个格子共用 22 个配置对象，不是造 2.5 万份。
 * 3. **`asCell()` 整对写入 `render` + `renderEditor`**。逐格手写配置最容易只给 `render`，
 *    配出「展示是进度条、点开却是列上的下拉」；走工厂就不可能配错。列专属选项
 *    （`key` / `width` / `sortable` …）在类型上被拒 —— 真正的列键来自 `setCellRender` 的 `colKey`。
 *
 * 最后一列「状态（列级兜底）」是**粒度优先**的对照：列上配了 `VtTag`，但 3n+1 行的
 * `cellType: 'option'` 与 4n+2 行的 `asCell(VtSelect)` 仍然抢得过它。3n+1 行显示的是原始值
 * `active` 而不是「活跃」—— `cellType` 只按内容类型画，拿不到列上那份字典，抢过去之后内容
 * 就得自己带。这正是当初「配了 `cellType` 却毫无反应」那个坑的反面。
 */

/* ==========================================================================
 * 1. 候选集与字典
 * ========================================================================== */

/** 配色走 `variant` 语义色而不是写死 hex：胶囊底色由 CSS `color-mix` 派生，跟随主题 */
const STATUS: VtSelectOption[] = [
  { value: 'active', label: '活跃', variant: 'success' },
  { value: 'inactive', label: '停用', variant: 'danger' },
  { value: 'pending', label: '待审', variant: 'warning' },
];

const SKILLS: VtSelectOption[] = [
  { value: 'ts', label: 'TypeScript', variant: 'primary' },
  { value: 'vue', label: 'Vue', variant: 'success' },
  { value: 'react', label: 'React', variant: 'primary' },
  { value: 'node', label: 'Node', variant: 'success' },
  { value: 'css', label: 'CSS', variant: 'warning' },
];

/** 「锁」胶囊：只用在勾选列被穿透的那几格 */
const LOCK: VtSelectOption[] = [{ value: 'lock', label: '锁', variant: 'danger' }];

const OWNERS: VtPersonOption[] = [
  { value: 'u1', label: '李炎杰', desc: '研发中心 / 前端', email: 'liyanjie@example.com' },
  { value: 'u2', label: '余兴达', desc: '研发中心 / 后端', email: 'yuxingda@example.com' },
  { value: 'u3', label: '马小波', desc: '算法中心', email: 'maxiaobo@example.com' },
  { value: 'u4', label: '罗小龙', desc: '产品部', email: 'luoxiaolong@example.com' },
  { value: 'u5', label: '曾伟杰', desc: '设计中心', email: 'zengweijie@example.com' },
  { value: 'u6', label: '万明悦', desc: '客户成功部', email: 'wanmingyue@example.com' },
];

const REGIONS: VtCascaderOption[] = [
  {
    value: 'zj', label: '浙江',
    children: [
      { value: 'hz', label: '杭州', children: [{ value: 'xh', label: '西湖区' }, { value: 'bj', label: '滨江区' }] },
      { value: 'nb', label: '宁波', children: [{ value: 'yz', label: '鄞州区' }] },
    ],
  },
  {
    value: 'js', label: '江苏',
    children: [
      { value: 'nj', label: '南京', children: [{ value: 'gl', label: '鼓楼区' }, { value: 'jn', label: '江宁区' }] },
      { value: 'sz', label: '苏州', children: [{ value: 'gyq', label: '工业园区' }] },
    ],
  },
  {
    value: 'gd', label: '广东',
    children: [
      { value: 'sz2', label: '深圳', children: [{ value: 'ns', label: '南山区' }, { value: 'ft', label: '福田区' }] },
      { value: 'gz', label: '广州', children: [{ value: 'th', label: '天河区' }] },
    ],
  },
];

/** 叶子路径（`VtCascader` 默认 `valueType: 'path'`，行里存的就是整条路径） */
const REGION_PATHS: string[][] = REGIONS.flatMap((p) =>
  (p.children ?? []).flatMap((c) =>
    (c.children ?? []).map((d) => [String(p.value), String(c.value), String(d.value)]),
  ),
);

const CITIES = ['杭州', '宁波', '南京', '苏州', '深圳', '广州', '成都', '西安', '武汉', '厦门'];
const NAMES = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
const PINYIN = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'qianqi', 'sunba', 'zhoujiu', 'wushi'];
const ENUM_COLORS = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#0891b2'];

/* ==========================================================================
 * 2. 日期与头像工具：全程本地构造 + 手拼格式化
 * ========================================================================== */

/**
 * 不用 `toISOString()`：那是按 UTC 输出的，东八区一夹就退一天（这个 demo 早年正是
 * 这么错的，见 AGENTS.md §7.14 那条）。基准日写死，截图与文档里的日期才稳定。
 */
const BASE = new Date(2026, 7, 17); // 2026-08-17
const pad = (n: number): string => String(n).padStart(2, '0');
const dayStr = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n: number): Date =>
  new Date(BASE.getFullYear(), BASE.getMonth(), BASE.getDate() + n);

/** 生成一个纯色方块当头像（避免 demo 依赖外部图片） */
function avatarUrl(i: number): string {
  const hue = (i * 47) % 360;
  return (
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">` +
        `<rect width="48" height="48" rx="8" fill="hsl(${hue} 62% 55%)"/></svg>`,
    )
  );
}

/* ==========================================================================
 * 3. 逐格配置池
 * ========================================================================== */

interface CellKind {
  /** 状态栏与表头说明里用的名字 */
  name: string;
  /**
   * 这一格的配置。**不含行状态**，所以所有用到这种 kind 的格子共享同一个对象。
   */
  config: CellRenderConfig<any>;
  /** 造一个形状匹配的值 —— 与 `config` 绑在一起，加 kind 时不会漏掉另一半 */
  value: (i: number) => unknown;
}

/**
 * 22 种逐格配置：18 个内置单元格组件（`VtSelect` 单值 / 多值各算一种）+ 3 个内容类型。
 *
 * 顺序刻意让相邻两种「不像」（文本 → 数字 → 胶囊 → 进度条 …），斜向花纹里每一步的变化
 * 才看得见；这个顺序同时决定了同一列往下走的循环节（22 行一轮）。
 *
 * 做成函数而不是模块级常量，只为了 `VtActions` 的回调能拿到 `note()` —— 换成模块级可变
 * 引用也行，但那是给 22 次便宜的工厂调用省成本，不值得多一处可变状态。
 */
function buildKinds(note: (text: string) => void, redraw: () => void): CellKind[] {
  return [
    {
      name: 'VtInput 单行文本',
      config: asCell(VtInput, { maxLength: 24 }),
      value: (i) => `文本 ${i}`,
    },
    {
      name: 'VtNumberInput 数字（带 validator）',
      config: asCell(VtNumberInput, {
        min: 0,
        max: 100,
        // validator 是 asCell 唯一放行的列属性（组件自己读它），单元格级照样生效
        validator: (v) => {
          const n = Number(v);
          return n >= 0 && n <= 100 ? true : '需在 0 ~ 100';
        },
      }),
      value: (i) => (i * 37) % 101,
    },
    {
      name: 'VtTag 只读胶囊',
      config: asCell(VtTag, { options: STATUS }),
      value: (i) => STATUS[i % STATUS.length]!.value,
    },
    {
      name: 'VtProgress 进度条',
      config: asCell(VtProgress, {
        max: 100,
        thresholds: [
          { lte: 50, variant: 'danger' },
          { lte: 80, variant: 'warning' },
          { lte: 100, variant: 'success' },
        ],
      }),
      value: (i) => (i * 7) % 101,
    },
    {
      name: 'VtPerson 人员（选人面板 + 悬停名片）',
      config: asCell(VtPerson, { options: OWNERS, searchable: true }),
      value: (i) => OWNERS[i % OWNERS.length]!.value,
    },
    {
      name: "VtSelect 单值胶囊（display: 'tag'）",
      config: asCell(VtSelect, { options: STATUS, display: 'tag' }),
      value: (i) => STATUS[(i + 1) % STATUS.length]!.value,
    },
    {
      name: 'VtRate 星级（半星）',
      config: asCell(VtRate, { allowHalf: true, showText: true }),
      value: (i) => ((i % 9) + 1) / 2,
    },
    {
      name: 'VtDatePicker 日期（自绘面板）',
      config: asCell(VtDatePicker, {}),
      value: (i) => dayStr(addDays(((i * 37) % 120) - 30)),
    },
    {
      name: 'VtSelect 多值胶囊（multiple，超过 3 枚折叠成 +N）',
      /*
       * 这里给不了 `maxCount` —— `VtSelectOptions` 是按 `display` 拆的判别联合，而
       * `CellOnlyOptions` 的 `Omit<A | B, K>` 只保留**两支共有**的键，胶囊专属的
       * `maxCount` / `variant` / `color` 因此在单元格级不可传（列级照常可以）。
       * 折叠阈值用默认的 3，所以值给到 4 枚就能看见 `+1`。
       */
      config: asCell(VtSelect, { options: SKILLS, multiple: true, display: 'tag' }),
      value: (i) =>
        [
          SKILLS[i % SKILLS.length]!.value,
          SKILLS[(i + 1) % SKILLS.length]!.value,
          SKILLS[(i + 2) % SKILLS.length]!.value,
          SKILLS[(i + 3) % SKILLS.length]!.value,
        ].slice(0, 1 + (i % 4)),
    },
    {
      name: 'VtSwitch 开关（点一下就切，不进编辑态）',
      config: asCell(VtSwitch, { activeText: '开', inactiveText: '关' }),
      value: (i) => i % 2 === 0,
    },
    {
      name: 'VtCascader 级联（值存整条路径）',
      config: asCell(VtCascader, { options: REGIONS }),
      value: (i) => REGION_PATHS[i % REGION_PATHS.length],
    },
    {
      name: "cellType: 'option'（内容类型，值自己带 label + color）",
      config: { cellType: 'option' },
      value: (i) => ({ label: `枚举 ${i % 5}`, color: ENUM_COLORS[i % ENUM_COLORS.length] }),
    },
    {
      name: 'VtTextarea 多行文本（编辑框随内容长高）',
      config: asCell(VtTextarea, { maxRows: 6 }),
      value: (i) =>
        `备注 ${i}：${NAMES[i % NAMES.length]}负责的第 ${1 + (i % 9)} 期，验收前需补齐监控与文档。`,
    },
    {
      name: 'VtTimePicker 时间',
      config: asCell(VtTimePicker, {}),
      value: (i) => `${pad(8 + (i % 3))}:${pad((i * 7) % 60)}`,
    },
    {
      name: 'VtCheckbox 布尔（点一下就切）',
      config: asCell(VtCheckbox, {}),
      value: (i) => i % 3 === 0,
    },
    {
      name: 'VtDateRangePicker 日期区间（自绘双月）',
      config: asCell(VtDateRangePicker, {}),
      value: (i) => {
        const start = (i * 13) % 60;
        return [dayStr(addDays(start)), dayStr(addDays(start + 5 + (i % 20)))];
      },
    },
    {
      name: "cellType: 'image'（内容类型）",
      config: { cellType: 'image' },
      value: (i) => avatarUrl(i),
    },
    {
      /*
       * 与上一种刻意挨着放：同一份 URL，`cellType: 'image'` 是**同步**画一张 `<img>`，
       * `VtImage` 是**异步排期 + 多图折叠 + 点开查看器**。两者摆在一起才看得出分工。
       */
      name: 'VtImage 图片（异步取图 + 点开查看器）',
      config: asCell(VtImage, { maxCount: 2 }),
      value: (i) => [avatarUrl(i), avatarUrl(i + 1), avatarUrl(i + 2), avatarUrl(i + 3)],
    },
    {
      name: 'VtAutocomplete 输入建议',
      config: asCell(VtAutocomplete, {
        // 同步源，所以防抖给 0；过滤规则由使用方定（组件不猜前缀还是模糊）
        fetchSuggestions: (query: string) =>
          CITIES.filter((c) => c.includes(query)).map((c) => ({ value: c, label: c })),
        debounce: 0,
      }),
      value: (i) => CITIES[i % CITIES.length],
    },
    {
      name: "cellType: 'checkbox'（只读回显，对照上面可点的 VtCheckbox）",
      config: { cellType: 'checkbox' },
      value: (i) => i % 4 === 0,
    },
    {
      name: "VtLink 链接（protocol: 'mailto'）",
      config: asCell(VtLink, { protocol: 'mailto' }),
      value: (i) => `${PINYIN[i % PINYIN.length]}${pad(i % 100)}@example.com`,
    },
    {
      name: 'VtActions 行内按钮（带二次确认）',
      // 用实例化表达式把行类型传给工厂，`onClick` 的 `row` 才有类型（见 shared.ts 的 asCell 注释）
      config: asCell(VtActions<Record<string, unknown>>, {
        items: [
          {
            text: '标记',
            onClick: (row: Record<string, unknown>) => note(`已标记第 ${row.id} 行`),
          },
          {
            text: '清空',
            variant: 'danger',
            confirm: '这一格的值会被清掉，确定？',
            onClick: (row: Record<string, unknown>) => {
              // VtActions 不认识「当前列」（它是一整格的按钮组），所以清的是行上的 flag 字段
              row.flag = '';
              redraw();
              note(`已清空第 ${row.id} 行的 flag`);
            },
          },
        ],
      }),
      // VtActions 不读单元格值 —— 这里给个 flag，好让上面「清空」有东西可清
      value: () => 'flag',
    },
  ];
}

/** 逐格渲染的那几列。列定义里**没有任何渲染字段** —— 每一格自己说自己长什么样 */
const CELL_COLS = ['a', 'b', 'c', 'd', 'e'] as const;

/* ==========================================================================
 * 4. demo
 * ========================================================================== */

const ROW_COUNT = 5000;

export function bootstrapTableCellTypeRender(root: HTMLElement): () => void {
  let tableRef: VirtTable<any> | null = null;

  root.innerHTML = `
  <div class="virt-table-controls">
    <button class="virt-table-btn virt-table-btn-primary" id="btnTop">滚动到顶部</button>
    <button class="virt-table-btn virt-table-btn-primary" id="btnBottom">滚动到底部</button>
    <button class="virt-table-btn virt-table-btn-warning" id="btnRandom">随机滚动</button>
    <button class="virt-table-btn" id="btnWhat">看第 0 / 1 行各是什么</button>
  </div>
  <div id="status" class="status-text"></div>
  <div id="note" class="status-text"></div>
  <div style="width:1040px;height:600px;" class="demo-container" id="virtTableContainer"></div>
`;

  const container = root.querySelector('#virtTableContainer') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;
  const noteEl = root.querySelector('#note') as HTMLElement;

  const note = (text: string) => {
    noteEl.innerHTML = text;
  };

  const kinds = buildKinds(note, () => tableRef?.forceUpdate());
  /** 这一格用第几种 kind：行号 + 列号，于是往下、往右都不重复 */
  const kindOf = (rowIndex: number, colIndex: number): number => (rowIndex + colIndex) % kinds.length;

  /**
   * 数据全是确定式的（没有 `Math.random()`）：同一格每次打开都是同一种 kind、同一个值，
   * 文档里说「第 0 行 A 列是 VtInput」才对得上。
   */
  const list = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, unknown> = {
      id: i,
      // `type: 'checkbox'` 功能列自己不读行值，这个字段留给被穿透的那几格
      sel: i % 7 === 0 ? 'lock' : '',
      // 最后一列有列级兜底（VtTag），所以它的值是普通枚举标量
      fallback: STATUS[i % STATUS.length]!.value,
      flag: 'flag',
    };
    /*
     * 每一格的值形状由它自己的 kind 决定 —— 装 `VtDatePicker` 的格子存 `'YYYY-MM-DD'`、
     * 装 `VtDateRangePicker` 的存 `['YYYY-MM-DD', 'YYYY-MM-DD']`、装 `VtSwitch` 的存布尔。
     * 这就是「一列里混着各种类型」的真实形态（电子表格案例里的 `_sheetCells` 同理）。
     */
    CELL_COLS.forEach((key, c) => {
      row[key] = kinds[kindOf(i, c)]!.value(i);
    });
    return row;
  });

  type Row = (typeof list)[number];

  const columns: VirtTableColumn<Row>[] = [
    { key: 'sel', title: '', width: 56, type: 'checkbox' },
    // A~E：列上只有 key / title / width，渲染完全由单元格级决定
    ...CELL_COLS.map((key, c) => ({
      key,
      title: `${key.toUpperCase()} · 逐格不同（起始 #${c}）`,
      width: 196,
    })),
    // 唯一一列有列级兜底的：拿来对照「粒度更细者胜」。钉在右边，横滚时始终看得见
    VtTag<Row>({
      key: 'fallback',
      title: '状态（列级兜底）',
      width: 150,
      fixed: 'right',
      options: STATUS,
    }),
  ];

  /**
   * 逐格登记。`setCellRenders()` 一次写完只刷新一次（逐个 `setCellRender` 会每次重绘）。
   *
   * 配置存在表格实例里，不进数据 —— 老写法是往每行挂 `_cellRenders`（仍然兼容），但那会
   * 让函数进到数据对象里，`JSON.stringify` / 深拷贝 / diff 都会被污染，React / Vue 端也拿
   * 不到 VNode 包装。
   */
  const cellRenderEntries: Array<{
    rowKey: string;
    colKey: string;
    config: CellRenderConfig<Row>;
  }> = [];

  for (let i = 0; i < ROW_COUNT; i++) {
    const rowKey = String(i);

    CELL_COLS.forEach((colKey, c) => {
      cellRenderEntries.push({ rowKey, colKey, config: kinds[kindOf(i, c)]!.config });
    });

    /*
     * 最后一列的优先级对照。两个分支互斥（`else if`）—— 同一格登记两次的话后写的静默
     * 盖掉前写的，就说不清是哪条生效了。
     */
    if (i % 3 === 1) {
      cellRenderEntries.push({ rowKey, colKey: 'fallback', config: { cellType: 'option' } });
    } else if (i % 4 === 2) {
      cellRenderEntries.push({
        rowKey, colKey: 'fallback',
        config: asCell(VtSelect, { options: STATUS, display: 'tag' }),
      });
    }

    /**
     * **穿透功能列**：勾选列里这一行不给勾选框，改画一枚「锁」胶囊（值取行上的 `sel`）。
     * 列级做不到（会被忽略并告警）—— 这是「就这一行不一样」唯一的官方出口。
     * ⚠️ 只改 UI 不改选择态：表头全选照样会选中这些行。
     */
    if (i % 7 === 0) {
      cellRenderEntries.push({ rowKey, colKey: 'sel', config: asCell(VtTag, { options: LOCK }) });
    }
  }

  statusEl.innerHTML =
    `${ROW_COUNT} 行 × ${columns.length} 列 · <b>${cellRenderEntries.length.toLocaleString('en-US')} 条逐格配置</b>` +
    `（<code>setCellRenders()</code>）。A~E 五列的<b>列定义里没有任何渲染字段</b>：每一格的内容与编辑器都由` +
    `它自己的配置决定，规则是 <code>kinds[(行号 + 列号) % ${kinds.length}]</code> —— 往下走每格都换，往右走也每格都换。` +
    `${kinds.length} 种 kind <b>覆盖全部 18 个内置单元格组件</b>（VtSelect 单值/多值各一种）<b>+ 3 个内容类型</b>` +
    `（<code>cellType: 'option' / 'image' / 'checkbox'</code>），没有一行自己拼的 HTML。` +
    `配置与值是配对的（装 <code>VtDateRangePicker</code> 的格子存 <code>['YYYY-MM-DD', …]</code>），而配置对象被` +
    `所有同类格子共享 —— <code>asCell()</code> 的产物里没有行状态。` +
    `最后一列是<b>粒度优先</b>的对照：列上配了 <code>VtTag</code>，但 3n+1 行的 <code>cellType</code> 与 4n+2 行的` +
    ` <code>VtSelect</code> 仍然抢得过它（前者只按内容类型画、拿不到列上的字典，所以显示原始值 <code>active</code>）。` +
    `勾选列 7n 行<b>穿透功能列</b>画成「锁」胶囊。`;

  const table = new VirtTable<Row>(container, {
    plugins: [vtCellEditor()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    // 横向也虚拟化，给一点列缓冲，横滚时右侧不空一格
    colBuffer: 2,
    border: true,
    textOverflow: 'ellipsis',
  });
  tableRef = table;

  table.setCellRenders(cellRenderEntries);

  const describe = (rowIndex: number): string =>
    `第 ${rowIndex} 行：` +
    CELL_COLS.map((k, c) => `${k.toUpperCase()} = ${kinds[kindOf(rowIndex, c)]!.name}`).join('；');

  const listeners: (() => void)[] = [];
  const on = (id: string, handler: () => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnTop', () => table.scrollToTop());
  on('btnBottom', () => table.scrollToBottom());
  on('btnRandom', () => {
    const idx = Math.floor(Math.random() * ROW_COUNT);
    table.scrollToIndex(idx);
    note(describe(idx));
  });
  on('btnWhat', () => note(`${describe(0)}<br>${describe(1)}`));

  note(describe(0));

  return () => {
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
