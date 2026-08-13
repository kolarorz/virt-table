<script setup lang="ts">
import type { MicroApp } from 'qiankun';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type FrameworkKind = 'vanilla' | 'vue' | 'react';

const props = withDefaults(
  defineProps<{
    framework?: FrameworkKind;
    exampleId?: string;
  }>(),
  {
    framework: 'vanilla',
    exampleId: '',
  },
);

const framework = computed(() => props.framework);
const exampleId = computed(() => props.exampleId);
const containerRef = ref<HTMLElement | null>(null);
const isMounted = ref(false);
const isLoading = ref(false);
const loadError = ref('');
const eventLog = ref<string[]>([]);

let currentApp: MicroApp | null = null;

const isDev = (import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV;

const base = (import.meta as any).env.BASE_URL || '/';
const appEntries: Record<FrameworkKind, string> = {
  vanilla: isDev ? 'http://localhost:7901/' : `${base}micro-apps/vanilla/`,
  vue: isDev ? 'http://localhost:7902/' : `${base}micro-apps/vue/`,
  react: isDev ? 'http://localhost:7903/' : `${base}micro-apps/react/`,
};

const appNames: Record<FrameworkKind, string> = {
  vanilla: 'vanillaDemo',
  vue: 'vueDemo',
  react: 'reactDemo',
};

const resolveFramework = (fw: string): FrameworkKind => {
  if (fw === 'vanilla' || fw === 'vue' || fw === 'react') return fw;
  return 'vanilla';
};

const appendLog = (message: string) => {
  eventLog.value = [message, ...eventLog.value].slice(0, 8);
};

async function getQiankunApi() {
  const w = window as any;
  if (w.__playgroundQiankun) return w.__playgroundQiankun;
  const api = await import('qiankun');
  w.__playgroundQiankun = api;
  return api;
}

function ensureStarted(api: { start: typeof import('qiankun').start }) {
  const w = window as any;
  if (!w.__playgroundStarted) {
    api.start({ sandbox: true, prefetch: false });
    w.__playgroundStarted = true;
  }
}

const mountApp = async () => {
  if (!containerRef.value) return;

  isLoading.value = true;
  loadError.value = '';

  try {
    const api = await getQiankunApi();
    ensureStarted(api);

    if (currentApp) {
      await currentApp.unmount();
      currentApp = null;
    }

    containerRef.value.innerHTML = '';

    const targetFramework = resolveFramework(framework.value);
    // 先存局部常量：currentApp 是被多个闭包写入的 let，await 后类型收窄会失效
    const app = api.loadMicroApp({
      name: appNames[targetFramework],
      entry: appEntries[targetFramework],
      container: containerRef.value,
      props: {
        framework: targetFramework,
        exampleId: exampleId.value,
        onEvent: (payload: { framework: FrameworkKind; message: string }) =>
          appendLog(`[${payload.framework}] ${payload.message}`),
      },
    });

    currentApp = app;

    await app.mountPromise;
    isMounted.value = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : '微应用加载失败';
    loadError.value = message;
    isMounted.value = false;
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await mountApp();
});

watch([framework, exampleId], async () => {
  await mountApp();
});

onBeforeUnmount(async () => {
  if (currentApp) {
    await currentApp.unmount();
    currentApp = null;
  }
});
</script>

<template>
  <section class="playground-shell">
    <div v-if="loadError" class="status error">
      {{ loadError }}
    </div>
    <div v-else-if="isLoading" class="status loading">微应用加载中...</div>
    <div v-else-if="!isMounted" class="status warning">微应用尚未挂载。</div>

    <div ref="containerRef" class="micro-container" />
  </section>
</template>
