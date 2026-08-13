<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 表身合并</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="scrollTop">滚动到顶部</button>
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="scrollBottom">滚动到底部</button>
      <button type="button" class="virt-table-btn virt-table-btn-warning" @click="scrollRandom">随机滚动</button>
      <button type="button" class="virt-table-btn virt-table-btn-success" @click="scrollTo500">滚动到第 500 行</button>
      <button
        type="button"
        class="virt-table-btn"
        style="background: #8b5cf6; color: #fff"
        @click="toggleMerge"
      >
        切换合并单元格
      </button>
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

const COL_COUNT = 30;
const ROW_COUNT = 1000;

const MERGES = [
  { rowIndex: 2, colIndex: 1, rowspan: 3, colspan: 2 },
  { rowIndex: 5, colIndex: 4, rowspan: 2, colspan: 3 },
  { rowIndex: 7, colIndex: 8, rowspan: 4, colspan: 1 },
  { rowIndex: 10, colIndex: 12, rowspan: 2, colspan: 2 },
  { rowIndex: 12, colIndex: 15, rowspan: 3, colspan: 1 },
  { rowIndex: 15, colIndex: 18, rowspan: 2, colspan: 3 },
  { rowIndex: 18, colIndex: 22, rowspan: 4, colspan: 1 },
  { rowIndex: 20, colIndex: 25, rowspan: 2, colspan: 2 },
  { rowIndex: 23, colIndex: 0, rowspan: 3, colspan: 2 },
  { rowIndex: 26, colIndex: 5, rowspan: 2, colspan: 3 },
  { rowIndex: 28, colIndex: 9, rowspan: 4, colspan: 1 },
  { rowIndex: 31, colIndex: 13, rowspan: 2, colspan: 2 },
  { rowIndex: 34, colIndex: 16, rowspan: 3, colspan: 1 },
  { rowIndex: 36, colIndex: 20, rowspan: 2, colspan: 3 },
  { rowIndex: 39, colIndex: 24, rowspan: 4, colspan: 1 },
  { rowIndex: 42, colIndex: 27, rowspan: 2, colspan: 2 },
  { rowIndex: 45, colIndex: 3, rowspan: 3, colspan: 2 },
  { rowIndex: 47, colIndex: 7, rowspan: 2, colspan: 3 },
  { rowIndex: 50, colIndex: 11, rowspan: 4, colspan: 1 },
  { rowIndex: 53, colIndex: 14, rowspan: 2, colspan: 2 },
  { rowIndex: 55, colIndex: 19, rowspan: 3, colspan: 1 },
  { rowIndex: 58, colIndex: 23, rowspan: 2, colspan: 3 },
  { rowIndex: 61, colIndex: 26, rowspan: 4, colspan: 1 },
  { rowIndex: 64, colIndex: 2, rowspan: 2, colspan: 2 },
  { rowIndex: 66, colIndex: 6, rowspan: 3, colspan: 2 },
  { rowIndex: 69, colIndex: 10, rowspan: 2, colspan: 3 },
  { rowIndex: 72, colIndex: 17, rowspan: 4, colspan: 1 },
  { rowIndex: 75, colIndex: 21, rowspan: 2, colspan: 2 },
  { rowIndex: 77, colIndex: 28, rowspan: 3, colspan: 1 },
  { rowIndex: 80, colIndex: 1, rowspan: 2, colspan: 3 },
  { rowIndex: 83, colIndex: 4, rowspan: 4, colspan: 1 },
  { rowIndex: 86, colIndex: 8, rowspan: 2, colspan: 2 },
  { rowIndex: 88, colIndex: 15, rowspan: 3, colspan: 1 },
  { rowIndex: 91, colIndex: 22, rowspan: 2, colspan: 3 },
  { rowIndex: 94, colIndex: 25, rowspan: 4, colspan: 1 },
  { rowIndex: 97, colIndex: 0, rowspan: 2, colspan: 2 },
  { rowIndex: 100, colIndex: 12, rowspan: 3, colspan: 2 },
  { rowIndex: 105, colIndex: 18, rowspan: 2, colspan: 3 },
  { rowIndex: 110, colIndex: 24, rowspan: 4, colspan: 1 },
  { rowIndex: 115, colIndex: 7, rowspan: 2, colspan: 2 },
  { rowIndex: 120, colIndex: 14, rowspan: 3, colspan: 1 },
  { rowIndex: 125, colIndex: 21, rowspan: 2, colspan: 3 },
  { rowIndex: 130, colIndex: 27, rowspan: 4, colspan: 1 },
  { rowIndex: 135, colIndex: 3, rowspan: 2, colspan: 2 },
  { rowIndex: 140, colIndex: 9, rowspan: 3, colspan: 2 },
  { rowIndex: 145, colIndex: 16, rowspan: 2, colspan: 3 },
  { rowIndex: 150, colIndex: 23, rowspan: 4, colspan: 1 },
  { rowIndex: 155, colIndex: 2, rowspan: 2, colspan: 2 },
  { rowIndex: 160, colIndex: 5, rowspan: 3, colspan: 1 },
  { rowIndex: 165, colIndex: 11, rowspan: 2, colspan: 3 },
  { rowIndex: 170, colIndex: 19, rowspan: 4, colspan: 1 },
  { rowIndex: 175, colIndex: 26, rowspan: 2, colspan: 2 },
  { rowIndex: 180, colIndex: 1, rowspan: 3, colspan: 2 },
  { rowIndex: 185, colIndex: 8, rowspan: 2, colspan: 3 },
  { rowIndex: 190, colIndex: 13, rowspan: 4, colspan: 1 },
  { rowIndex: 195, colIndex: 20, rowspan: 2, colspan: 2 },
  { rowIndex: 200, colIndex: 28, rowspan: 3, colspan: 1 },
  { rowIndex: 205, colIndex: 4, rowspan: 2, colspan: 3 },
  { rowIndex: 210, colIndex: 10, rowspan: 4, colspan: 1 },
  { rowIndex: 215, colIndex: 17, rowspan: 2, colspan: 2 },
  { rowIndex: 220, colIndex: 25, rowspan: 3, colspan: 1 },
  { rowIndex: 225, colIndex: 0, rowspan: 2, colspan: 3 },
  { rowIndex: 230, colIndex: 6, rowspan: 4, colspan: 1 },
  { rowIndex: 235, colIndex: 12, rowspan: 2, colspan: 2 },
  { rowIndex: 240, colIndex: 22, rowspan: 3, colspan: 1 },
  { rowIndex: 245, colIndex: 24, rowspan: 2, colspan: 3 },
  { rowIndex: 250, colIndex: 3, rowspan: 4, colspan: 1 },
  { rowIndex: 255, colIndex: 9, rowspan: 2, colspan: 2 },
  { rowIndex: 260, colIndex: 15, rowspan: 3, colspan: 1 },
  { rowIndex: 265, colIndex: 18, rowspan: 2, colspan: 3 },
  { rowIndex: 270, colIndex: 27, rowspan: 4, colspan: 1 },
  { rowIndex: 275, colIndex: 2, rowspan: 2, colspan: 2 },
  { rowIndex: 280, colIndex: 7, rowspan: 3, colspan: 2 },
  { rowIndex: 285, colIndex: 14, rowspan: 2, colspan: 3 },
  { rowIndex: 290, colIndex: 21, rowspan: 4, colspan: 1 },
  { rowIndex: 295, colIndex: 1, rowspan: 2, colspan: 2 },
  { rowIndex: 300, colIndex: 5, rowspan: 3, colspan: 1 },
  { rowIndex: 305, colIndex: 11, rowspan: 2, colspan: 3 },
  { rowIndex: 310, colIndex: 19, rowspan: 4, colspan: 1 },
  { rowIndex: 315, colIndex: 26, rowspan: 2, colspan: 2 },
  { rowIndex: 320, colIndex: 4, rowspan: 3, colspan: 2 },
  { rowIndex: 325, colIndex: 8, rowspan: 2, colspan: 3 },
  { rowIndex: 330, colIndex: 13, rowspan: 4, colspan: 1 },
  { rowIndex: 335, colIndex: 20, rowspan: 2, colspan: 2 },
  { rowIndex: 340, colIndex: 28, rowspan: 3, colspan: 1 },
  { rowIndex: 345, colIndex: 0, rowspan: 2, colspan: 3 },
  { rowIndex: 350, colIndex: 6, rowspan: 4, colspan: 1 },
  { rowIndex: 355, colIndex: 12, rowspan: 2, colspan: 2 },
  { rowIndex: 360, colIndex: 16, rowspan: 3, colspan: 1 },
  { rowIndex: 365, colIndex: 23, rowspan: 2, colspan: 3 },
  { rowIndex: 370, colIndex: 25, rowspan: 4, colspan: 1 },
  { rowIndex: 375, colIndex: 3, rowspan: 2, colspan: 2 },
  { rowIndex: 380, colIndex: 10, rowspan: 3, colspan: 2 },
  { rowIndex: 385, colIndex: 17, rowspan: 2, colspan: 3 },
  { rowIndex: 390, colIndex: 22, rowspan: 4, colspan: 1 },
  { rowIndex: 395, colIndex: 2, rowspan: 2, colspan: 2 },
  { rowIndex: 400, colIndex: 15, rowspan: 3, colspan: 1 },
  { rowIndex: 410, colIndex: 18, rowspan: 2, colspan: 3 },
  { rowIndex: 420, colIndex: 24, rowspan: 4, colspan: 1 },
  { rowIndex: 430, colIndex: 7, rowspan: 2, colspan: 2 },
  { rowIndex: 440, colIndex: 21, rowspan: 3, colspan: 1 },
  { rowIndex: 450, colIndex: 27, rowspan: 2, colspan: 3 },
  { rowIndex: 460, colIndex: 4, rowspan: 4, colspan: 1 },
  { rowIndex: 470, colIndex: 9, rowspan: 2, colspan: 2 },
  { rowIndex: 480, colIndex: 14, rowspan: 3, colspan: 1 },
  { rowIndex: 490, colIndex: 20, rowspan: 2, colspan: 3 },
];

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

const tableRef = ref<VirtTableVueInstance | null>(null);
const mergeOn = ref(true);
const status = ref(`表身合并：${ROW_COUNT} 行 × ${COL_COUNT} 列`);

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  merges: MERGES,
  border: true,
  showHeader: false,
  highlightSelectRow: true,
  highlightSelectCol: true,
  highlightSelectCell: true,
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
  const index = Math.floor(Math.random() * ROW_COUNT);
  tableRef.value?.scrollToIndex(index);
  status.value = `随机滚动到第 ${index + 1} 行`;
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
