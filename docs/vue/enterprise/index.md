# 开始使用付费插件

<!--@include: @/.enterprise/index/intro.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins'; // 核心插件
import { setLicenseKey } from '@virt-table-pro/license';
import { vtViews } from '@virt-table-pro/views'; // 付费插件
import { vtUndo } from '@virt-table-pro/undo';
import '@virt-table-pro/license/index.css';
import '@virt-table-pro/views/index.css';

setLicenseKey(import.meta.env.VITE_VT_LICENSE); // 整个应用设一次

// Vue 端的 ref 类型要自己交叉一个 VirtTablePluginApi（运行时方法都在，只是类型到不了）
type TableInstance = VirtTablePluginApi & { forceUpdate(): void };
const tableRef = ref<TableInstance | null>(null);

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtViews(), vtUndo(), vtCellEditor()],
};
</script>

<template>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

<!--@include: @/.enterprise/index/after.md-->
