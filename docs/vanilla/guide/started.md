---
description: 在 原生 JavaScript 中安装和使用 VirtTable 虚拟表格：定义列、数据与容器尺寸，接入行列双向虚拟化。
---

# 快速开始

## 安装

```bash
npm install @virt-table/vanilla
```

## 基本用法

```ts
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import '@virt-table/vanilla/core.css';

// 1. 准备容器（需设置宽高）
const container = document.getElementById('table')!;

// 2. 定义列
const columns: VirtTableColumn[] = [
  { key: 'name', title: '姓名', width: 200 },
  { key: 'age', title: '年龄', width: 100 },
  { key: 'email', title: '邮箱', width: 300 },
];

// 3. 准备数据
const list = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `用户 ${i}`,
  age: 20 + (i % 30),
  email: `user${i}@example.com`,
}));

// 4. 创建表格
const table = new VirtTable(container, {
  list,
  columns,
  itemKey: 'id',       // 行唯一标识字段
  estimatedSize: 40,     // 行预估高度(px)
  buffer: 4,           // 上下缓冲行数
});
```

## 构造函数

```ts
new VirtTable<T>(root: HTMLElement, options: VirtTableOptions<T>)
```

- **`root`** — 表格挂载的 DOM 容器，需设置明确的宽高
- **`options`** — 表格配置项

## 必填配置

| 属性 | 类型 | 说明 |
|------|------|------|
| `list` | `T[]` | 数据源数组 |
| `columns` | `VirtTableColumn[]` | 列配置数组 |
| `itemKey` | `string` | 行数据中的唯一标识字段名 |
| `estimatedSize` | `number` | 行预估高度（px），用于初始布局 |

## 常用配置

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `buffer` | `number` | `0` | 上下缓冲行数，减少快速滚动时的白屏 |
| `border` | `boolean` | `false` | 是否显示边框 |
| `stripe` | `boolean` | `false` | 是否显示斑马纹 |
| `showHeader` | `boolean` | `true` | 是否显示表头 |
| `showFooter` | `boolean` | `false` | 是否显示表尾 |
| `textOverflow` | `string` | - | 文本溢出处理：`'ellipsis'` \| `'tooltip'` |

## 列配置

```ts
type VirtTableColumn = {
  key: string;         // 列标识（必填）
  title: string;       // 列标题（必填）
  width: number;       // 列宽 px（必填）
  fixed?: 'left' | 'right';  // 冻结列
  resizable?: boolean;        // 是否可拖拽调整宽度
  align?: 'left' | 'center' | 'right';
  type?: 'index' | 'checkbox' | 'expand' | 'tree';
  render?: (ctx) => string | HTMLElement;
  renderEditor?: (ctx) => HTMLElement;
}
```

## 实例方法

```ts
table.scrollToTop();          // 滚动到顶部
table.scrollToBottom();       // 滚动到底部
table.scrollToIndex(index);   // 滚动到指定行
table.setList(newList);       // 更新数据源
table.forceUpdate();          // 强制刷新可视区
table.destroy();              // 销毁实例
```

## Vue 用法

```bash
npm install @virt-table/vue
```

```vue
<template>
  <div style="width: 800px; height: 600px">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>
</template>

<script setup>
import { VirtTableVue } from '@virt-table/vue';
import '@virt-table/vanilla/core.css';
</script>
```

## React 用法

```bash
npm install @virt-table/react
```

```tsx
import { VirtTableReact } from '@virt-table/react';
import '@virt-table/vanilla/core.css';

function App() {
  return (
    <div style={{ width: 800, height: 600 }}>
      <VirtTableReact
        columns={columns}
        options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4 }}
      />
    </div>
  );
}
```
