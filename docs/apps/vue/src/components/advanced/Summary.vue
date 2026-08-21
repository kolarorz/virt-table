<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 自动合计行</h3>
    <div class="demo-hint">
      底部合计行自动聚合：数量求和、单价求平均、小计自定义汇总。合计随筛选/排序动态更新。
    </div>
    <div style="width: 720px; height: 480px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  qty: number;
  price: number;
  total: number;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '商品', width: 200 },
  { key: 'qty', title: '数量', width: 140, align: 'right', summary: 'sum' },
  { key: 'price', title: '单价', width: 140, align: 'right', summary: 'avg' },
  {
    key: 'total',
    title: '小计',
    width: 160,
    align: 'right',
    summaryMethod: (values) =>
      '¥' + (values as number[]).reduce((a, b) => a + (b || 0), 0).toFixed(2),
  },
];

const list: Row[] = Array.from({ length: 800 }, (_, i) => {
  const qty = faker.number.int({ min: 1, max: 20 });
  const price = faker.number.int({ min: 5, max: 500 });
  return { id: i + 1, name: faker.commerce.productName(), qty, price, total: qty * price };
});

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  showSummary: true,
  summaryText: '合计',
};
</script>
