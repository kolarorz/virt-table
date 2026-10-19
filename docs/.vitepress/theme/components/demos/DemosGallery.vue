<script setup lang="ts">
/**
 * Demos 落地页的主体：一堵**纯卡片墙**，点一张就去那个案例自己的页面。
 *
 * ## 这一页刻意**不挂 demo**（2026-08-31 改的）
 *
 * 早先这里有一块「舞台」：点卡片就地把 demo 挂起来，首屏还默认挂着电子表格。结果同一个
 * demo 跑在**两处** —— 这里一处、案例页的「在线体验」一处。合成一处时留的是案例页那一处：
 *
 * - **一个 demo 一个 URL**。案例页能分享、能被搜索引擎收录、能被企业版文档与
 *   `demoCases.ts` 之外的地方直接链过去；而「总览页上第几张卡片被点开了」不是个地址。
 * - **从外部链接落进 `/demos/spreadsheet` 的人得看到真表格**。舞台留在总览页的话，
 *   那些人只会看到一篇说明文。
 * - 十万行 × 65 列的案例挂起来不便宜（造数 + 建表 + 9.75 万条公式）。总览页的职责是
 *   **让人挑**，挑的时候不该先付一次挂载的钱。
 *
 * 代价如实记下来：**总览页首屏不再有东西在跑**。原来那块舞台的注释里写着
 * 「一个案例站最没说服力的样子就是首屏只有截图」—— 那句话仍然对，只是它该由**案例页**
 * 的首屏来满足，而不是由总览页替所有案例满足一遍。
 *
 * 截图由 `scripts/shoot-demos.mjs` 生成到 `docs/public/demos/<slug>.png`，改了案例的
 * 外观记得重跑一次。
 */
import { withBase } from 'vitepress';
import { DEMO_CASES, type DemoCase } from '../../../demoCases';

/**
 * 案例 slug → 它用到的付费插件名。
 *
 * 原来这是一整块「企业版横幅」的数据（紧贴舞台，说的是"正在运行的那个案例"）。
 * 舞台没了之后横幅也没了依附对象 —— 改成卡片上的一行短标签：挑案例的时候就该看得见
 * 「这个案例里有付费能力」，而逐条说明在案例页的「本案例中涉及企业版功能」那一节（长版）。
 *
 * 故意不进 `demoCases.ts`：那份清单同时被 Node 侧的 `config.ts` 吃，而这是纯展示数据。
 * 加/改案例时这里与案例页那一节一起改。
 */
const PRO_BY_SLUG: Record<string, string[]> = {
  spreadsheet: ['公式', '撤销 / 重做', '浮动图片', '透视表', '真 xlsx 与 PDF'],
  'project-wbs': ['甘特图'],
};

const shotOf = (c: DemoCase) => withBase(`/demos/${c.slug}.png`);
const pageOf = (c: DemoCase) => withBase(`/demos/${c.slug}`);
const enterpriseHref = withBase('/enterprise/');
</script>

<template>
  <div class="dg">
    <div class="dg-cards">
      <!--
        能点的卡片是 `<a>` 而不是 `<button>`：它就是一个跳转，用按钮的话会丢掉
        中键新开、右键复制链接、以及爬虫看得见的 href。规划中的那张没有目标页
        （`demoCases.ts` 里打了 `planned`），所以退化成 `<div>`。
      -->
      <component
        :is="c.planned ? 'div' : 'a'"
        v-for="c in DEMO_CASES"
        :key="c.slug"
        :href="c.planned ? undefined : pageOf(c)"
        class="dg-card"
        :class="{ 'is-planned': c.planned }"
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
              <span class="dg-card-cta">查看案例与源码 →</span>
            </span>
          </template>
          <span v-else class="dg-card-todo">规划中</span>
        </span>

        <span class="dg-card-body">
          <span class="dg-card-head">
            <span class="dg-card-title">{{ c.title }}</span>
            <span v-if="c.planned" class="dg-badge">规划中</span>
          </span>
          <span class="dg-card-tagline">{{ c.tagline }}</span>
          <span class="dg-card-scale">{{ c.scale }}</span>
          <span class="dg-tags">
            <span v-for="t in c.tags" :key="t" class="dg-tag">{{ t }}</span>
          </span>
          <!--
            付费信号：挑案例时就该看得见。这里只给插件名，逐条说明在案例页那一节。
            **不是链接** —— 整张卡片已经是一个 `<a>`，里面再套一个 `<a>` 是非法嵌套
            （浏览器会把内层拆出去，点击区域随之错乱）。想去企业版就走下面那一行。
          -->
          <span v-if="PRO_BY_SLUG[c.slug]" class="dg-card-pro">
            <span class="dg-card-pro-tag">企业版</span>
            <span class="dg-card-pro-names">{{ PRO_BY_SLUG[c.slug].join(' · ') }}</span>
          </span>
        </span>
      </component>
    </div>

    <p class="dg-foot">
      <!-- 这里是 Vue 模板不是 markdown，加粗只能用 <strong> —— `**…**` 会原样显示出星号 -->
      每个案例页的首屏就是<strong>真实运行的表格</strong>，下面接完整说明与可展开的源码。
      带「企业版」标签的案例里有付费插件 ——
      <a :href="enterpriseHref">看看有哪些 →</a>
    </p>
  </div>
</template>

<style scoped>
/*
 * 全部走 class 选择器，且不写裸元素后代选择器。
 *
 * 这一页现在不挂 demo 了（见脚本段头注），所以「不能命中 demo 内部 DOM」那条约束在这里
 * 已经不适用 —— 但写法保持不变：案例页那边的组件仍然要守这条，两处风格一致才不会有人
 * 从这里抄一份带裸元素选择器的样式过去。
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

.dg-badge {
  padding: 1px 8px;
  border-radius: var(--vtd-radius-full);
  background: var(--vtd-bg-mute);
  color: var(--vtd-text-3);
  font-size: 11px;
  font-weight: 600;
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

/*
 * 卡片上的付费标签。
 *
 * 与卡片其余文字**同一层缩进**、只靠一枚小色块区分 —— 不做成醒目的角标：它是选案例时
 * 的一条参考信息，不是这一页要推销的东西（推销放在企业版页）。
 */
.dg-card-pro {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
}

.dg-card-pro-tag {
  flex: 0 0 auto;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--vtd-warning-soft);
  color: var(--vtd-warning);
  font-size: 11px;
  font-weight: 600;
}

.dg-card-pro-names {
  color: var(--vtd-text-3);
}

.dg-card.is-planned .dg-card-pro-tag {
  background: var(--vtd-bg-mute);
  color: var(--vtd-text-3);
}

/* ---- 卡片墙底下那一句：把「案例页首屏才是 demo」说出来 ---- */
.dg-foot {
  margin: 16px 0 0;
  color: var(--vtd-text-3);
  font-size: 13px;
  line-height: 1.7;
}

/* ---- 宽屏加量：留白与横排都从这里开始 ---- */
@media (min-width: 640px) {
  .dg {
    margin: 28px 0 0;
  }

  .dg-cards {
    gap: 14px;
  }



}
</style>
