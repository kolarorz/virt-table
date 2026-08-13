<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 文字溢出处理</h3>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import { faker } from '@faker-js/faker';

/** 两种溢出处理交替，方便横向对比 */
const MODES = ['ellipsis', 'tooltip'] as const;
const COL_COUNT = 6;
const ROW_COUNT = 1000;

const columns: VueTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => {
  const mode = MODES[i % MODES.length];
  return {
    key: `extra_${i}`,
    title: `列 ${i} · ${mode}`,
    width: 220,
    // 列级覆盖全局的 textOverflow
    textOverflow: mode,
  };
});

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    // 掺一些短文本：没被裁掉的单元格不该弹浮层
    row[`extra_${c}`] = c % 2 === 1 && i % 4 === 0 ? '短' : faker.lorem.sentences(3);
  }
  return row;
});

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  textOverflow: 'ellipsis' as const,
};

const status = ref(
  `${ROW_COUNT} 行；ellipsis 仅省略号　·　tooltip 省略号 + 自绘浮层（悬停 150ms，仅在真被裁时弹）`,
);
</script>
