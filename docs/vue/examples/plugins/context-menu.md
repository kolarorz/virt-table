# Vue 右键菜单

右键菜单由 `vtContextMenu` 插件提供（插件与框架无关，`@virt-table/vue` 直接透传 vanilla 的实现与类型）。

## 关键写法

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  VirtTableVue,
  vtContextMenu,
  type ContextMenuContext,
  type ContextMenuItem,
} from '@virt-table/vue';

const tableRef = ref<InstanceType<typeof VirtTableVue> | null>(null);

const buildItems = (ctx: ContextMenuContext<Row>): ContextMenuItem[] => [
  { label: `复制「${ctx.column.title}」的值`, action: () => copy(ctx.row[ctx.column.key]) },
  { divider: true, label: `删除 ${ctx.row.name}`, action: () => remove(ctx.row) },
  { label: '仅高分行可用', disabled: ctx.row.score <= 90, action: () => {} },
];

const options = { list, itemKey: 'id', estimatedSize: 40, plugins: [vtContextMenu(buildItems)] };
</script>

<template>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

组件 ref 方法：`hideContextMenu()`。

::: tip 插件 API 自动透传
`hideContextMenu()` 是插件通过 `PluginHandle.api` 注入的，Vue 封装里**没有为它手写转发**——`expose` 出来的 ref 会把未显式声明的方法自动回落到插件 API。自定义插件的方法同样可以直接在 ref 上调用。
:::

::: tip 插件在构造时装载
`plugins` 在建表时生效，运行时替换该字段不会重新装载。需要换插件配置时用 `:key` 重建组件。
:::

完整语义（上下文字段、菜单项结构、`selection` 依赖、边界回收）见 [Vanilla · 右键菜单](/vanilla/examples/plugins/context-menu)。

## 示例

<PlaygroundHost framework="vue" example-id="vue-context-menu" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/ContextMenu.vue
:::
