<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 列筛选</h3>
    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn"
        style="background: #ef4444; color: #fff"
        @click="clearFilters"
      >
        清除全部筛选
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
import { VirtTableVue, type VueTableColumn,
  vtColumnFilter,
} from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

type TableRef = VirtTableVueInstance & {
  getTable: () => { core: { state: { renderTotal: number } } } | null;
  clearAllFilters: () => void;
};

const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
const levels = ['P5', 'P6', 'P7', 'P8'];
const cities = ['北京', '上海', '杭州', '深圳'];

const list = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  name: faker.person.fullName(),
  department: departments[i % departments.length],
  level: levels[i % levels.length],
  city: cities[i % cities.length],
  score: Math.floor(Math.random() * 100),
}));

const columns: VueTableColumn[] = [
  { key: 'name', title: '姓名', width: 180 },
  {
    key: 'department',
    title: '部门',
    width: 140,
    filters: departments.map((d) => ({ label: d, value: d })),
    filterMultiple: true,
  },
  {
    key: 'level',
    title: '级别',
    width: 100,
    filters: levels.map((l) => ({ label: l, value: l })),
    filterMultiple: false,
  },
  {
    key: 'city',
    title: '城市',
    width: 120,
    filters: cities.map((c) => ({ label: c, value: c })),
  },
  {
    key: 'score',
    title: '分数',
    width: 120,
    filters: [
      { label: '≥ 80 优秀', value: 80 },
      { label: '≥ 60 及格', value: 60 },
      { label: '< 60 不及格', value: -1 },
    ],
    filterMultiple: false,
    filterMethod: (filterValue: unknown, row: Record<string, unknown>) => {
      const v = filterValue as number;
      const score = row.score as number;
      if (v === -1) return score < 60;
      return score >= v;
    },
  },
];

const tableRef = ref<TableRef | null>(null);
const status = ref(`列筛选：${list.length} 行（无筛选，点击表头筛选图标）`);

const options = {
  list,
  itemKey: 'id',
  plugins: [vtColumnFilter()],
  estimatedSize: 40,
  buffer: 4,
  border: true,
  onFilterChange: (filters: Record<string, unknown[]>) => {
    const t = tableRef.value?.getTable() as
      | { core: { state: { renderTotal: number } } }
      | undefined;
    const renderTotal = t?.core?.state?.renderTotal ?? list.length;
    const keys = Object.keys(filters);
    if (keys.length === 0) {
      status.value = `列筛选：${list.length} 行（无筛选）`;
    } else {
      const desc = keys
        .map((k) => {
          const v = filters[k] as unknown[];
          return `${k}: ${v.join(',')}`;
        })
        .join('；');
      status.value = `筛选条件 ${desc}，结果 ${renderTotal} 行`;
    }
  },
};

const clearFilters = () => {
  tableRef.value?.clearAllFilters();
  status.value = `列筛选：${list.length} 行（已清除全部筛选）`;
};
</script>
