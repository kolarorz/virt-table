<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vitepress';
import {
  getModuleLink,
  useFramework,
  type ModuleName,
} from '../composables/useFramework';

const props = defineProps<{
  text: string;
  mod: ModuleName;
}>();

const router = useRouter();
const { currentFramework, currentModule } = useFramework();

const href = computed(() => getModuleLink(currentFramework.value, props.mod));
/**
 * 按**路径段**判断激活，不能用 `route.path.includes(mod)`：
 * `ai` 是任意子串，`/vue/examples/plugins/ai-column` 会让「AI 场景」和「示例」同时亮。
 * `currentModule` 只认第二段，天然精确。
 */
const isActive = computed(() => currentModule.value === props.mod);

function navigate(e: MouseEvent) {
  e.preventDefault();
  router.go(href.value);
}
</script>

<template>
  <a
    class="VPNavBarMenuLink"
    :href="href"
    :class="{ active: isActive }"
    @click="navigate"
  >
    <span>{{ text }}</span>
  </a>
</template>

<style scoped>
.VPNavBarMenuLink {
  display: flex;
  align-items: center;
  padding: 0 12px;
  line-height: var(--vp-nav-height);
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}

.VPNavBarMenuLink.active {
  color: var(--vp-c-brand-1);
}

.VPNavBarMenuLink:hover {
  color: var(--vp-c-brand-1);
}
</style>
