# Vue 固定行 pinned

`pinnedTop` / `pinnedBottom` 传入的行冻结在表头下方与表尾上方，不参与虚拟滚动，随横向滚动同步。也可以在运行时用 ref 上的 `setPinnedRows()` 替换。

## 使用的 API

```ts
type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  border: boolean;  // 是否显示边框
  pinnedTop?: T[];  // 冻结在表头下方的行
  pinnedBottom?: T[];  // 冻结在表尾上方的行
}

// 实例方法（ref 上调用）
tableRef.value?.setPinnedRows(topRows, bottomRows);
```

完整语义（与合计行/合并/选中的关系、行高与命中测试的边界）见 [Vanilla · 固定行 pinned](/vanilla/examples/feature/pinned)。

## 示例

<PlaygroundHost framework="vue" example-id="vue-pinned" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/feature/Pinned.vue
:::
