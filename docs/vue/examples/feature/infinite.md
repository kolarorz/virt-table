# Vue 无限滚动

配置 `infinite` 并给一个 `loadData`，滚到底部就自动加载下一批。表格负责在途去重、竞态作废、状态条四态与滚动位置维持；你只负责发请求。

## 使用的 API

```ts
type Options = {
  list: T[];             // 无限滚动时传 []，数据由表格内部累积
  itemKey: string;       // 行唯一标识字段名
  estimatedSize: number;   // 行预估高度(px)
  fixed?: boolean;       // 固定行高：追加时滚动条不因重新测量而抖动
  infinite?: {
    pageSize?: number;   // 每批条数，默认 50
    distance?: number;   // 距底触发阈值(px)，默认 200
    manual?: boolean;    // 只显示「加载更多」按钮，不自动触发
    direction?: 'down' | 'up' | 'both';  // 加载方向，默认 down
    showNoMore?: boolean;// 到底后显示「没有更多」，默认 true
  };
  loadData?: (req: DataRequest) => Promise<DataResponse<T>>;   // 取数糖层
  onLoadMore?: (ctx: LoadMoreContext<T>) => void | Promise<void>; // 受控层（优先）
  onLoad?: (res, req) => void;
  onLoadError?: (err, req) => void;
  onRemoteStateChange?: (state: RemoteState) => void;
}
```

组件 ref 方法：`reload()` / `refresh()` / `loadMore()` / `loadPrev()` / `retryLoad()` / `getRemoteState()` / `appendRows()` / `prependRows()` / `setHasMore()` / `setCursor()`。

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

完整语义（竞态处理、`hasMore` 推导、向上加载补偿、与 `pagination` 互斥、限制）见 [Vanilla · 无限滚动](/vanilla/examples/feature/infinite)。

## 示例

<PlaygroundHost framework="vue" example-id="vue-infinite" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/feature/Infinite.vue
:::
