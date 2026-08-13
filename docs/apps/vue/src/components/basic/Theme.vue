<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 暗夜模式</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="toggleTheme">
        {{ theme === 'light' ? '🌙 切换暗夜模式' : '☀️ 切换亮色模式' }}
      </button>
      <span class="demo-note">当前：{{ theme === 'light' ? '亮色' : '暗色' }}</span>
    </div>
    <div style="width: 760px; height: 520px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  city: string;
  score: number;
}

const ROW_COUNT = 1000;

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, fixed: 'left' },
  { key: 'name', title: '姓名', width: 160 },
  { key: 'email', title: '邮箱', width: 240 },
  { key: 'city', title: '城市', width: 160 },
  { key: 'score', title: '分数', width: 120, align: 'right' },
];

const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
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
  stripe: true,
  highlightHoverRow: true,
  theme: 'light' as const,
};

const tableRef = ref<VirtTableVueInstance | null>(null);
const theme = ref<'light' | 'dark'>('light');

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  tableRef.value?.setTheme(theme.value);
};
</script>
