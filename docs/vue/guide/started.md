# 快速开始

## 安装

```bash
npm install @virt-table/vue
```

Peer dependency：`vue >= 3.0.0`

样式由 `@virt-table/vanilla` 提供，通常自动引入。若样式未生效，可手动引入：

```ts
import '@virt-table/vanilla/core.css';
```

## 基本用法

```vue
<template>
  <div style="width: 800px; height: 600px">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';

const columns: VueTableColumn[] = [
  { key: 'name', title: '姓名', width: 200 },
  { key: 'age', title: '年龄', width: 100 },
  { key: 'email', title: '邮箱', width: 300 },
];

const list = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `用户 ${i}`,
  age: 20 + (i % 30),
  email: `user${i}@example.com`,
}));

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
};

const tableRef = ref<InstanceType<typeof VirtTableVue> | null>(null);

// 滚动到第 500 行
tableRef.value?.scrollToIndex(499);
</script>
```

## Props

| Prop | 类型 | 说明 |
|------|------|------|
| `columns` | `VueTableColumn[]` | 列配置数组 |
| `options` | `VirtTableOptions` | 表格配置（list, itemKey, estimatedSize 等） |

## 必填配置

| 属性 | 类型 | 说明 |
|------|------|------|
| `list` | `T[]` | 数据源数组 |
| `itemKey` | `string` | 行数据中的唯一标识字段名 |
| `estimatedSize` | `number` | 行预估高度（px），用于初始布局 |

## 列配置

```ts
type VueTableColumn = {
  key: string;         // 列标识（必填）
  title: string;       // 列标题（必填）
  width: number;       // 列宽 px（必填）
  fixed?: 'left' | 'right';
  resizable?: boolean;
  align?: 'left' | 'center' | 'right';
  type?: 'index' | 'checkbox' | 'expand' | 'tree';
  render?: (ctx) => string | VNode;
  renderEditor?: (ctx) => VNode;
}
```

## 实例方法（通过 ref 调用）

```ts
const tableRef = ref<InstanceType<typeof VirtTableVue>>();

tableRef.value?.scrollToTop();
tableRef.value?.scrollToBottom();
tableRef.value?.scrollToIndex(index);
tableRef.value?.setList(newList);
tableRef.value?.forceUpdate();
```

## 响应式数据

`options.list` 被自动 watch，数据变化时内部调用 `setList()` 同步。

如果只修改行内某个属性（非响应式），需要手动调用 `forceUpdate()` 通知表格刷新。
