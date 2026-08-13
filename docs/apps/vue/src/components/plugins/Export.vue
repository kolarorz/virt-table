<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 导出 CSV / Excel</h3>
    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn virt-table-btn-primary"
        @click="tableRef?.exportCsv({ filename: '全表.csv' })"
      >
        导出 CSV（全表）
      </button>
      <button
        type="button"
        class="virt-table-btn"
        @click="tableRef?.exportExcel({ filename: '全表.xls' })"
      >
        导出 Excel（全表）
      </button>
      <button
        type="button"
        class="virt-table-btn"
        @click="tableRef?.exportCsv({ filename: '选区.csv', scope: 'selection' })"
      >
        导出 CSV（当前选区）
      </button>
      <span class="demo-note">框选若干单元格后可只导出选区</span>
    </div>
    <div style="width: 760px; height: 460px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn, vtExport, vtCellSelection } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  city: string;
  score: number;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 180 },
  { key: 'email', title: '邮箱', width: 240 },
  { key: 'city', title: '城市', width: 160 },
  { key: 'score', title: '分数', width: 120 },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  city: faker.location.city(),
  score: faker.number.int({ min: 0, max: 100 }),
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  // scope: 'selection' 依赖框选，所以两个插件要一起装
  plugins: [vtCellSelection(), vtExport()],
};

const tableRef = ref<VirtTableVueInstance | null>(null);
</script>
