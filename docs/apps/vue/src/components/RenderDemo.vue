<template>
  <div style="padding: 16px">
    <h3 style="margin: 0 0 12px; color: #1d2129">Vue 组件渲染单元格</h3>
    <div style="color: #86909c; font-size: 13px; margin-bottom: 8px">
      render 返回 VNode，框架自动挂载/卸载，支持响应式
    </div>
    <div style="width: 800px; height: 500px; border: 1px solid #e5e6eb">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

interface Row {
  id: number;
  name: string;
  age: number;
  city: string;
  score: number;
  [k: string]: any;
}

const list = ref<Row[]>(
  Array.from({ length: 500 }, (_, i) => ({
    id: i,
    name: faker.person.fullName(),
    age: 20 + Math.floor(Math.random() * 40),
    city: ['北京', '上海', '杭州', '深圳', '广州'][i % 5],
    score: Math.floor(Math.random() * 100),
  })),
);

const RatingBar = (props: { value: number }) => {
  const pct = props.value;
  const color = pct >= 80 ? '#00b42a' : pct >= 60 ? '#ff7d00' : '#f53f3f';
  return h('div', { style: 'display:flex;align-items:center;gap:6px;' }, [
    h('div', {
      style: `width:60px;height:6px;background:#f2f3f5;border-radius:3px;overflow:hidden;`,
    }, [
      h('div', {
        style: `width:${pct}%;height:100%;background:${color};border-radius:3px;`,
      }),
    ]),
    h('span', { style: `font-size:12px;color:${color};min-width:28px;` }, `${pct}`),
  ]);
};

const TagCell = (props: { text: string }) => {
  const colors: Record<string, string> = {
    '北京': '#165dff', '上海': '#0fc6c2', '杭州': '#7816ff',
    '深圳': '#ff7d00', '广州': '#00b42a',
  };
  const bg = colors[props.text] || '#86909c';
  return h('span', {
    style: `display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;color:#fff;background:${bg};`,
  }, props.text);
};

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  {
    key: 'name',
    title: '姓名',
    width: 180,
    render: (value) =>
      h('span', { style: 'font-weight:500;color:#1d2129;' }, value),
  },
  { key: 'age', title: '年龄', width: 80 },
  {
    key: 'city',
    title: '城市',
    width: 120,
    render: (value) => h(TagCell, { text: value }),
  },
  {
    key: 'score',
    title: '分数',
    width: 160,
    render: (value) => h(RatingBar, { value }),
  },
];

const options = {
  list: list.value,
  itemKey: 'id',
  itemPreSize: 40,
  buffer: 4,
  border: true,
};
</script>
