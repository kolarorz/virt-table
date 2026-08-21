# Vue 无限滚动

配置 `infinite` 并给一个 `loadData`，滚到底部就自动加载下一批。表格负责在途去重、竞态作废、状态条四态与滚动位置维持；你只负责发请求。

组件 ref 方法：`reload()` / `refresh()` / `loadMore()` / `loadPrev()` / `retryLoad()` / `getRemoteState()` / `appendRows()` / `prependRows()` / `setHasMore()` / `setCursor()`。

## 示例

<PlaygroundHost framework="vue" example-id="vue-infinite" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/advanced/Infinite.vue
:::

## 关键写法

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type DataRequest, type DataResponse } from '@virt-table/vue';

const tableRef = ref<InstanceType<typeof VirtTableVue> | null>(null);

const options = {
  list: [],
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  infinite: { pageSize: 50 },
  async loadData(req: DataRequest): Promise<DataResponse<Row>> {
    const res = await fetch(`/api/rows?offset=${req.offset}&limit=${req.pageSize}`, { signal: req.signal });
    const { rows, total } = await res.json();
    return { rows, total };
  },
};
</script>

<template>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

::: tip 取数回调无需保持引用稳定
组件把 `loadData` / `onLoadMore` / `onLoadPrev` / `onLoad` / `onLoadError` / `onRemoteStateChange` 包了一层读 `props.options` 的转发函数：父组件整体替换 `options` 也不会重建表格或重复取数，同时拿到的始终是最新实现。
:::

::: tip 远程模式下 `list` 只是初始值
提供 `loadData` / `onLoadMore` 后，组件对 `options.list` 的同步会自动跳过（否则父组件重建 `options` 会把累积数据清空）。传 `[]` 即可，数据归表格管。

另外 `infinite` 配置在构造时生效，示例里切换「手动模式」是靠 `:key` 重建组件实现的。
:::

完整语义（竞态处理、`hasMore` 推导、向上加载补偿、与 `pagination` 互斥、限制）见 [Vanilla · 无限滚动](/vanilla/examples/advanced/infinite)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `infinite` | `{ enabled?, pageSize?, distance?, autoLoadFirst?, manual?, direction?, showNoMore? }` | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `loadData` / `onLoadMore` / `onLoadPrev` | 糖层与受控层两个入口 | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `reload` / `refresh` / `loadMore` / `loadPrev` / `retryLoad` | 主动触发 | [实例方法](/vanilla/api/instance) |
| `getRemoteState()` / `onRemoteStateChange` | 取数状态机快照与回调 | [数据与远程](/vanilla/api/data#服务端数据-无限滚动) |
| `fixedSize` | 固定行高：追加与前插时滚动条不抖 | [表格配置](/vanilla/api/table#virttableoptions) |

与 `pagination` **互斥**（前者累积流、后者页视图），与 `merges` 不兼容 —— 三条限制见 [API](/vanilla/api/data#服务端数据-无限滚动)。

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
