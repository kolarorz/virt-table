<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 高亮悬停/选中</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

const COL_COUNT = 10;
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
  highlightHoverRow: true,
  highlightSelectRow: true,
  highlightSelectCol: true,
  highlightSelectCell: true,
};

const status = ref(
  '悬停/行选/列选/格选 高亮已开启。点击单元格、行、列以查看效果。',
);
</script>
