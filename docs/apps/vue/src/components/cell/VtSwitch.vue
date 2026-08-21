<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtSwitch 开关</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 840px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { VtSwitch } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const lastChange = ref('（未操作）');
// 计数要在写回后重算，用一个递增的 tick 触发 computed 重新求值
const tick = ref(0);

const columns: VueTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '名称', width: 160 },
  VtSwitch({
    key: 'enabled',
    title: '启用',
    width: 110,
    onChange: (v, row) => {
      lastChange.value = `${(row as { name: string }).name} → ${v}`;
      tick.value++;
    },
  }),
  // 带文案
  VtSwitch({ key: 'notify', title: '通知', width: 160, activeText: '已开启', inactiveText: '已关闭' }),
  // 字符串枚举
  VtSwitch({
    key: 'mode',
    title: '模式',
    width: 150,
    trueValue: 'on',
    falseValue: 'off',
    activeText: 'on',
    inactiveText: 'off',
  }),
  VtSwitch({ key: 'locked', title: '锁定（只读）', width: 130, disabled: true }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `条目 ${i}`,
  enabled: i % 2 === 0,
  notify: i % 3 === 0,
  mode: i % 4 === 0 ? 'on' : 'off',
  locked: i % 5 === 0,
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
};

const status = computed(() => {
  tick.value; // 依赖它，写回后重算
  const on = list.filter((r) => r.enabled).length;
  return `VtSwitch：点一下即写回，与 VtCheckbox 同一套值语义（trueValue / falseValue）。启用 ${on} 行 · 最近一次 onChange：${lastChange.value}`;
});
</script>
