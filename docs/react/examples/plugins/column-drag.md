# React 列拖拽排序

装载 `vtColumnDrag()` 后拖拽表头即可调整列顺序，通过 `onColumnOrderChange` 获取新顺序。与列宽拖拽、点击排序互不冲突（拖拽阈值区分）。

## 使用的 API

```tsx
import { VirtTableReact, vtColumnDrag } from '@virt-table/react';

const plugins = React.useMemo(() => [vtColumnDrag()], []);

// options
{
  plugins,
  list,
  itemKey: 'id',
  estimatedSize: 40,
  onColumnOrderChange: (cols) => console.log(cols.map((c) => c.key)),
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-column-drag" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/ColumnDrag.tsx
:::
