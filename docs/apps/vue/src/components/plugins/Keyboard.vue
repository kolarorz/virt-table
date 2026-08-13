<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 键盘导航</h3>
    <div class="demo-hint">
      先单击任一单元格，然后使用键盘： <b>方向键</b> 移动 · <b>Tab / Shift+Tab</b> 左右 ·
      <b>Enter</b> 下移 · <b>Shift+方向</b> 扩选区
    </div>
    <div style="width: 760px; height: 480px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { VirtTableVue, type VueTableColumn, vtCellSelection, vtKeyboardNav } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  city: string;
  score: number;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 180 },
  { key: 'age', title: '年龄', width: 120 },
  { key: 'city', title: '城市', width: 180 },
  { key: 'score', title: '分数', width: 120 },
];

const list: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 60 }),
  city: faker.location.city(),
  score: faker.number.int({ min: 0, max: 100 }),
}));

const options = {
  plugins: [vtCellSelection(), vtKeyboardNav()],
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
};
</script>
