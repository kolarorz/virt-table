<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 列拖拽排序</h3>
    <div class="demo-hint">拖拽<b>表头</b>调整列顺序（固定列 ID 不建议拖动）。</div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 760px; height: 480px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn, vtColumnDrag } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  city: string;
  job: string;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, fixed: 'left' },
  { key: 'name', title: '姓名', width: 180 },
  { key: 'age', title: '年龄', width: 120 },
  { key: 'city', title: '城市', width: 180 },
  { key: 'job', title: '职位', width: 200 },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 60 }),
  city: faker.location.city(),
  job: faker.person.jobTitle(),
}));

const status = ref('当前列顺序：' + columns.map((c) => c.key).join(' → '));

const options = {
  plugins: [vtColumnDrag()],
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  onColumnOrderChange: (cols: { key: string }[]) => {
    status.value = '当前列顺序：' + cols.map((c) => c.key).join(' → ');
  },
};
</script>
