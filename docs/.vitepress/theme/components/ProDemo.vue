<script setup lang="ts">
/**
 * 付费插件文档页的 demo 位。
 *
 * 两条分支：
 *
 *   1. 给了 `example-id` **且**当前框架端这次构建带上了付费能力 → 嵌真 demo
 *      （`PlaygroundHost`，qiankun 同文档挂载，与「功能」那些页同一套机制）；
 *   2. 其余情况 → 一张说明卡。
 *
 * ## 第 2 条为什么必须存在
 *
 * 付费包不一定在构建那台机器上：外部贡献者、fork、没铺离线包的 CI 一律落在 `off` 档
 * （见 `build/pro-mode.ts`）。那时候如果照旧嵌 demo，读者看到的是**一张没有付费功能的
 * 普通表格** —— 分不清是「这个插件就这样」还是「站坏了」，而这个故障没有任何外部症状。
 *
 * 所以档位由 `themeConfig.proModes` 明确告知（`docs/.vitepress/config.ts` 算出来，值来自与
 * 微应用**同一个**解析器）。文档站运行时读不到微应用的构建期变量，只能这样传进来。
 *
 * ⚠️ 不要改回 `vite.define`：那样 **dev 下不生效**（VitePress 的 dev server 不把用户的
 * define 应用到主题组件的 SFC 转换上），表现是 `pnpm dev` 时每个插件页都显示占位卡，
 * 而构建产物是对的 —— 只验构建照不出这个 bug。
 *
 * ## 为什么框架端取当前页面所在的那一端
 *
 * 这些页在 `/{fw}/enterprise/*` 下，Vue 文档里就该看到 Vue 版的 demo 跑起来 ——
 * 付费插件与框架无关，但「能用」只有真的在那一端跑起来才算数。
 */
import { computed } from 'vue';
import { useData } from 'vitepress';
import { useFramework } from '../composables/useFramework';
import { useProHref } from '../composables/useProHref';

const props = withDefaults(
  defineProps<{
    /** 包名，如 `@virt-table-pro/gantt` */
    pkg: string;
    /** 微应用里的示例 id（约定 `pro-<插件>`）。不给就只出说明卡 */
    exampleId?: string;
    /** 能看到它真跑起来的经典案例链接，如 `/demos/spreadsheet#浮动图片` */
    to?: string;
    /** 上面那条链接的文案 */
    label?: string;
  }>(),
  { exampleId: '', to: '', label: '' },
);

const { currentFramework } = useFramework();
const { theme } = useData();
const proHref = useProHref();

type ProMode = 'src' | 'installed' | 'off';

/** 拿不到就兜一个 off（宁可少嵌一个 demo，也不要抛在读者脸上） */
const proMode = computed<ProMode>(() => {
  const modes = (theme.value as { proModes?: Record<string, ProMode> }).proModes;
  return modes?.[currentFramework.value] ?? 'off';
});

const showLive = computed(() => Boolean(props.exampleId) && proMode.value !== 'off');
/** 有 demo 但这次构建没带付费能力 —— 与「压根还没有 demo」是两回事，文案要分开 */
const stubbed = computed(() => Boolean(props.exampleId) && proMode.value === 'off');

const caseHref = computed(() => (props.to ? proHref(props.to) : ''));
const enterpriseHref = proHref('/enterprise/');
</script>

<template>
  <PlaygroundHost v-if="showLive" :framework="currentFramework" :example-id="props.exampleId" />

  <div v-else class="pro-demo">
    <p class="pro-demo-head">
      <span class="pro-demo-tag">付费插件</span>
      <code>{{ props.pkg }}</code>
    </p>

    <p v-if="stubbed" class="pro-demo-body">
      这个 demo 需要付费包，而<b>本次构建不含付费能力</b>（解析到桩）。功能与授权方式见
      <a :href="enterpriseHref">企业版</a>。
    </p>
    <p v-else-if="props.to" class="pro-demo-body">
      在线体验：<a :href="caseHref">{{ props.label || '经典案例' }}</a>
      —— 那个案例装的是本插件的正式产物，你现在就能点。
    </p>
    <p v-else class="pro-demo-body">
      这个能力还没有在线 demo。需要试用密钥或想看它跑起来，见
      <a :href="enterpriseHref">企业版</a>。
    </p>
  </div>
</template>

<style scoped>
.pro-demo {
  margin: 20px 0 24px;
  padding: 14px 16px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.pro-demo-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  flex-wrap: wrap;
}

.pro-demo-tag {
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 12px;
  line-height: 18px;
}

.pro-demo-body {
  margin: 8px 0 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
</style>
