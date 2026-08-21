<script setup lang="ts">
/**
 * 单元格公式 demo（**第二档**，Vue 端），电子表格形态。
 *
 * 与计算列那个 demo 的区别是**数据形状**：那边列是字段（金额、部门），一条公式管一整列；
 * 这边列是坐标（A/B/C），每一格独立，公式写在格里。
 *
 * 这里刻意**不开排序/筛选**：A1 记法的行号绑的是数据下标，视图一重排公式就指到别的行上
 * （插件装载时会 warn）。这不是偷懒，是第二档的设计决策。
 */
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor, vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtFormula } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';
import { makeSheet, SHEET_COLS, type SheetRow } from '../../../pro-kit/shared/sheet-data';
import type { ProTableInstance } from './types';

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
/** 公式栏当前对准的格 */
const currentRef = ref<string | null>(null);
const fx = ref('');

const showRef = (cell: string | null): void => {
  currentRef.value = cell;
  if (!cell) {
    fx.value = '';
    return;
  }
  // 公式格显示原文，字面格显示值 —— 与编辑态里看到的东西一致
  const formula = tableRef.value?.getCellFormula?.(cell);
  fx.value = formula ?? String(tableRef.value?.getCellValue?.(cell) ?? '');
};

const columns: VirtTableColumn<SheetRow>[] = [
  {
    key: 'id',
    title: '',
    width: 44,
    fixed: 'left',
    align: 'center',
    // 行号列不参与公式（它是坐标而不是数据），下面 vtFormula 的 columns 里也不含它
    render: ({ row }) => {
      const el = document.createElement('span');
      el.className = 'pg-sheet-rownum';
      el.textContent = String(row.id);
      return el;
    },
  },
  ...SHEET_COLS.map(
    (letter): VirtTableColumn<SheetRow> => ({
      key: letter,
      title: letter,
      width: letter === 'A' ? 140 : 110,
      resizable: true,
      align: 'left',
    }),
  ),
];

const options = {
  list: makeSheet(),
  itemKey: 'id',
  estimatedSize: 32,
  fixedSize: true,
  border: true,
  plugins: [
    vtFormula<SheetRow>({
      // 显式给一份：以后在最左边插列也不会让列字母集体错位
      columns: [...SHEET_COLS],
      onRecalculated: ({ changed, errors }) =>
        emit('status', `重算 ${changed} 格${errors ? ` · ${errors} 处错误` : ''}`),
      // 当前格由插件报出来（它同时负责把引用框出来）
      onActiveCellChange: (cell) => showRef(cell),
    }),
    vtCellEditor({ trigger: 'dblclick' }),
    // 框选与公式无关，装在一起是为了顺手验证两个插件互不干扰
    vtCellSelection(),
  ],
};

const fill = (): void => {
  const filled = tableRef.value?.fillFormula?.('F2', 'F3:F11') ?? 0;
  emit('status', `填了 ${filled} 格 —— D2→D3… 跟着走，$E$2 不动`);
};

const makeCircular = (): void => {
  tableRef.value?.setCellFormula?.('A16', '=B16+1');
  tableRef.value?.setCellFormula?.('B16', '=A16+1');
  emit('status', 'A16 与 B16 互引 → 两格 #CIRCULAR!');
};

const unlink = (): void => {
  tableRef.value?.setCellFormula?.('B16', '100');
  emit('status', `A16 现在是 ${String(tableRef.value?.getCellValue?.('A16'))}`);
};

const errorsDemo = (): void => {
  tableRef.value?.setCellFormula?.('A17', '=1/0');
  tableRef.value?.setCellFormula?.('B17', '=NOPE()');
  tableRef.value?.setCellFormula?.('C17', '=A99');
  tableRef.value?.setCellFormula?.('D17', '=1+');
  tableRef.value?.setCellFormula?.('E17', '=D2:D3');
  emit('status', '第 17 行：#DIV/0! / #NAME? / #REF! / #SYNTAX! / #VALUE!');
};

const trace = (): void => {
  const cell = currentRef.value ?? 'B2';
  const deps = tableRef.value?.getCellDependents?.(cell) ?? [];
  emit('status', deps.length ? `${cell} 被这些格引用：${deps.join(' ')}` : `没有格子引用 ${cell}`);
};

const listErrors = (): void => {
  const errors = tableRef.value?.getSheetErrors?.() ?? [];
  emit(
    'status',
    errors.length ? errors.map((e) => `${e.id} ${e.code}`).join(' · ') : '当前没有出错的格',
  );
  if (errors.length) console.table(errors);
};

const submitFx = (): void => {
  if (!currentRef.value) return;
  tableRef.value?.setCellFormula?.(currentRef.value, fx.value);
  showRef(currentRef.value);
};
</script>

<template>
  <div class="pg-toolbar">
    <button class="pg-btn" @click="fill">把 F2 填到 F3:F11</button>
    <button class="pg-btn" @click="makeCircular">制造循环引用</button>
    <button class="pg-btn" @click="unlink">解开循环</button>
    <button class="pg-btn" @click="errorsDemo">各种错误值</button>
    <button class="pg-btn" @click="trace">追踪引用</button>
    <button class="pg-btn" @click="listErrors">列出错误</button>
  </div>

  <div class="pg-table">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>

  <div class="pg-aside">
    <!-- 公式栏（Excel 的 fx 栏）。当前格来自插件的 onActiveCellChange —— 装了框选之后
         核心的 getActiveCell() 一直是 null，那个回调是唯一可靠的「当前格」来源 -->
    <div class="pg-sheet-bar">
      <span class="pg-sheet-ref">{{ currentRef ?? '—' }}</span>
      <input
        v-model="fx"
        class="pg-sheet-fx"
        placeholder="选中一格后在这里写公式，回车提交（如 =B2*C2）"
        spellcheck="false"
        @keydown.enter="submitFx"
      />
    </div>
  </div>
</template>
