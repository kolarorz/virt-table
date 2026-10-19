<script setup lang="ts">
/**
 * 真 xlsx / PDF 导出 demo（Vue 端）：`vtXlsx` + 核心的 `vtCellSelection`。
 *
 * 装 `vtCellSelection` 不是「依赖」—— `vtXlsx` 不 `requires` 任何插件，全表导出单独就能跑。
 * 装它是为了演示 `selectionOnly`：没有选区能力的话那一档只能告警并退回全表。
 *
 * 数据侧刻意开了 `showSummary` 与两列 `mergeKey` —— 这个 demo 要证明的正是
 * 「免费版那份 HTML 伪装的 `.xls` 导不出来的东西」，所以先得有合计行与合并单元格。
 */
import { computed, ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtXlsx } from '@virt-table-pro/xlsx';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { ProTableInstance } from './types';

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
const liveSummary = ref(true);
const selectionOnly = ref(false);

const rows: Row[] = makeRows(300);
const columns = makeColumns();
for (const col of columns) {
  // 相邻同值自动纵向合并：数据按下标循环生成，所以这两列本来就是成段的
  if (col.key === 'dept' || col.key === 'city') col.mergeKey = true;
  if (col.key === 'amount') col.summary = 'sum';
}

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  stripe: true,
  border: true,
  showSummary: true,
  plugins: [
    vtXlsx({
      sheetName: '项目明细',
      freeze: { rows: 1, cols: 1 },
      numberFormats: { amount: '#,##0.00' },
      autoFilter: true,
      // 入口交给下面几颗手写按钮，免得同一个 demo 里两套入口
      toolbar: false,
    }),
    vtCellSelection(),
  ],
};

const note = computed(
  () =>
    `冻结：表头 1 行 + 首列 · 合计行：${liveSummary.value ? '活公式 SUBTOTAL' : '死数字'}` +
    ` · 范围：${selectionOnly.value ? '当前选区' : '全表 300 行'}`,
);

const exportXlsx = (): void => {
  void tableRef.value?.exportXlsx?.({
    liveSummary: liveSummary.value,
    selectionOnly: selectionOnly.value,
  });
  emit(
    'status',
    selectionOnly.value
      ? '已导出当前选区（没框选时会告警并退回全表）'
      : '已导出全表：合并单元格、列宽、数字格式、冻结窗格都在里面',
  );
};

const exportSheets = (): void => {
  void tableRef.value?.exportXlsx?.({
    liveSummary: liveSummary.value,
    sheets: [
      { name: '明细' },
      // 换一份列的 sheet 关掉合并（合并坐标按显示列表定义，换了列就不对应了）
      { name: '仅部门与金额', columns: ['dept', 'amount'], merges: false },
    ],
  });
  emit('status', '已导出两张 sheet：明细（全列）+ 仅部门与金额');
};

const exportPdf = (): void => {
  void tableRef.value?.exportPdf?.({
    title: '项目明细',
    landscape: true,
    footNote: '由 virt-table 导出',
    selectionOnly: selectionOnly.value,
  });
  emit('status', '已排版并唤起打印 —— 在对话框里选「另存为 PDF」');
};

/** 演示「服务端出 PDF 字节」那条路：拿排好的 HTML，交给 headless Chrome */
const inspectHtml = async (): Promise<void> => {
  const html = await tableRef.value?.exportPdf?.({ title: '项目明细', htmlOnly: true });
  if (typeof html !== 'string') {
    emit('status', '付费能力未装载，拿不到排版 HTML');
    return;
  }
  emit(
    'status',
    `排版 HTML ${html.length} 字符，每页重复表头：${
      html.includes('table-header-group') ? '开' : '关'
    } —— 服务端出 PDF 就用这一份`,
  );
};
</script>

<template>
  <div class="pg-toolbar">
    <button class="pg-btn" @click="exportXlsx">导出 xlsx</button>
    <button class="pg-btn" @click="exportSheets">导出多 sheet</button>
    <button class="pg-btn" @click="exportPdf">打印 / PDF</button>
    <button class="pg-btn" @click="inspectHtml">看排版 HTML</button>
    <label class="pg-switch">
      <input v-model="liveSummary" type="checkbox" />
      合计行写成活公式
    </label>
    <label class="pg-switch">
      <input v-model="selectionOnly" type="checkbox" />
      只导当前选区
    </label>
  </div>

  <div class="pg-table">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>

  <div class="pg-aside">
    <div class="pg-aside-box">{{ note }}</div>
  </div>
</template>
