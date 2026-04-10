<template>
  <div style="padding: 16px">
    <h3 style="margin: 0 0 12px; color: #1d2129">Vue 基础表格</h3>
    <div style="display: flex; gap: 8px; margin-bottom: 12px">
      <button @click="scrollTop">滚动到顶部</button>
      <button @click="scrollBottom">滚动到底部</button>
      <button @click="scrollRandom">随机滚动</button>
      <button @click="scrollTo500">滚动到第 500 行</button>
    </div>
    <div style="color: #86909c; font-size: 13px; margin-bottom: 8px">{{ status }}</div>
    <div style="width: 800px; height: 500px; border: 1px solid #e5e6eb">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

const COL_COUNT = 20;
const ROW_COUNT = 1000;

const columns: VueTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
  key: `col_${i}`,
  title: `列 ${i}`,
  width: 150,
  fixed: i === 0 ? 'left' as const : i === COL_COUNT - 1 ? 'right' as const : undefined,
}));

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, any> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`col_${c}`] = `${i}-${c}-${faker.lorem.words(3)}`;
  }
  return row;
});

const options = {
  list,
  itemKey: 'id',
  itemPreSize: 40,
  buffer: 4,
  border: true,
};

const tableRef = ref<InstanceType<typeof VirtTableVue> | null>(null);
const status = ref(`${ROW_COUNT} 行 × ${COL_COUNT} 列`);

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
</script>
