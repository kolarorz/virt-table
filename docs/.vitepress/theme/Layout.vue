<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useRoute } from 'vitepress';
import { nextTick, onBeforeUnmount, watch } from 'vue';
import FrameworkSwitch from './components/FrameworkSwitch.vue';
import { useSidebarAutoScroll } from './composables/useSidebarAutoScroll';

const route = useRoute();

// 刷新 / 换页后把侧边栏激活项带进视野
useSidebarAutoScroll();
const MARKER_ATTR = 'data-vp-example';

/**
 * 页面内是否会嵌 demo（qiankun 同文档挂载）。
 *
 * 这类页面必须摘掉 `.vp-doc` 换成 `[data-vp-example]` —— VitePress 自带的
 * `.vp-doc table`(0,1,1) 会压过 `.vt-table`(0,1,0)，把 `display: table` 顶成
 * `display: block`、把单元格内边距顶成 8/16px，colgroup 列宽体系与虚拟滚动的
 * 行高账本一起崩（详见 styles/styles-contract.test.ts 的头注）。
 *
 * 所以**新增任何嵌 demo 的路径都要登记到这里**，`/ai/` 就是这么进来的。
 */
const DEMO_HOSTING_SEGMENTS = ['/examples/', '/ai/'];
const isExamplePage = (path: string): boolean =>
  DEMO_HOSTING_SEGMENTS.some((seg) => path.includes(seg));

const syncDocClass = (path: string) => {
  if (typeof document === 'undefined') return;

  const nodes = document.querySelectorAll<HTMLElement>(`.vp-doc, [${MARKER_ATTR}]`);
  nodes.forEach((el) => {
    if (isExamplePage(path)) {
      el.classList.remove('vp-doc');
      el.setAttribute(MARKER_ATTR, '');
    } else {
      el.classList.add('vp-doc');
      el.removeAttribute(MARKER_ATTR);
    }
  });
};

const stopWatch = watch(
  () => route.path,
  async (path) => {
    if (typeof window === 'undefined') return;
    await nextTick();
    requestAnimationFrame(() => syncDocClass(path));
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopWatch();
});
</script>

<template>
  <DefaultTheme.Layout>
    <template #nav-bar-content-before>
      <FrameworkSwitch />
    </template>
  </DefaultTheme.Layout>
</template>
