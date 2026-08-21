<script setup lang="ts">
/**
 * 首页全页编排。
 *
 * 编排原则：**每一条性能断言后面都挂一个实测数字**，数字与出处（AGENTS.md §7 的 CDP
 * 实测记录 / vitest）一一对应。改这里的数字前请先去对应章节核一遍 —— 首页是唯一会被
 * 当成对外承诺读的页面，写虚了就是欺骗。
 *
 * hero 右侧那块不是插图，是真实 VirtTable 实例，见 HomeLiveTable.vue 的文件头注
 * （尤其是「首页正文不能带 `.vp-doc`」那条，它约束着 index.md 的 frontmatter）。
 *
 * 紧跟 hero 的「合并 × 双向虚拟化」专区同样是真表格（HomeMergeTable.vue）。它排在
 * 全站第一个内容区块是刻意的：那是本项目最不容易被替代的能力，而在它之前首页只是
 * **讲**了「合并段不展开」（下方机制卡片第 4 条），没演过。
 */
import { computed, ref } from 'vue';
import { withBase } from 'vitepress';
import HomeLiveTable from './HomeLiveTable.vue';
import HomeMergeTable from './HomeMergeTable.vue';
import { FRAMEWORK_ICONS, type Framework } from '../../composables/useFramework';

/* --------------------------------------------------------------------------
 * 实测指标（出处见每条 note）
 * -------------------------------------------------------------------------- */
const metrics = [
  {
    v: '8.3',
    unit: 'ms',
    k: '10 万行滚动帧耗时中位',
    note: 'p95 9.2ms；开按值自动合并后与不开完全一致',
  },
  {
    v: '25',
    unit: 'tr',
    k: '常驻行 DOM',
    note: '与数据量无关；滚到 9.3 万行长段中间仍是 25',
  },
  {
    v: '0',
    unit: '%',
    k: '表头空白帧',
    note: '把 thead/tfoot 移出 body table 之前是 41%',
  },
  {
    v: '3.3',
    unit: 'ms',
    k: '100 万行建合并段索引',
    note: 'Int32Array 存段起点，占 781 KB，零对象分配',
  },
  {
    v: '27.1',
    unit: 'kB',
    k: '基础表格需引入的 CSS',
    note: '插件与内置组件各自成文件，全量 45 kB',
  },
  {
    v: '1054',
    unit: '个',
    k: '单元测试',
    note: '37 个测试文件，含 5 份契约测试与 17 份 DOM 测试',
  },
];

/* --------------------------------------------------------------------------
 * 流畅度的来源：每张卡是一个真实的工程决策 + 它的实测依据
 * -------------------------------------------------------------------------- */
const mechanisms = [
  {
    h: '行 + 列双向虚拟化',
    p: '纵向窗口由框架无关的 <code>@virt-list/core</code> 算，横向由列前缀和 + <code>colBuffer</code> 自己裁。宽表和长表都只把「看得见的那一屏」变成 DOM。',
    proof: '常驻 25 个 tr',
    proofNote: '10 万行 × 30 列与 1000 行同价',
  },
  {
    h: '表头 / 表尾独立成层',
    p: '<code>&lt;table&gt;</code> 是整体布局上下文：虚拟滚动每帧改 tbody，会让内容根本没变的 <code>&lt;thead&gt;</code> 一起失效、重新光栅化，主线程忙时就是整条表头闪白。于是把它们搬成滚动容器内的独立 sticky table。',
    proof: '41% → 0%',
    proofNote: '表头空白帧，唯一变量就是「在不在 body table 里」',
  },
  {
    h: '表体写 top 残差，不用 transform',
    p: 'transform 会给后代建立包含块，让固定列的 <code>position: sticky</code> 失去参照、跟着内容被推走。写残差不建包含块，还顺手消掉了元素高度上限与「滚不到底」两个老坑。',
    proof: '0.03px',
    proofNote: '横滚 30 帧固定表头最大偏差，纯亚像素舍入',
  },
  {
    h: '合并段只存段起点，不展开',
    p: '按值自动合并把段起点存进 <code>Int32Array</code>，查询走二分、每帧按渲染窗口裁剪。展开成全量 merges 会把 <code>rowspan=50000</code> 物化成 5 万个 <code>&lt;tr&gt;</code>，虚拟滚动直接失效。',
    proof: '快 2–8 倍',
    proofNote: '10 万次查询：二分 0.4–2.3ms，Map 3–9.7ms',
  },
  {
    h: '滚动路径上不读布局',
    p: 'tooltip 的文本截断判定放进延迟计时器，而不是 <code>mouseover</code> 里。滚动时指针底下的行在动，布局是脏的，那一刻读 <code>scrollWidth</code> 会强制同步布局。',
    proof: '145 倍',
    proofNote: '读 scrollWidth：布局干净 0.15µs，布局脏 21.8µs',
  },
  {
    h: '滑块按行索引映射，不按像素',
    p: '不定高表格的内容总高随实测行高一直回填，按像素算滑块位置会让它在手指底下反复跳。所以两条滚动条都自绘成 overlay 浮层，分母取「滚到底时视口顶部那一行」。',
    proof: '连续跟手',
    proofNote: 'frac 让高行内部也能连续移动，不吸附到行边界',
  },
];

/* --------------------------------------------------------------------------
 * 合并专区的三条说明
 *
 * 写这三条是因为「重锚」会被误读成 bug：滚进长段中间时合并格的内容跟到了可视区顶部，
 * 而不是留在段的真实起点。那不是妥协，那是长段能免费的**原因**。
 *
 * ⚠️ 这里刻意**不提排序**。表上掺了静态 `merges`（跨列汇总带）就会整表禁用排序 ——
 * 合并按绝对行号，排序会错位。「`mergeKey` 不禁用排序」是真的，但那要在没有静态
 * merges 的表上才看得到，属于能力全景与示例页的地盘，写在这一区就是错的。
 * -------------------------------------------------------------------------- */
const mergeProofs = [
  {
    h: '长段不展开，只存段起点',
    p: '按值自动合并把段起点存进 <code>Int32Array</code>，查询走二分、每帧按渲染窗口裁剪。所以「业务域」那一段真实跨两万行，DOM 里的 <code>rowspan</code> 却只有十几 —— 与数据量无关。',
  },
  {
    h: '重锚是必然，不是妥协',
    p: '滚进长段中间时，合并格的起点被抬到窗口起点，内容锚在可视区（AG Grid 的 Cell Span 同样如此）。换来的是渲染区间**不被拉宽** —— 这正是让自动合并在虚拟滚动下成立的关键。标签的逐帧跟随交给 <code>position: sticky</code>，主线程零开销。',
  },
  {
    h: '跨列合并走另一条路',
    p: '按值合并只产出纵向段；任意几何用静态 <code>merges</code>。横滚后合并带的起始列会落到窗口左侧之外，此时渲染列区间被反向撑回去，屏外那段折叠成**一个**留白格 —— 行的 colspan 始终配平。',
  },
];

/* --------------------------------------------------------------------------
 * 能力全景
 * -------------------------------------------------------------------------- */
const capabilities = [
  {
    h: '表格结构',
    count: '7',
    items: [
      '行 + 列双向虚拟化，动态行高自动测量',
      '冻结列（左 / 右）与固定行 <code>pinned</code>',
      '多级分组表头 / 表尾，分组标签跟随横滚',
      '合并单元格：表体 / 表头 / 表尾',
      '按值自动合并 <code>mergeKey</code>，且不禁用排序',
      '树形 · 分组 · 树形 + 分组 · 展开行',
      '自动换行 / 溢出省略 / 悬停 tooltip',
    ],
  },
  {
    h: '类电子表格交互',
    count: '8',
    items: [
      '单元格区域框选，含边缘自动滚动',
      '键盘导航：方向键 / PageUp·Down / Ctrl+Home·End',
      '剪贴板复制粘贴，与 Excel 互通',
      '单元格编辑浮层 + 校验',
      '列宽拖拽，指针事件一套代码覆盖触屏',
      '列拖拽排序 / 行拖拽排序',
      '右键菜单、列显隐面板',
      '实验中的电子表格模式',
    ],
  },
  {
    h: '数据与流程',
    count: '8',
    items: [
      '统一管线：筛选 → 排序 → 分页 → 结构展开 → 聚合',
      '客户端分页（默认）与服务端分页',
      '无限滚动（向下 / 向上 / 双向）',
      '树形懒加载、服务端取数状态机',
      '列头筛选 + 高级筛选管理器',
      '自动合计行、全表搜索',
      'CSV / Excel 导出与打印',
      '状态持久化 <code>getState</code> / <code>setState</code>',
    ],
  },
  {
    h: 'AI 与工程化',
    count: '9',
    items: [
      '<code>vtAIQuery</code> 自然语言查询，不绑任何模型厂商',
      '<code>vtAIColumn</code> AI 列，只为可见行付费',
      '<code>vtAIStream</code> 流式表格，列从首批数据推断',
      '14 个插件按需装载，tree-shaking 友好',
      '18 个内置单元格组件',
      '第三方组件库列渲染（Element Plus / Ant Design）',
      'i18n：内置 zhCN / enUS，可运行时切换',
      '无障碍 ARIA 网格语义',
      '亮色 / 暗色主题，<code>--vt-*</code> 令牌换肤',
    ],
  },
];

/* --------------------------------------------------------------------------
 * 工程可信度
 * -------------------------------------------------------------------------- */
const engineering = [
  {
    v: '1054',
    h: '单元测试，37 个文件',
    p: '纯逻辑跑 node 环境，DOM 行为跑 happy-dom 并按文件开启 —— 避免 11 个纯逻辑文件白付每文件约 90ms 的环境成本。',
  },
  {
    v: '5',
    h: '份契约测试',
    p: 'CSS 令牌算术（行高等式）、JS 写出的 class ↔ CSS 选择器、内置组件契约、「点外面关掉」的事件名、文档站样式与 demo 的隔离。守的是编译器管不到、运行时也测不出来的耦合。',
  },
  {
    v: 'CDP',
    h: '性能结论全部实测',
    p: 'Chrome headless 里用合成器手势驱动真滚动（<code>synthesizeScrollGesture</code>），按区带亮度判空白帧。复现步骤写在文档里，包括两个会把人带偏的测量陷阱。',
  },
  {
    v: '20+',
    h: '条决策记录，含否决理由',
    p: '列宽内容自适应、逐格 <code>spanMethod</code>、tooltip 挂 body —— 每条为什么不做都写清了依据，避免下一个人再走一遍。',
  },
];

const layers = [
  { n: 'React / Vue 适配层', d: 'VNode / JSX ↔ DOM 桥接、生命周期、列转换', t: '薄封装' },
  { n: '插件层', d: '框选 / 键盘 / 编辑 / 筛选 / 拖拽 / 搜索 / 导出 / AI', t: '14 个，可选' },
  { n: 'VirtTable 核心（vanilla）', d: '列管理 · 固定列 · 横向虚拟化 · 合并 · 树形分组 · 多级表头 · 单元格几何', t: '框架无关', core: true },
  { n: '@virt-list/core', d: '纵向虚拟滚动引擎，纯算法不碰 DOM', t: '外部依赖' },
];

/* --------------------------------------------------------------------------
 * 三端代码
 * -------------------------------------------------------------------------- */
type Snippet = { lang: string; lines: string[] };

const frameworks: Framework[] = ['vanilla', 'vue', 'react'];
const FW_LABEL: Record<Framework, string> = {
  vanilla: 'Vanilla',
  vue: 'Vue 3',
  react: 'React 18+',
};
const activeFw = ref<Framework>('vanilla');

const snippets: Record<Framework, Snippet> = {
  vanilla: {
    lang: 'ts',
    lines: [
      "import { VirtTable } from '@virt-table/vanilla';",
      "import '@virt-table/vanilla/core.css';",
      '',
      'const table = new VirtTable(el, {',
      '  list,              // 10 万行照常整个传进来',
      '  columns,',
      "  itemKey: 'id',",
      '  estimatedSize: 40, // 行高估值，动态行高会自动回填',
      '});',
      '',
      'table.scrollToIndex(99_999);',
    ],
  },
  vue: {
    lang: 'vue',
    lines: [
      '<template>',
      '  <div style="height: 600px">',
      '    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />',
      '  </div>',
      '</template>',
      '',
      '<script setup lang="ts">',
      "import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';",
      "import '@virt-table/vanilla/core.css';",
      '',
      "const options = { list, itemKey: 'id', estimatedSize: 40 };",
      '<\/script>',
    ],
  },
  react: {
    lang: 'tsx',
    lines: [
      "import { VirtTableReact, type VirtTableRef } from '@virt-table/react';",
      "import '@virt-table/vanilla/core.css';",
      '',
      'const tableRef = useRef<VirtTableRef>(null);',
      '',
      '<VirtTableReact',
      '  ref={tableRef}',
      '  columns={columns}',
      "  options={{ list, itemKey: 'id', estimatedSize: 40 }}",
      '/>;',
    ],
  },
};

const activeSnippet = computed(() => snippets[activeFw.value]);
/** 注释行走淡色。刻意不做假的语法高亮 —— 只区分「说明」与「代码」 */
const isComment = (line: string) => /^\s*(\/\/|<!--)/.test(line);

const link = (p: string) => withBase(p);
const guideLink = computed(() => withBase(`/${activeFw.value}/guide/started`));
</script>

<template>
  <div class="vth">
    <!-- ================= Hero ================= -->
    <section class="vth-hero">
      <div class="vth-wrap vth-hero-inner">
        <div>
          <div class="vth-badges">
            <span class="vth-badge">行 + 列双向虚拟化</span>
            <span class="vth-badge vth-badge--plain">TypeScript</span>
            <span class="vth-badge vth-badge--plain">零 UI 框架依赖</span>
            <span class="vth-badge vth-badge--plain">14 个可选插件</span>
          </div>

          <h1 class="vth-title">
            <span class="vth-title-name">VirtTable</span>
            <span class="vth-title-sub">十万行数据，一屏 DOM</span>
          </h1>

          <p class="vth-tagline">
            一套框架无关的虚拟表格内核。Vanilla / Vue / React
            共用同一份逻辑，复杂表格能力齐备，
            <strong>每条性能结论都有实测数字撑着</strong
            >。这一页里跑着的就是真的 10 万行，不是截图。
          </p>

          <div class="vth-actions">
            <a class="vth-btn vth-btn--brand" :href="link('/vanilla/guide/started')">快速开始</a>
            <a class="vth-btn vth-btn--alt" :href="link('/vanilla/examples/basic/basic')">
              在线示例
            </a>
            <a class="vth-btn vth-btn--alt" :href="link('/vanilla/api/index')">API</a>
          </div>

          <div class="vth-install">
            <span class="vth-install-dollar">$</span>
            <span class="vth-install-cmd">npm i @virt-table/vanilla</span>
          </div>
        </div>

        <div>
          <HomeLiveTable />
          <p class="vth-live-hint">
            左右滚动看列虚拟化，点「跳到第 10 万行」看纵向。HUD 读数现场采样，行 DOM
            取实测上界。这张表<strong>不开合并</strong> —— 合并单独放在下一屏演。
          </p>
        </div>
      </div>
    </section>

    <!-- ================= 合并 × 双向虚拟化 =================
      刻意排在第一个内容区块：这是最不容易被替代的能力。
      本区**不带 `--soft`**，于是 hero → plain → 指标 soft → 机制 plain → … 的
      明暗节奏天然接上，下面几个区块的 class 一处都不用改。
    -->
    <section class="vth-sec">
      <div class="vth-wrap">
        <div class="vth-sec-head">
          <p class="vth-eyebrow">Merged cells, still virtual</p>
          <h2 class="vth-h2">合并单元格之下，行与列照样只渲染一屏</h2>
          <p class="vth-lead">
            合并是虚拟表格最容易破功的地方：一个 <code>rowspan</code> 跨两万行的格子，
            天真的实现只能把它物化成两万个 <code>&lt;tr&gt;</code>，虚拟滚动当场失效。
            下面这张表 10 万行、三档合并段同屏、每 20 行还横插一条跨列汇总带 ——
            HUD 里那条「真实跨度 → DOM rowspan」就是全部答案。
          </p>
        </div>

        <HomeMergeTable />

        <div class="vth-mg-notes">
          <article v-for="p in mergeProofs" :key="p.h" class="vth-card vth-mg-note">
            <h3 class="vth-mg-note-h">{{ p.h }}</h3>
            <!-- eslint-disable-next-line vue/no-v-html -- 文案里的 <code> 是本文件的静态常量 -->
            <p class="vth-mg-note-p" v-html="p.p" />
          </article>
        </div>
      </div>
    </section>

    <!-- ================= 实测指标 ================= -->
    <section class="vth-sec vth-sec--soft">
      <div class="vth-wrap">
        <div class="vth-sec-head">
          <p class="vth-eyebrow">Measured</p>
          <h2 class="vth-h2">性能不是形容词，是数字</h2>
          <p class="vth-lead">
            下面每一项都能复现：纯逻辑走 vitest，DOM 行为与帧耗时走 Chrome DevTools
            Protocol（headless + 合成器手势滚动）。测法与陷阱都写在文档里。
          </p>
        </div>

        <div class="vth-metrics">
          <div v-for="m in metrics" :key="m.k" class="vth-metric">
            <div class="vth-metric-v">{{ m.v }}<em>{{ m.unit }}</em></div>
            <div class="vth-metric-k">{{ m.k }}</div>
            <p class="vth-metric-note">{{ m.note }}</p>
          </div>
        </div>

        <p class="vth-foot">
          测量条件、复现步骤与已被证伪的假设，见
          <a :href="link('/vanilla/guide/decisions')">设计决策</a> 与
          <a :href="link('/vanilla/guide/architecture')">架构设计</a>。
        </p>
      </div>
    </section>

    <!-- ================= 流畅度机制 ================= -->
    <section class="vth-sec">
      <div class="vth-wrap">
        <div class="vth-sec-head">
          <p class="vth-eyebrow">How it stays smooth</p>
          <h2 class="vth-h2">流畅度是拆出来的，不是调参调出来的</h2>
          <p class="vth-lead">
            虚拟滚动最难的部分不是「算哪些行可见」，而是每帧只做必要的那点工作、并且不让
            浏览器替你重算全表。这六条都是踩过之后定下来的。
          </p>
        </div>

        <div class="vth-mech">
          <article v-for="(m, i) in mechanisms" :key="m.h" class="vth-card">
            <span class="vth-mech-idx">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3 class="vth-mech-h">{{ m.h }}</h3>
            <!-- eslint-disable-next-line vue/no-v-html -- 文案里的 <code> 是本文件的静态常量 -->
            <p class="vth-mech-p" v-html="m.p" />
            <div class="vth-mech-proof">
              <b>{{ m.proof }}</b>
              <span>{{ m.proofNote }}</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= 三端一致 ================= -->
    <section class="vth-sec vth-sec--soft">
      <div class="vth-wrap vth-fw">
        <div>
          <p class="vth-eyebrow">One core, three bindings</p>
          <h2 class="vth-h2">三端一套逻辑，不是三份实现</h2>
          <p class="vth-lead">
            所有表格行为都在框架无关的 vanilla 层。Vue 与 React 只做 VNode / JSX ↔ DOM
            的桥接和生命周期，因此 API、事件与插件在三端逐条对齐；插件的方法还会自动透传到
            组件 ref 上。
          </p>
          <p class="vth-fw-note">
            示例也按端各出一份：Vanilla 76 个，Vue / React 同步跟进。
          </p>
        </div>

        <div>
          <div class="vth-fw-tabs" role="tablist">
            <button
              v-for="fw in frameworks"
              :key="fw"
              class="vth-fw-tab"
              type="button"
              role="tab"
              :aria-selected="activeFw === fw"
              @click="activeFw = fw"
            >
              <!-- eslint-disable-next-line vue/no-v-html -- 图标来自 useFramework 的静态常量 -->
              <span class="vth-fw-tab-ico" v-html="FRAMEWORK_ICONS[fw]" />
              {{ FW_LABEL[fw] }}
            </button>
          </div>

          <pre class="vth-code"><code><template
            v-for="(line, i) in activeSnippet.lines"
            :key="i"
          ><span v-if="isComment(line)" class="vth-cm">{{ line }}</span><template v-else>{{ line }}</template>
</template></code></pre>

          <p class="vth-fw-note">
            <a :href="guideLink">→ {{ FW_LABEL[activeFw] }} 快速开始</a>
          </p>
        </div>
      </div>
    </section>

    <!-- ================= 能力全景 ================= -->
    <section class="vth-sec">
      <div class="vth-wrap">
        <div class="vth-sec-head">
          <p class="vth-eyebrow">Capabilities</p>
          <h2 class="vth-h2">复杂表格该有的，都在</h2>
          <p class="vth-lead">
            核心只留「不可选」的部分，其余做成插件与内置组件按需装载 —— 只用基础表格时
            CSS 27 kB，全量装齐 45 kB。
          </p>
        </div>

        <div class="vth-caps">
          <article v-for="c in capabilities" :key="c.h" class="vth-card">
            <h3 class="vth-cap-h">
              {{ c.h }}
              <span class="vth-cap-count">{{ c.count }}</span>
            </h3>
            <ul class="vth-cap-list">
              <!-- eslint-disable-next-line vue/no-v-html -- 条目里的 <code> 是本文件的静态常量 -->
              <li v-for="(it, i) in c.items" :key="i" v-html="it" />
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= 工程可信度 ================= -->
    <section class="vth-sec vth-sec--soft">
      <div class="vth-wrap">
        <div class="vth-sec-head">
          <p class="vth-eyebrow">Engineering</p>
          <h2 class="vth-h2">能长期维护，才敢叫专业</h2>
          <p class="vth-lead">
            表格是最容易在第二年崩掉的组件：行高、列宽、滚动几何、样式特异度互相牵扯，
            改一处坏三处。所以这里的护栏不止单元测试。
          </p>
        </div>

        <div class="vth-eng">
          <article v-for="e in engineering" :key="e.h" class="vth-card">
            <div class="vth-eng-v">{{ e.v }}</div>
            <h3 class="vth-eng-h">{{ e.h }}</h3>
            <!-- eslint-disable-next-line vue/no-v-html -- 文案里的 <code> 是本文件的静态常量 -->
            <p class="vth-eng-p" v-html="e.p" />
          </article>
        </div>

        <div class="vth-layers">
          <div
            v-for="l in layers"
            :key="l.n"
            class="vth-layer"
            :class="{ 'vth-layer--core': l.core }"
          >
            <span class="vth-layer-n">{{ l.n }}</span>
            <span class="vth-layer-d">{{ l.d }}</span>
            <span class="vth-layer-t">{{ l.t }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= CTA ================= -->
    <section class="vth-cta">
      <div class="vth-wrap">
        <h2 class="vth-h2">十万行，先滚起来看看</h2>
        <p class="vth-lead">
          装一个包、传一个 <code>list</code> 和 <code>columns</code>，剩下的按需加。
        </p>
        <div class="vth-actions">
          <a class="vth-btn vth-btn--brand" :href="link('/vanilla/guide/started')">快速开始</a>
          <!-- 经典案例（Demos）没有框架段：案例是框架无关的原生实现，只有一份 -->
          <a class="vth-btn vth-btn--alt" :href="link('/demos/')">经典案例</a>
          <a class="vth-btn vth-btn--alt" :href="link('/vanilla/ai/index')">AI 场景</a>
          <a class="vth-btn vth-btn--alt" :href="link('/vanilla/examples/basic/basic')">
            浏览全部示例
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/**
 * 代码块里的注释行。不用 scoped：与 .vth-* 命名空间保持一致，
 * 行内 code 胶囊的样式统一在 styles/home.css 里（这里不重复一份）。
 */
.vth-code .vth-cm {
  color: var(--vtd-text-3);
}
</style>
