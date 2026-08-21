# 浮动图片

<ProPkgStatus pkg="@virt-table-pro/floating-image" status="shipped" product="floating-image" css="index.css" />

<ProDemo pkg="@virt-table-pro/floating-image" to="/demos/spreadsheet#浮动图片" label="经典案例 · 电子表格" />

::: tip 这一端还没有独立 demo
三个手势（拖动 / 缩放 / 旋转）与自动滚动全部是 DOM 级交互，由插件自己实现、**与框架无关**，
所以 Vanilla 那一页的 demo 展示的行为在这一端完全相同。上面的经典案例链接可以直接点。
:::

<!--@include: @/.enterprise/floating-image/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtFloatingImage } from '@virt-table-pro/floating-image';
import '@virt-table-pro/floating-image/index.css';
import '@virt-table/vanilla/components/image-viewer.css';

// Vue 端的 ref 类型要自己交叉一个 VirtTablePluginApi（运行时方法都在，只是类型到不了）
type TableInstance = VirtTablePluginApi & { forceUpdate(): void };
const tableRef = ref<TableInstance | null>(null);

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [
    vtFloatingImage({
      images: [{ id: 'site-plan', src: '/plan.png', x: 560, y: 120, width: 300 }],
      resizable: true,
      rotatable: true,
      viewer: true,
      onChange: (img, { done }) => done && save(img),
    }),
  ],
};
</script>

<template>
  <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
</template>
```

<!--@include: @/.enterprise/floating-image/s1.md-->
