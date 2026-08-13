# Vue 树形懒加载

`loadChildren` + `hasChildren`：首屏只给根节点，首次展开某节点时才去取它的子节点，取数期间该节点箭头变 spinner。

- 同一节点在途只请求一次
- 返回空数组记为「确实没有子节点」，箭头变叶子且不再请求
- 失败会回到折叠态，再点一次即重试

## 使用的 API

```ts
type Options = {
  list: T[];  // 首屏根节点
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  // 未加载时靠它判断要不要给箭头，默认读 row.hasChildren
  hasChildren?: (row: T) => boolean;
  loadChildren: (row: T, ctx: { level: number }) => Promise<T[]>;
  onChildrenLoaded?: (row: T, children: T[]) => void;
  onChildrenLoadError?: (row: T, err: unknown) => void;
}

// 实例方法（ref 上调用）
tableRef.value?.loadChildrenFor(rowKey);
tableRef.value?.resetLazyNode(rowKey);  // 清缓存与 children，下次展开重新取数
```

完整语义（在途去重、失败态回滚、与 `defaultExpandAll` 的关系）见 [Vanilla · 树形懒加载](/vanilla/examples/feature/lazy-tree)。

## 示例

<PlaygroundHost framework="vue" example-id="vue-lazy-tree" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/feature/LazyTree.vue
:::
