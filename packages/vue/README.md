# @virt-table/vue

[virt-table](https://github.com/kolarorz/virt-table) 的 Vue 3 封装 —— 行列双向虚拟化的高性能表格，十万级数据流畅滚动。

📖 **[完整文档](https://kolarorz.github.io/virt-table/vue/guide/started)** · [在线示例](https://kolarorz.github.io/virt-table/vue/examples/basic/basic) · [API](https://kolarorz.github.io/virt-table/vue/api/)

表格能力（合并单元格、分组表头、树形、筛选、插件…）全部来自 [`@virt-table/vanilla`](https://www.npmjs.com/package/@virt-table/vanilla)，这个包只做 Vue 侧的桥接：响应式 props、`ref` 命令式 API、用 Vue 组件渲染单元格。

## 安装

```bash
npm install @virt-table/vue
```

`@virt-table/vanilla` 会作为依赖一起装上。Peer dependency：`vue >= 3.0.0`。

## 快速开始

```vue
<template>
  <!-- 容器需要有明确的宽高 -->
  <div style="width: 800px; height: 600px">
    <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import '@virt-table/vanilla/core.css';

const tableRef = ref();

const columns: VueTableColumn[] = [
  { key: 'name', title: '姓名', width: 200 },
  { key: 'age', title: '年龄', width: 100 },
  { key: 'email', title: '邮箱', width: 300 },
];

const options = {
  list: Array.from({ length: 100000 }, (_, i) => ({
    id: i,
    name: `用户 ${i}`,
    age: 20 + (i % 30),
    email: `user${i}@example.com`,
  })),
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
};
</script>
```

插件与内置单元格组件直接从 vanilla 引，插件本身与框架无关：

```ts
import { vtSearch, vtExport } from '@virt-table/vanilla/plugins';
import { VtSelect, VtSwitch } from '@virt-table/vanilla/components';
```

## License

[MIT](./LICENSE) © kolarorz(kolarorz@gmail.com)
