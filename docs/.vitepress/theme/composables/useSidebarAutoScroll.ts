import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from 'vitepress';

const SIDEBAR_SELECTOR = '.VPSidebar';
/** 激活项与侧栏上下边缘的最小留白，小于它就算“贴边”，需要重新居中 */
const EDGE_PADDING = 24;

/**
 * 把侧边栏当前激活项滚动到可视区域中部。
 * 只改侧栏自身的 scrollTop，不用 scrollIntoView —— 后者会连带滚动整个页面，
 * 刷新时会把正文位置/锚点一起带偏。
 */
function scrollActiveItemIntoView(behavior: ScrollBehavior): void {
  const sidebar = document.querySelector<HTMLElement>(SIDEBAR_SELECTOR);
  // 侧栏未渲染（首页无侧栏）或不可见时直接跳过
  if (!sidebar || sidebar.clientHeight === 0) return;

  // 父分组只有 has-active，精确命中的那条才带 is-active；取最后一条以防嵌套
  const actives = sidebar.querySelectorAll<HTMLElement>('.VPSidebarItem.is-active > .item');
  const target = actives[actives.length - 1];
  if (!target) return;

  const box = sidebar.getBoundingClientRect();
  const item = target.getBoundingClientRect();
  // 桌面端侧栏顶部有 nav 高度的内边距 + sticky 的 .curtain 遮罩，这段不算可视区
  const topInset = parseFloat(getComputedStyle(sidebar).paddingTop) || 0;
  const viewTop = box.top + topInset;
  const viewHeight = box.bottom - viewTop;

  // 已经在视野内就不动，避免点击可见项时出现无谓的跳动
  const visible = item.top >= viewTop + EDGE_PADDING && item.bottom <= box.bottom - EDGE_PADDING;
  if (visible) return;

  const delta = item.top - viewTop - (viewHeight - item.height) / 2;
  sidebar.scrollTo({ top: sidebar.scrollTop + delta, behavior });
}

/** 首屏加载与路由切换后，自动把侧边栏激活项定位到可视区域 */
export function useSidebarAutoScroll(): void {
  const route = useRoute();
  let raf = 0;

  // 等两帧：hydration 之后侧栏分组的展开态才落定，此时量到的位置才准
  const schedule = (behavior: ScrollBehavior) => {
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => scrollActiveItemIntoView(behavior));
    });
  };

  onMounted(() => schedule('auto'));

  const stopWatch = watch(
    () => route.path,
    () => schedule('smooth'),
  );

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    stopWatch();
  });
}
