<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 分组 + 树形</h3>
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

const depts = ['工程部', '设计部', '市场部'];
const teamNames = ['Alpha', 'Beta'];
let uid = 0;

const flatRows: Record<string, unknown>[] = [];
for (const dept of depts) {
  for (const team of teamNames) {
    const managerCount = 1 + Math.floor(Math.random() * 2);
    for (let m = 0; m < managerCount; m++) {
      const membersCount = 2 + Math.floor(Math.random() * 4);
      flatRows.push({
        id: uid++,
        name: faker.person.fullName(),
        role: '主管',
        department: dept,
        team: `${dept}-${team}`,
        score: Math.floor(Math.random() * 100),
        children: Array.from({ length: membersCount }, () => ({
          id: uid++,
          name: faker.person.fullName(),
          role: faker.person.jobTitle(),
          department: dept,
          team: `${dept}-${team}`,
          score: Math.floor(Math.random() * 100),
        })),
      });
    }
  }
}

const columns: VueTableColumn[] = [
  { key: 'name', title: '名称', width: 280, type: 'tree' },
  { key: 'role', title: '角色', width: 160 },
  { key: 'department', title: '部门', width: 120 },
  { key: 'team', title: '小组', width: 160 },
  { key: 'score', title: '分数', width: 100 },
];

const options = {
  list: flatRows,
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

status.value = '分组 + 树形';
</script>
