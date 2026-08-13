# Vue 暗夜模式

通过 `theme` 选项或 ref 上的 `setTheme()` 显式切换亮色 / 暗色。表格样式基于 `.vt-root` 上的 `--vt-*` CSS 变量，暗色下自动套用暗色 token。

> 除显式切换外，表格处于 `.dark` 祖先元素下（如 VitePress / Tailwind 暗色）会自动应用暗色，无需手动设置。

## 使用的 API

```ts
type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  theme?: 'light' | 'dark';  // 初始主题
}

// 实例方法（ref 上调用）：运行时切换
tableRef.value?.setTheme('dark');
tableRef.value?.setTheme('light');
```

完整的主题定制（`--vt-*` 变量清单、密度变体、行高等式、深浅色作用域）见 [Vanilla · 暗夜模式](/vanilla/examples/basic/theme)。

## 示例

<PlaygroundHost framework="vue" example-id="vue-theme" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Theme.vue
:::
