<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 无限滚动</h3>
    <div class="virt-table-controls">
      <label>
        <input v-model="manual" type="checkbox" />
        手动模式（只显示「加载更多」按钮）
      </label>
      <label>
        <input v-model="failNext" type="checkbox" />
        注入故障（下一次请求失败）
      </label>
      <button type="button" class="virt-table-btn" @click="tableRef?.reload()">reload()</button>
      <button type="button" class="virt-table-btn" @click="tableRef?.refresh()">refresh()</button>
      <button type="button" class="virt-table-btn" @click="tableRef?.loadMore()">loadMore()</button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 820px; height: 460px" class="demo-container">
      <!-- key 让「手动模式」切换后重建表格（infinite 配置在构造时生效） -->
      <VirtTableVue :key="manual ? 'manual' : 'auto'" ref="tableRef" :columns="columns" :options="options" />
    </div>
    <div class="status-text" style="margin-top: 12px; white-space: pre-wrap; font-family: ui-monospace, Menlo, monospace">{{ logText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  VirtTableVue,
  type VueTableColumn,
  type DataRequest,
  type DataResponse,
  type RemoteState,
} from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  qty: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];
const TOTAL = 3000;
// 模拟服务端数据（真实场景在后端）。懒生成：playground 会 import 全部示例模块，
// 顶层就造几千条 faker 数据会拖慢整个 demo 站的首屏。
let _db: Row[] | null = null;
const getDb = (): Row[] => (_db ??= Array.from({ length: TOTAL }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  dept: depts[i % depts.length]!,
  qty: faker.number.int({ min: 1, max: 20 }),
})));

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 240 },
  { key: 'dept', title: '部门', width: 160 },
  { key: 'qty', title: '数量', width: 140, align: 'right' },
];

const tableRef = ref<VirtTableVueInstance | null>(null);
const manual = ref(false);
const failNext = ref(false);
const status = ref('等待首屏取数…');
const logs = ref<string[]>([]);
const logText = computed(() => logs.value.slice(0, 6).join('\n'));
let reqSeq = 0;

const log = (msg: string): void => {
  logs.value = [msg, ...logs.value].slice(0, 8);
};

/**
 * 取数糖层：返回 Promise 即可，表格负责去重/竞态/状态条。
 * 不需要 useCallback 之类的稳定化——Vue 封装内部已包一层读 props 的转发。
 */
const loadData = (req: DataRequest): Promise<DataResponse<Row>> => {
  const seq = ++reqSeq;
  log(`#${seq} ${req.reason} offset=${req.offset} pageSize=${req.pageSize}`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (failNext.value) {
        failNext.value = false;
        log(`#${seq} ✗ 失败（可点状态条重试）`);
        reject(new Error('mock network error'));
        return;
      }
      const rows = getDb().slice(req.offset, req.offset + req.pageSize);
      log(`#${seq} ✓ 返回 ${rows.length} 条`);
      resolve({ rows, total: TOTAL });
    }, 400);
  });
};

// options 用 computed：manual 变化时连同 key 一起重建
const options = computed(() => ({
  list: [] as Row[],
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  buffer: 6,
  border: true,
  infinite: { pageSize: 50, distance: 200, manual: manual.value },
  loadData,
  onRemoteStateChange: (st: RemoteState) => {
    status.value =
      `已加载 ${st.loadedCount}/${st.total} 条 · 第 ${st.page} 批` +
      (st.hasMore ? '' : ' · 已到底') +
      (st.loadingMore ? ' · 追加中' : '');
  },
  onLoadError: (err: unknown) => log(`onLoadError: ${(err as Error).message}`),
}));
</script>
