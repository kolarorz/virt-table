# Vue 列拖拽排序

装载 `vtColumnDrag()` 后拖拽表头即可调整列顺序，通过 `onColumnOrderChange` 获取新顺序。与列宽拖拽、点击排序互不冲突（拖拽阈值区分）。

## 使用的 API

```ts
import { VirtTableVue, vtColumnDrag } from '@virt-table/vue';

const options = {
  plugins: [vtColumnDrag()],
  list,
  itemKey: 'id',
  estimatedSize: 40,
  onColumnOrderChange: (cols) => console.log(cols.map((c) => c.key)),
};
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-column-drag" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/ColumnDrag.vue
:::
