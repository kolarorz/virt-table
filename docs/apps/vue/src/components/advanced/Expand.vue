<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 展开行</h3>
    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn"
        style="background: #10b981; color: #fff"
        @click="expandAll"
      >
        全部展开
      </button>
      <button
        type="button"
        class="virt-table-btn"
        style="background: #6b7280; color: #fff"
        @click="collapseAll"
      >
        全部收起
      </button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="tsx">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

type TableRef = VirtTableVueInstance & {
  expandAll: () => void;
  collapseAll: () => void;
};

const expandRows = Array.from({ length: 100 }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < 6; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(3)}`;
  }
  return row;
});

const columns: VueTableColumn[] = [
  {
    key: '__expand',
    title: '',
    width: 50,
    type: 'expand',
    renderExpandRow: ({ row }) => (
      <div style={{ padding: '8px', lineHeight: '1.6' }}>
        <strong>行 {(row as { id: number }).id} 的详情</strong>
        <br />
        {Object.keys(row)
          .filter((k) => k !== 'id' && !k.startsWith('_'))
          .map((k) => (
            <div key={k}>{k}: {String((row as Record<string, unknown>)[k])}</div>
          ))}
      </div>
    ),
  },
  ...Array.from({ length: 6 }, (_, i) => ({
    key: `extra_${i}`,
    title: `列 ${i}`,
    width: 180,
  })),
];

const options = {
  list: expandRows,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
};

const tableRef = ref<TableRef | null>(null);
const status = ref('');

const expandAll = () => {
  tableRef.value?.expandAll();
  status.value = '全部展开';
};

const collapseAll = () => {
  tableRef.value?.collapseAll();
  status.value = '全部收起';
};

status.value = '展开行：100 行';
</script>
