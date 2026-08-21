<!--
  响应式更新 —— 「数据变了，表格怎么知道」（Vue）。

  表格自己不侦测数据变化，侦测交给 Vue：`@virt-table/vue` 内部一个 watch 盯着
  `options.list` 的**引用**，变了就替你调 `setList()`。

  但**换引用不是目的**，只是让那个 watch 认出来的信号。所以四档里真正要比的是成本：
  克隆整份每轮新建「行数」个对象；`slice()` 只新建一个数组；拿 ref 直接
  `forceUpdate()` 一个对象都不新建 —— 巨量数据高频刷新走最后一档。
-->
<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 响应式更新 — 数据变了，表格怎么知道</h3>
    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn virt-table-btn-success"
        :disabled="timer != null"
        @click="start"
      >
        开始刷新
      </button>
      <button
        type="button"
        class="virt-table-btn virt-table-btn-danger"
        :disabled="timer == null"
        @click="stop"
      >
        停止刷新
      </button>
      <label>更新方式：</label>
      <button
        type="button"
        class="virt-table-btn"
        :class="{ 'virt-table-btn-primary': mode === 'clone' }"
        @click="mode = 'clone'"
      >
        克隆整份（watch 自动 setList）
      </button>
      <button
        type="button"
        class="virt-table-btn"
        :class="{ 'virt-table-btn-primary': mode === 'slice' }"
        @click="mode = 'slice'"
      >
        原地改 + slice() 换引用
      </button>
      <button
        type="button"
        class="virt-table-btn"
        :class="{ 'virt-table-btn-primary': mode === 'force' }"
        @click="mode = 'force'"
      >
        原地改 + forceUpdate()
      </button>
      <button
        type="button"
        class="virt-table-btn"
        :class="{ 'virt-table-btn-primary': mode === 'mutate' }"
        @click="mode = 'mutate'"
      >
        原地改（不通知）
      </button>
      <button
        v-if="mode === 'mutate'"
        type="button"
        class="virt-table-btn virt-table-btn-warning"
        @click="manualUpdate"
      >
        手动 forceUpdate()
      </button>
      <label>间隔(ms)：</label>
      <input v-model.number="interval" type="number" min="200" step="200" style="width: 82px" @change="onIntervalChange" />
      <label>行数：</label>
      <input v-model.number="rowCount" type="number" min="100" step="500" style="width: 92px" @change="onRowCountChange" />
    </div>
    <div class="status-text">
      行数: {{ list.length }} | 数据已改: {{ dataTick }} 轮 | 已通知表格: {{ notifyCount }} 次 |
      本轮新建对象: {{ lastAlloc }} | 间隔: {{ interval }}ms | 状态: {{ timer ? '刷新中' : '已停止' }}
    </div>
    <div class="status-text">{{ hint }}</div>
    <div style="width: 900px; height: 520px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

type Mode = 'clone' | 'slice' | 'force' | 'mutate';

interface Row {
  id: number;
  code: string;
  name: string;
  price: number;
  change: string;
  tick: number;
  updatedAt: string;
  [key: string]: unknown;
}

const DEFAULT_ROWS = 2000;

const nowText = () => new Date().toLocaleTimeString();

function createRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    code: `SEC-${String(i).padStart(5, '0')}`,
    name: faker.company.name(),
    price: Number(faker.finance.amount({ min: 10, max: 500, dec: 2 })),
    change: '+0.00%',
    tick: 0,
    updatedAt: nowText(),
  }));
}

/**
 * 把一行推进一个轮次。`clone` 为 true 时返回新对象（克隆整份那一档），
 * 为 false 时原地改写 —— 后者不产生垃圾，但 watch 也认不出来。
 */
function bump(row: Row, tick: number, clone: boolean): Row {
  const delta = (Math.random() - 0.5) * 6;
  const price = Number(Math.max(1, row.price * (1 + delta / 100)).toFixed(2));
  const change = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`;
  const updatedAt = nowText();

  if (clone) return { ...row, price, change, tick, updatedAt };

  row.price = price;
  row.change = change;
  row.tick = tick;
  row.updatedAt = updatedAt;
  return row;
}

const columns: VueTableColumn[] = [
  { key: 'code', title: '代码', width: 130, fixed: 'left' },
  { key: 'name', title: '名称', width: 240 },
  { key: 'price', title: '最新价', width: 120, align: 'right' },
  { key: 'change', title: '涨跌幅', width: 120, align: 'right' },
  { key: 'tick', title: '轮次', width: 90, align: 'right' },
  { key: 'updatedAt', title: '更新于', width: 140 },
];

// shallowRef 而不是 ref：深响应式会把每行每个字段都代理一遍，开销按总行数收，
// 而表格只渲染可视区那几十行 —— 且单元格内容不经 Vue 渲染器，深响应式换不到自动更新
const list = shallowRef<Row[]>(createRows(DEFAULT_ROWS));
const mode = ref<Mode>('force');
const interval = ref(600);
const rowCount = ref(DEFAULT_ROWS);
const dataTick = ref(0);
const notifyCount = ref(0);
const lastAlloc = ref(0);
const timer = ref<ReturnType<typeof setInterval> | null>(null);
const tableRef = ref<VirtTableVueInstance | null>(null);

// options 跟着 list 换新对象：适配层 watch 的就是 `options.list` 这个引用
const options = computed(() => ({
  list: list.value,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  // 涨跌上色：只读行数据，不参与更新通道
  cellStyle: (col: { key: string }, row: Record<string, unknown>) => {
    if (col.key !== 'change' && col.key !== 'price') return '';
    return String(row.change).startsWith('-') ? 'color:#16a34a' : 'color:#dc2626';
  },
}));

const HINTS: Record<Mode, string> = {
  clone: '克隆整份：list.value = list.value.map(row => ({ ...row })) —— watch 命中，但每轮新建「行数」个临时对象；巨量数据下堆峰值能翻好几倍，只适合数据量小或本来就走不可变数据流。',
  slice: '原地改 + slice()：元素对象全部复用，只新建一个数组（n 个指针）就能让 watch 命中 —— 想留在「框架自动同步」这条路上时的便宜写法。',
  force: '原地改 + forceUpdate()：不换引用、不新建对象，拿 ref 直接通知 —— 巨量数据高频刷新首选。前提是行集合没变（没增删、没改动参与排序/筛选的字段）。',
  mutate: '原地改（不通知）：shallowRef 不代理元素，引用也没换，Vue 与表格都察觉不到，「轮次」列会停住 —— 点「手动 forceUpdate()」才追上。',
};

const hint = computed(() => HINTS[mode.value]);

function tickOnce() {
  dataTick.value += 1;
  if (mode.value === 'clone') {
    list.value = list.value.map((row) => bump(row, dataTick.value, true));
    lastAlloc.value = list.value.length;
    notifyCount.value += 1; // watch 命中后由适配层调 setList()
    return;
  }

  for (const row of list.value) bump(row, dataTick.value, false);
  if (mode.value === 'slice') {
    list.value = list.value.slice();
    lastAlloc.value = 1;
    notifyCount.value += 1;
  } else if (mode.value === 'force') {
    tableRef.value?.forceUpdate();
    lastAlloc.value = 0;
    notifyCount.value += 1;
  } else {
    lastAlloc.value = 0;
  }
}

function start() {
  if (timer.value != null) return;
  tickOnce();
  timer.value = setInterval(tickOnce, interval.value);
}

function stop() {
  if (timer.value == null) return;
  clearInterval(timer.value);
  timer.value = null;
}

function manualUpdate() {
  tableRef.value?.forceUpdate();
  notifyCount.value += 1;
}

function onIntervalChange() {
  if (!Number.isFinite(interval.value) || interval.value < 200) interval.value = 200;
  if (timer.value != null) {
    // 改频率要重挂定时器，否则新值下一轮才生效
    clearInterval(timer.value);
    timer.value = setInterval(tickOnce, interval.value);
  }
}

function onRowCountChange() {
  if (!Number.isFinite(rowCount.value) || rowCount.value < 100) rowCount.value = 100;
  list.value = createRows(rowCount.value);
  dataTick.value = 0;
  lastAlloc.value = rowCount.value;
  notifyCount.value += 1;
}

onUnmounted(() => {
  if (timer.value != null) {
    clearInterval(timer.value);
    timer.value = null;
  }
});
</script>
