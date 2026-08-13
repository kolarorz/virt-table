# React 列显隐 / 列设置

列支持 `hidden`（默认隐藏）与 `hideable: false`（禁止在面板切换）。装载 `vtColumnPanel()` 后用 ref 上的 `toggleColumnPanel()` 打开列设置面板，或用 `setColumnVisible(key, visible)` 编程控制。

## 使用的 API

```tsx
import { VirtTableReact, vtColumnPanel } from '@virt-table/react';

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, hideable: false },  // 不允许隐藏
  { key: 'email', title: '邮箱', width: 240, hidden: true },  // 默认隐藏
];

const plugins = React.useMemo(() => [vtColumnPanel()], []);

// 实例方法（ref 上调用）；面板要贴着触发按钮定位，把按钮作为 anchor 传进去
onClick={(e) => tableRef.current?.toggleColumnPanel(e.currentTarget)}
tableRef.current?.setColumnVisible('job', false);
tableRef.current?.getVisibleColumns();
```

## 示例

<PlaygroundHost framework="react" example-id="react-column-visibility" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/ColumnVisibility.tsx
:::
