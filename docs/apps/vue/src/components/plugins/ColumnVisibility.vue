<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 字段配置</h3>
    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn virt-table-btn-primary"
        @click="togglePanel"
      >
        字段配置
      </button>
      <button type="button" class="virt-table-btn" @click="tableRef?.setColumnVisible('job', false)">
        隐藏「职位」
      </button>
      <button type="button" class="virt-table-btn" @click="tableRef?.setColumnVisible('email', true)">
        显示「邮箱」
      </button>
      <span class="demo-note">ID 列不可隐藏；邮箱列默认隐藏</span>
    </div>
    <div style="width: 760px; height: 460px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn, vtFieldConfig } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  city: string;
  job: string;
  email: string;
}

const columns: VueTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, hideable: false },
  { key: 'name', title: '姓名', width: 160 },
  { key: 'age', title: '年龄', width: 120 },
  { key: 'city', title: '城市', width: 160 },
  { key: 'job', title: '职位', width: 200 },
  { key: 'email', title: '邮箱', width: 240, hidden: true },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 60 }),
  city: faker.location.city(),
  job: faker.person.jobTitle(),
  email: faker.internet.email(),
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 6,
  border: true,
  plugins: [vtFieldConfig()],
};

const tableRef = ref<VirtTableVueInstance | null>(null);

// 面板要贴着触发按钮定位，所以把按钮本身作为 anchor 传进去
const togglePanel = (e: MouseEvent) => {
  tableRef.value?.toggleFieldConfig(e.currentTarget as HTMLElement);
};
</script>
