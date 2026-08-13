<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 高级筛选（筛选管理器）</h3>
    <div class="virt-table-controls">
      <label>
        <input v-model="autoApply" type="checkbox" /> 即时应用
      </label>
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="loadPreset">载入示例条件</button>
    </div>
    <!-- 条件构建器在表格外部；v-model:model 双向绑定条件树 -->
    <div style="max-width: 900px; margin-bottom: 10px">
      <VirtFilterBuilderVue
        ref="builderRef"
        v-model:model="model"
        :table="tableInstance"
        :auto-apply="autoApply"
        @apply="updateStatus"
      />
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 900px; height: 520px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import {
  VirtTableVue,
  VirtFilterBuilderVue,
  type VueTableColumn,
  type FilterModel,
  vtColumnFilter,
} from '@virt-table/vue';
import { faker } from '@faker-js/faker';

const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
const levels = ['P5', 'P6', 'P7', 'P8'];
const cities = ['北京', '上海', '杭州', '深圳'];

const list = Array.from({ length: 2000 }, (_, i) => ({
  id: i,
  name: faker.person.fullName(),
  department: departments[i % departments.length],
  level: levels[i % levels.length],
  city: cities[i % cities.length],
  score: Math.floor(Math.random() * 100),
  hiredAt: faker.date.between({ from: '2019-01-01', to: '2025-06-30' }).toISOString().slice(0, 10),
}));

const columns: VueTableColumn[] = [
  { key: 'name', title: '姓名', width: 180, filterType: 'text' },
  {
    key: 'department',
    title: '部门',
    width: 130,
    filters: departments.map((d) => ({ label: d, value: d })),
  },
  { key: 'level', title: '级别', width: 100, filters: levels.map((l) => ({ label: l, value: l })) },
  {
    // 表头快捷筛选与高级筛选并存（AND）
    key: 'city',
    title: '城市',
    width: 110,
    filters: cities.map((c) => ({ label: c, value: c })),
  },
  { key: 'score', title: '分数', width: 100, filterType: 'number-range' },
  { key: 'hiredAt', title: '入职日期', width: 140, filterType: 'date-range' },
];

type TableInstance = {
  getTable: () => any;
  getFilterModel: () => FilterModel;
  getActiveFilters: () => Record<string, unknown[]>;
};

const tableRef = ref<TableInstance | null>(null);
const builderRef = ref<{ apply: () => void } | null>(null);
const tableInstance = ref<any>(null);
const autoApply = ref(false);
const model = ref<FilterModel>(null);
const status = ref('');

const options = {
  list,
  itemKey: 'id',
  plugins: [vtColumnFilter()],
  estimatedSize: 40,
  buffer: 4,
  border: true,
  onFilterChange: () => updateStatus(),
  onFilterModelChange: () => updateStatus(),
};

function updateStatus(): void {
  const t = tableRef.value?.getTable();
  const rendered = t?.core?.state?.renderTotal ?? list.length;
  const headerFilters = Object.keys(tableRef.value?.getActiveFilters() ?? {});
  status.value =
    `结果 ${rendered} / ${list.length} 行 · 高级筛选：${tableRef.value?.getFilterModel() ? '已启用' : '未启用'}` +
    (headerFilters.length ? ` · 表头筛选：${headerFilters.join('、')}` : '');
}

onMounted(() => {
  // 构建器需要 vanilla 实例才能自动取列并应用筛选
  tableInstance.value = tableRef.value?.getTable() ?? null;
  updateStatus();
});

async function loadPreset(): Promise<void> {
  model.value = {
    kind: 'group',
    logic: 'and',
    children: [
      { kind: 'condition', colKey: 'score', operator: 'gte', value: 80 },
      {
        kind: 'group',
        logic: 'or',
        children: [
          { kind: 'condition', colKey: 'department', operator: 'in', value: ['工程部', '设计部'] },
          { kind: 'condition', colKey: 'level', operator: 'eq', value: 'P8' },
        ],
      },
    ],
  };
  // 等 watch 把新模型写进构建器后再应用
  await nextTick();
  builderRef.value?.apply();
}
</script>
