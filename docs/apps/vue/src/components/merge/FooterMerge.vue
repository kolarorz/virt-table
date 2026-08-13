<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 表尾合并</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="scrollTop">滚动到顶部</button>
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="scrollBottom">滚动到底部</button>
      <button type="button" class="virt-table-btn virt-table-btn-warning" @click="scrollRandom">随机滚动</button>
      <button type="button" class="virt-table-btn virt-table-btn-success" @click="scrollTo500">滚动到第 500 行</button>
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
import type { VirtTableVueInstance } from '../../virt-table-ref';

const colCount = 8;
const rowCount = 100;

const columns: VueTableColumn[] = Array.from({ length: colCount }, (_, i) => ({
  key: `col_${i}`,
  title: i === 0 ? '名称' : i < 4 ? `Q${i}` : `指标 ${i - 3}`,
  width: i === 0 ? 180 : 140,
}));

const list = Array.from({ length: rowCount }, (_, i) => {
  const row: Record<string, unknown> = { id: i, col_0: faker.person.fullName() };
  for (let c = 1; c < colCount; c++) {
    row[`col_${c}`] = String(Math.floor(Math.random() * 1000));
  }
  return row;
});

const footerData = [
  ['合计', '', '', '', '100', '200', '300', '400'],
  ['平均', '', '', '', '25', '50', '75', '100'],
];

const footerMerges = [
  { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 4 },
  { rowIndex: 1, colIndex: 0, rowspan: 1, colspan: 4 },
];

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref(`表尾合并：${rowCount} 行（两行表尾 + 合计/平均跨列合并）`);

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  footerData,
  footerMerges,
};

const scrollTop = () => {
  tableRef.value?.scrollToTop();
  status.value = '已滚动到顶部';
};

const scrollBottom = () => {
  tableRef.value?.scrollToBottom();
  status.value = '已滚动到底部';
};

const scrollRandom = () => {
  const index = Math.floor(Math.random() * rowCount);
  tableRef.value?.scrollToIndex(index);
  status.value = `随机滚动到第 ${index + 1} 行`;
};

const scrollTo500 = () => {
  tableRef.value?.scrollToIndex(499);
  status.value = '已滚动到第 500 行';
};
</script>
