# Vue 打印

> 由 `vtExport` 插件提供：`plugins: [vtExport()]`。

调用 ref 上的 `print({ title })` 在新窗口输出全表（内联样式），复用导出的 HTML 构造，适合快速打印或另存。

## 使用的 API

```ts
import { VirtTableVue, vtExport } from '@virt-table/vue';

const options = { plugins: [vtExport()], list, itemKey: 'id', estimatedSize: 40 };

// 实例方法（ref 上调用）
tableRef.value?.print({ title: '人员清单' });
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-print" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/Print.vue
:::
