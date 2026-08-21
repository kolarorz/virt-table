<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtActions 操作列</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { VtActions } from '@virt-table/vanilla/components';
import type { VirtTableVueInstance } from '../../virt-table-ref';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  enabled: boolean;
  draft: boolean;
}

let list: Row[] = Array.from({ length: 5000 }, (_, i) => ({
  id: i,
  name: `条目 ${i}`,
  enabled: i % 2 === 0,
  draft: i % 3 === 0,
}));

const tableRef = ref<VirtTableVueInstance | null>(null);
const lastAction = ref('（未操作）');
const rowCount = ref(list.length);

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '名称', width: 200 },
  { key: 'state', title: '状态', width: 120, render: ({ row }) => (row.enabled ? '启用' : '停用') },
  VtActions<Row>({
    key: 'ops',
    title: '操作',
    width: 240,
    fixed: 'right',
    align: 'center',
    items: [
      // 只有草稿能编辑 —— disabled 写成函数，跟着行状态走
      {
        text: '编辑',
        disabled: (row) => !row.draft,
        onClick: (row) => {
          lastAction.value = `编辑 #${row.id}`;
        },
      },
      // 文案随行变化；停用/启用是同一个按钮的两面
      {
        text: (row) => (row.enabled ? '停用' : '启用'),
        onClick: (row) => {
          row.enabled = !row.enabled;
          lastAction.value = `${row.enabled ? '启用' : '停用'} #${row.id}`;
          tableRef.value?.forceUpdate();
        },
      },
      // 危险动作：语义色 + 二次确认
      {
        text: '删除',
        variant: 'danger',
        confirm: '删除后不可恢复，确定吗？',
        onClick: (row) => {
          list = list.filter((r) => r.id !== row.id);
          tableRef.value?.setList(list);
          rowCount.value = list.length;
          lastAction.value = `删除 #${row.id}`;
        },
      },
    ],
  }),
];

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
};

const status = computed(
  () =>
    `VtActions：text / disabled / hidden 都可写成 (row) => …；「删除」带二次确认气泡。剩余 ${rowCount.value} 行 · 最近操作：${lastAction.value}`,
);
</script>
