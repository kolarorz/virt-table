# Vue 高级筛选（筛选管理器）

列筛选有两种入口，可同时使用：表头快捷筛选（见 [列筛选](../plugins/filter)）与**筛选管理器**
`<VirtFilterBuilderVue />` —— 渲染在表格之外，用 AND/OR 条件组表达
「分数 ≥ 80 **且**（部门属于工程部/设计部 **或** 级别为 P8）」这类复合条件，支持任意层嵌套。

两者是独立状态，最终以 **AND** 组合。

## 使用的 API

```vue
<VirtFilterBuilderVue
  v-model:model="model"    <!-- 条件树双向绑定 -->
  :table="tableInstance"   <!-- tableRef.getTable() 的结果：自动取列 + 自动应用 -->
  :auto-apply="autoApply"  <!-- true 则每次改动即时生效 -->
  @change="onChange"
  @apply="onApply"
/>
```

```ts
import { VirtTableVue, VirtFilterBuilderVue, type FilterModel } from '@virt-table/vue';

type Column = {
  filterType?: 'enum' | 'text' | 'number-range' | 'date-range'; // 也决定高级筛选的值域
  filterValueKind?: 'text' | 'number' | 'date' | 'enum' | 'boolean';
  filterOperators?: FilterOperator[];                  // 收窄该列可用算子
  filters?: Array<{ label: string; value: unknown }>;  // in/notIn 的候选来源
};

type Options = {
  filterModel?: FilterModel;                          // 初始条件树
  onFilterModelChange?: (model: FilterModel) => void;
};

// 表格 ref 方法
tableRef.value?.setFilterModel(model);
tableRef.value?.getFilterModel();
tableRef.value?.clearFilterModel();
tableRef.value?.hasActiveFilters();

// 构建器 ref 方法：getModel / setModel / setColumns / refresh / apply / clear
```

::: tip 注意
构建器要拿到 vanilla 实例才能取列并应用筛选，因此在 `onMounted` 里用
`tableRef.value?.getTable()` 取实例后再传入。列的 `filterMethod` 只参与 `in` / `notIn`。
:::

## 示例

<PlaygroundHost framework="vue" example-id="vue-filter-builder" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/advanced/FilterBuilder.vue
:::
