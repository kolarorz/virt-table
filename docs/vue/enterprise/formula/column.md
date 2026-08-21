# 公式 · 计算列

<ProPkgStatus pkg="@virt-table-pro/formula" status="shipped" product="formula" css="none" />

<ProDemo pkg="@virt-table-pro/formula" example-id="pro-formula" />

<!--@include: @/.enterprise/formula/column/s0.md-->

```vue
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtFormulaColumn } from '@virt-table-pro/formula';

type TableInstance = VirtTablePluginApi & { forceUpdate(): void };
const tableRef = ref<TableInstance | null>(null);

const options = reactive({
  list: makeRows(1000),
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [
    vtFormulaColumn({
      columns: { tax: 'ROUND(amount * 0.06, 2)', total: 'amount + tax' },
    }),
  ],
});

// 换数据：先算再进表（见下方「求值时机」）
const swap = (next: Row[]): void => {
  tableRef.value?.evaluateFormulas(next);
  options.list = next;
};
</script>

<template>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

<!--@include: @/.enterprise/formula/column/s1.md-->
