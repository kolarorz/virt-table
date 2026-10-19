# 真 xlsx 与 PDF 导出

<ProPkgStatus pkg="@virt-table-pro/xlsx" status="shipped" css="none" />

<ProDemo pkg="@virt-table-pro/xlsx" example-id="pro-xlsx" />

<!--@include: @/.enterprise/xlsx/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtCellSelection, vtToolbar, vtExport } from '@virt-table/vanilla/plugins';
import { vtXlsx } from '@virt-table-pro/xlsx';

const tableRef = ref<VirtTablePluginApi | null>(null);

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40, // 核心的必填项：list / columns / itemKey / estimatedSize
  showSummary: true,
  plugins: [
    vtXlsx({
      sheetName: '订单',
      freeze: { rows: 1, cols: 2 }, // rows 数的是表头，分组表头会自动冻满
      numberFormats: { amount: '#,##0.00' },
      liveSummary: true, // 合计行写成活 SUBTOTAL 公式
    }),
    // 选区导出要它；不装的话 selectionOnly 会告警并退回全表
    vtCellSelection(),
    // 把「导出」那颗按钮留给 vtXlsx（核心那颗也叫导出，并排两颗很怪）
    vtToolbar(),
    vtExport({ toolbar: false }),
  ],
};
</script>

<template>
  <button @click="tableRef?.exportXlsx()">导出 xlsx</button>
  <button @click="tableRef?.exportXlsx({ selectionOnly: true })">导出选区</button>
  <button @click="tableRef?.exportPdf({ title: '订单明细', landscape: true })">打印 / PDF</button>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

::: warning Vue 端的 ref 类型链路
`vtXlsx` 用 `declare module` 把 `exportXlsx` / `exportPdf` 合并进了 `VirtTablePluginApi`，
所以把 ref 标成 `VirtTablePluginApi` 就有类型。Vue 端 `VirtTableVue` 自己的 ref 类型
**没有** extends 它（核心侧的已知缺口），直接写 `ref<InstanceType<typeof VirtTableVue>>`
的话这两个方法在类型上看不见 —— 运行时完全正常。
:::

<!--@include: @/.enterprise/xlsx/s1.md-->
