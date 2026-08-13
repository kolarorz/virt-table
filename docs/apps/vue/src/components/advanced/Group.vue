<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 分组</h3>
    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn"
        style="background: #10b981; color: #fff"
        @click="expandAll"
      >
        全部展开
      </button>
      <button
        type="button"
        class="virt-table-btn"
        style="background: #6b7280; color: #fff"
        @click="collapseAll"
      >
        全部收起
      </button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

type TableRef = VirtTableVueInstance & {
  expandAll: () => void;
  collapseAll: () => void;
};

const depts = ['工程部', '设计部', '市场部', '财务部'];
const teamNames = ['Alpha', 'Beta', 'Gamma'];
const groupRows = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  name: faker.person.fullName(),
  department: depts[i % depts.length],
  team: teamNames[i % teamNames.length],
  score: Math.floor(Math.random() * 100),
}));

const columns: VueTableColumn[] = [
  { key: 'name', title: '姓名', width: 180 },
  { key: 'department', title: '部门', width: 120 },
  { key: 'team', title: '小组', width: 120 },
  { key: 'score', title: '分数', width: 100 },
];

const options = {
  list: groupRows,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  groupConfig: [{ field: 'department' }, { field: 'team' }],
  defaultExpandAll: true,
  border: true,
};

const tableRef = ref<TableRef | null>(null);
const status = ref('');

const expandAll = () => {
  tableRef.value?.expandAll();
  status.value = '全部展开';
};

const collapseAll = () => {
  tableRef.value?.collapseAll();
  status.value = '全部收起';
};

status.value = '分组：200 行';
</script>
