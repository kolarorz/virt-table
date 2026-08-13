<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 无障碍 ARIA</h3>
    <div class="demo-hint">表格自动输出 ARIA 语义，便于屏幕阅读器识别。点击「检查」查看实际属性。</div>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="check">
        检查 ARIA 属性
      </button>
      <span class="demo-note">{{ out }}</span>
    </div>
    <div ref="containerRef" style="width: 680px; height: 420px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  city: string;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 200, sortable: true },
  { key: 'age', title: '年龄', width: 140, sortable: true },
  { key: 'city', title: '城市', width: 200 },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 60 }),
  city: faker.location.city(),
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
};

const containerRef = ref<HTMLElement | null>(null);
const out = ref('');

const check = () => {
  const container = containerRef.value;
  if (!container) return;
  const grid = container.querySelector('[role="grid"]');
  const th = container.querySelector('[role="columnheader"]');
  const cell = container.querySelector('[role="gridcell"]');
  out.value =
    `grid: aria-rowcount=${grid?.getAttribute('aria-rowcount')}, ` +
    `aria-colcount=${grid?.getAttribute('aria-colcount')} · ` +
    `columnheader aria-sort=${th?.getAttribute('aria-sort')} · ` +
    `gridcell role=${cell?.getAttribute('role')}`;
};
</script>
