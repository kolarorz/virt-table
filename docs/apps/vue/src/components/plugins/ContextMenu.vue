<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 右键菜单（vtContextMenu 插件）</h3>
    <div class="demo-hint">
      在表格里<b>右键任意单元格</b>弹出菜单（无需先框选）。菜单项会拿到所在行/列的上下文。
    </div>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn" @click="onHide">hideContextMenu()</button>
      <button type="button" class="virt-table-btn" @click="reset">重置数据</button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 760px; height: 420px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  VirtTableVue,
  vtContextMenu,
  type VueTableColumn,
  type ContextMenuContext,
  type ContextMenuItem,
} from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  score: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];

const makeList = (): Row[] =>
  Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    score: faker.number.int({ min: 0, max: 100 }),
  }));

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 200 },
  { key: 'dept', title: '部门', width: 160 },
  { key: 'score', title: '分数', width: 120, align: 'right' },
];

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref('右键任一单元格试试');
let list = makeList();

/** 菜单项由所在单元格的上下文动态生成 */
const contextMenuProvider = (ctx: ContextMenuContext<Row>): ContextMenuItem[] => [
  {
    label: `复制「${ctx.column.title}」的值`,
    action: () => {
      const value = String(ctx.row[ctx.column.key] ?? '');
      void navigator.clipboard?.writeText(value);
      status.value = `已复制 ${ctx.column.title}=${value}（行 ${ctx.rowIndex + 1} / 列 ${ctx.colIndex + 1}）`;
    },
  },
  {
    label: `置顶第 ${ctx.rowIndex + 1} 行`,
    action: () => {
      list = [ctx.row, ...list.filter((r) => r.id !== ctx.row.id)];
      tableRef.value?.setList(list);
      status.value = `已把 ${ctx.row.name} 置顶`;
    },
  },
  {
    divider: true,
    label: `删除 ${ctx.row.name}`,
    action: () => {
      list = list.filter((r) => r.id !== ctx.row.id);
      tableRef.value?.setList(list);
      status.value = `已删除 ${ctx.row.name}，剩余 ${list.length} 行`;
    },
  },
  {
    // 禁用项：不可点击，点了也不会关闭菜单
    label: '仅高分行可用（分数 > 90）',
    disabled: ctx.row.score <= 90,
    action: () => {
      status.value = `${ctx.row.name} 分数 ${ctx.row.score}，触发了高分操作`;
    },
  },
];

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  highlightHoverRow: true,
  plugins: [vtContextMenu<Row>(contextMenuProvider)],
};

// hideContextMenu 是插件注入的 API，由组件 ref 自动透传（封装里没有手写转发）
const onHide = (): void => {
  tableRef.value?.hideContextMenu();
  status.value = '已调用 hideContextMenu()（插件注入的方法）';
};

const reset = (): void => {
  list = makeList();
  tableRef.value?.setList(list);
  status.value = '数据已重置';
};
</script>
