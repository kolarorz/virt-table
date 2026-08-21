<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtLink 链接</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 900px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { VirtTableVue, type VueTableColumn, vtCellEditor } from '@virt-table/vue';
import { VtLink, type VtLinkValue } from '@virt-table/vanilla/components';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  phone: string;
  site: string;
  /** 可编辑列的值：有地址是 `{ text, url }`，没地址就是纯字符串 */
  ref: string | VtLinkValue;
}

const lastClick = ref('（未点击）');
const lastChange = ref('（未编辑）');

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  // 无地址：渲染成 <button>，点开详情面板一类
  VtLink<Row>({
    key: 'name',
    title: '名称（回调）',
    width: 180,
    onClick: (row) => {
      lastClick.value = `打开详情 #${row.id}`;
    },
  }),
  // 可编辑：值自带文案与地址，激活后在下拉面板里分别改
  VtLink<Row>({
    key: 'ref',
    title: '参考链接（可编辑）',
    width: 240,
    editable: true,
    target: '_blank',
    placeholder: '双击添加链接',
    onChange: (v, row) => {
      const shown = typeof v === 'string' ? `"${v}"（无地址 → 存字符串）` : JSON.stringify(v);
      lastChange.value = `#${row.id} → ${shown}`;
    },
  }),
  VtLink<Row>({ key: 'email', title: '邮箱', width: 200, protocol: 'mailto' }),
  VtLink<Row>({ key: 'phone', title: '电话', width: 150, protocol: 'tel' }),
  VtLink<Row>({
    key: 'site',
    title: '主页（新窗口）',
    width: 220,
    href: (row) => row.site,
    target: '_blank',
    underline: 'always',
  }),
  VtLink<Row>({ key: 'name', title: '禁用', width: 120, disabled: true }),
];

const list: Row[] = Array.from({ length: 5000 }, (_, i) => ({
  id: i,
  name: `用户 ${i}`,
  email: `user${i}@example.com`,
  phone: `1380000${String(i % 10000).padStart(4, '0')}`,
  site: `https://example.com/u/${i}`,
  // 三种形状各来一批：带地址的对象 / 只有文案的字符串 / 空值（走 placeholder）
  ref:
    i % 3 === 0
      ? { text: `需求文档 #${i}`, url: `https://example.com/doc/${i}` }
      : i % 3 === 1
        ? `待补链接 #${i}`
        : '',
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  // 可编辑列要它。trigger 用 dblclick：链接元素常常铺满整格，
  // click 触发的话「点链接跳转」与「点单元格编辑」抢同一次点击
  plugins: [vtCellEditor({ trigger: 'dblclick' })],
};

const status = computed(
  () =>
    `VtLink：有地址渲染 <a>（_blank 自动补 rel="noopener noreferrer"），没有则渲染 <button> —— 无 href 的 <a> 键盘聚焦不到、读屏也不报链接。` +
    `「参考链接」列 editable: true：双击进入编辑，下拉面板里分别改文案与链接（Enter 确定 / Esc 取消）。` +
    `最近一次点击：${lastClick.value} · 最近一次编辑：${lastChange.value}`,
);
</script>
