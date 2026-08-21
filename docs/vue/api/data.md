# 数据与远程

服务端取数与无限滚动在 Vue 端的写法与注意点。分页、筛选、树形懒加载等配置项同样写在 `options` 里，语义见 [Vanilla API · 数据与远程](/vanilla/api/data)。

本节只讲怎么写；完整语义（竞态处理、`hasMore` 推导、限制）见 [Vanilla API · 服务端数据 / 无限滚动](/vanilla/api/data#服务端数据-无限滚动)。

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { VirtTableVue, type DataRequest, type DataResponse, type RemoteState } from '@virt-table/vue';

interface Row extends Record<string, unknown> { id: number; name: string }

const tableRef = ref<InstanceType<typeof VirtTableVue> | null>(null);
const remote = ref<RemoteState | null>(null);

const columns = [
  { key: 'id', title: 'ID', width: 80, sortable: true },
  { key: 'name', title: '姓名', width: 220 },
];

const options = reactive({
  list: [] as Row[],
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  border: true,
  dataMode: 'server' as const,
  infinite: { pageSize: 50 },
  async loadData(req: DataRequest): Promise<DataResponse<Row>> {
    const res = await fetch(`/api/rows?offset=${req.offset}&limit=${req.pageSize}`, { signal: req.signal });
    const { rows, total } = await res.json();
    return { rows, total };
  },
  onRemoteStateChange: (st: RemoteState) => { remote.value = st; },
});
</script>

<template>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
  <button @click="tableRef?.reload()">重新加载</button>
</template>
```

::: tip 取数回调无需保持引用稳定
组件内部把 `loadData` / `onLoadMore` / `onLoadPrev` / `onLoad` / `onLoadError` / `onRemoteStateChange` 包了一层读 `props.options` 的转发函数，因此**父组件整体替换 `options` 对象也不会重建表格或重复取数**，同时拿到的始终是最新实现。
:::

::: tip 远程模式下 `options.list` 只作为初始值
组件平时会监听 `options.list` 变化并 `setList`（整批替换）。但**一旦提供了 `loadData` / `onLoadMore`，这个同步就会跳过**——否则父组件重建 `options`（含新的 `list: []` 字面量）会把表格刚累积的数据清空。远程模式下数据归表格管，要改数据用 `reload()` / `appendRows()`。
:::
