<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 空数据表格</h3>
    <div class="virt-table-controls">
      <button type="button" @click="toggleData">{{ hasData ? '清空数据' : '加载 1000 行' }}</button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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

function buildList() {
  return Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, unknown> = { id: i };
    for (let c = 0; c < COL_COUNT; c++) {
      row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
    }
    return row;
  });
}

const fullList = buildList();
const list = ref<Record<string, unknown>[]>([]);
const hasData = computed(() => list.value.length > 0);
const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref('无数据，emptyText: 暂无数据');

const options = computed(() => ({
  list: list.value,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  emptyText: '暂无数据',
}));

const toggleData = () => {
  if (list.value.length === 0) {
    list.value = fullList;
    tableRef.value?.setList(fullList);
    status.value = `已加载 ${ROW_COUNT} 行`;
  } else {
    list.value = [];
    tableRef.value?.setList([]);
    status.value = '无数据，emptyText: 暂无数据';
  }
};
</script>
