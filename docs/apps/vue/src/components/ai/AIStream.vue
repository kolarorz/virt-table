<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 流式表格</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="start">
        开始接收
      </button>
      <button type="button" class="virt-table-btn" @click="stop">停止</button>
      <button type="button" class="virt-table-btn" @click="burst">灌 2 万行</button>
      <button type="button" class="virt-table-btn" @click="reset">清空重来</button>
      <span class="demo-note" style="font-variant-numeric: tabular-nums">{{ stat }}</span>
    </div>
    <div class="demo-hint">
      表格初始<strong>没有列配置</strong>，列是首批数据到达时推断出来的（金额右对齐 + 千分位、结清居中、
      订单号虽是数字串但不右对齐）。接收中往上滚会脱离底部跟随，滚回底部自动恢复。
    </div>
    <div style="width: 100%; height: 520px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { VirtTableVue, type VueTableColumn, type AIStreamState, vtAIStream } from '@virt-table/vue';
import type { VirtTableVueInstance } from '../../virt-table-ref';

/**
 * vtAIStream：一边收数据一边渲染，列自己长出来。
 *
 * 这个 demo 模拟的是「agent 跑完一段任务，把结果一行一行吐回来」——
 * 表格初始**没有任何列配置**（`columns: []`），首批数据到达时由
 * `inferColumns()` 推断出列（类型、标题、宽度、对齐都是算出来的）。
 *
 * 换成真实数据源只需替换这个生成器（吃任何 `AsyncIterable`，SSE /
 * `ReadableStream` / 异步生成器都行），再交给 `consumeAIStream()`。
 */
const FIRST_NAMES = ['林', '陈', '王', '李', '张', '刘', '黄', '周', '吴', '徐'];
const GIVEN = ['明', '静', '磊', '娜', '强', '敏', '杰', '芳', '涛', '燕'];
const CITIES = ['上海', '北京', '深圳', '杭州', '成都', '广州', '武汉', '西安'];
const CHANNELS = ['官网', '小程序', '门店', '电话', '第三方平台'];
const STATUS = ['已完成', '处理中', '待审核', '已取消'];

/** 一条「agent 抓回来的」记录。注意 key 是 camelCase，标题由 humanizeKey 推出来 */
function makeRow(i: number) {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  return {
    id: i,
    orderNo: `SO${String(202600000 + i)}`, // 纯数字串：不该被当成数字右对齐
    customerName: FIRST_NAMES[rnd(FIRST_NAMES.length)]! + GIVEN[rnd(GIVEN.length)]!,
    city: CITIES[rnd(CITIES.length)]!,
    channel: CHANNELS[rnd(CHANNELS.length)]!,
    amount: rnd(980000) + 2000, // 数字：应当右对齐 + 千分位
    settled: Math.random() > 0.4, // 布尔：应当居中
    createdAt: new Date(Date.now() - rnd(86400000 * 90)).toISOString().slice(0, 10), // 日期
    status: STATUS[rnd(STATUS.length)]!,
  };
}

// 故意留空 —— 列由 vtAIStream 推断
const columns: VueTableColumn[] = [];

const tableRef = ref<VirtTableVueInstance | null>(null);
const stat = ref('');

const options = {
  list: [] as Record<string, unknown>[],
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  emptyText: '等待数据…点上方「开始接收」',
  plugins: [
    vtAIStream({
      inferOptions: { minWidth: 96 },
      onStateChange(state: AIStreamState) {
        stat.value =
          state.status === 'idle'
            ? ''
            : `${state.status} · 已落地 ${state.received.toLocaleString()} 行` +
              (state.buffered > 0 ? ` · 缓冲 ${state.buffered}` : '') +
              (state.following ? '' : ' · 已脱离跟随');
      },
    }),
  ],
};

let seq = 0;
let stopped = true;
let timer: ReturnType<typeof setTimeout> | null = null;

/** 模拟「模型逐条吐结果」：每 30~90ms 来 1~6 行，节奏不均匀 */
const start = () => {
  if (!stopped && timer) return;
  stopped = false;
  tableRef.value?.startAIStream();
  const step = () => {
    if (stopped) return;
    const n = 1 + Math.floor(Math.random() * 6);
    tableRef.value?.pushAIStreamRows(Array.from({ length: n }, () => makeRow(seq++)));
    timer = setTimeout(step, 30 + Math.random() * 60);
  };
  step();
};

const stop = () => {
  stopped = true;
  if (timer) clearTimeout(timer);
  timer = null;
  tableRef.value?.endAIStream();
};

// 一次灌很多：验证批量落地不会把一帧撑爆（maxRowsPerFlush 会分批）
const burst = () => {
  tableRef.value?.pushAIStreamRows(Array.from({ length: 20000 }, () => makeRow(seq++)));
};

const reset = () => {
  stop();
  seq = 0;
  tableRef.value?.setList([]);
  tableRef.value?.setColumns([]);
  tableRef.value?.startAIStream();
  stat.value = '';
};

onUnmounted(() => {
  stopped = true;
  if (timer) clearTimeout(timer);
});
</script>
