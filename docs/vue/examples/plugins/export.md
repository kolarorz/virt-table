# Vue 导出 CSV / Excel

装载 `vtExport()` 后调用 ref 上的 `exportCsv()` / `exportExcel()` 导出数据，`scope: 'selection'` 可仅导出当前框选区域，`exportValue` 可自定义列导出值。CSV 带 UTF-8 BOM，Excel 为 HTML 表格。

## 使用的 API

```ts
import { VirtTableVue, vtExport, vtCellSelection } from '@virt-table/vue';

const options = {
  // scope: 'selection' 依赖框选，所以两个插件要一起装
  plugins: [vtCellSelection(), vtExport()],
  list,
  itemKey: 'id',
  estimatedSize: 40,
};

// 实例方法（ref 上调用）
tableRef.value?.exportCsv({ filename: '全表.csv' });
tableRef.value?.exportExcel({ filename: '全表.xls' });
tableRef.value?.exportCsv({ filename: '选区.csv', scope: 'selection' });
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-export" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/Export.vue
:::
