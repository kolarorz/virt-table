<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtNumberInput 数字输入</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 760px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { VirtTableVue, type VueTableColumn, vtCellEditor } from '@virt-table/vue';
import { VtNumberInput } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const columns: VueTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  VtNumberInput({ key: 'score', title: '分数', width: 160, placeholder: '0-100', min: 0, max: 100, step: 1 }),
  VtNumberInput({
    key: 'price',
    title: '价格',
    width: 180,
    placeholder: '请输入价格',
    min: 0,
    step: 0.01,
    precision: 2,
    clearable: true,
  }),
  VtNumberInput({
    key: 'quantity',
    title: '数量',
    width: 160,
    placeholder: '请输入数量',
    min: 0,
    max: 9999,
    step: 1,
    clearable: true,
  }),
  VtNumberInput({ key: 'readonly', title: '只读', width: 160, disabled: true, precision: 2 }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  score: Math.floor(Math.random() * 100),
  price: +(Math.random() * 1000).toFixed(2),
  quantity: Math.floor(Math.random() * 500),
  readonly: +(Math.random() * 100).toFixed(2),
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  textOverflow: 'ellipsis' as const,
  // 编辑态走 renderEditor，必须装 vtCellEditor 才会被触发
  plugins: [vtCellEditor()],
};

const status = `VtNumberInput 单元格组件：${ROW_COUNT} 行（支持 min/max/step/precision、clearable、disabled）`;
</script>
