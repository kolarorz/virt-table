# 单元格迷你图

<ProPkgStatus pkg="@virt-table-pro/charts" status="partial" product="charts" css="index.css" />

<ProDemo pkg="@virt-table-pro/charts" example-id="pro-sparkline" />

<!--@include: @/.enterprise/charts/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi, VirtTableColumn } from '@virt-table/vanilla';
import { vtSparkline } from '@virt-table-pro/charts';
import '@virt-table-pro/charts/index.css';

const tableRef = ref<VirtTablePluginApi | null>(null);

const columns: VirtTableColumn[] = [
  { key: 'name', title: '产品', width: 140 },
  { key: 'weekly', title: '12 周趋势', width: 180 },
  { key: 'pnl', title: '近 10 日盈亏', width: 140 },
];

const options = {
  list: products,
  itemKey: 'id',
  estimatedSize: 40, // 核心的必填项：list / columns / itemKey / estimatedSize
  plugins: [
    vtSparkline({
      columns: {
        // field 默认就是列 key，行上有 row.weekly 就不用写
        weekly: { type: 'line', markers: ['min', 'max'], range: 'shared' },
        pnl: { type: 'winloss' },
      },
    }),
  ],
};

/** 迷你图**不需要**自定义单元格组件 —— 它由插件在 onCellRendered 里画进格子 */
function svgForExport() {
  return tableRef.value?.renderSparklineSvg([12, 18, 15, 22], 'weekly');
}
</script>

<template>
  <VirtTableVue ref="tableRef" v-bind="options" :columns="columns" />
</template>
```

<!--@include: @/.enterprise/charts/s1.md-->
