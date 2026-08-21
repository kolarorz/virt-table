<script setup lang="ts">
/**
 * 首页「合并单元格 × 行列双向虚拟化」专区里的真实表格。
 *
 * 存在的理由：首页原先只**讲**了「合并段只存段起点，不展开」（机制卡片第 4 条、
 * 指标卡「滚到 9.3 万行长段中间仍是 25」），却从没**演**过 —— hero 那张表的两列
 * `mergeKey` 段长分别是 4 行与 19 行，前者根本不超视口（永远不触发重锚），后者在
 * 第 12 列、620px 宽的卡片里露不出来。这里把三种合并形态一次演全：
 *
 *   纵向长段  `mergeKey` 2 万行 / 2 千行 / 8 行三档同时在场
 *   跨列合并  静态 `merges` 每 20 行一条「小节汇总」带，横跨「本次运行」整组 4 列
 *   多级表头  列树 `children` 产出的分组表头 + 分组表尾
 *
 * ---- 装载与生命周期（照 HomeLiveTable.vue，全是硬约束不是风格偏好）----
 *
 * 1. **必须客户端才建表**：VitePress 构建期会 SSR 这个组件，而 VirtTable 在构造函数里
 *    就建 DOM，所以实现与 CSS 都走动态 import。
 * 2. **CSS 不能进全站包**：动态 import 让 core.css 成为异步 chunk。
 * 3. **首页正文不能带 `.vp-doc`**：`.vp-doc table`(0,1,1) 会压过 `.vt-table`(0,1,0)。
 *    index.md 用 `markdownStyles: false` 绕开 —— 改首页 frontmatter 前先读那条注释。
 * 4. **比 hero 多一步：表格本体也延后到首次进入视口才 `new`**。首页已经有一张 10 万行
 *    表，不能在首屏再叠一份 10 万行数组的构造与内存。
 *
 * ---- 三条决定了配置形状的核心机制（改这里前先读）----
 *
 * **① 多级表头只能用列树 `children`，不能用 `headerData` + `headerMerges`。**
 * 两条路径不同：`headerData` 走 `_buildTheadFlat`，doc comment 明写「整段渲染**不做**
 * 横向虚拟化」；列树走 `_buildTheadGrouped`，中间段按列窗口裁剪 + 留白，跨窗口边界的
 * 分组格裁到窗口内（`planHeaderRow`）。用 `headerData` 就演不出「表头也在横向虚拟化」。
 * 而且列树存在时 `headerData` / `headerMerges` 会被**忽略并告警**，两者互斥。
 * 附带避开一个坑：`headerMerges` 的 `colIndex` 走含固定列的 renderOrder，而表体 `merges`
 * 的 `colIndex` **只算中间段列**，两套坐标系混用极易错（guide/notes.md 只写了后者）。
 *
 * **② 静态 `merges` 的 rowspan 必须是 1。**
 * `_mergeRenderControl` 在 `_merges` 非空时会把渲染行区间撑到合并块的真实起点 ——
 * 实测 `rowspan=50000` 会 materialize 5 万个 `<tr>`，虚拟滚动当场失效（merge.ts 与
 * index.ts 里四处注释都记着这条）。`rowspan: 1` 则行区间完全不受影响，于是**横向的
 * 证明与纵向的证明互不干扰**：长段交给不扩张区间的 `mergeKey`，跨列交给静态 merges。
 *
 * **③ 汇总带的数量上限由 Σrowspan 决定，不由块数决定。**
 * `getMergeInfo` → `getRowMergeIndex` 是按**数组身份**缓存的 WeakMap，而
 * `_updateRenderMerges` 每帧都 `[...placeholders, ...merges, ...auto]` 拼新数组 ——
 * 每帧必然 miss，`buildRowMergeIndex` 全额重建，成本按**覆盖行数**算。
 * 本机实测（node，仅该函数）：500 条目 0.009ms · 2,000 条目 0.039ms ·
 * 4,000 条目 0.077ms · 8,000 条目 0.156ms · 16,667 条目 0.608ms。
 * 所以带取「每 20 行一条 × rowspan 1」= 5,000 条目 ≈ 0.1ms/帧。要更密就先量。
 *
 * ---- 一个刻意的取舍：本区不宣传排序 ----
 *
 * 掺入静态 `merges` 会**整表禁用排序**（`_toggleSort` 直接早退，表头也不加
 * `vt-th--sortable`）—— 合并按绝对行号，排序会错位。而 `mergeKey` 机制上永远出不了
 * colspan（`collectRuns` 硬写 `colspan: 1`），所以「长段 + 跨列」只能混搭静态 merges。
 * 「`mergeKey` 不禁用排序」这条卖点留在能力全景与示例页，本区文案不能顺嘴带上。
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';

/**
 * 与 estimatedSize 一致（fixedSize，全表恒定 40px）。
 *
 * 40 不是随手取的：它等于组件默认的 `line-height 21 + padding-y 9×2 + 下边框 1`
 * （index.css 里 `--vt-line-height` 那段注释有推导）。**改这个数治不了行高不符**——
 * 曾经把它调成 42 去迁就那条被 pill 撑高的汇总带，结果是账本比真实内容高 2px/行 ×
 * 其余 95,000 行 ≈ 19 万 px，滚到底时下方留出大片空白。行高不符只能回去修撑高的那个
 * 元素（见文件末尾 `.vth-mg-band`），不能改账本。
 */
const ROW_H = 40;
const ROW_COUNT = 100_000;

/** 「业务域」段长：远超视口，用来演重锚 + sticky 标签 */
const DOMAIN_RUN = 20_000;
/** 「区域」段长：同样超视口，但段边界更密，滚动中能看到段与段交替 */
const REGION_RUN = 2_000;
/** 「班组」段长：对照组，一屏内能看到完整合并块 */
const SQUAD_RUN = 8;

/**
 * 每 BAND_EVERY 行一条跨列汇总带。5,000 块 × rowspan 1 ≈ 0.1ms/帧（见头注 ③）。
 * 带落在 `rowIndex % BAND_EVERY === BAND_EVERY - 1`，与 `merges` 的绝对行号一致。
 */
const BAND_EVERY = 20;
/** 带的起始列（**中间段**列索引）与跨度：正好横跨「本次运行」这一组的 4 个叶子列 */
const BAND_COL = 3;
const BAND_SPAN = 4;
/** 左固定叶子列个数：中间段第 k 列 = 全量叶子列第 k + FIXED_LEAVES 列（scrollToCell 用） */
const FIXED_LEAVES = 2;

const hostRef = ref<HTMLElement | null>(null);
const ready = ref(false);
const playing = ref(false);

/** 自动滚动速度（px/ms）。比 hero 慢一档：这里要让人看清合并块，不是比谁快 */
const SCROLL_SPEED = 0.6;
/** HUD 结账周期 */
const SAMPLE_MS = 400;

/* HUD 读数 --------------------------------------------------------------- */
const fps = ref(0);
/** 合并段的**真实**跨度（行）：来自 getEffectiveMerges，不受渲染窗口影响 */
const realSpan = ref(0);
/** 同一批段在 DOM 里的 rowspan；合并列横滚出窗口时为 0（显示「—」） */
const domSpan = ref(0);
/** 常驻行 DOM 的实测上界（与 hero 的 HUD 语义一致，理由见 readPeak） */
const peakRows = ref(0);
/** 渲染中的单元格 td 数（不含横向留白格 .vt-cell-pad） */
const cellDom = ref(0);
/** 渲染中的合并块数（rowspan 或 colspan > 1 的 td） */
const mergeDom = ref(0);
const topRow = ref(1);
/** 叶子列数与总宽，建表后从实例问出来，不写死在文案里 */
const leafCount = ref(0);
const totalWidth = ref(0);
/** 中间段列总数（叶子列减去左固定列） */
const centerCols = ref(0);
/**
 * 当前行「中间段 colspan 合计」与其中的留白格数 —— 横向那半边的**真正证明**。
 *
 * 为什么用数字而不是靠画面：跨列合并的起始列滚出窗口时，格子的内容也随之移到屏外
 * （纵向那套 `.vt-merge-label` sticky 在横向没有对偶），画面上只是一个空的宽格子，
 * 看着像 bug 而不像本事。而这条恒等式在**任何**滚动位置都成立、且一眼能看懂：
 * 合计恒等于中间列总数，屏外的列被折叠进那 1~2 个留白格里。
 * 天真的实现（只渲染可见列、丢掉跨界的合并格）在这里必然对不上，行会相对表头错位。
 */
const colspanSum = ref(0);
const padCells = ref(0);

const table = shallowRef<any>(null);
let clientEl: HTMLElement | null = null;
let tbodyEl: HTMLElement | null = null;

let rafId = 0;
let io: IntersectionObserver | null = null;
let built = false;
/** 已排进空闲队列但还没开跑 —— 防止相交回调抖动时建出第二张表 */
let scheduled = false;
let lastTs = 0;
let frames = 0;
let windowStart = 0;

/* --------------------------------------------------------------------------
 * 数据
 *
 * 10 万行要在一帧里造完，所以**除了编号列，所有值都从池里按下标取引用** ——
 * 没有 per-cell 字符串拼接，也没有 Date 格式化。
 * -------------------------------------------------------------------------- */
const DOMAINS = ['交易履约', '风控合规', '增长实验', '供应链', '结算清分'];
const REGIONS = ['华东-1', '华北-2', '华南-3', 'ap-southeast', 'us-east', 'eu-west'];
const SQUADS = ['甲组', '乙组', '丙组', '丁组', '戊组', '己组', '庚组'];
const STAGES = ['抽取', '清洗', '关联', '聚合', '物化', '校验', '发布'];
/** 状态 / 优先级的字典（值 → 文案 + 配色），理由见 HomeLiveTable.vue 的同名注释 */
const STATUS = [
  { value: 'run', label: '运行中', color: '#10b981' },
  { value: 'queued', label: '排队', color: '#f59e0b' },
  { value: 'done', label: '已完成', color: '#2563eb' },
  { value: 'failed', label: '失败', color: '#ef4444' },
  { value: 'paused', label: '已暂停', color: '#8b5cf6' },
];
const PRIORITY = [
  { value: 'P0', label: 'P0', color: '#ef4444' },
  { value: 'P1', label: 'P1', color: '#f59e0b' },
  { value: 'P2', label: 'P2', color: '#2563eb' },
  { value: 'P3', label: 'P3', color: '#98a2b3' },
];
const OWNERS = ['陈昱', '林洛', '赵斯', '孙茗', '周砚', '吴桉', '郑玥', '钱屿'];
const WINDOWS = ['00:00–01:00', '02:30–03:15', '06:00–06:45', '11:20–12:00', '18:40–19:30'];
const NOTES = [
  '上游分区延迟，已自动重试 2 次并降级到小时级快照',
  '与 T-1 全量核对一致，差异行数 0',
  '目标表存在热点键，已切换为两阶段聚合',
  'schema 变更已灰度，下游三个消费者均已适配',
  '无异常',
];
const BYTES = ['12.4 MB', '38.1 MB', '104 MB', '512 MB', '1.2 GB', '3.6 GB'];
/** 240 个预生成时间串，行按下标取，避免 10 万次日期格式化 */
const TIMES = Array.from({ length: 240 }, (_, i) => {
  const h = String(i % 24).padStart(2, '0');
  const m = String((i * 7) % 60).padStart(2, '0');
  const d = String(((i * 3) % 28) + 1).padStart(2, '0');
  return `2026-08-${d} ${h}:${m}`;
});

function buildRows() {
  const rows = new Array(ROW_COUNT);
  for (let i = 0; i < ROW_COUNT; i++) {
    rows[i] = {
      id: i,
      code: 'RUN-' + (100000 + i),
      /**
       * 三列 `mergeKey` 的段长刻意差三个数量级（2 万 / 2 千 / 8），这样同一屏里
       * 能同时看到「被重锚的长段」与「完整的小段」。
       * 段值必须保证**相邻段不同值**，否则两段会粘成一段：这里 5 / 6 / 7 个候选值
       * 配上取模递增，相邻下标必然不同。
       */
      domain: DOMAINS[Math.floor(i / DOMAIN_RUN) % DOMAINS.length],
      region: REGIONS[Math.floor(i / REGION_RUN) % REGIONS.length],
      squad: SQUADS[Math.floor(i / SQUAD_RUN) % SQUADS.length],
      stage: STAGES[i % STAGES.length],
      status: STATUS[(i * 3) % STATUS.length].value,
      priority: PRIORITY[i % PRIORITY.length].value,
      progress: (i * 7) % 101,
      qps: 1200 + ((i * 37) % 8800),
      p95: 8 + ((i * 13) % 240),
      p99: 20 + ((i * 29) % 600),
      errRate: (i * 11) % 320,
      rowsIn: 10_000 + ((i * 977) % 900_000),
      rowsOut: 9_000 + ((i * 811) % 880_000),
      bytes: BYTES[i % BYTES.length],
      files: 1 + ((i * 7) % 64),
      sla: 90 + ((i * 3) % 10),
      retry: i % 5,
      lag: (i * 17) % 900,
      window: WINDOWS[i % WINDOWS.length],
      owner: OWNERS[i % OWNERS.length],
      updatedAt: TIMES[i % TIMES.length],
      version: 'v' + (1 + (i % 9)) + '.' + (i % 13),
      note: NOTES[i % NOTES.length],
    };
  }
  return rows;
}

/** 汇总带的行判定。与 `buildMerges()` 的绝对行号必须逐字一致 */
const isBandRow = (rowIndex: number) => rowIndex % BAND_EVERY === BAND_EVERY - 1;

/**
 * 跨列合并带。
 *
 * `colIndex` 是**中间段列**的索引（`_centerCols[colIndex]`），不含固定列 ——
 * 而且核心**不校验越界**：填超过中间列数不会有任何告警，只会拿到 undefined 列。
 * 所以 BAND_COL + BAND_SPAN 必须夹在中间列范围内（这里横跨「本次运行」整组）。
 */
function buildMerges() {
  const out: { rowIndex: number; colIndex: number; rowspan: number; colspan: number }[] = [];
  for (let r = BAND_EVERY - 1; r < ROW_COUNT; r += BAND_EVERY) {
    out.push({ rowIndex: r, colIndex: BAND_COL, rowspan: 1, colspan: BAND_SPAN });
  }
  return out;
}

/* --------------------------------------------------------------------------
 * 列树
 *
 * 分组节点 `width: 0`（宽度由叶子决定）；`fixed` 写在分组上会自动下发给所有子列。
 * 三列 `mergeKey` 全部落在中间段 —— 固定列不参与合并坐标系，配在那儿会告警并忽略。
 * -------------------------------------------------------------------------- */
/** 进度条列用内置组件；动态 import 来的，只能当参数传进来（见 hero 表的同名注释） */
type Comps = typeof import('@virt-table/vanilla/components');

function buildColumns({ VtProgress, VtPerson, VtTag }: Comps) {
  const num = { align: 'right' as const, cellType: 'number' as const };
  /** 被合并的列都要 vAlign middle：段首没被重锚时保留格内居中，重锚后由 sticky 内层接管 */
  const mergeCol = { vAlign: 'middle' as const, align: 'center' as const };

  return [
    {
      key: 'g_key',
      title: '标识',
      width: 0,
      fixed: 'left',
      children: [
        // 首列叶子格默认自动放合计标签，序号列太窄会折行，显式让给下一列
        { key: '_idx', title: '#', width: 52, type: 'index', align: 'center', footerValue: '' },
        { key: 'code', title: '运行编号', width: 112, footerValue: '合计' },
      ],
    },
    {
      key: 'g_own',
      title: '归属维度（按值自动合并）',
      width: 0,
      footerValue: '全部业务域',
      children: [
        { key: 'domain', title: '业务域', width: 124, mergeKey: true, ...mergeCol },
        { key: 'region', title: '区域', width: 112, mergeKey: true, ...mergeCol },
        { key: 'squad', title: '班组', width: 100, mergeKey: true, ...mergeCol },
      ],
    },
    {
      key: 'g_run',
      title: '本次运行（跨列合并带横跨这一组）',
      width: 0,
      footerValue: '—',
      children: [
        {
          key: 'stage',
          title: '阶段',
          width: 140,
          /**
           * 汇总带的 primary 格就是这一列 —— 带行输出跨 4 列的文案，其余行照常出值。
           * 返回字符串走 innerHTML，只有渲染窗口内的格子会调用。
           */
          render: ({ value, rowIndex }: { value: string; rowIndex: number }) =>
            isBandRow(rowIndex)
              ? `<span class="vth-mg-band">小节汇总 · 第 ${Math.floor(rowIndex / BAND_EVERY) + 1} 段（这一格跨 ${BAND_SPAN} 列）</span>`
              : value,
        },
        VtTag({ key: 'status', title: '状态', width: 104, options: STATUS }),
        VtTag({ key: 'priority', title: '优先级', width: 88, options: PRIORITY, align: 'center' }),
        // 进度条走内置组件（理由与 hero 表同源，见那边 buildColumns 的头注）
        VtProgress({
          key: 'progress',
          title: '进度',
          width: 124,
          color: 'linear-gradient(90deg, var(--vtd-primary, #2563eb), #22d3ee)',
        }),
      ],
    },
    {
      key: 'g_perf',
      title: '吞吐与延迟',
      width: 0,
      footerValue: '—',
      children: [
        { key: 'qps', title: '吞吐 / s', width: 104, ...num, summary: 'sum' },
        {
          key: 'p95',
          title: 'p95',
          width: 84,
          align: 'right',
          render: ({ value }: { value: number }) => `${value} ms`,
          summaryMethod: (values: unknown[]) =>
            `${Math.round(values.reduce((s: number, v) => s + Number(v || 0), 0) / (values.length || 1))} ms`,
        },
        {
          key: 'p99',
          title: 'p99',
          width: 84,
          align: 'right',
          render: ({ value }: { value: number }) => `${value} ms`,
        },
        {
          key: 'errRate',
          title: '错误率',
          width: 92,
          align: 'right',
          render: ({ value }: { value: number }) => `${(value / 100).toFixed(2)}%`,
        },
      ],
    },
    {
      key: 'g_io',
      title: '数据量',
      width: 0,
      footerValue: '—',
      children: [
        { key: 'rowsIn', title: '入库行数', width: 108, ...num, summary: 'sum' },
        { key: 'rowsOut', title: '出库行数', width: 108, ...num, summary: 'sum' },
        { key: 'bytes', title: '体积', width: 100, align: 'right' },
        { key: 'files', title: '文件数', width: 84, ...num, summary: 'sum' },
      ],
    },
    {
      key: 'g_sla',
      title: 'SLA 与重试',
      width: 0,
      footerValue: '—',
      children: [
        {
          key: 'sla',
          title: 'SLA',
          width: 84,
          align: 'right',
          render: ({ value }: { value: number }) => `${value}%`,
        },
        { key: 'retry', title: '重试', width: 76, ...num },
        {
          key: 'lag',
          title: '延迟',
          width: 92,
          align: 'right',
          render: ({ value }: { value: number }) => `${value} s`,
        },
        { key: 'window', title: '调度窗口', width: 108 },
      ],
    },
    {
      key: 'g_meta',
      title: '元信息',
      width: 0,
      footerValue: '—',
      children: [
        VtPerson({ key: 'owner', title: '负责人', width: 92 }),
        { key: 'updatedAt', title: '更新时间', width: 132 },
        { key: 'version', title: '版本', width: 84 },
        { key: 'note', title: '备注', width: 260, textOverflow: 'tooltip' },
      ],
    },
  ];
}

/* --------------------------------------------------------------------------
 * HUD 采样
 *
 * 分两档，因为两类读数的成本差一个量级：
 *   每帧    —— 只数行（一次 querySelectorAll，节点数以窗口为界）
 *   每 400ms —— 数单元格 / 合并块 + 问 getEffectiveMerges
 *
 * 后者里 getEffectiveMerges 会 filter 一遍 5,000 条静态带（≈0.01ms），逐帧调没必要；
 * 而这是一个讲帧耗时的页面，HUD 自己不该成为负担。
 * -------------------------------------------------------------------------- */

/**
 * 行数公布的是**实测上界**而不是瞬时值。
 *
 * 它是关于亚行偏移量的确定性阶梯函数：视口上下缘一般都落在某一行内部，覆盖它所需的
 * 行数就是 ceil 或 ceil+1，多渲染那一行正是为了边缘不露白。所以「定高」只保证行高
 * 恒定，不保证「覆盖视口的行数」恒定 —— 后者恒定的前提是把滚动吸附到整行，那样滚动
 * 会一格一格跳，在一个讲流畅度的 demo 里自毁前提。
 *
 * 于是取运行至今观察到的最大值、显示成 `≤N`：依然现场量、恒定、且没假装 ±1 不存在。
 * 与 hero 的 HUD 同一套语义（HomeLiveTable.vue 里有完整推导）。
 */
function readPeak() {
  if (!tbodyEl) return;
  const n = tbodyEl.querySelectorAll('tr:not(.vt-padding)').length;
  if (n > peakRows.value) peakRows.value = n;
}

function readMergeHud() {
  const t = table.value;
  if (!t || !tbodyEl) return;

  const row = Math.min(ROW_COUNT - 1, Math.max(0, Math.round(t.getOffset() / ROW_H)));
  topRow.value = row + 1;

  /**
   * 真实跨度：`getEffectiveMerges` 给的是段的**真实起止**，不受渲染窗口影响
   * （渲染内部用的是裁剪结果）。只问 [row, row] 这一行 —— 自动合并的段数与行数同阶，
   * 传大区间会产出十万级数组。
   */
  let maxReal = 0;
  for (const m of t.getEffectiveMerges(row, row) as { rowspan: number }[]) {
    if (m.rowspan > maxReal) maxReal = m.rowspan;
  }
  realSpan.value = maxReal;

  /**
   * DOM 侧只认 `.vt-td--merge-sticky` —— 核心只给**被重锚的** `mergeKey` 长段套这层
   * 内层，所以它精确等于「跨度超过窗口、起点被抬到窗口顶部的那些格」。
   * 横滚到合并列之外时一个都不剩，此时显示「—」：那不是读数坏了，那就是列虚拟化。
   */
  let maxDom = 0;
  const sticky = tbodyEl.querySelectorAll('.vt-td--merge-sticky');
  for (let i = 0; i < sticky.length; i++) {
    const rs = (sticky[i] as HTMLTableCellElement).rowSpan || 1;
    if (rs > maxDom) maxDom = rs;
  }
  domSpan.value = maxDom;

  // .vt-cell-pad 是横向留白格，不承载数据，天然不在 .vt-td 里
  cellDom.value = tbodyEl.querySelectorAll('.vt-td').length;
  mergeDom.value = tbodyEl.querySelectorAll(
    '.vt-td[rowspan]:not([rowspan="1"]), .vt-td[colspan]:not([colspan="1"])',
  ).length;

  /**
   * 中间段 colspan 合计。行的 DOM 结构是
   * `[左固定 × L][中间段][td.vt-cell-h]`（末尾那个只承载行高），所以中间段就是
   * 掐掉两头。取渲染窗口的**首行**：被裁剪的合并段的 primary 都落在这一行，
   * 因此它的合计必然等于中间列总数；再往下的行会少掉被 rowspan 覆盖的那几列。
   */
  const tr = tbodyEl.querySelector('tr:not(.vt-padding)');
  if (tr) {
    const kids = Array.from(tr.children) as HTMLTableCellElement[];
    const left = kids.filter((td) => td.classList.contains('vt-fixed-left')).length;
    const center = kids.slice(left, kids.length - 1);
    colspanSum.value = center.reduce((s, td) => s + (td.colSpan || 1), 0);
    padCells.value = center.filter((td) => td.classList.contains('vt-cell-pad')).length;
  }
}

function tick(ts: number) {
  rafId = requestAnimationFrame(tick);

  frames++;
  if (!windowStart) windowStart = ts;

  const t = table.value;
  if (playing.value && t) {
    const dt = lastTs ? Math.min(ts - lastTs, 48) : 16;
    const from = t.getOffset();
    t.scrollToOffset(from + SCROLL_SPEED * dt);
    // 到底了回顶部继续，不反向滚：方向恒为向下，语义不藏状态。
    // 判据用「这一帧有没有推进」——滚到底时 offset 被 clamp，比较目标值反而不好定阈值
    if (t.getOffset() - from < 0.5) t.scrollToTop();
  }
  lastTs = ts;

  readPeak();

  if (ts - windowStart >= SAMPLE_MS) {
    fps.value = Math.round((frames * 1000) / (ts - windowStart));
    frames = 0;
    windowStart = ts;
    readMergeHud();
  }
}

function startLoop() {
  if (rafId) return;
  lastTs = 0;
  windowStart = 0;
  frames = 0;
  rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = 0;
  fps.value = 0;
}

/**
 * 停下时把偏移量吸附到行边界：自动滚动逐像素推进，随手停住会在表头下方留半行 ——
 * 虚拟滚动的正常表现，但作为静止画面看着像没画完。全表 fixedSize 40px，取整即可。
 */
function snapToRow() {
  const t = table.value;
  if (!t) return;
  t.scrollToOffset(Math.round(t.getOffset() / ROW_H) * ROW_H);
}

function togglePlay() {
  playing.value = !playing.value;
  if (!playing.value) {
    snapToRow();
    readMergeHud();
  }
}

/**
 * 跳进 2 万行长段的中间。
 *
 * 用 `scrollToCell(row, 2)` 而不是 `scrollToIndex`：叶子列 2 就是「业务域」，
 * 它会顺手把 scrollLeft 归零 —— 否则用户先点过「横滚到合并块」再点这里，
 * 合并列还在窗口外，按钮看着像没生效。
 */
function jumpIntoRun() {
  playing.value = false;
  table.value?.scrollToCell(Math.floor(DOMAIN_RUN * 1.5), FIXED_LEAVES);
  readMergeHud();
}

/**
 * 一路横滚到最右 —— 横向那半边的证明。
 *
 * 三件事同时发生，都能在 HUD / 提示行上读到：
 *   · 三列 `mergeKey` 全部离开渲染窗口 → 第一格的 DOM rowspan 变「—」（列虚拟化本身）
 *   · 屏外的十几列折叠进 1~2 个留白格
 *   · 而「中间段 colspan 合计」始终等于中间列总数 —— 行没有相对表头错位
 *
 * **不**把目标定成「让合并带的起始列刚好出窗口」：实测过，那样格子的内容会跟着移到
 * 屏外（横向没有 `.vt-merge-label` 那种 sticky 对偶），画面上只剩一个空的宽格子，
 * 看着像 bug 而不像本事。带本身在默认位置（scrollLeft 0）与自动滚动时一直看得见。
 */
function sweepRight() {
  const t = table.value;
  if (!t) return;
  playing.value = false;
  const near = Math.round(t.getOffset() / ROW_H);
  const bandRow = Math.min(
    ROW_COUNT - 1,
    Math.floor(near / BAND_EVERY) * BAND_EVERY + BAND_EVERY - 1,
  );
  t.scrollToCell(bandRow, Math.max(0, leafCount.value - 1));
  readMergeHud();
}

function backToTop() {
  playing.value = false;
  table.value?.scrollToCell(0, FIXED_LEAVES);
  readMergeHud();
}

function pauseByUser() {
  playing.value = false;
}

/* -------------------------------------------------------------------------- */
async function build() {
  if (built || !hostRef.value) return;
  built = true;

  const [{ VirtTable }, comps] = await Promise.all([
    import('@virt-table/vanilla'),
    // 内置单元格组件的子路径入口；样式随模块自带（components/shared.ts 顶部就 import 了）
    import('@virt-table/vanilla/components'),
    // 样式与实现分开引，与文档里给用户的用法逐字一致
    import('@virt-table/vanilla/core.css'),
  ]);
  if (!hostRef.value) return;

  const mount = document.createElement('div');
  mount.className = 'vth-mg-mount';
  hostRef.value.appendChild(mount);

  table.value = new VirtTable(mount, {
    list: buildRows(),
    columns: buildColumns(comps) as any,
    merges: buildMerges(),
    itemKey: 'id',
    estimatedSize: ROW_H,
    // 合并 + 动态行高是既有的敏感组合（组被窗口边缘裁短时行高会变），演示一律定高
    fixedSize: true,
    buffer: 4,
    colBuffer: 2,
    // 合并块必须有边界才读得懂：无边框时合并格只剩一个浮在空白里的标签，看着像数据缺失
    border: true,
    stripe: true,
    highlightHoverRow: true,
    textOverflow: 'ellipsis',
    // 开启后表尾按同一棵列树渲染成多级分组表尾（分组格跨其全部叶子列）
    showSummary: true,
  });

  clientEl = mount.querySelector('.vt-client');
  tbodyEl = mount.querySelector('.vt-tbody');

  const leaves = table.value.getVisibleColumns() as { width?: number; fixed?: string }[];
  leafCount.value = leaves.length;
  totalWidth.value = leaves.reduce((w, c) => w + (c.width ?? 0), 0);
  centerCols.value = leaves.filter((c) => !c.fixed).length;

  ready.value = true;
  readPeak();
  readMergeHud();

  // 默认自动滚动，但尊重「减少动态效果」
  const calm =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  playing.value = !calm;

  // 用户自己滚动时把控制权交回去
  clientEl?.addEventListener('wheel', pauseByUser, { passive: true });
  clientEl?.addEventListener('pointerdown', pauseByUser, { passive: true });
}

/**
 * 建表推到空闲期。
 *
 * 本区紧跟 hero，在常见的笔记本视口里**首屏就已经露出一部分** —— 光靠
 * IntersectionObserver 并不能把它挡在首屏之外（实测 1440×1000 下 observer 立刻就
 * 触发了）。而首页此刻已经有一张 10 万行表在建，再叠一份 10 万行数组的构造会和
 * hero 的建表、Vue 的水合挤在同一段主线程里。
 *
 * 所以相交只是**允许**建表，真正开工等一个空闲片段。`requestIdleCallback` 不是
 * 到处都有（Safari 直到 17 才给），退化成短 timeout —— 让出一次事件循环，也就够把
 * hero 的首帧放过去了。
 */
function buildWhenIdle(then: () => void) {
  // `built` 要等 build() 真正开跑才置位，而相交回调在空闲片段到来前可能再触发几次
  // （threshold 两侧抖动）—— 少了这个闸就会建出两张表
  if (scheduled) return;
  scheduled = true;
  const run = () => void build().then(then);
  const ric = (globalThis as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(run, { timeout: 1500 });
  else setTimeout(run, 200);
}

onMounted(() => {
  if (!hostRef.value) return;
  /**
   * 一个 observer 管两件事：首次相交才建表，之后进出视口开关 rAF 循环 ——
   * 滚出去就别占着主线程。
   *
   * 刻意**不给 rootMargin**、并把 threshold 提到 0.2：宿主高 520px，也就是要真的
   * 露出一百来像素才算「看见了」。给了 rootMargin 反而会让它提前到首屏里去建。
   */
  io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        if (!built) buildWhenIdle(startLoop);
        else startLoop();
      } else {
        stopLoop();
        snapToRow();
      }
    },
    { threshold: 0.2 },
  );
  io.observe(hostRef.value);
});

onBeforeUnmount(() => {
  stopLoop();
  io?.disconnect();
  io = null;
  clientEl?.removeEventListener('wheel', pauseByUser);
  clientEl?.removeEventListener('pointerdown', pauseByUser);
  table.value?.destroy();
  table.value = null;
  clientEl = null;
  tbodyEl = null;
});
</script>

<template>
  <div class="vth-mg">
    <div class="vth-mg-bar">
      <span class="vth-mg-title">
        {{ ROW_COUNT.toLocaleString('en-US') }} 行 ×
        {{ leafCount || 25 }} 列<template v-if="totalWidth"> · 总宽 {{ totalWidth.toLocaleString('en-US') }}px</template>
        · 合并全开
      </span>
      <span class="vth-mg-tools">
        <button class="vth-mg-btn" type="button" :aria-pressed="playing" @click="togglePlay">
          {{ playing ? '暂停' : '自动滚动' }}
        </button>
        <button class="vth-mg-btn" type="button" @click="jumpIntoRun">
          跳进 2 万行长段中间
        </button>
        <button class="vth-mg-btn" type="button" @click="sweepRight">横滚到最右</button>
        <button class="vth-mg-btn" type="button" @click="backToTop">回到左上角</button>
      </span>
    </div>

    <div ref="hostRef" class="vth-mg-host">
      <div v-if="!ready" class="vth-mg-skeleton">
        <span class="vth-mg-spin" />
        进入视口后装载 10 万行…
      </div>
    </div>

    <div class="vth-hud vth-mg-hud">
      <div class="vth-hud-cell">
        <div class="vth-hud-k">合并段真实跨度 → DOM rowspan</div>
        <div class="vth-hud-v">
          {{ realSpan ? realSpan.toLocaleString('en-US') : '—' }}<small>行</small>
          <span class="vth-mg-arrow">→</span>
          <!-- 合并列横滚出窗口时它就不在 DOM 里了，此时连单位一起省掉（「— rowspan」读着别扭） -->
          <template v-if="domSpan">{{ domSpan }}<small>rowspan</small></template>
          <template v-else><small>不在 DOM 里</small></template>
        </div>
      </div>
      <div class="vth-hud-cell">
        <div class="vth-hud-k">单元格 DOM / 总量</div>
        <div class="vth-hud-v">
          {{ cellDom || '—' }}<small
            >/ {{ ((leafCount || 25) * ROW_COUNT).toLocaleString('en-US') }}</small
          >
        </div>
      </div>
      <div class="vth-hud-cell">
        <div class="vth-hud-k">常驻行 DOM</div>
        <div class="vth-hud-v">≤{{ peakRows || '—' }}<small>tr</small></div>
      </div>
      <div class="vth-hud-cell">
        <div class="vth-hud-k">渲染中的合并块 · 帧率</div>
        <div class="vth-hud-v" :class="{ 'vth-hud-v--live': fps >= 50 }">
          {{ mergeDom || '—' }}<small>块</small>
          <span class="vth-mg-sep">·</span>{{ fps || '—' }}<small>fps</small>
        </div>
      </div>
    </div>

    <p class="vth-mg-hint">
      视口首行 <b>#{{ topRow.toLocaleString('en-US') }}</b> ·
      当前行中间段 colspan 合计
      <b>{{ colspanSum || '—' }}/{{ centerCols || '—' }}</b>
      <template v-if="padCells">（屏外的列折叠进 {{ padCells }} 个留白格）</template>
      —— 这条恒等式在任何横滚位置都成立，跨界的合并格一个都没丢，所以行永远对得上表头。
      「业务域」段长 2 万行、「区域」2 千行、「班组」8 行三档同屏；每 {{ BAND_EVERY }} 行一条汇总带横跨「本次运行」整组
      {{ BAND_SPAN }} 列。合并列自己横滚出窗口时第一格会显示「—」：那几列此刻确实不在 DOM 里。
    </p>
  </div>
</template>

<style>
/**
 * 由 VirtTable 用 innerHTML 写进 `<td>` 的产物 —— **不能用 scoped**，那些节点拿不到
 * Vue 的 `data-v-*`。所以走 `.vth-mg-*` 专属类名，且刻意不出现任何裸元素选择器
 * （首页里嵌的是真表格，与 styles-contract.test.ts 那条隔离契约同源）。
 */
/**
 * 汇总带的 pill。
 *
 * ⚠️ 高度**必须锁成 `var(--vt-line-height)`**（21px = 行内容区），不能靠
 * `padding` + 继承的 line-height 自然撑。第一版写的是 `display: inline-block`
 * + `padding: 1px 9px`，12px 字号在 21px 的继承行高下算出 23px，比内容区高 2px ——
 * 于是每 20 行那条带行的实际高度是 **42px**，而本区配的是
 * `fixedSize: true` + `estimatedSize: 40`。账本按 40 算、DOM 实际 42，
 * 正是 AGENTS.md §7.11 那条不变量（line-height 21 + padding-y 9×2 + 下边框 1 = 40）
 * 的破法：滚到底时最后一行与表尾之间会差出几像素的缝。
 *
 * 组件内置的 `.vt-cell-option` 踩过同一个坑（index.css 里那段注释记着同一个 42），
 * 这里照它的解法办：锁高 + `line-height: 1` + 只留横向 padding + `vertical-align: top`
 * （不能用 `middle` —— 它仍以基线为参照，inline-flex 的 descender 空间会把行盒顶高）。
 * 锁成变量之后 pill 还会跟着密度档走，紧凑档自动变 19px。
 */
.vth-mg-band {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  vertical-align: top;
  height: var(--vt-line-height);
  padding: 0 9px;
  border-radius: 999px;
  background: var(--vtd-primary-soft, rgb(37 99 235 / 10%));
  color: var(--vtd-primary, #2563eb);
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  white-space: nowrap;
}
</style>
