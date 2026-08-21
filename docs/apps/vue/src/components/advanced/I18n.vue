<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 国际化 i18n</h3>
    <div class="demo-hint">
      点下方按钮切换语言：空数据文案、合计行、排序提示、列头筛选下拉、搜索框（按 Ctrl/Cmd+F
      打开）一并切换。
    </div>
    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn"
        :class="{ 'virt-table-btn-primary': lang === 'zh' }"
        @click="setLang('zh')"
      >
        中文
      </button>
      <button
        type="button"
        class="virt-table-btn"
        :class="{ 'virt-table-btn-primary': lang === 'en' }"
        @click="setLang('en')"
      >
        English
      </button>
      <button type="button" class="virt-table-btn" @click="toggleEmpty">切换空数据</button>
    </div>
    <div style="width: 760px; height: 460px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  VirtTableVue,
  type VueTableColumn,
  zhCN,
  enUS,
  vtColumnFilter,
  vtSearch,
} from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

/**
 * 国际化示例：点「中文 / English」切换语言，
 * 空数据文案、合计行标签、表头排序提示、列头筛选下拉、全文搜索框
 * 均随 ref 上的 `setLocale()` 即时切换。
 */
interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  qty: number;
  price: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, sortable: true },
  { key: 'name', title: '姓名', width: 200, sortable: true },
  {
    key: 'dept',
    title: '部门',
    width: 160,
    filters: depts.map((d) => ({ label: d, value: d })),
    filterMultiple: true,
  },
  { key: 'qty', title: '数量', width: 140, align: 'right', summary: 'sum' },
  { key: 'price', title: '单价', width: 140, align: 'right', summary: 'avg' },
];

const genList = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    qty: faker.number.int({ min: 1, max: 20 }),
    price: faker.number.int({ min: 5, max: 500 }),
  }));

const options = {
  list: genList(500),
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  showSummary: true,
  plugins: [vtColumnFilter(), vtSearch()],
  // locale 缺省即 zhCN；这里显式写出以示意
  locale: zhCN,
};

const tableRef = ref<VirtTableVueInstance | null>(null);
const lang = ref<'zh' | 'en'>('zh');
const empty = ref(false);

const setLang = (next: 'zh' | 'en') => {
  lang.value = next;
  tableRef.value?.setLocale(next === 'zh' ? zhCN : enUS);
};

const toggleEmpty = () => {
  empty.value = !empty.value;
  tableRef.value?.setList(empty.value ? [] : genList(500));
};
</script>
