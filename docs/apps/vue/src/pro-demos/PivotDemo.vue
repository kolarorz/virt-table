<script setup lang="ts">
/**
 * 透视表 demo（Vue 端）：只装 `vtPivot`。
 *
 * 五档预设按「这个包替你省了什么」递进：一层维度 → 两层（小计 + 折叠展开）→ 加列维度
 * （多级分组表头）→ 平表形式 → 关掉透视。中间那两档的能力全部是**核心的**，
 * 这个插件只是产出了一棵树与一套列。
 */
import { computed, ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import { vtPivot, type PivotOptions } from '@virt-table-pro/pivot';
import '@virt-table-pro/pivot/index.css';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { ProTableInstance } from './types';

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
const activeIndex = ref(0);
const onlyDone = ref(false);

const rows: Row[] = makeRows();
const columns = makeColumns();

/** 金额是掺了负数的（见 shared/data.ts），千分位看得清一点 */
const formatValue = (v: unknown): string =>
  typeof v === 'number' ? v.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '';

const PRESETS: Array<{ label: string; note: string; config: PivotOptions<Row> | null }> = [
  {
    label: '① 按部门',
    note: '一层行维度：最朴素的分组聚合，值列可点表头排序',
    config: {
      rows: ['dept'],
      values: [
        { field: 'amount', agg: 'sum', title: '金额' },
        { field: 'id', agg: 'count', title: '笔数' },
        { field: 'amount', agg: 'avg', title: '均值' },
      ],
    },
  },
  {
    label: '② 部门 → 城市',
    note: '两层行维度：出小计行，点行首箭头可展开 —— 折叠展开是核心的树形列',
    config: {
      rows: ['dept', 'city'],
      values: [
        { field: 'amount', agg: 'sum', title: '金额' },
        { field: 'id', agg: 'count', title: '笔数' },
      ],
    },
  },
  {
    label: '③ 交叉：× 状态',
    note: '加了列维度 → 多级分组表头（也是核心的），最右边一组是总计列',
    config: {
      rows: ['dept'],
      columns: ['status'],
      values: [
        { field: 'amount', agg: 'sum', title: '金额' },
        { field: 'id', agg: 'count', title: '笔数' },
      ],
    },
  },
  {
    label: '④ 平表形式',
    note: '关掉小计 → 每个维度各占一列（Excel 的「表格形式」），没有树也就没有折叠',
    config: {
      rows: ['dept', 'city'],
      values: [{ field: 'amount', agg: 'sum', title: '金额' }],
      showSubtotals: false,
    },
  },
  {
    label: '⑤ 关掉透视',
    note: '行与列一起退回明细视图 —— 装了这个插件不等于失去原来那张表',
    config: null,
  },
];

/*
 * `PRESETS[i]!` 的断言不是偷懒：Vue 那个 app 继承了 `@vue/tsconfig` 的
 * `noUncheckedIndexedAccess`，下标访问一律带上 `undefined`。`activeIndex` 只由
 * `apply(i)` 写入、i 一定来自这个数组的遍历，所以越界不可能发生。
 * （同 `pro-kit/shared/data.ts` 里 `pick()` 的那条注释。）
 */
const at = (i: number): (typeof PRESETS)[number] => PRESETS[i]!;

const note = computed(() => at(activeIndex.value).note);

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  stripe: true,
  border: true,
  plugins: [vtPivot<Row>({ ...(at(0).config as PivotOptions<Row>), formatValue })],
};

const apply = (index: number): void => {
  activeIndex.value = index;
  const preset = at(index);
  if (!preset.config) {
    tableRef.value?.setPivotConfig?.(null);
    emit('status', '已退回明细视图（2000 行）');
    return;
  }
  tableRef.value?.setPivotConfig?.({
    ...preset.config,
    formatValue,
    // 源数据级的条件只能放这里：列头筛选筛的是透视结果
    ...(onlyDone.value ? { filter: (r: Row) => r.status === '已完成' } : {}),
  });
  const result = tableRef.value?.getPivotResult?.();
  emit(
    'status',
    `参与统计 ${result?.sourceCount ?? 0} 条明细 → ${result?.rows.length ?? 0} 行`,
  );
};

const toggleOnlyDone = (): void => {
  onlyDone.value = !onlyDone.value;
  apply(activeIndex.value);
};
</script>

<template>
  <div class="pg-toolbar">
    <button
      v-for="(preset, i) in PRESETS"
      :key="preset.label"
      class="pg-btn"
      :class="{ 'is-active': activeIndex === i }"
      @click="apply(i)"
    >
      {{ preset.label }}
    </button>
    <label class="pg-switch">
      <input type="checkbox" :checked="onlyDone" @change="toggleOnlyDone" />
      只统计「已完成」
    </label>
    <button class="pg-btn" @click="tableRef?.expandAll()">展开全部</button>
    <button class="pg-btn" @click="tableRef?.collapseAll()">折叠全部</button>
  </div>

  <div class="pg-table">
    <!-- columns 是明细列：不透视时用它，setPivotConfig(null) 也会还回来 -->
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>

  <div class="pg-aside">
    <div class="pg-aside-box">{{ note }}</div>
  </div>
</template>
