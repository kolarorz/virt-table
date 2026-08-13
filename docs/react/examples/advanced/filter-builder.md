# React 高级筛选（筛选管理器）

列筛选有两种入口，可同时使用：表头快捷筛选（见 [列筛选](../plugins/filter)）与**筛选管理器**
`<VirtFilterBuilderReact />` —— 渲染在表格之外，用 AND/OR 条件组表达
「分数 ≥ 80 **且**（部门属于工程部/设计部 **或** 级别为 P8）」这类复合条件，支持任意层嵌套。

两者是独立状态，最终以 **AND** 组合。

## 使用的 API

```tsx
import {
  VirtTableReact,
  VirtFilterBuilderReact,
  type FilterModel,
  type VirtTableRef,
} from '@virt-table/react';

<VirtFilterBuilderReact
  tableRef={tableRef}      // 指向 <VirtTableReact> 的 ref：自动取列 + 自动应用
  value={model}            // 受控条件树
  autoApply={false}        // true 则每次改动即时生效
  onChange={setModel}      // 条件变化（含编辑中的半成品）
  onApply={onApply}        // 已应用到表格
  className="..." style={{ maxWidth: 900 }}
/>
```

```ts
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

// ref 方法
tableRef.current?.setFilterModel(model);
tableRef.current?.getFilterModel();
tableRef.current?.clearFilterModel();
tableRef.current?.hasActiveFilters();
```

::: tip 注意
构建器要拿到 vanilla 实例才能取列并应用筛选，因此需在表格挂载后再渲染它
（示例里用一个 `ready` 状态延后一帧）。列的 `filterMethod` 只参与 `in` / `notIn`。
:::

## 示例

<PlaygroundHost framework="react" example-id="react-filter-builder" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/FilterBuilder.tsx
:::
