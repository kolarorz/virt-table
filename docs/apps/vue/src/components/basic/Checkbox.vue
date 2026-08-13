<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 多选列</h3>
    <div class="virt-table-controls">
      <button type="button" @click="clearChecked">清除选中行</button>
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
  {
    key: '__checkbox',
    title: '',
    width: 50,
    align: 'center',
    type: 'checkbox',
  },
  ...dataCols,
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < REG_COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
  }
  return row;
});

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref('勾选行或全选。事件：onCheckChange / onCheckAll');

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  onCheckChange: (checked: boolean, row: Record<string, unknown>) => {
    status.value = `onCheckChange: ${checked}，id=${row.id}`;
  },
  onCheckAll: (checked: boolean) => {
    status.value = `onCheckAll: 全选=${checked}`;
  },
};

const clearChecked = () => {
  tableRef.value?.clearCheckedRows();
  status.value = '已清除选中行';
};
</script>
