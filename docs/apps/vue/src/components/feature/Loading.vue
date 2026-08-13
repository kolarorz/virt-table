<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 加载态</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="showLoading">
        显示加载态
      </button>
      <button type="button" class="virt-table-btn" @click="reload">模拟异步刷新数据 (1.5s)</button>
    </div>
    <div style="width: 720px; height: 480px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  city: string;
}

function genList(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    city: faker.location.city(),
  }));
}

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 180 },
  { key: 'email', title: '邮箱', width: 260 },
  { key: 'city', title: '城市', width: 160 },
];

const options = {
  list: genList(500),
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  loadingText: '数据加载中...',
};

const tableRef = ref<VirtTableVueInstance | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

const showLoading = () => {
  tableRef.value?.setLoading(true);
  timer = setTimeout(() => tableRef.value?.setLoading(false), 1500);
};

const reload = () => {
  tableRef.value?.setLoading(true);
  timer = setTimeout(() => {
    tableRef.value?.setList(genList(500));
    tableRef.value?.setLoading(false);
  }, 1500);
};

onUnmounted(() => {
  if (timer != null) clearTimeout(timer);
});
</script>
