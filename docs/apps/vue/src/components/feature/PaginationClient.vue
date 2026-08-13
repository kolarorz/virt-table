<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 分页（客户端）</h3>
    <div class="demo-hint">
      客户端分页（默认）：全量 {{ ROW_COUNT }} 条一次性交给表格，翻页只换切片。 total
      由筛选后的行数派生 —— 试试筛选部门，总数会跟着变，页码自动回到第 1 页。
      排序作用于全量数据而不是当前页。
    </div>
    <div class="virt-table-controls">
      <button type="button" @click="goPage7">跳到第 7 页</button>
      <button type="button" @click="filterDept">筛「工程部」</button>
      <button type="button" @click="clearFilter">清空筛选</button>
      <button type="button" @click="saveState">存状态</button>
      <button type="button" @click="loadState">还原状态</button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 100%; height: 520px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

/**
 * 客户端分页（默认模式）：把全量数据交给表格，翻页 / 切换每页条数 / 排序 / 筛选
 * 全部由表格自己处理，**不用写 onPageChange，也不用管 total**。
 *
 * 与服务端模式（`manualPagination: true`，见 feature/pagination）的差别就是那一个开关。
 */
const ROW_COUNT = 2000;
const DEPTS = ['工程部', '设计部', '市场部'];

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  score: number;
}

const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  dept: DEPTS[i % DEPTS.length]!,
  score: 40 + ((i * 17) % 60),
}));

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 90, align: 'center', sortable: true },
  { key: 'name', title: '姓名', width: 200 },
  {
    key: 'dept',
    title: '部门',
    width: 160,
    align: 'center',
    filters: DEPTS.map((d) => ({ label: d, value: d })),
  },
  { key: 'score', title: '分数', width: 120, align: 'right', sortable: true },
];

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  stripe: true,
  // 传了 pagination 就有分页器；不开 manualPagination 即客户端分页
  pagination: { pageSize: 20, pageSizes: [20, 50, 100] },
};

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref('');
let saved: string | null = null;

const syncStatus = () => {
  const p = tableRef.value?.getPagination();
  if (!p) return;
  status.value = `第 ${p.page} 页 · 每页 ${p.pageSize} 条 · 共 ${p.total} 条（筛选后）`;
};

onMounted(syncStatus);

const goPage7 = () => {
  tableRef.value?.setPage(7);
  syncStatus();
};
const filterDept = () => {
  tableRef.value?.setColumnFilter('dept', ['工程部']);
  syncStatus();
};
const clearFilter = () => {
  tableRef.value?.clearAllFilters();
  syncStatus();
};
const saveState = () => {
  saved = JSON.stringify(tableRef.value?.getState());
  status.value = '已存下当前列宽 / 列序 / 排序 / 筛选 / 分页';
};
const loadState = () => {
  if (!saved) return;
  tableRef.value?.setState(JSON.parse(saved));
  syncStatus();
};
</script>
