<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 强制刷新（定时更新部分列）</h3>
    <div class="virt-table-controls">
      <button type="button" :disabled="timer != null" @click="startAuto">开始自动更新</button>
      <button type="button" :disabled="timer == null" @click="stopAuto">停止自动更新</button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

const COL_COUNT = 8;
const ROW_COUNT = 1000;

const columns: VueTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
  key: `extra_${i}`,
  title: `列 ${i}`,
  width: 200,
}));

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
  }
  return row;
});

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
};

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref('空闲。将每秒更新前 4 列（extra_0～extra_3）并 forceUpdate。');
const timer = ref<ReturnType<typeof setInterval> | null>(null);
let tick = 0;

const tickUpdate = () => {
  for (const row of list) {
    for (let c = 0; c < 4; c++) {
      row[`extra_${c}`] = faker.lorem.words(3);
    }
  }
  tick += 1;
  tableRef.value?.forceUpdate();
  status.value = `自动更新中… tick=${tick}（已改 extra_0～extra_3）`;
};

const startAuto = () => {
  if (timer.value != null) return;
  status.value = '已启动定时器（每 1s）';
  timer.value = setInterval(tickUpdate, 1000);
};

const stopAuto = () => {
  if (timer.value == null) return;
  clearInterval(timer.value);
  timer.value = null;
  status.value = '已停止自动更新';
};

onUnmounted(() => {
  if (timer.value != null) {
    clearInterval(timer.value);
    timer.value = null;
  }
});
</script>
