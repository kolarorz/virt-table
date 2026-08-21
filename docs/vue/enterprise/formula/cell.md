# 公式 · 单元格公式

<ProPkgStatus pkg="@virt-table-pro/formula" status="shipped" product="formula" css="index.css" />

<ProDemo pkg="@virt-table-pro/formula" example-id="pro-sheet" />

<!--@include: @/.enterprise/formula/cell/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtCellEditor, vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtFormula } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';

const SHEET_COLS = ['A', 'B', 'C', 'D', 'E'];

type TableInstance = VirtTablePluginApi & { forceUpdate(): void };
const tableRef = ref<TableInstance | null>(null);
const activeRef = ref<string | null>(null);

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 32,
  plugins: [
    vtFormula({ columns: SHEET_COLS, onActiveCellChange: (cell) => (activeRef.value = cell) }),
    vtCellEditor({ trigger: 'dblclick' }),
    vtCellSelection(),
  ],
};
</script>

<template>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

<!--@include: @/.enterprise/formula/cell/s1.md-->
