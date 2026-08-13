<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 树形结构</h3>
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

const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
const teams = ['前端组', '后端组', '测试组'];
let uid = 0;

const treeData = departments.map((dept) => ({
  id: uid++,
  name: dept,
  role: '部门',
  count: '',
  children: teams.map((team) => ({
    id: uid++,
    name: `${dept}-${team}`,
    role: '小组',
    count: '',
    children: Array.from(
      { length: 3 + Math.floor(Math.random() * 5) },
      () => ({
        id: uid++,
        name: faker.person.fullName(),
        role: faker.person.jobTitle(),
        count: String(Math.floor(Math.random() * 100)),
      }),
    ),
  })),
}));

const columns: VueTableColumn[] = [
  { key: 'name', title: '名称', width: 280, type: 'tree' },
  { key: 'role', title: '角色', width: 200 },
  { key: 'count', title: '数量', width: 120 },
];

const options = {
  list: treeData,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  defaultExpandAll: false,
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

status.value = '树形结构：5 部门';
</script>
