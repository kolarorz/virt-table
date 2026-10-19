<script setup lang="ts">
/**
 * 状态栏 demo（Vue 端）：装 `vtStatusBar` + 核心的 `vtCellSelection`。
 *
 * 框选那件事必须**亲手拖**才有感觉，按钮留给拖不出来的：程序化设选区、选一片文字
 * （求和那几项整项消失，而不是显示 0）、筛掉一半（「总行数」不跟着变）。
 */
import { computed, ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtStatusBar } from '@virt-table-pro/status-bar';
import '@virt-table-pro/status-bar/index.css';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { ProTableInstance } from './types';

/**
 * 金额格式化。
 *
 * 用 `Intl.NumberFormat` 而不是 `¥${v.toLocaleString()}` —— 后者在负数上会拼出
 * `¥-87,355`，而中文的正确写法是 `-¥87,355`（符号在货币记号之前）。
 * 这个 demo 的数据每 9 行掺一个负数，所以「最小」那一项一定会踩到。
 */
const CNY = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
/** 拖选与按钮都会改它，旁注跟着它走 */
const tick = ref(0);
const visible = ref(true);

const rows: Row[] = makeRows();
const columns = makeColumns();

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  stripe: true,
  border: true,
  plugins: [
    vtCellSelection(),
    vtStatusBar<Row>({
      aggregates: ['count', 'sum', 'avg', 'min', 'max'],
      counts: ['total', 'filtered', 'checked', 'selectedRows'],
      /*
       * 选区只覆盖金额那一列时才加「¥」—— 跨列时不同列的单位不一样，
       * 一律加会把计数也标上货币符号。
       */
      format: (v, kind, { columnKeys }) =>
        columnKeys.length === 1 && columnKeys[0] === 'amount' && kind !== 'count'
          ? CNY.format(v)
          : v.toLocaleString('zh-CN', { maximumFractionDigits: 4 }),
      items: (s) => [
        {
          key: 'ratio',
          label: '选中占比',
          value:
            s.filtered && s.selectedRows
              ? `${((s.selectedRows / s.filtered) * 100).toFixed(1)}%`
              : '',
          side: 'left',
        },
      ],
    }),
  ],
};

/** 列下标别写死 —— 列定义改了就会指错 */
const colIndex = (key: string): number =>
  tableRef.value?.getLeafColumns().findIndex((c) => c.key === key) ?? 0;

const summary = computed(() => {
  void tick.value; // 依赖它以便拖选后重算
  return tableRef.value?.getStatusBarSummary?.();
});

const selectAmount = (): void => {
  const col = colIndex('amount');
  tableRef.value?.setCellSelection({ startRow: 0, startCol: col, endRow: 99, endCol: col });
  tick.value += 1;
  emit('status', '程序化设置的选区与拖选走同一条路，条上照常更新');
};

const selectText = (): void => {
  const col = colIndex('name');
  tableRef.value?.setCellSelection({ startRow: 0, startCol: col, endRow: 49, endCol: col });
  tick.value += 1;
  emit('status', '求和 / 平均 / 极值整项消失了 —— 不是显示 0。「求和 0」会被读成「加起来是零」');
};

const selectAcross = (): void => {
  tableRef.value?.setCellSelection({
    startRow: 0,
    startCol: colIndex('name'),
    endRow: 19,
    endCol: colIndex('amount') + 1,
  });
  tick.value += 1;
  emit('status', '跨列时只有能当数字的格进聚合，货币符号也不加了（列的单位不一样）');
};

const filterDone = (): void => {
  tableRef.value?.setColumnFilter('status', ['已完成']);
  tick.value += 1;
  emit('status', '「当前」跟着变，「总行数」不变 —— 后者读的是筛选前的源数据行数');
};

const reset = (): void => {
  tableRef.value?.setColumnFilter('status', []);
  tableRef.value?.clearCellSelection();
  tick.value += 1;
  emit('status', '');
};

const toggle = (): void => {
  visible.value = !visible.value;
  tableRef.value?.showStatusBar?.(visible.value);
};
</script>

<template>
  <div class="pg-toolbar">
    <button class="pg-btn" @click="selectAmount">选中金额列前 100 行</button>
    <button class="pg-btn" @click="selectText">选一片「名称」（文字）</button>
    <button class="pg-btn" @click="selectAcross">跨列选</button>
    <button class="pg-btn" @click="filterDone">只看「已完成」</button>
    <button class="pg-btn" @click="reset">清筛选与选区</button>
    <label class="pg-switch">
      <input type="checkbox" :checked="visible" @change="toggle" />
      显示状态栏
    </label>
  </div>

  <!-- 拖选结束后刷旁注。状态栏自己走 cellSelection.subscribe（多消费者），
       这里再订一份也不会抢它 —— 不能去占 vtCellSelection({ onChange })，那是单槽位的 -->
  <div class="pg-table" @pointerup="tick += 1">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>

  <div class="pg-aside">
    <div class="pg-aside-box">
      <p>
        <b>在金额列上按住拖一片</b> —— 底下那条会跟着变。任意一项<b>点一下即复制</b>（复制出去的是
        <code>3500</code> 而不是 <code>3,500</code>：贴到别处还要继续算）。
      </p>
      <p>
        当前选区：{{
          summary?.range
            ? `${summary.selectedRows} 行 × ${summary.columnKeys.length} 列（${summary.columnKeys.join(' / ')}）`
            : '无'
        }}
      </p>
      <p>
        能当数字的格子 {{ summary?.selection.numericCount ?? 0 }} /
        {{ summary?.selection.count ?? 0 }}　去重取值 {{ summary?.selection.distinct ?? 0 }}
      </p>
    </div>
  </div>
</template>
