<!--
⚠️ 这一页目前是**孤儿页**：命名视图暂不作为付费能力出售，2026-08-31 起从侧边栏、定价页与
所有交叉引用里摘掉了，只有直接输 URL 才走得到。页面正文原样保留，恢复出售时把
`docs/enterprise/index.md` 同日注释里列的那几处一起取消注释即可。

页内的 `<ProDemo example-id="pro-views" />` 现在落不到实 demo（三端 pro-demos 注册也注释掉了），
会退化成说明卡 —— 这是预期行为，不是坏了。
-->

# 命名视图

<ProPkgStatus pkg="@virt-table-pro/views" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/views" example-id="pro-views" />

<!--@include: @/.enterprise/views/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';

/*
 * ⚠️ Vue 端的 ref 类型要自己拼：`@virt-table/vue` 没有导出「带插件 API」的实例类型，
 * 运行时的 expose 是个 Proxy，方法都在，只是类型到不了。
 * 交叉一个 `VirtTablePluginApi` 就有补全了。
 */
type TableInstance = VirtTablePluginApi & { forceUpdate(): void };

const tableRef = ref<TableInstance | null>(null);
const btnRef = ref<HTMLButtonElement | null>(null);

const options = {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtViews({ storageKey: 'orders-table' })],
};
</script>

<template>
  <button ref="btnRef" @click="tableRef?.toggleViewPanel(btnRef ?? undefined)">视图</button>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

<!--@include: @/.enterprise/views/s1.md-->
