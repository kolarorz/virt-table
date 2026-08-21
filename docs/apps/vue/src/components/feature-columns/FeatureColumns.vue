<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 功能列</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="getChecked">
        获取勾选行
      </button>
      <button type="button" class="virt-table-btn virt-table-btn-danger" @click="clearChecked">
        清空勾选
      </button>
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="getRadio">
        获取当前行
      </button>
      <button type="button" class="virt-table-btn" @click="clearRadio">清除当前行</button>
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

/** 序号 / 勾选 / 单选 三种 `col.type` 同表并存（勾选与单选各占一列，状态互不干扰） */
interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
  dept: string;
}

const ROW_COUNT = 1000;

const columns: VueTableColumn<Row>[] = [
  { key: '__index', title: '#', width: 60, type: 'index', align: 'center' },
  { key: '__checkbox', title: '', width: 50, type: 'checkbox', align: 'center' },
  { key: '__radio', title: '当前', width: 60, type: 'radio', align: 'center' },
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 160 },
  { key: 'city', title: '城市', width: 160 },
  { key: 'dept', title: '部门', width: 200 },
];

const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  city: faker.location.city(),
  dept: faker.commerce.department(),
}));

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref(`序号 / 勾选 / 单选 三种功能列同表：${ROW_COUNT} 行`);

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  onCheckChange: (checked: boolean, row: Record<string, unknown>) => {
    const count = (tableRef.value?.getCheckedRows() ?? []).length;
    status.value = `勾选：行 ${(row as Row).id} ${checked ? '选中' : '取消'}，共 ${count} 行`;
  },
  onCheckAll: (checked: boolean) => {
    const count = (tableRef.value?.getCheckedRows() ?? []).length;
    status.value = checked ? `全选 ${count} 行` : '取消全选';
  },
  onRadioChange: (row: Record<string, unknown>) => {
    const r = row as Row;
    status.value = `单选：当前行 ${r.name}（id=${r.id}）`;
  },
};

const getChecked = () => {
  const rows = (tableRef.value?.getCheckedRows() ?? []) as Row[];
  status.value = rows.length
    ? `勾选了 ${rows.length} 行：${rows.map((r) => r.id).join(', ')}`
    : '没有勾选任何行';
};

const clearChecked = () => {
  tableRef.value?.clearCheckedRows();
  status.value = '已清空勾选';
};

const getRadio = () => {
  const r = tableRef.value?.getSelectedRadio() as Row | null | undefined;
  status.value = r ? `当前行：${r.name}（id=${r.id}）` : '没有当前行';
};

const clearRadio = () => {
  tableRef.value?.setSelectedRadio(null);
  status.value = '已清除当前行';
};
</script>
