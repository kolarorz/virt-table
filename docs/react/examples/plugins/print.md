# React 打印

> 由 `vtExport` 插件提供：`plugins: [vtExport()]`。

调用 ref 上的 `print({ title })` 在新窗口输出全表（内联样式），复用导出的 HTML 构造，适合快速打印或另存。

## 使用的 API

```tsx
import { VirtTableReact, vtExport } from '@virt-table/react';

const plugins = React.useMemo(() => [vtExport()], []);

// 实例方法（ref 上调用）
tableRef.current?.print({ title: '人员清单' });
```

## 示例

<PlaygroundHost framework="react" example-id="react-print" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/Print.tsx
:::
