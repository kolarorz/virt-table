<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtProgress 进度条</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 1100px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { VirtTableVue, type VueTableColumn, vtCellEditor } from '@virt-table/vue';
import { VtProgress } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const columns: VueTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '任务', width: 160 },
  VtProgress({ key: 'progress', title: '进度', width: 200 }),
  // 色阶：30 以下红、70 以下黄、其余默认主色
  VtProgress({
    key: 'health',
    title: '健康度（色阶）',
    width: 200,
    thresholds: [
      { lte: 30, variant: 'danger' },
      { lte: 70, variant: 'warning' },
    ],
  }),
  // 可编辑：点开是滑块 + 数字框（拖着调大概，键入调准确；max: 100 时数字就是百分比）
  VtProgress({ key: 'done', title: '完成度（可编辑）', width: 220, editable: true }),
  // 非百分制 + 自定义文案。editable 下右侧那格换成数字框，所以 format 只作用于只读态
  VtProgress({
    key: 'score',
    title: '得分（满分 5，可编辑）',
    width: 220,
    max: 5,
    step: 0.5,
    editable: true,
    format: (v) => `${v} / 5`,
  }),
  // 值缺失/非数字：条画 0，文字如实显示
  VtProgress({ key: 'unknown', title: '未评估', width: 180 }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `任务 ${i}`,
  progress: i % 101,
  health: (i * 7) % 101,
  done: (i * 13) % 101,
  score: (i % 5) + 1,
  unknown: i % 3 === 0 ? null : i % 3 === 1 ? '待评估' : i % 101,
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  // editable 的列走 renderEditor，必须装 vtCellEditor 才会被触发
  plugins: [vtCellEditor()],
};

const status =
  'VtProgress：默认纯展示。两列开了 editable —— 点开是滑块 + 数字输入框：拖滑块调大概，直接键入调准确（默认 max: 100 时键入的数字就是百分比，框后面跟一个 %；「得分」列 max: 5 所以不跟 %），两个控件永远显示同一个值。最后一列演示「值不是数字」时的表现 —— 条画成 0 但文字显示原值/短横，不冒充「真的是 0」';
</script>
