<script setup lang="ts">
/**
 * Demos 落地页的主体：一排案例卡片 + 一块 demo 舞台。
 *
 * 早先上面还有一块 hero（左文案 + 右大截图），已经删掉 —— 那张大图和卡片缩略图是同一张
 * 截图，两处并存等于同一件事说两遍，而「选中」和「加载」两个状态还得各画一套高亮。
 * 现在卡片区是**唯一**的切换入口：缩略图底部浮出「▶ 加载 demo」，点了就在下面挂起来；
 * 开头的定位文案回到 `docs/demos/index.md` —— 散文本来就该写在 markdown 里。
 *
 * 进来就先把**电子表格**挂上（`DEFAULT_SLUG`）：一个案例站最没说服力的样子就是首屏
 * 只有截图，得先点一下才有东西动。同时只挂一个 —— 另一个案例是点了才付钱，所以首屏
 * 的代价固定是「一个实例」，与用户手点第一张卡片一样，不会因为默认加载而翻倍。
 *
 * `PlaygroundHost` 自己 watch 了 `exampleId`，所以换案例是卸载重挂，**同时只有一个
 * 实例活着**（与 AiScenarios.vue 同一套做法）。
 *
 * 截图由 `scripts/shoot-demos.mjs` 生成到 `docs/public/demos/<slug>.png`，改了案例的
 * 外观记得重跑一次。
 */
import { computed, nextTick, ref } from 'vue';
import { withBase } from 'vitepress';
import { DEMO_CASES, type DemoCase } from '../../../demoCases';

/** 首屏默认挂哪个案例。找不到（或它被标成规划中）就退回「什么都不挂」 */
const DEFAULT_SLUG = 'spreadsheet';

/**
 * 已加载的案例；`null` 表示舞台空着（点了「收起」之后）。
 *
 * 这是本组件**唯一**的状态 —— 删掉 hero 之后「选中」不再需要单独存一份：
 * 卡片的高亮就是「正在运行的那个」。
 */
const loaded = ref<DemoCase | null>(
  DEMO_CASES.find((c) => c.slug === DEFAULT_SLUG && !c.planned) ?? null,
);

const stageRef = ref<HTMLElement | null>(null);

/**
 * 舞台下面那条**企业版横幅**的数据：案例 slug → 它用到的付费插件。
 *
 * 故意就放在这里、不进 `demoCases.ts`：案例页底下已经有一节长版（标题 + 逐条说明），
 * 这里只要够横幅用的短标签。两处内容本来就该不一样（一个是文档、一个是提示条），
 * 抽成共享清单反而要为「长短两种写法」再加字段。加/改案例时这两处一起改。
 */
const PRO_BY_SLUG: Record<string, { id: string; name: string; items: string[] }[]> = {
  spreadsheet: [
    {
      id: 'formula',
      name: '单元格公式',
      items: ['偏差列整列是公式', 'fx 栏写 A1 公式', '引用高亮', '增量重算'],
    },
    {
      id: 'undo',
      name: '撤销 / 重做',
      items: ['Ctrl/Cmd+Z', '编辑 / 清空 / 合并 / 粘贴', '一次编辑一条'],
    },
    {
      id: 'floating-image',
      name: '浮动图片',
      items: ['拖动（边缘自动滚动）', '四角缩放 / 旋转', '点图看大图与下载', '锁定为水印'],
    },
  ],
  'project-wbs': [
    {
      id: 'gantt',
      name: '甘特图',
      items: [
        '时间轴与甘特条',
        '拖条改期 / 改工期 / 拖进度',
        '配置面板换日期列与上色维度',
        '工作日历（节假日 + 补班）',
        '里程碑竖线',
        '日 / 周 / 月 / 季',
        '拖分界调宽',
      ],
    },
  ],
};

/** 只说**正在运行的那个**案例：横幅紧贴舞台，说别的案例会让人以为是当前 demo 的能力 */
const proOfLoaded = computed(() => (loaded.value ? PRO_BY_SLUG[loaded.value.slug] ?? [] : []));

/** 不传 id 就是企业版首页；`withBase` 是必须的（站点部署在子路径下） */
const enterpriseHref = (id?: string) => withBase(id ? `/enterprise/#${id}` : '/enterprise/');

const shotOf = (c: DemoCase) => withBase(`/demos/${c.slug}.png`);
const pageOf = (c: DemoCase) => withBase(`/demos/${c.slug}`);

const loadedExampleId = computed(() =>
  loaded.value ? `demo-${loaded.value.slug}` : '',
);

async function load(c: DemoCase) {
  if (c.planned) return;
  const wasClosed = loaded.value === null;
  loaded.value = c;
  await nextTick();

  const el = stageRef.value;
  if (!el) return;
  /*
   * 舞台已经在视野里就别抢滚动位置；在视野外才带过去 —— 默认已经挂了一个案例，
   * 所以「首次加载」不再等于「舞台在视野外」：手机上卡片各占一整行，点第二张卡片时
   * 舞台往往还在一屏之下，不滚过去就像是点了没反应。
   */
  const { top } = el.getBoundingClientRect();
  if (wasClosed || top < 0 || top > window.innerHeight * 0.6) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
</script>

<template>
  <div class="dg">
    <div class="dg-cards">
      <component
        :is="c.planned ? 'div' : 'button'"
        v-for="c in DEMO_CASES"
        :key="c.slug"
        :type="c.planned ? undefined : 'button'"
        class="dg-card"
        :class="{ 'is-running': c.slug === loaded?.slug, 'is-planned': c.planned }"
        :aria-pressed="c.planned ? undefined : c.slug === loaded?.slug"
        @click="load(c)"
      >
        <span class="dg-card-shot">
          <template v-if="!c.planned">
            <img
              class="dg-card-img"
              :src="shotOf(c)"
              :alt="`${c.title} 案例截图`"
              loading="lazy"
            />
            <!-- 只占截图底部一条：悬停才浮出，触屏设备常显（没有 hover 可用） -->
            <span class="dg-card-veil">
              <span class="dg-card-cta">
                {{ c.slug === loaded?.slug ? '↻ 重新加载' : '▶ 加载 demo' }}
              </span>
            </span>
          </template>
          <span v-else class="dg-card-todo">规划中</span>
        </span>

        <span class="dg-card-body">
          <span class="dg-card-head">
            <span class="dg-card-title">{{ c.title }}</span>
            <span v-if="c.slug === loaded?.slug" class="dg-badge dg-badge--live">运行中</span>
            <span v-else-if="c.planned" class="dg-badge">规划中</span>
          </span>
          <span class="dg-card-tagline">{{ c.tagline }}</span>
          <span class="dg-card-scale">{{ c.scale }}</span>
          <span class="dg-tags">
            <span v-for="t in c.tags" :key="t" class="dg-tag">{{ t }}</span>
          </span>
        </span>
      </component>
    </div>

    <div ref="stageRef" class="dg-stage">
      <template v-if="loaded">
        <div class="dg-stage-head">
          <span class="dg-stage-title">
            <span class="dg-dot" aria-hidden="true" />
            正在运行：{{ loaded.title }}
          </span>
          <span class="dg-stage-actions">
            <a class="dg-stage-link" :href="pageOf(loaded)">完整说明与源码 →</a>
            <button type="button" class="dg-stage-close" @click="loaded = null">收起</button>
          </span>
        </div>
        <!-- 同时只有这一个实例活着：换案例即卸载重挂 -->
        <PlaygroundHost framework="vanilla" :example-id="loadedExampleId" />
      </template>

      <p v-else class="dg-stage-empty">
        舞台已收起。点上面任意一张卡片，真实 demo 会重新加载在这里 ——
        <strong>同时只有一个实例活着</strong>，这一页自己也得遵守「只为看得见的东西付钱」。
      </p>
    </div>

    <!--
      企业版横幅：紧跟舞台，说的是**正在运行的那个案例**用到了哪些付费插件。
      整块是链接区（点哪条都落到企业版页对应插件），所以用色块而不是正文列表 ——
      正文里那种项目符号列表在 demo 底下会被当成"案例说明"的一部分读过去。
    -->
    <section class="dg-pro">
      <span class="dg-pro-tag">企业版</span>

      <template v-if="proOfLoaded.length">
        <span class="dg-pro-lead">这个案例用到的付费插件：</span>
        <span v-for="p in proOfLoaded" :key="p.id" class="dg-pro-group">
          <a class="dg-pro-name" :href="enterpriseHref(p.id)">
            {{ p.name }}
            <code>@virt-table-pro/{{ p.id }}</code>
            <span aria-hidden="true">→</span>
          </a>
          <span class="dg-pro-items">
            <a
              v-for="item in p.items"
              :key="item"
              class="dg-pro-item"
              :href="enterpriseHref(p.id)"
            >{{ item }}</a>
          </span>
        </span>
      </template>

      <span v-else class="dg-pro-lead">
        这个案例没有用到付费插件。
        <a class="dg-pro-name" :href="enterpriseHref()">看看企业版有哪些插件 →</a>
      </span>
    </section>
  </div>
</template>

<style scoped>
/*
 * 全部走 class 选择器：scoped 会补 [data-v-xxx]，而 demo 内部的 DOM 由 qiankun
 * 同文档挂载、拿不到这个属性，所以天然不会被命中。但仍然不写裸元素后代选择器 ——
 * `PlaygroundHost` 的根节点会继承本组件的 scope id，`.dg-stage div` 之类会漏进去。
 *
 * 尺寸一律 **mobile first**：基础值给窄屏，`@media (min-width: 640px)` 往上加
 * （与 styles/ 下几个文件同一个方向，全站没有 max-width 查询）。
 */
.dg {
  margin: 20px 0 0;
}

/* ---- 案例卡片：整页唯一的切换入口 ---- */
.dg-cards {
  display: grid;
  /*
   * 轨道下限 260px。这个数字是按**最窄的一档正文宽**倒推的：1440 屏减掉侧边栏 272
   * 与右侧大纲栏，正文只有 816px —— 320px 的下限在那里只排得下 2 列、每张 401px，
   * 一张卡片顶掉半屏；260px 刚好排 3 列（每张 262px），1920 屏排 5 列。
   * 再往下就该重画卡片了：240px 以下 tagline 要三行、六个能力标签能占掉四行。
   *
   * `min(260px, 100%)` 里的 min() 不能省：auto-fill 的轨道下限是**硬的**，
   * 正文宽度不到 260px 时（小屏手机）单列轨道会顶出横向滚动条。
   */
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 12px;
}

.dg-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--vtd-border);
  border-radius: var(--vtd-radius-lg);
  background: var(--vtd-bg-elevated);
  transition:
    border-color var(--vtd-transition-fast) var(--vtd-ease),
    box-shadow var(--vtd-transition-fast) var(--vtd-ease),
    transform var(--vtd-transition-fast) var(--vtd-ease);
}

.dg-card:hover {
  border-color: var(--vtd-primary-border);
  box-shadow: var(--vtd-shadow-md);
  transform: translateY(-2px);
}

.dg-card.is-running {
  border-color: var(--vtd-primary);
  box-shadow: var(--vtd-shadow-md);
}

.dg-card.is-planned {
  cursor: default;
  background: var(--vtd-bg-soft);
  box-shadow: none;
  transform: none;
  border-color: var(--vtd-border-light);
}

.dg-card-shot {
  position: relative;
  display: block;
  border-bottom: 1px solid var(--vtd-border-light);
  background: var(--vtd-bg-mute);
}

/*
 * 比例写死成 1560 / 740 —— 与 `scripts/shoot-demos.mjs` 的截图尺寸一致。
 * 一致才意味着 `cover` 不裁掉任何东西（比例一歪就会切掉右侧的列或底部的合计行）。
 * 改截图尺寸时这里和 `.dg-card-todo` 要一起改。
 */
.dg-card-img {
  display: block;
  width: 100%;
  aspect-ratio: 1560 / 740;
  object-fit: cover;
  object-position: top left;
}

/*
 * 「幕布」只盖截图**底部一条**，不再 `inset: 0` 整张盖住 —— 这层唯一的职责是把按钮
 * 从表格线里托出来，盖满反而把缩略图（悬停时正想看清的东西）压暗了。高度由内容决定。
 *
 * 盖在截图上，所以**不用主题令牌**：底下永远是亮色截图（案例只拍亮色），
 * 用 `--vtd-shadow-rgb` 在暗色主题下会变成纯黑，与亮色表格的对比反而更差。
 */
.dg-card-veil {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 7px;
  opacity: 0;
  background: linear-gradient(to top, rgb(15 23 42 / 62%), rgb(15 23 42 / 0%));
  transition: opacity var(--vtd-transition-fast) var(--vtd-ease);
}

.dg-card:hover .dg-card-veil,
.dg-card:focus-visible .dg-card-veil {
  opacity: 1;
}

/* 触屏没有 hover，常显 —— 否则这颗按钮在手机上永远不出现 */
@media (hover: none) {
  .dg-card-veil {
    opacity: 1;
  }
}

.dg-card-cta {
  padding: 4px 11px;
  border-radius: var(--vtd-radius-full);
  background: var(--vtd-primary);
  color: var(--vtd-text-inverse);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  box-shadow: var(--vtd-shadow-sm);
}

/* 规划中的占位：斜纹底 + 文字，与真截图同比例，卡片不会高低不齐 */
.dg-card-todo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1560 / 740;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--vtd-text-3);
  background-image: repeating-linear-gradient(
    45deg,
    var(--vtd-bg-mute) 0 10px,
    var(--vtd-bg-soft) 10px 20px
  );
}

/* 卡片变小之后内边距不再随屏幕加量：352px 宽的卡再留 16px 白边就只剩一句话的宽度 */
.dg-card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  padding: 11px 13px 13px;
}

.dg-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dg-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vtd-text);
}

.dg-card.is-running .dg-card-title {
  color: var(--vtd-primary);
}

.dg-badge {
  padding: 1px 8px;
  border-radius: var(--vtd-radius-full);
  background: var(--vtd-bg-mute);
  color: var(--vtd-text-3);
  font-size: 11px;
  font-weight: 600;
}

.dg-badge--live {
  background: var(--vtd-success-soft);
  color: var(--vtd-success);
}

.dg-card-tagline {
  font-size: 13px;
  line-height: 1.6;
  color: var(--vtd-text-2);
}

.dg-card-scale {
  font-size: 12px;
  color: var(--vtd-text-3);
  font-variant-numeric: tabular-nums;
}

.dg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.dg-tag {
  padding: 2px 8px;
  border-radius: var(--vtd-radius-sm);
  background: var(--vtd-primary-softer);
  color: var(--vtd-primary);
  font-size: 11px;
  line-height: 1.6;
}

.dg-card.is-planned .dg-tag {
  background: var(--vtd-bg-mute);
  color: var(--vtd-text-3);
}

/* ---- 舞台：真实 demo 挂在这里 ---- */
.dg-stage {
  margin: 20px 0 0;
  scroll-margin-top: calc(var(--vp-nav-height, 64px) + 16px);
}

/* 窄屏竖排：标题一行、动作一行；宽屏才左右对齐（见下方 min-width: 640px） */
.dg-stage-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vtd-border-light);
}

.dg-stage-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--vtd-text);
}

.dg-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--vtd-radius-full);
  background: var(--vtd-success);
}

.dg-stage-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}

.dg-stage-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--vtd-primary);
}

.dg-stage-close {
  /* 手机上按 4px 上下内边距只有 26px 高，点不准；宽屏再收回去 */
  padding: 6px 14px;
  cursor: pointer;
  border: 1px solid var(--vtd-border);
  border-radius: var(--vtd-radius-md);
  background: var(--vtd-bg);
  color: var(--vtd-text-2);
  font-size: 12px;
  transition:
    border-color var(--vtd-transition-fast) var(--vtd-ease),
    color var(--vtd-transition-fast) var(--vtd-ease);
}

.dg-stage-close:hover {
  border-color: var(--vtd-border-strong);
  color: var(--vtd-text);
}

.dg-stage-empty {
  margin: 0;
  padding: 16px 14px;
  border: 1px dashed var(--vtd-border);
  border-radius: var(--vtd-radius-lg);
  background: var(--vtd-bg-soft);
  font-size: 13px;
  line-height: 1.7;
  color: var(--vtd-text-3);
}

/* ---- 企业版横幅：舞台正下方的色块 ---- */
/*
 * ⚠️ 里面的链接选择器都写成**两层类**（`.dg-pro .dg-pro-x`）。本站正文排版挂在
 * `[data-vp-example]` 上，其中 `[data-vp-example] a:not(.playground-shell *)`
 * 是 0,2,1；单层类 + scoped 属性只有 0,2,0，会被它加上下划线。多一层块类变成
 * 0,3,0 就压得住，也不用 `!important`（那会连主题覆盖一起挡掉）。
 */
.dg-pro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin: 14px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--vtd-warning-border);
  border-left: 3px solid var(--vtd-warning);
  border-radius: var(--vtd-radius-lg);
  background: var(--vtd-warning-soft);
}

.dg-pro-tag {
  padding: 1px 8px;
  border-radius: var(--vtd-radius-sm);
  background: var(--vtd-warning);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
}

.dg-pro-lead {
  font-size: 13px;
  color: var(--vtd-text-2);
}

/*
 * 一个插件**独占一行**：`flex-basis: 100%` 在这个 wrap 容器里就是「从我开始换行」。
 * 不这么钉的话两个插件会挤在同一行、包名与另一个插件的能力标签混在一起，
 * 读的人分不清哪个标签属于哪个插件。
 */
.dg-pro-group {
  display: flex;
  flex: 0 0 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.dg-pro .dg-pro-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vtd-primary);
  text-decoration: none;
}

.dg-pro .dg-pro-name:hover {
  text-decoration: underline;
}

.dg-pro-name code {
  font-size: 11px;
  font-weight: 400;
}

.dg-pro-items {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 标签本身也可点：横幅上任何一处都能进企业版页，不用先找那个包名 */
.dg-pro .dg-pro-item {
  padding: 1px 8px;
  border: 1px solid var(--vtd-warning-border);
  border-radius: var(--vtd-radius-full);
  background: var(--vtd-bg);
  color: var(--vtd-text-2);
  font-size: 11px;
  font-weight: 400;
  line-height: 18px;
  text-decoration: none;
  transition: color var(--vtd-transition-fast) var(--vtd-ease);
}

.dg-pro .dg-pro-item:hover {
  color: var(--vtd-warning);
}

/* ---- 宽屏加量：留白与横排都从这里开始 ---- */
@media (min-width: 640px) {
  .dg,
  .dg-stage {
    margin: 28px 0 0;
  }

  .dg-cards {
    gap: 14px;
  }

  .dg-stage-head {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .dg-stage-close {
    padding: 4px 12px;
  }

  .dg-stage-empty {
    padding: 22px 20px;
  }
}
</style>
