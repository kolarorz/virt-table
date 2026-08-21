<script setup lang="ts">
/**
 * 付费插件文档里的**跨页链接**，按当前框架解析。
 *
 * ## 为什么需要它
 *
 * 这些页的正文（`docs/.enterprise/`）三端共用一份，而 URL 里带着框架段
 * （`/vue/enterprise/gantt/options`）。于是共享片段里没法写死链接目标：
 * 写 `/vanilla/enterprise/undo` 会把 Vue 读者踢到 vanilla 那一端。
 *
 * 所以片段里写 `<ProLink to="undo">撤销 / 重做</ProLink>`，落地时才拼出
 * `/{当前框架}/enterprise/undo`。
 *
 * `core` 指向核心自己的文档（同样带框架段）：
 * `<ProLink core="api/instance">实例方法</ProLink>` → `/{fw}/api/instance`。
 *
 * 两者都不给就当无框架维度的站内路径用（`href`，如 `/demos/spreadsheet`）。
 *
 * 三种情况都过 `useProHref`：它补站点 base，也补 `.html`（本站没开 `cleanUrls`）。
 * 裸 `withBase` 只做第一件事，拼出来的链接在产物里 404 —— 第一版就是这么错的。
 */
import { computed } from 'vue';
import { useFramework } from '../composables/useFramework';
import { useProHref } from '../composables/useProHref';

const props = withDefaults(
  defineProps<{
    /** 付费插件页的 slug，相对 `/{fw}/enterprise/`，可带 `#锚点`（如 `gantt/options#配置项`） */
    to?: string;
    /** 核心文档路径，相对 `/{fw}/`（如 `api/instance`） */
    core?: string;
    /** 不带框架维度的站内绝对路径（如 `/demos/spreadsheet`） */
    href?: string;
  }>(),
  { to: '', core: '', href: '' },
);

const { currentFramework } = useFramework();
const proHref = useProHref();

const resolved = computed(() => {
  const fw = currentFramework.value;
  if (props.to) return proHref(`/${fw}/enterprise/${props.to}`);
  if (props.core) return proHref(`/${fw}/${props.core}`);
  return proHref(props.href || '/');
});
</script>

<template>
  <a :href="resolved"><slot /></a>
</template>
