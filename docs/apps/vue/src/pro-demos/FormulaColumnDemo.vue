<script setup lang="ts">
/**
 * 公式**第一档**（计算列）demo（Vue 端）。
 *
 * 演示的重点是「结果写回了行数据」—— 所以税额/合计列**能排序**。纯 `col.render` 做不到这点：
 * 核心的管线比较的是 `row[key]`，render 只影响显示。
 */
import { reactive, ref, shallowRef } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTableColumn } from '@virt-table/vanilla';
import { vtFormulaColumn } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';
import { AMOUNT_MAX, makeRows, type Row } from '../../../pro-kit/shared/data';
import { moneyCell } from '../../../pro-kit/shared/money-cell';
import type { ProTableInstance } from './types';

const emit = defineEmits<{ status: [string] }>();

/** 初始公式：税额 = 金额 6%，合计 = 金额 + 税额（引用另一个公式列） */
const INITIAL = {
  tax: 'ROUND(amount * 0.06, 2)',
  total: 'amount + tax',
  grade: 'IF(amount > 60000, "A", IF(amount > 30000, "B", "C"))',
};
type FormulaKey = keyof typeof INITIAL;

const tableRef = ref<ProTableInstance | null>(null);
const formulas = reactive({ ...INITIAL });
const bad = reactive<Record<string, boolean>>({});
/** 行数组整体替换时不需要深响应：表格自己管渲染，Vue 只要拿到新引用 */
const rows = shallowRef<Row[]>(makeRows(1000));

const columns: VirtTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 70, fixed: 'left', sortable: true },
  { key: 'name', title: '项目名称', width: 150, sortable: true, resizable: true },
  {
    key: 'amount',
    title: '金额',
    width: 140,
    align: 'right',
    sortable: true,
    resizable: true,
    render: moneyCell<Row>({ max: AMOUNT_MAX }),
  },
  // 公式列照常自己定义 —— 插件只负责算与写回，不会凭空造列
  { key: 'tax', title: '税额（公式）', width: 130, align: 'right', sortable: true, resizable: true },
  {
    key: 'total',
    title: '合计（公式）',
    width: 150,
    align: 'right',
    sortable: true,
    resizable: true,
    render: moneyCell<Row>({ max: AMOUNT_MAX * 1.06 }),
  },
  { key: 'grade', title: '评级（公式）', width: 110, align: 'center', sortable: true },
];

const options = reactive({
  list: rows.value,
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  stripe: true,
  border: true,
  plugins: [
    vtFormulaColumn<Row>({
      columns: { ...INITIAL },
      // 自定义函数：名字大小写不敏感
      functions: { TENTH: (args) => Number(args[0]) / 10 },
      onError: ({ colKey, code, detail }) => emit('status', `${colKey} ${code} ${detail}`),
    }),
  ],
});

const commit = (colKey: FormulaKey): void => {
  const expr = formulas[colKey];
  const ok = tableRef.value?.setColumnFormula?.(colKey, expr) ?? false;
  const errors = tableRef.value?.getFormulaErrors?.() ?? {};
  bad[colKey] = !ok;
  emit(
    'status',
    ok
      ? `${colKey} 已重算：${expr}`
      : `${colKey} ${errors[colKey]?.code ?? '错误'} ${errors[colKey]?.detail ?? ''}`,
  );
};

const bump = (): void => {
  for (const row of rows.value) row.amount += 1000;
  // 改了源字段，公式列要跟上 —— 核心不知道行对象被改了
  emit('status', `重算写回 ${tableRef.value?.recalculateFormulas?.() ?? 0} 格`);
};

const swapData = (): void => {
  const next = makeRows(1000).map((r) => ({ ...r, amount: r.amount * 2 }));
  // 推荐用法：先算好再进表，管线第一次就用到真值
  tableRef.value?.evaluateFormulas?.(next);
  rows.value = next;
  options.list = next;
  emit('status', '已换数据（先 evaluateFormulas 再换 list）');
};

const makeCircular = (): void => {
  tableRef.value?.setColumnFormula?.('total', 'tax + 1');
  tableRef.value?.setColumnFormula?.('tax', 'total * 0.5');
  formulas.total = 'tax + 1';
  formulas.tax = 'total * 0.5';
  emit('status', 'tax 与 total 互相引用 → 两列都是 #CIRCULAR!');
};

const restore = (): void => {
  for (const [colKey, expr] of Object.entries(INITIAL)) {
    tableRef.value?.setColumnFormula?.(colKey, expr);
    formulas[colKey as FormulaKey] = expr;
    bad[colKey] = false;
  }
  emit('status', '已恢复初始公式');
};
</script>

<template>
  <div class="pg-toolbar">
    <button class="pg-btn" @click="bump">金额全部 +1000</button>
    <button class="pg-btn" @click="swapData">换一批数据</button>
    <button class="pg-btn" @click="makeCircular">制造循环引用</button>
    <button class="pg-btn" @click="restore">恢复初始公式</button>
  </div>

  <div class="pg-table">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>

  <div class="pg-aside">
    <div class="pg-aside-box pg-formula-box">
      <label v-for="(_, colKey) in INITIAL" :key="colKey" class="pg-formula-line">
        <span class="pg-formula-key">{{ colKey }} =</span>
        <input
          v-model="formulas[colKey as FormulaKey]"
          class="pg-formula-input"
          :class="{ 'pg-formula-input--bad': bad[colKey] }"
          spellcheck="false"
          @keydown.enter="commit(colKey as FormulaKey)"
        />
      </label>
    </div>
  </div>
</template>
