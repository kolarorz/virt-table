# React 富筛选类型

为列配置 `filterType`：`text`（关键字模糊）、`number-range`（数值区间）、`date-range`（日期区间）、`enum`（枚举勾选，默认）。点击表头筛选图标弹出对应筛选器。

## 使用的 API

```tsx
import { VirtTableReact, vtColumnFilter } from '@virt-table/react';

const columns: ReactTableColumn<Row>[] = [
  { key: 'name', title: '姓名（关键字）', width: 200, filterType: 'text' },
  { key: 'age', title: '年龄（区间）', width: 180, filterType: 'number-range' },
  { key: 'date', title: '入职日期（区间）', width: 220, filterType: 'date-range' },
];

const plugins = React.useMemo(() => [vtColumnFilter()], []);

// options
{ plugins, list, itemKey: 'id', estimatedSize: 40, onFilterChange: (f) => console.log(f) }
```

## 示例

<PlaygroundHost framework="react" example-id="react-rich-filter" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/RichFilter.tsx
:::
