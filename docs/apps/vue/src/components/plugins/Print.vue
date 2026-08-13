<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 打印</h3>
    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn virt-table-btn-primary"
        @click="tableRef?.print({ title: '人员清单' })"
      >
        打印表格
      </button>
      <span class="demo-note">会打开新窗口输出全表（内联样式）</span>
    </div>
    <div style="width: 660px; height: 460px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn, vtExport } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
  score: number;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 220 },
  { key: 'city', title: '城市', width: 220 },
  { key: 'score', title: '分数', width: 120 },
];

const list: Row[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  city: faker.location.city(),
  score: faker.number.int({ min: 0, max: 100 }),
}));

// 打印与导出同属 vtExport
const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  plugins: [vtExport()],
};

const tableRef = ref<VirtTableVueInstance | null>(null);
</script>
