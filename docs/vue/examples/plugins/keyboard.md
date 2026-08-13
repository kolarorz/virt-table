# Vue 键盘导航

装载 `vtCellSelection()` + `vtKeyboardNav()` 后，先单击单元格再用键盘操作：方向键移动、Tab / Shift+Tab 左右、Enter 下移、F2 进入编辑、Shift+方向键扩展选区。目标行不在视口时会自动滚动。

## 使用的 API

```ts
import { VirtTableVue, vtCellSelection, vtKeyboardNav } from '@virt-table/vue';

const options = {
  // 键盘导航依赖框选提供「当前单元格」，两个插件要一起装
  plugins: [vtCellSelection(), vtKeyboardNav()],
  list,
  itemKey: 'id',
  estimatedSize: 40,
};
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-keyboard" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/Keyboard.vue
:::
