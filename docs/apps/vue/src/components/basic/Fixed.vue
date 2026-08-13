<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 冻结列与合并</h3>
    <div class="virt-table-controls">
      <button type="button" @click="scrollTop">滚动到顶部</button>
      <button type="button" @click="scrollBottom">滚动到底部</button>
      <button type="button" @click="scrollRandom">随机滚动</button>
      <button type="button" @click="scrollTo500">滚动到第 500 行</button>
      <button type="button" @click="toggleMerge">切换合并单元格</button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import { merges as MERGES } from '../../../../vanilla/src/components/merges-data';
import type { VirtTableVueInstance } from '../../virt-table-ref';

const COL_COUNT = 30;
const ROW_COUNT = 1000;

const columns: VueTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => {
  const col: VueTableColumn = { key: `extra_${i}`, title: `列 ${i}`, width: 200 };
  if (i < 1) col.fixed = 'left';
  if (i >= COL_COUNT - 1) col.fixed = 'right';
  return col;
});

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
  }
  return row;
});

const mergeOn = ref(true);

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  merges: MERGES,
};

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref(
  `${ROW_COUNT} 行 × ${COL_COUNT} 列。左 1 列、右 1 列固定；合并已启用。`,
);

const scrollTop = () => {
  tableRef.value?.scrollToTop();
  status.value = '已滚动到顶部';
};

const scrollBottom = () => {
  tableRef.value?.scrollToBottom();
  status.value = '已滚动到底部';
};

const scrollRandom = () => {
  const idx = Math.floor(Math.random() * ROW_COUNT);
  tableRef.value?.scrollToIndex(idx);
  status.value = `随机滚动到第 ${idx + 1} 行`;
};

const scrollTo500 = () => {
  tableRef.value?.scrollToIndex(499);
  status.value = '已滚动到第 500 行';
};

const toggleMerge = () => {
  mergeOn.value = !mergeOn.value;
  tableRef.value?.setMerges(mergeOn.value ? MERGES : []);
  status.value = mergeOn.value ? '合并单元格已启用' : '合并单元格已关闭';
};
</script>
