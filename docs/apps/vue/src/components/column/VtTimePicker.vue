<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtTimePicker 时间选择</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 880px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { VirtTableVue, type VueTableColumn, vtCellEditor } from '@virt-table/vue';
import { VtTimePicker } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const columns: VueTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '排班', width: 160 },
  VtTimePicker({ key: 'start', title: '开始', width: 150 }),
  VtTimePicker({ key: 'end', title: '结束', width: 150, clearable: true }),
  // step: 1 让原生控件出现秒位；min/max 限制可选范围
  VtTimePicker({ key: 'checkAt', title: '打卡（含秒）', width: 180, step: 1, min: '06:00', max: '23:00' }),
  VtTimePicker({ key: 'fixed', title: '只读', width: 150, disabled: true }),
];

const pad = (n: number) => String(n).padStart(2, '0');
const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `班次 ${i}`,
  start: `${pad(8 + (i % 4))}:${pad((i * 15) % 60)}`,
  end: `${pad(17 + (i % 3))}:${pad((i * 20) % 60)}`,
  checkAt: `${pad(8 + (i % 4))}:${pad((i * 7) % 60)}:${pad((i * 13) % 60)}`,
  fixed: '09:00',
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  plugins: [vtCellEditor()],
};

const status =
  'VtTimePicker：与 VtDatePicker 同构，用原生 input[type=time]。值就是控件的原始字符串（HH:mm，配了 step 则含秒），不做二次解析';
</script>
