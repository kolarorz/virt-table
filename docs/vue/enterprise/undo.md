# 撤销 / 重做

<ProPkgStatus pkg="@virt-table-pro/undo" status="shipped" css="none" />

<ProDemo pkg="@virt-table-pro/undo" example-id="pro-undo" />

<!--@include: @/.enterprise/undo/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtUndo, type HistoryChangeInfo } from '@virt-table-pro/undo';

type TableInstance = VirtTablePluginApi & { forceUpdate(): void };

const tableRef = ref<TableInstance | null>(null);
const history = ref<HistoryChangeInfo>({
  canUndo: false,
  canRedo: false,
  labels: { undo: [], redo: [] },
});

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtUndo({ limit: 100, onChange: (info) => (history.value = info) })],
};
</script>

<template>
  <button
    :disabled="!history.canUndo"
    :title="history.canUndo ? `撤销：${history.labels.undo[0]}` : '没有可撤销的操作'"
    @click="tableRef?.undo()"
  >
    撤销
  </button>
  <button :disabled="!history.canRedo" @click="tableRef?.redo()">重做</button>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

<!--@include: @/.enterprise/undo/s1.md-->

```vue
<script setup lang="ts">
onMounted(() => {
  onCellEdit(({ row, key, before, after, label }) => {
    tableRef.value?.recordChange({
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
// 卸载取消订阅，理由同 React 端
onUnmounted(() => onCellEdit(null));
</script>
```

<!--@include: @/.enterprise/undo/s2.md-->
