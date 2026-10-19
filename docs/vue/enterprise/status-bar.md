# 状态栏（选区聚合）

<ProPkgStatus pkg="@virt-table-pro/status-bar" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/status-bar" example-id="pro-status-bar" />

<!--@include: @/.enterprise/status-bar/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtStatusBar } from '@virt-table-pro/status-bar';
import '@virt-table-pro/status-bar/index.css';

const tableRef = ref<VirtTablePluginApi | null>(null);

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40, // 核心的必填项：list / columns / itemKey / estimatedSize
  plugins: [
    // 选区聚合要它 —— 不装也能用，那时只有左侧的行数统计
    vtCellSelection(),
    vtStatusBar({ aggregates: ['count', 'sum', 'avg', 'max'] }),
  ],
};

/** 插件 API 自动透到 ref 上，不需要另外声明 */
function toggle() {
  tableRef.value?.showStatusBar();
}
function readSummary() {
  return tableRef.value?.getStatusBarSummary();
}
</script>

<template>
  <button @click="toggle">显示 / 隐藏状态栏</button>
  <VirtTableVue ref="tableRef" v-bind="options" :columns="columns" />
</template>
```

<!--@include: @/.enterprise/status-bar/s1.md-->
