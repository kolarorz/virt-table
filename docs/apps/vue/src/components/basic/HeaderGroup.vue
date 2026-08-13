<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 多级分组表头</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="scrollMid">横向滚到中间</button>
      <button type="button" class="virt-table-btn" @click="scrollEnd">横向滚到最右</button>
      <button type="button" class="virt-table-btn virt-table-btn-warning" @click="scrollRandom">随机滚动行</button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 900px; height: 600px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import type { VirtTableVueInstance } from '../../virt-table-ref';

// 12 个季度分组 × 4 个指标 = 48 个叶子列，足够触发横向虚拟化
const quarters = Array.from({ length: 12 }, (_, i) => ({
  year: 2023 + Math.floor(i / 4),
  q: (i % 4) + 1,
}));

const metrics = [
  { key: 'revenue', title: '营收' },
  { key: 'cost', title: '成本' },
  { key: 'profit', title: '利润' },
  { key: 'rate', title: '毛利率' },
];

const rowCount = 2000;

function buildColumns(): VueTableColumn[] {
  const yearMap = new Map<number, VueTableColumn>();
  for (const { year, q } of quarters) {
    let yearCol = yearMap.get(year);
    if (!yearCol) {
      // 分组节点上的 summary 会聚合它旗下全部叶子列 × 全部行
      yearCol = { key: `y_${year}`, title: `${year} 年`, width: 0, summary: 'sum', children: [] };
      yearMap.set(year, yearCol);
    }
    yearCol.children!.push({
      key: `y${year}q${q}`,
      title: `Q${q}`,
      width: 0,
      // 季度小计只统计营收，用 summaryMethod 从摊平值里挑（每行 4 个指标，营收在第 0 个）
      summaryMethod: (values) => {
        let sum = 0;
        for (let i = 0; i < values.length; i += metrics.length) sum += Number(values[i]) || 0;
        return `营收 ${sum}`;
      },
      children: metrics.map((m) => ({
        key: `y${year}q${q}_${m.key}`,
        title: m.title,
        width: 110,
        align: 'right' as const,
        headerAlign: 'center' as const,
        // 毛利率是百分比字符串，不做求和
        ...(m.key === 'rate' ? { footerValue: '—' } : { summary: 'sum' as const }),
      })),
    });
  }

  return [
    // 冻结列同样支持分组：fixed 写在分组上，会自动下发给所有子列
    {
      key: 'g_base',
      title: '基础信息',
      width: 0,
      fixed: 'left',
      children: [
        // 首列叶子格默认自动放合计标签；这里显式给空值把标签让给下一列（序号列太窄会折行）
        { key: 'index', title: '#', width: 56, type: 'index', footerValue: '' },
        { key: 'name', title: '门店', width: 140, sortable: true, footerValue: '合计' },
      ],
    },
    ...yearMap.values(),
    {
      key: 'g_total',
      title: '汇总',
      width: 0,
      fixed: 'right',
      // 分组格用 renderFooter 自定义：可以拿到 rows / leafColumns / 自动聚合结果
      renderFooter: ({ rows }) => `<b>${rows.length} 家</b>`,
      children: [
        { key: 'total', title: '合计营收', width: 130, align: 'right', sortable: true, summary: 'sum' },
      ],
    },
  ];
}

const columns = buildColumns();
const leafCount = quarters.length * metrics.length + 3;

const list = Array.from({ length: rowCount }, (_, i) => {
  const row: Record<string, unknown> = { id: i, name: `门店 ${i + 1}` };
  let total = 0;
  for (const { year, q } of quarters) {
    const revenue = 200 + ((i * 37 + year + q * 13) % 800);
    const cost = Math.round(revenue * (0.45 + ((i + q) % 30) / 100));
    row[`y${year}q${q}_revenue`] = revenue;
    row[`y${year}q${q}_cost`] = cost;
    row[`y${year}q${q}_profit`] = revenue - cost;
    row[`y${year}q${q}_rate`] = `${(((revenue - cost) / revenue) * 100).toFixed(1)}%`;
    total += revenue;
  }
  row.total = total;
  return row;
});

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref(
  `多级分组表头 + 分组表尾：${rowCount} 行 × ${leafCount} 个叶子列，表头/表尾各 3 层；两者与表体一同横向虚拟化`,
);

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  colBuffer: 2,
  border: true,
  stripe: true,
  // 开启后表尾按同一棵列树渲染成多级分组表尾
  showSummary: true,
};

const scrollMid = () => {
  tableRef.value?.scrollToCell(0, Math.floor(leafCount / 2));
  status.value = '已横向滚动到中间列';
};

const scrollEnd = () => {
  tableRef.value?.scrollToCell(0, leafCount - 1);
  status.value = '已横向滚动到最右列';
};

const scrollRandom = () => {
  const index = Math.floor(Math.random() * rowCount);
  tableRef.value?.scrollToIndex(index);
  status.value = `随机滚动到第 ${index + 1} 行`;
};
</script>
