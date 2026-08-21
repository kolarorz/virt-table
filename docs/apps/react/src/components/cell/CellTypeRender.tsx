import React from 'react';
import { VirtTableReact, type ReactCellRenderConfig, type ReactTableColumn, type VirtTableRef,
  vtCellEditor,
} from '@virt-table/react';
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
 * 单元格独立渲染（React）—— **同一列里每一格都不一样**。
 *
 * 内容与编辑器逐格指定（`ref.setCellRenders()`），列上配的只是兜底：A~E 五列的列定义里
 * **只有 key / title / width，一个渲染字段都没有**。分配规则 `kinds[(行号 + 列号) % 22]`，
 * 往下走每格都换、往右走也每格都换。
 *
 * 22 种逐格配置覆盖全部 18 个内置单元格组件（`VtSelect` 单值 / 多值各算一种）+ 3 个核心
 * 内容类型（`cellType: 'option' / 'image' / 'checkbox'`）。组件从
 * `@virt-table/vanilla/components` 引入 —— 框架无关的列工厂，React 端直接用。全程没有一行
 * 自己拼的 HTML / JSX（需要时 `render` 照样可以返回 JSX，适配层负责挂载与回收）。
 *
 * 关键点与 vanilla 版逐条对齐：配置与值必须配对（装 `VtDateRangePicker` 的格子存
 * `['YYYY-MM-DD', 'YYYY-MM-DD']`）、配置对象无行状态所以可共享、`asCell()` 整对写入
 * `render` + `renderEditor`。最后一列是**粒度优先**的对照。
 */

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

/** 叶子路径（`VtCascader` 默认 `valueType: 'path'`，行里存整条路径） */
const REGION_PATHS: string[][] = REGIONS.flatMap((p) =>
  (p.children ?? []).flatMap((c) =>
    (c.children ?? []).map((d) => [String(p.value), String(c.value), String(d.value)]),
  ),
);

const CITIES = ['杭州', '宁波', '南京', '苏州', '深圳', '广州', '成都', '西安', '武汉', '厦门'];
const NAMES = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
const PINYIN = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'qianqi', 'sunba', 'zhoujiu', 'wushi'];
const ENUM_COLORS = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#0891b2'];

/** 日期全程本地构造 + 手拼格式化：`toISOString()` 按 UTC 输出，东八区一夹就退一天 */
const BASE = new Date(2026, 7, 17); // 2026-08-17
const pad = (n: number) => String(n).padStart(2, '0');
const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n: number) => new Date(BASE.getFullYear(), BASE.getMonth(), BASE.getDate() + n);

/** 生成一个纯色方块当头像（避免 demo 依赖外部图片） */
function avatarUrl(i: number) {
  const hue = (i * 47) % 360;
  return (
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">` +
        `<rect width="48" height="48" rx="8" fill="hsl(${hue} 62% 55%)"/></svg>`,
    )
  );
}

interface CellKind {
  /** 状态栏里用的名字 */
  name: string;
  /** 这一格的配置。**不含行状态**，所以所有同类格子共享同一个对象 */
  config: ReactCellRenderConfig;
  /** 造一个形状匹配的值 —— 与 `config` 绑在一起，加 kind 时不会漏掉另一半 */
  value: (i: number) => unknown;
}

/** 逐格渲染的那几列。列定义里**没有任何渲染字段** */
const CELL_COLS = ['a', 'b', 'c', 'd', 'e'] as const;
const ROW_COUNT = 5000;

/**
 * 22 种逐格配置。做成函数只为了 `VtActions` 的回调能拿到 `note` / `redraw`。
 */
function buildKinds(note: (text: string) => void, redraw: () => void): CellKind[] {
  return [
    { name: 'VtInput 单行文本', config: asCell(VtInput, { maxLength: 24 }), value: (i) => `文本 ${i}` },
    {
      name: 'VtNumberInput 数字（带 validator）',
      config: asCell(VtNumberInput, {
        min: 0, max: 100,
        // validator 是 asCell 唯一放行的列属性（组件自己读它），单元格级照样生效
        validator: (v) => {
          const n = Number(v);
          return n >= 0 && n <= 100 ? true : '需在 0 ~ 100';
        },
      }),
      value: (i) => (i * 37) % 101,
    },
    { name: 'VtTag 只读胶囊', config: asCell(VtTag, { options: STATUS }), value: (i) => STATUS[i % STATUS.length]!.value },
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
       * 这里给不了 `maxCount`：`VtSelectOptions` 是按 `display` 拆的判别联合，而
       * `CellOnlyOptions` 的 `Omit<A | B, K>` 只保留两支**共有**的键，胶囊专属的
       * `maxCount` / `variant` / `color` 在单元格级不可传（列级照常可以）。
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
      value: (i) => `备注 ${i}：${NAMES[i % NAMES.length]}负责的第 ${1 + (i % 9)} 期，验收前需补齐监控与文档。`,
    },
    { name: 'VtTimePicker 时间', config: asCell(VtTimePicker, {}), value: (i) => `${pad(8 + (i % 3))}:${pad((i * 7) % 60)}` },
    { name: 'VtCheckbox 布尔（点一下就切）', config: asCell(VtCheckbox, {}), value: (i) => i % 3 === 0 },
    {
      name: 'VtDateRangePicker 日期区间（自绘双月）',
      config: asCell(VtDateRangePicker, {}),
      value: (i) => {
        const start = (i * 13) % 60;
        return [dayStr(addDays(start)), dayStr(addDays(start + 5 + (i % 20)))];
      },
    },
    { name: "cellType: 'image'（内容类型）", config: { cellType: 'image' }, value: (i) => avatarUrl(i) },
    {
      /*
       * 与上一种刻意挨着放：同一份 URL，`cellType: 'image'` 是**同步**画一张 `<img>`，
       * `VtImage` 是**异步排期 + 多图折叠 + 点开查看器**。两者摆在一起才看得出分工。
       */
      name: 'VtImage 图片（异步取图 + 点开查看器）',
      config: asCell(VtImage, { maxCount: 2 }),
      value: (i: number) => [avatarUrl(i), avatarUrl(i + 1), avatarUrl(i + 2), avatarUrl(i + 3)],
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
          { text: '标记', onClick: (row: Record<string, unknown>) => note(`已标记第 ${row.id} 行`) },
          {
            text: '清空', variant: 'danger',
            confirm: '这一格的值会被清掉，确定？',
            onClick: (row: Record<string, unknown>) => {
              // VtActions 是一整格的按钮组，不认识「当前列」，所以清的是行上的 flag 字段
              row.flag = '';
              redraw();
              note(`已清空第 ${row.id} 行的 flag`);
            },
          },
        ],
      }),
      // VtActions 不读单元格值 —— 给个 flag，好让上面「清空」有东西可清
      value: () => 'flag',
    },
  ];
}

export default function CellTypeRenderTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [note, setNote] = React.useState('');

  const kinds = React.useMemo(
    () => buildKinds(setNote, () => tableRef.current?.forceUpdate()),
    [],
  );
  /** 这一格用第几种 kind：行号 + 列号，于是往下、往右都不重复 */
  const kindOf = React.useCallback(
    (rowIndex: number, colIndex: number) => (rowIndex + colIndex) % kinds.length,
    [kinds],
  );

  /** 数据全是确定式的（没有 `Math.random()`）：同一格每次打开都是同一种 kind、同一个值 */
  const list = React.useMemo(
    () =>
      Array.from({ length: ROW_COUNT }, (_, i) => {
        const row: Record<string, unknown> = {
          id: i,
          // `type: 'checkbox'` 功能列自己不读行值，这个字段留给被穿透的那几格
          sel: i % 7 === 0 ? 'lock' : '',
          // 最后一列有列级兜底（VtTag），所以它的值是普通枚举标量
          fallback: STATUS[i % STATUS.length]!.value,
          flag: 'flag',
        };
        // 每一格的值形状由它自己的 kind 决定
        CELL_COLS.forEach((key, c) => {
          row[key] = kinds[kindOf(i, c)]!.value(i);
        });
        return row;
      }),
    [kinds, kindOf],
  );

  const columns = React.useMemo<ReactTableColumn[]>(
    () => [
      { key: 'sel', title: '', width: 56, type: 'checkbox' },
      ...CELL_COLS.map((key, c) => ({
        key,
        title: `${key.toUpperCase()} · 逐格不同（起始 #${c}）`,
        width: 196,
      })),
      // 唯一一列有列级兜底的：拿来对照「粒度更细者胜」。钉在右边，横滚时始终看得见
      VtTag({ key: 'fallback', title: '状态（列级兜底）', width: 150, fixed: 'right', options: STATUS }),
    ],
    [],
  );

  const cellRenderEntries = React.useMemo(() => {
    const entries: Array<{ rowKey: string; colKey: string; config: ReactCellRenderConfig }> = [];
    for (let i = 0; i < ROW_COUNT; i++) {
      const rowKey = String(i);
      CELL_COLS.forEach((colKey, c) => {
        entries.push({ rowKey, colKey, config: kinds[kindOf(i, c)]!.config });
      });
      // 最后一列的优先级对照。两个分支互斥：同一格登记两次的话后写的会静默盖掉前写的
      if (i % 3 === 1) {
        entries.push({ rowKey, colKey: 'fallback', config: { cellType: 'option' } });
      } else if (i % 4 === 2) {
        entries.push({
          rowKey, colKey: 'fallback',
          config: asCell(VtSelect, { options: STATUS, display: 'tag' }),
        });
      }
      /**
       * **穿透功能列**：勾选列里这一行不给勾选框，改画一枚「锁」胶囊（值取行上的 `sel`）。
       * ⚠️ 只改 UI 不改选择态：表头全选照样会选中这些行。
       */
      if (i % 7 === 0) {
        entries.push({ rowKey, colKey: 'sel', config: asCell(VtTag, { options: LOCK }) });
      }
    }
    return entries;
  }, [kinds, kindOf]);

  // 一次登记，整批只刷新一次（逐个 setCellRender 会每次重绘）
  React.useEffect(() => {
    tableRef.current?.setCellRenders(cellRenderEntries);
  }, [cellRenderEntries]);

  const describe = (rowIndex: number) =>
    `第 ${rowIndex} 行：` +
    CELL_COLS.map((k, c) => `${k.toUpperCase()} = ${kinds[kindOf(rowIndex, c)]!.name}`).join('；');

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 每行每列不同渲染</h3>
      <div className="virt-table-controls">
        <button type="button" onClick={() => tableRef.current?.scrollToTop()}>滚动到顶部</button>
        <button type="button" onClick={() => tableRef.current?.scrollToBottom()}>滚动到底部</button>
        <button
          type="button"
          onClick={() => {
            const idx = Math.floor(Math.random() * ROW_COUNT);
            tableRef.current?.scrollToIndex(idx);
            setNote(describe(idx));
          }}
        >
          随机滚动
        </button>
        <button type="button" onClick={() => setNote(`${describe(0)}｜${describe(1)}`)}>
          看第 0 / 1 行各是什么
        </button>
      </div>
      <div className="status-text">
        {ROW_COUNT} 行 × {columns.length} 列 · <b>{cellRenderEntries.length.toLocaleString('en-US')} 条逐格配置</b>
        （setCellRenders）。A~E 五列的<b>列定义里没有任何渲染字段</b>：每一格的内容与编辑器都由它自己的配置决定，
        规则是 kinds[(行号 + 列号) % {kinds.length}] —— 往下走每格都换，往右走也每格都换。
        {kinds.length} 种 kind <b>覆盖全部 18 个内置单元格组件</b>（VtSelect 单值/多值各一种）
        <b> + 3 个内容类型</b>（cellType: 'option' / 'image' / 'checkbox'），没有一行自己拼的 HTML。
        最后一列是<b>粒度优先</b>的对照：列上配了 VtTag，但 3n+1 行的 cellType 与 4n+2 行的 VtSelect 仍然抢得过它
        （前者只按内容类型画、拿不到列上的字典，所以显示原始值 active）。勾选列 7n 行<b>穿透功能列</b>画成「锁」胶囊。
      </div>
      <div className="status-text">{note || describe(0)}</div>
      <div style={{ width: 1040, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            plugins: [vtCellEditor()],
            estimatedSize: 40,
            buffer: 4,
            colBuffer: 2,
            border: true,
            textOverflow: 'ellipsis',
          }}
        />
      </div>
    </div>
  );
}
