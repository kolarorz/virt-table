<script setup lang="ts">
/**
 * 撤销 / 重做 demo（Vue 端）：`vtUndo` + 核心的 `vtCellEditor`。
 *
 * 装 `vtCellEditor` 不是「依赖」—— `vtUndo` 的自动层（列宽/排序/筛选）单独就能跑。
 * 装它是为了演示**手动层**：金额格可编辑之后，才有「核心不通知的数据变更」可撤销。
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { vtUndo, type HistoryChangeInfo } from '@virt-table-pro/undo';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import { onCellEdit } from '../../../pro-kit/shared/edit-hook';
import type { ProTableInstance } from './types';
import { REDO_PATHS, UNDO_PATHS } from '../../../pro-kit/shared/icons';
import Icon from './Icon.vue';

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
const history = ref<HistoryChangeInfo>({
  canUndo: false,
  canRedo: false,
  labels: { undo: [], redo: [] },
});

const rows: Row[] = makeRows();
const columns = makeColumns({ editable: true });

const renderHistory = (info: HistoryChangeInfo): void => {
  history.value = info;
  emit('status', `可撤销 ${info.labels.undo.length} 步 · 可重做 ${info.labels.redo.length} 步`);
};

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  stripe: true,
  border: true,
  plugins: [vtUndo({ onChange: renderHistory }), vtCellEditor()],
};

/**
 * 编辑写回后把撤销/重做交给 vtUndo（核心没有编辑事件，见 shared/edit-hook.ts）。
 * **卸载必须取消订阅**：桥接只记一个监听者，不解绑就会留下指向已销毁表格的闭包。
 */
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
  // 桩档下 getHistory 不存在，喂一份空历史（按钮就都是禁用态）
  if (tableRef.value) renderHistory(tableRef.value.getHistory?.() ?? { canUndo: false, canRedo: false, labels: { undo: [], redo: [] } });
});
onUnmounted(() => onCellEdit(null));

const raisePrices = (): void => {
  // 只动前 50 行：撤销要恢复每一行的原值，存 2000 份快照没必要
  const targets = rows.slice(0, 50);
  const before = targets.map((r) => r.amount);
  tableRef.value?.recordTransaction?.('批量涨价 10% + 按金额排序', () => {
    for (const r of targets) r.amount = Math.round(r.amount * 1.1);
    tableRef.value?.recordChange?.({
      label: '涨价 50 行',
      undo: () => {
        targets.forEach((r, i) => (r.amount = before[i] ?? r.amount));
        tableRef.value?.forceUpdate();
      },
      redo: () => {
        targets.forEach((r) => (r.amount = Math.round(r.amount * 1.1)));
        tableRef.value?.forceUpdate();
      },
    });
    tableRef.value?.sort('amount', 'desc');
  });
};
</script>

<template>
  <div class="pg-toolbar">
    <button
      class="pg-btn"
      :disabled="!history.canUndo"
      :title="history.canUndo ? `撤销：${history.labels.undo[0]}` : '没有可撤销的操作'"
      @click="tableRef?.undo?.()"
    >
      <Icon :paths="UNDO_PATHS" />
      撤销
    </button>
    <button
      class="pg-btn"
      :disabled="!history.canRedo"
      :title="history.canRedo ? `重做：${history.labels.redo[0]}` : '没有可重做的操作'"
      @click="tableRef?.redo?.()"
    >
      <Icon :paths="REDO_PATHS" />
      重做
    </button>
    <button class="pg-btn" @click="raisePrices">批量涨价 10%</button>
    <button class="pg-btn" @click="tableRef?.clearHistory?.()">清空历史</button>
  </div>

  <div class="pg-table">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>

  <div class="pg-aside">
    <div class="pg-aside-box">
      {{
        history.labels.undo.length
          ? `历史（近 → 远）：${history.labels.undo.join(' ← ')}`
          : '历史：空'
      }}
    </div>
  </div>
</template>
