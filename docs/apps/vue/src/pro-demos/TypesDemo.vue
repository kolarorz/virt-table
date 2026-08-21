<script setup lang="ts">
/**
 * 类型注入链路的验证页（Vue 端）。
 *
 * ⚠️ **这一端的类型链路与 React 端不同，而且是断的** —— 运行时完全正常，只有类型到不了。
 * 原因与核心侧的修法见 `./types.ts` 里 `TableInstance` 的注释，以及文档站的「调试栈」。
 *
 * 与其它 demo 的分工：那些验证**单个插件的行为**（一张表只装一个），
 * 这一张刻意把三个付费插件装在一起，顺带验证它们互不干扰。
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { setLicenseKey, vtLicense } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';
import { vtUndo, type HistoryChangeInfo } from '@virt-table-pro/undo';
import { PRO_DEMO_LICENSE_KEY } from '../../../pro-kit/demo-license';
import { columns, makeRows } from '../../../pro-kit/shared/data';
import { onCellEdit } from '../../../pro-kit/shared/edit-hook';
import type { ProTableInstance } from './types';
import { REDO_PATHS, UNDO_PATHS } from '../../../pro-kit/shared/icons';
import Icon from './Icon.vue';

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
const viewsBtn = ref<HTMLButtonElement | null>(null);
const history = ref<HistoryChangeInfo>({
  canUndo: false,
  canRedo: false,
  labels: { undo: [], redo: [] },
});

const options = {
  list: makeRows(),
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  stripe: true,
  border: true,
  plugins: [
    vtLicense(),
    vtViews({ storageKey: 'vtp-vue-types' }),
    vtUndo({ onChange: (info) => (history.value = info) }),
    vtCellEditor(),
  ],
};

onMounted(() => {
  onCellEdit(({ row, key, before, after, label }) => {
    tableRef.value?.recordChange?.({
      label,
      undo: () => {
        row[key] = before;
        tableRef.value?.forceUpdate();
      },
      redo: () => {
        row[key] = after;
        tableRef.value?.forceUpdate();
      },
    });
  });
});
onUnmounted(() => onCellEdit(null));

const save = (): void => {
  const name = prompt('视图名称', tableRef.value?.getCurrentView?.() ?? '我的视图');
  if (!name) return;
  tableRef.value?.saveView?.(name);
  emit('status', `当前视图：${name} · 已保存 ${tableRef.value?.listViews?.().length ?? 0} 个`);
};

const applyLicense = (): void => {
  setLicenseKey(PRO_DEMO_LICENSE_KEY);
  tableRef.value?.refreshLicenseBadge?.();
  emit(
    'status',
    `已应用测试许可（${tableRef.value?.getLicenseStatus?.().payload?.sub}），角标应当消失`,
  );
};
</script>

<template>
  <div class="pg-toolbar">
    <button class="pg-btn" ref="viewsBtn" @click="tableRef?.toggleViewPanel?.(viewsBtn ?? undefined)">
      视图面板
    </button>
    <button class="pg-btn" @click="save">保存当前视图</button>
    <button class="pg-btn" :disabled="!history.canUndo" @click="tableRef?.undo?.()">
      <Icon :paths="UNDO_PATHS" />
      撤销
    </button>
    <button class="pg-btn" :disabled="!history.canRedo" @click="tableRef?.redo?.()">
      <Icon :paths="REDO_PATHS" />
      重做
    </button>
    <button class="pg-btn" @click="applyLicense">应用测试许可</button>
  </div>

  <div class="pg-table">
    <!-- 三端的 props 形状一致：`columns` + `options`，表格配置都在 options 里 -->
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>

  <div class="pg-aside">
    <div class="pg-aside-box">历史（近 → 远）：{{ history.labels.undo.join(' ← ') || '空' }}</div>
  </div>
</template>
