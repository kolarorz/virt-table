<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 序号列</h3>
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

const REG_COL_COUNT = 8;
const ROW_COUNT = 1000;

const dataCols: VueTableColumn[] = Array.from(
  { length: REG_COL_COUNT },
  (_, i) => ({
    key: `extra_${i}`,
    title: `列 ${i}`,
    width: 200,
  }),
);

const columns: VueTableColumn[] = [
  { key: '__index', title: '#', width: 60, align: 'center', type: 'index' },
  ...dataCols,
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < REG_COL_COUNT; c++) {
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

const status = ref(`${ROW_COUNT} 行，含序号列，border: true`);
</script>
