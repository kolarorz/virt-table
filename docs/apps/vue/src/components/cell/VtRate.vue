<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtRate 星级评分</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 900px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { VtRate } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const lastChange = ref('（未操作）');

const columns: VueTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '名称', width: 160 },
  VtRate({
    key: 'score',
    title: '评分（可点）',
    width: 160,
    onChange: (v, row) => {
      lastChange.value = `${(row as { name: string }).name} → ${v}`;
    },
  }),
  // 半星：点星的左半给 .5
  VtRate({ key: 'half', title: '半星 + 分值', width: 200, allowHalf: true, showText: true }),
  VtRate({ key: 'stars', title: '10 星制', width: 260, count: 10 }),
  VtRate({ key: 'fixed', title: '只读', width: 160, disabled: true }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `条目 ${i}`,
  score: (i % 5) + 1,
  half: ((i % 10) + 1) / 2,
  stars: (i % 10) + 1,
  fixed: (i % 5) + 1,
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
};

const status = computed(
  () =>
    `VtRate：点一下即写回（不需要 vtCellEditor）。半星靠「底层空心星 + 上层按百分比裁剪的实心星」实现 · 最近一次 onChange：${lastChange.value}`,
);
</script>
