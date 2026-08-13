<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtCheckbox 布尔勾选</h3>
    <div class="status-text">{{ status }}</div>
    <div ref="containerRef" style="width: 820px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { VtCheckbox } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const columns: VueTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '名称', width: 160 },
  VtCheckbox({ key: 'enabled', title: '启用', width: 100, align: 'center' }),
  // 值不是布尔：勾选写回 'Y'、取消写回 'N'
  VtCheckbox({ key: 'vip', title: 'VIP', width: 100, align: 'center', trueValue: 'Y', falseValue: 'N' }),
  // 数字 1/0
  VtCheckbox({ key: 'audited', title: '已审核', width: 110, align: 'center', trueValue: 1, falseValue: 0 }),
  // 只读回显
  VtCheckbox({ key: 'locked', title: '锁定（只读）', width: 130, align: 'center', disabled: true }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `条目 ${i}`,
  enabled: i % 2 === 0,
  vip: i % 3 === 0 ? 'Y' : 'N',
  audited: i % 4 === 0 ? 1 : 0,
  locked: i % 5 === 0,
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
};

const containerRef = ref<HTMLElement | null>(null);
const status = ref('');

const refresh = () => {
  const on = list.filter((r) => r.enabled).length;
  const vip = list.filter((r) => r.vip === 'Y').length;
  status.value = `VtCheckbox：点一下即写回（不弹编辑浮层，所以不需要 vtCellEditor 插件）。当前启用 ${on} 行、VIP ${vip} 行`;
};

// 勾选写回后统计要跟着变。组件内部改的是行数据，冒泡上来的 change 事件是最省事的信号
onMounted(() => {
  refresh();
  containerRef.value?.addEventListener('change', refresh);
});
onUnmounted(() => {
  containerRef.value?.removeEventListener('change', refresh);
});
</script>
