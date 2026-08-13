<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 单选行 radio</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="getSelected">
        获取当前选中
      </button>
      <button type="button" class="virt-table-btn" @click="clearSelected">清除</button>
      <span class="demo-note">{{ out }}</span>
    </div>
    <div style="width: 620px; height: 480px" class="demo-container">
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
  city: string;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'radio', title: '', width: 50, type: 'radio', fixed: 'left' },
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 220 },
  { key: 'city', title: '城市', width: 220 },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  city: faker.location.city(),
}));

const tableRef = ref<VirtTableVueInstance | null>(null);
const out = ref('未选中');

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  onRadioChange: (row: Record<string, unknown>) => {
    out.value = `选中：${(row as Row).name}`;
  },
};

const getSelected = () => {
  const r = tableRef.value?.getSelectedRadio() as Row | null | undefined;
  out.value = r ? `当前：${r.name}（id=${r.id}）` : '未选中';
};

const clearSelected = () => {
  tableRef.value?.setSelectedRadio(null);
  out.value = '未选中';
};
</script>
