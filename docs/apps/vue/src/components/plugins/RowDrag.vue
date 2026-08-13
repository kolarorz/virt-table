<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 行拖拽排序</h3>
    <div class="demo-hint">
      拖拽行首的 <b>⣿ 手柄</b> 调整行顺序（拖到视口边缘会自动滚动）。仅扁平数据、未排序/筛选时生效。
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 660px; height: 480px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn, vtRowDrag } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
  score: number;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'drag', title: '', width: 50, type: 'drag', fixed: 'left' },
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 200 },
  { key: 'city', title: '城市', width: 200 },
  { key: 'score', title: '分数', width: 120 },
];

const list: Row[] = Array.from({ length: 300 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  city: faker.location.city(),
  score: faker.number.int({ min: 0, max: 100 }),
}));

const status = ref('尚未拖动');

const options = {
  plugins: [vtRowDrag()],
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  onRowOrderChange: (_list: Record<string, unknown>[], from: number, to: number) => {
    status.value = `行 ${from} → ${to}`;
  },
};
</script>
