# Vue 列显隐 / 列设置

列支持 `hidden`（默认隐藏）与 `hideable: false`（禁止在面板切换）。装载 `vtColumnPanel()` 后用 ref 上的 `toggleColumnPanel()` 打开列设置面板，或用 `setColumnVisible(key, visible)` 编程控制。

## 使用的 API

```ts
import { VirtTableVue, vtColumnPanel } from '@virt-table/vue';

const columns = [
  { key: 'id', title: 'ID', width: 80, hideable: false },  // 不允许隐藏
  { key: 'email', title: '邮箱', width: 240, hidden: true },  // 默认隐藏
];

const options = { plugins: [vtColumnPanel()], list, itemKey: 'id', estimatedSize: 40 };

// 实例方法（ref 上调用）；面板要贴着触发按钮定位，把按钮作为 anchor 传进去
tableRef.value?.toggleColumnPanel(e.currentTarget as HTMLElement);
tableRef.value?.setColumnVisible('job', false);
tableRef.value?.getVisibleColumns();
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-column-visibility" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/ColumnVisibility.vue
:::
