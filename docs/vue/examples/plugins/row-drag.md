# Vue 行拖拽排序

配置 `type: 'drag'` 手柄列并装载 `vtRowDrag()`，拖拽手柄调整行顺序，拖到视口边缘自动滚动。仅扁平数据、未排序/筛选时生效。

## 使用的 API

```ts
import { VirtTableVue, vtRowDrag } from '@virt-table/vue';

const columns = [
  { key: 'drag', title: '', width: 50, type: 'drag', fixed: 'left' },  // 手柄列
  // …数据列
];

const options = {
  plugins: [vtRowDrag()],
  list,
  itemKey: 'id',
  estimatedSize: 40,
  onRowOrderChange: (list, from, to) => console.log(`行 ${from} → ${to}`),
};
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-row-drag" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/RowDrag.vue
:::
