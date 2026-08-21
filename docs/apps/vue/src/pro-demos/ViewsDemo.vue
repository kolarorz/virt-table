<script setup lang="ts">
/**
 * 命名视图 demo（Vue 端）。
 *
 * 那一行 `import '@virt-table-pro/views/index.css'` 是**照客户真实用法写的** ——
 * 付费包的产物里 JS 与 CSS 分开产出，必须自己引。
 *
 * 实例方法一律走 `?.`：桩档（没有付费包）下它们**在运行时确实不存在**。文档页在桩档下
 * 不会嵌这个 demo（`ProDemo` 换成说明卡），但微应用能被单独打开
 * （`localhost:7902/?example=pro-views`），那条路要说得清。
 *
 * 存储用**自己的 storageKey**：默认 key 是固定的，同一个域下多张表用默认值会互相覆盖
 * —— 三端各一个 key，切框架看 demo 时互不干扰。
 */
import { onMounted, ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';
import { makeColumns, makeRows } from '../../../pro-kit/shared/data';
import type { ProTableInstance } from './types';

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
const panelBtn = ref<HTMLButtonElement | null>(null);
const saved = ref<string[]>([]);

const columns = makeColumns();
const options = {
  list: makeRows(),
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  stripe: true,
  border: true,
  plugins: [vtViews({ storageKey: 'vtp-vue-views', onViewChange: (name) => refresh(name) })],
};

function refresh(name?: string | null): void {
  const api = tableRef.value;
  if (!api) return;
  if (!api.listViews) {
    emit('status', '付费插件未装载：@virt-table-pro/views 不在（当前是桩档）');
    return;
  }
  const views = api.listViews?.();
  saved.value = views.map((v) => v.name);
  emit(
    'status',
    `当前视图：${name ?? api.getCurrentView?.() ?? '（未应用）'} · 已保存 ${views.length} 个`,
  );
}

// 首帧 ref 还没落地，等挂载后读一次
onMounted(() => refresh());

const save = (): void => {
  const name = prompt('视图名称', tableRef.value?.getCurrentView?.() ?? '我的视图');
  if (!name) return;
  tableRef.value?.saveView?.(name);
  refresh(name);
};

const exportJson = (): void => {
  // 控制台看完整内容；状态栏只放个长度，免得把整串 JSON 糊在界面上
  const json = tableRef.value?.exportViews?.() ?? '';
  console.log('[views] exportViews():', json);
  emit('status', `已导出 ${json.length} 字符到 console`);
};

const importJson = (): void => {
  const json = prompt('粘贴视图 JSON（整体替换现有列表）');
  if (!json) return;
  emit('status', tableRef.value?.importViews?.(json) ? '导入成功' : '导入失败：不是合法的视图 JSON');
  refresh();
};
</script>

<template>
  <div class="pg-toolbar">
    <button class="pg-btn" ref="panelBtn" @click="tableRef?.toggleViewPanel?.(panelBtn ?? undefined)">
      视图面板
    </button>
    <button class="pg-btn" @click="save">保存视图</button>
    <button class="pg-btn" @click="exportJson">导出 JSON</button>
    <button class="pg-btn" @click="importJson">导入 JSON</button>
  </div>

  <div class="pg-table">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>

  <div class="pg-aside">
    <div class="pg-aside-box">
      {{ saved.length ? `已保存：${saved.join(' · ')}` : '还没有保存的视图' }}
    </div>
  </div>
</template>
