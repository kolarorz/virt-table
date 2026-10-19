# 透视表

<ProPkgStatus pkg="@virt-table-pro/pivot" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/pivot" example-id="pro-pivot" />

<!--@include: @/.enterprise/pivot/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtPivot } from '@virt-table-pro/pivot';
import '@virt-table-pro/pivot/index.css'; // 只有一条规则（条数徽标），其余外观全是核心的

const tableRef = ref<VirtTablePluginApi | null>(null);

const options = {
  list: orders,
  itemKey: 'id', // ⚠️ 不要与维度字段同名（行 key 会写到这个字段上）
  estimatedSize: 40,
  plugins: [
    vtPivot({
      rows: ['region', 'dept'], // 行维度，顺序即层级
      columns: ['quarter'], // 列维度 → 多级分组表头
      values: [
        { field: 'amount', agg: 'sum', title: '金额' },
        { field: 'id', agg: 'count', title: '笔数' },
      ],
      // 源数据级的条件放这里 —— 列头筛选筛的是透视结果，见下文
      filter: (o) => o.status !== 'cancelled',
    }),
  ],
};

const byDept = (): void => {
  tableRef.value?.setPivotConfig({ rows: ['dept'], values: [{ field: 'amount', agg: 'avg' }] });
};
</script>

<template>
  <button @click="byDept">按部门看平均</button>
  <button @click="tableRef?.setPivotConfig(null)">退回明细</button>
  <!-- columns 是明细列：不透视时用它，setPivotConfig(null) 也会还回来 -->
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

::: warning Vue 端的 ref 类型链路
`vtPivot` 用 `declare module` 把三个方法合并进了 `VirtTablePluginApi`，所以把 ref 标成
`VirtTablePluginApi` 就有类型。`VirtTableVue` 自己的 ref 类型**没有** extends 它
（核心侧的已知缺口），直接写 `ref<InstanceType<typeof VirtTableVue>>` 时这几个方法在
类型上看不见 —— 运行时完全正常。
:::

<!--@include: @/.enterprise/pivot/s1.md-->
