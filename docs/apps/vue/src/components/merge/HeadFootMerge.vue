<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 表头 + 表尾合并</h3>
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

const colCount = 10;
const rowCount = 200;

const columns: VueTableColumn[] = Array.from({ length: colCount }, (_, i) => ({
  key: `col_${i}`,
  title: `Col ${i}`,
  width: 150,
}));

const list = Array.from({ length: rowCount }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < colCount; c++) {
    row[`col_${c}`] = `${i}-${c}-${faker.lorem.word()}`;
  }
  return row;
});

const headerData = [
  ['个人信息', '', '', '成绩', '', '', '备注', '', '', ''],
  ['姓名', '年龄', '性别', '语文', '数学', '英语', '评语1', '评语2', '评语3', '总评'],
];

const headerMerges = [
  { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
  { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 3 },
  { rowIndex: 0, colIndex: 6, rowspan: 1, colspan: 4 },
];

const footerData = [['', '', '', '合计', '', '', '', '', '', '总计']];
const footerMerges = [
  { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
  { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 6 },
];

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref(`表头 + 表尾合并：${rowCount} 行（分组表头 + 汇总表尾）`);

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  headerData,
  headerMerges,
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
