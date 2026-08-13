# React 导出 CSV / Excel

装载 `vtExport()` 后调用 ref 上的 `exportCsv()` / `exportExcel()` 导出数据，`scope: 'selection'` 可仅导出当前框选区域，`exportValue` 可自定义列导出值。CSV 带 UTF-8 BOM，Excel 为 HTML 表格。

## 使用的 API

```tsx
import { VirtTableReact, vtExport, vtCellSelection } from '@virt-table/react';

// scope: 'selection' 依赖框选，所以两个插件要一起装
const plugins = React.useMemo(() => [vtCellSelection(), vtExport()], []);

// 实例方法（ref 上调用）
tableRef.current?.exportCsv({ filename: '全表.csv' });
tableRef.current?.exportExcel({ filename: '全表.xls' });
tableRef.current?.exportCsv({ filename: '选区.csv', scope: 'selection' });
```

## 示例

<PlaygroundHost framework="react" example-id="react-export" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/Export.tsx
:::
