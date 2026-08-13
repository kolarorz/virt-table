<script setup lang="ts">
/**
 * 首页 hero 的「真实表格」——**不是截图、不是 CSS 动画**，是一个真的 VirtTable 实例，
 * 10 万行 × 14 列，HUD 里的读数全部现场量出来。
 *
 * 三条约束决定了这里的写法：
 *
 * 1. **必须客户端才建表**。VitePress 构建期会 SSR 渲染这个组件，而 VirtTable 在构造函数里
 *    就建 DOM，所以 `@virt-table/vanilla` 与它的 CSS 都走 `onMounted` 里的动态 import
 *    （顺带让首屏文字先画出来，表格随后补位）。
 *
 * 2. **CSS 不能进全站包**。动态 import 让 core.css 成为异步 chunk，只有访问首页才加载。
 *    它全部是 `.vt-*` 类选择器（无裸元素选择器），落到 document 上不会影响文档排版。
 *
 * 3. **首页正文不能带 `.vp-doc`**。VitePress 的 `.vp-doc table`(0,1,1) 会压过
 *    `.vt-table`(0,1,0)，把 `display: table` 顶成 block、内边距顶成 8/16px，
 *    colgroup 列宽体系与虚拟滚动的行高账本一起崩。index.md 用 `markdownStyles: false`
 *    绕开（VPHome 会跳过 VPHomeContent 那层 `.vp-doc container` 包装）。
 *    **改首页 frontmatter 前先读这一条。**
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';

/** 与 estimatedSize 一致；HUD 里由偏移量换算行号也用它 */
const ROW_H = 40;
const ROW_COUNT = 100_000;

const hostRef = ref<HTMLElement | null>(null);
const ready = ref(false);
const playing = ref(false);

/** 自动滚动速度（px/ms），约 900px/s ≈ 22 行/s */
const SCROLL_SPEED = 0.9;
/** 帧率的结账周期，避免逐帧刷数字 */
const SAMPLE_MS = 400;

/** HUD 读数 */
const fps = ref(0);
/** 常驻行 DOM 的**实测上界**（不是瞬时值），理由见 readHud() */
const peakRows = ref(0);
const topRow = ref(0);

/** 表格实例。shallowRef：VirtTable 是命令式实例，不能被 Vue 递归代理 */
const table = shallowRef<any>(null);
let clientEl: HTMLElement | null = null;
let tbodyEl: HTMLElement | null = null;

let rafId = 0;
let io: IntersectionObserver | null = null;
let lastTs = 0;
/** 帧率采样窗口：帧数在窗口内累计，到期公布均值 */
let frames = 0;
let windowStart = 0;

/* --------------------------------------------------------------------------
 * 数据
 *
 * 10 万行要在一帧里造完，所以**除了编号列，所有值都从池里按下标取引用**——
 * 没有 per-cell 的字符串拼接，也没有 Date 格式化。
 * -------------------------------------------------------------------------- */
const STATUSES = [
  { label: '运行中', color: '#10b981' },
  { label: '排队', color: '#f59e0b' },
  { label: '已完成', color: '#2563eb' },
  { label: '失败', color: '#ef4444' },
  { label: '已暂停', color: '#8b5cf6' },
];
const PRIORITIES = [
  { label: 'P0', color: '#ef4444' },
  { label: 'P1', color: '#f59e0b' },
  { label: 'P2', color: '#2563eb' },
  { label: 'P3', color: '#98a2b3' },
];
const OWNERS = ['陈昱', '林洛', '赵斯', '孙茗', '周砚', '吴桉', '郑玥', '钱屿'];
const TEAMS = ['数据平台', '交易中台', '风控引擎', '增长实验', '基础架构', '结算'];
const REGIONS = ['华东-1', '华北-2', '华南-3', 'ap-southeast', 'us-east', 'eu-west'];
const JOBS = [
  '实时对账快照',
  '订单宽表回溯',
  '风控特征物化',
  '用户画像增量',
  '库存冷热分层',
  '结算流水校验',
  '埋点漏斗聚合',
  '推荐召回索引',
];
const NOTES = [
  '上游分区延迟，已自动重试 2 次并降级到小时级快照',
  '与 T-1 全量核对一致，差异行数 0',
  '目标表存在热点键，已切换为两阶段聚合',
  'schema 变更已灰度，下游三个消费者均已适配',
  '无异常',
];
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
      code: 'JOB-' + (100000 + i),
      job: JOBS[i % JOBS.length],
      status: STATUSES[(i * 3) % STATUSES.length],
      priority: PRIORITIES[i % PRIORITIES.length],
      owner: OWNERS[i % OWNERS.length],
      /**
       * team / region 逐行轮换（`i % N`）而不是成段。
       *
       * 这两列曾经配着 `mergeKey`，于是数据刻意造成段（`i / 4`、`i / 19`）——
       * 合并已经移交给下方的「合并 × 双向虚拟化」专区（HomeMergeTable.vue），
       * 成段的数据在**不合并**的表里就只是连着几行重复值，看着像渲染坏了。
       */
      team: TEAMS[i % TEAMS.length],
      progress: (i * 7) % 101,
      qps: 1200 + ((i * 37) % 8800),
      p95: 8 + ((i * 13) % 240),
      err: (i * 11) % 320,
      region: REGIONS[(i * 5) % REGIONS.length],
      updatedAt: TIMES[i % TIMES.length],
      note: NOTES[i % NOTES.length],
    };
  }
  return rows;
}

function buildColumns() {
  return [
    { key: '_idx', title: '#', type: 'index', width: 56, fixed: 'left', align: 'center' },
    { key: 'code', title: '任务编号', width: 116, fixed: 'left' },
    { key: 'team', title: '团队', width: 104 },
    { key: 'job', title: '任务', width: 168 },
    { key: 'status', title: '状态', width: 100, cellType: 'option' },
    { key: 'priority', title: '优先级', width: 88, cellType: 'option', align: 'center' },
    {
      key: 'progress',
      title: '进度',
      width: 132,
      // 返回字符串 → 走 innerHTML。只有渲染窗口内的格子会调用（约 20 行 × 1 列）
      render: ({ value }: { value: number }) =>
        `<span class="vth-bar"><i style="width:${value}%"></i></span><b>${value}%</b>`,
    },
    { key: 'qps', title: '吞吐 / s', width: 100, cellType: 'number', align: 'right' },
    {
      key: 'p95',
      title: 'p95',
      width: 88,
      align: 'right',
      render: ({ value }: { value: number }) => `${value} ms`,
    },
    {
      key: 'err',
      title: '错误率',
      width: 92,
      align: 'right',
      render: ({ value }: { value: number }) => `${(value / 100).toFixed(2)}%`,
    },
    { key: 'owner', title: '负责人', width: 92 },
    { key: 'region', title: '地域', width: 116 },
    { key: 'updatedAt', title: '更新时间', width: 132 },
    { key: 'note', title: '备注', width: 300, textOverflow: 'tooltip' },
  ];
}

/* --------------------------------------------------------------------------
 * HUD 采样 + 自动滚动，同一个 rAF 循环
 * -------------------------------------------------------------------------- */
/**
 * 采一帧的读数。
 *
 * 行数公布的是**实测上界**（`≤20`）而不是瞬时值。原因不是「读数不准」——
 * 恰恰相反，它是**关于亚行偏移量 f 的确定性阶梯函数**：同一个 f 永远给同一个 n，
 * 每 40px 行高周期内跳变一次。
 *
 * 机制：渲染区间的下界由「第一行底边越过视口下边界」决定，即
 * `end = floor((offset + 可视数据区高) / 行高) + 1`（core 的 `_calculateViewEnd`）。
 * offset 连续变化时这个 floor 必然取到两个相邻值 —— 换成几何说法：**视口上下缘一般都落在
 * 某一行的内部，覆盖它所需的行数就是 ceil 或 ceil+1**，多渲染那一行正是为了边缘不露白。
 * 所以「定高」只保证行高恒定，并不保证「覆盖视口的行数」恒定；后者恒定的前提是 offset
 * 永远是行高的整数倍，也就是把滚动吸附到整行（那样滚动会一格一格跳，比数字变化难受）。
 *
 * **调容器高度消不掉它**，三个高度都从干净加载实测过（真实自动滚动 0.9px/帧、420 帧、
 * f 覆盖整个 0~40 周期，offset 由「行索引 + 行的视口位置」精确反解，不用代理量）：
 *
 *   可视数据区 354px（宿主 396）：f≲6    → 19，其余 → 20   少数派窗口约 6px
 *   可视数据区 358px（宿主 400）：420 帧内未出现第二个值   窗口窄到没撞上
 *   可视数据区 360px（宿主 402）：f≳39.3 → 21，其余 → 20   少数派窗口约 0.7px
 *
 * 注意最后一行：**可视区正好是 9 整行也没消掉**，只是把窗口挤到周期末端。所以宿主高度
 * 保持 396px，不去凑一个「看起来恒定」的数 —— 那只是把 6px 的窗口换成 0.7px 的窗口，
 * 撞不撞上取决于滚动速度与帧节奏，是运气不是保证。
 *
 * ---- 所以 HUD 显示什么 ----
 *
 * 这个读数想说的是「窗口就这么大，与数据量无关」，而 ±1 对这句话没有信息量，逐帧公布
 * 只会变成跳字。三种做法里选了第三种：
 *
 *   1. 把滚动吸附到整行 → f 恒为 0，n 真恒定。但滚动会 40px 一跳、每秒二十几跳，
 *      在一个讲流畅度的 demo 里自毁前提。**不做。**
 *   2. 只在 f≈0 时采样 → 数字恒定，但那是挑最小值（19），而 DOM 里大多数时候是 20，
 *      属于选择性报告。**不做。**
 *   3. 公布**实测上界**：取运行至今观察到的最大值，显示成 `≤20`。依然是现场量的，
 *      恒定，且没有假装 ±1 不存在。
 *
 * 上界是**终身累计、不按窗口重置**的：重置就等于让它随机回落到 19 又弹回 20。
 * 容器高度是 CSS 固定的 396px（宽度变化只影响列虚拟化，不影响行数），所以窗口大小不会
 * 因视口变化而改变，无需监听 resize 重新求上界。首屏若恰好停在 f≈0，会先显示 `≤19`、
 * 滚动一行后定格在 `≤20` —— 一次性的，且发生在表格淡入期间。
 */
function readHud() {
  // 排除 `.vt-padding`（虚拟滚动的占位行，不承载数据）
  if (tbodyEl) {
    const n = tbodyEl.querySelectorAll('tr:not(.vt-padding)').length;
    if (n > peakRows.value) peakRows.value = n;
  }
  const t = table.value;
  if (t) topRow.value = Math.min(ROW_COUNT, Math.round(t.getOffset() / ROW_H) + 1);
}

/** 结算采样窗口：只有帧率需要按窗口取均值，上界是终身累计的 */
function publishSample(elapsed: number) {
  fps.value = Math.round((frames * 1000) / elapsed);
  frames = 0;
}

function tick(ts: number) {
  rafId = requestAnimationFrame(tick);

  frames++;
  if (!windowStart) windowStart = ts;

  const t = table.value;
  if (playing.value && t) {
    const dt = lastTs ? Math.min(ts - lastTs, 48) : 16;
    const from = t.getOffset();
    const want = from + SCROLL_SPEED * dt;
    t.scrollToOffset(want);
    /**
     * 到底了就回到顶部继续，**不反向滚**。
     *
     * 原先是 ping-pong（撞端点翻转方向），但那让「自动滚动」的方向变成一个隐藏状态：
     * 点过「跳到第 10 万行」之后再点播放，表格立刻往上滚 —— 从按钮上完全看不出来为什么。
     * 现在方向恒为向下，语义固定成「从当前位置往下滚，到尾了从头再来」。
     *
     * 判据用「这一帧有没有推进」而不是比较 want 与实际值：滚到底时 offset 会被 clamp 在
     * 最大值上，二者的差正好等于溢出量，阈值不好定；而「没推进」是无歧义的。
     */
    if (t.getOffset() - from < 0.5) t.scrollToTop();
  }
  lastTs = ts;

  readHud();

  if (ts - windowStart >= SAMPLE_MS) {
    publishSample(ts - windowStart);
    windowStart = ts;
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
 * 停下时把偏移量吸附到行边界。
 *
 * 自动滚动是逐像素推进的，随手停住会在表头下方留半行 —— 那是虚拟滚动的正常表现，
 * 但作为首页的静止画面看着像没画完。行高在这份数据里是恒定的 40px（没有换行），
 * 所以直接对 ROW_H 取整就够，不必去问核心的行高账本。
 */
function snapToRow() {
  const t = table.value;
  if (!t) return;
  t.scrollToOffset(Math.round(t.getOffset() / ROW_H) * ROW_H);
}

function togglePlay() {
  playing.value = !playing.value;
  if (!playing.value) snapToRow();
}

function jumpToEnd() {
  playing.value = false;
  table.value?.scrollToIndex(ROW_COUNT - 1);
  readHud();
}

function backToTop() {
  playing.value = false;
  table.value?.scrollToTop();
  readHud();
}

/* -------------------------------------------------------------------------- */
onMounted(async () => {
  const [{ VirtTable }] = await Promise.all([
    import('@virt-table/vanilla'),
    // 样式与实现分开引，与文档里给用户的用法逐字一致（alias 见 .vitepress/config.ts）
    import('@virt-table/vanilla/core.css'),
  ]);
  if (!hostRef.value) return;

  const mount = document.createElement('div');
  mount.className = 'vth-live-mount';
  hostRef.value.appendChild(mount);

  table.value = new VirtTable(mount, {
    list: buildRows(),
    columns: buildColumns() as any,
    itemKey: 'id',
    estimatedSize: ROW_H,
    buffer: 4,
    stripe: true,
    // 14 列挤在 620px 的卡片里，没有竖线时相邻列的数字会连成一片
    border: true,
    highlightHoverRow: true,
    textOverflow: 'ellipsis',
  });

  clientEl = mount.querySelector('.vt-client');
  tbodyEl = mount.querySelector('.vt-tbody');
  ready.value = true;
  // 先出一次读数，让上界与行号立刻有值（帧率仍要等第一个采样窗口）
  readHud();

  // 默认自动滚动，但尊重「减少动态效果」
  const calm =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  playing.value = !calm;

  // 只在进入视口时跑循环：滚出去就别占着主线程
  io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        startLoop();
      } else {
        stopLoop();
        snapToRow();
      }
    },
    { threshold: 0.1 },
  );
  io.observe(hostRef.value);

  // 用户自己滚动时暂停自动滚动，把控制权交回去
  clientEl?.addEventListener('wheel', pauseByUser, { passive: true });
  clientEl?.addEventListener('pointerdown', pauseByUser, { passive: true });
});

function pauseByUser() {
  playing.value = false;
}

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
  <div class="vth-live">
    <div class="vth-live-bar">
      <span class="vth-live-dots" aria-hidden="true">
        <i class="vth-live-dot" />
        <i class="vth-live-dot" />
        <i class="vth-live-dot" />
      </span>
      <span class="vth-live-title">100,000 行 × 14 列 · 140 万单元格</span>
      <span class="vth-live-tools">
        <button
          class="vth-live-btn"
          type="button"
          :aria-pressed="playing"
          @click="togglePlay"
        >
          {{ playing ? '暂停' : '自动滚动' }}
        </button>
        <button class="vth-live-btn" type="button" @click="jumpToEnd">跳到第 10 万行</button>
        <button class="vth-live-btn" type="button" @click="backToTop">回顶部</button>
      </span>
    </div>

    <div ref="hostRef" class="vth-live-host">
      <div v-if="!ready" class="vth-live-skeleton">
        <span class="vth-live-spin" />
        正在装载 10 万行…
      </div>
    </div>

    <div class="vth-hud">
      <div class="vth-hud-cell">
        <div class="vth-hud-k">实时帧率</div>
        <div class="vth-hud-v" :class="{ 'vth-hud-v--live': fps >= 50 }">
          {{ fps || '—' }}<small>fps</small>
        </div>
      </div>
      <div class="vth-hud-cell">
        <div class="vth-hud-k">常驻行 DOM</div>
        <div class="vth-hud-v">≤{{ peakRows || '—' }}<small>tr</small></div>
      </div>
      <div class="vth-hud-cell">
        <div class="vth-hud-k">视口首行</div>
        <div class="vth-hud-v">#{{ topRow.toLocaleString('en-US') }}</div>
      </div>
      <div class="vth-hud-cell">
        <div class="vth-hud-k">数据总量</div>
        <div class="vth-hud-v">100,000<small>行</small></div>
      </div>
    </div>
  </div>
</template>

<style>
/**
 * 进度条列的 render 产物。**不能用 scoped** —— 这些节点由 VirtTable 用 innerHTML 写进
 * `<td>`，拿不到 Vue 的 `data-v-*` 属性。所以走 `.vth-bar` 这个专属类名，
 * 且刻意不出现任何裸元素选择器（首页里嵌的是真表格，见文件头注第 3 条）。
 */
.vth-bar {
  display: inline-block;
  width: 56px;
  height: 5px;
  margin-right: 7px;
  border-radius: 999px;
  background: var(--vtd-bg-mute, #eef1f5);
  overflow: hidden;
  vertical-align: middle;
}

.vth-bar > i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--vtd-primary, #2563eb), #22d3ee);
}
</style>
