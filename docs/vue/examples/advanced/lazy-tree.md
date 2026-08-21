# Vue 树形懒加载

`loadChildren` + `hasChildren`：首屏只给根节点，首次展开某节点时才去取它的子节点，取数期间该节点箭头变 spinner。

## 示例

<PlaygroundHost framework="vue" example-id="vue-lazy-tree" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/advanced/LazyTree.vue
:::

## 说明

- 同一节点在途只请求一次
- 返回空数组记为「确实没有子节点」，箭头变叶子且不再请求
- 失败会回到折叠态，再点一次即重试

完整语义（在途去重、失败态回滚、与 `defaultExpandAll` 的关系）见 [Vanilla · 树形懒加载](/vanilla/examples/advanced/lazy-tree)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `loadChildren(row, ctx)` | 取子节点；`ctx` 含 `level` 与 `signal` | [数据与远程 · 树形懒加载](/vanilla/api/data#树形懒加载) |
| `hasChildren(row)` | 未加载时是否给展开箭头 | [数据与远程 · 树形懒加载](/vanilla/api/data#树形懒加载) |
| `onChildrenLoaded` / `onChildrenLoadError` | 成功 / 失败回调 | [数据与远程 · 树形懒加载](/vanilla/api/data#树形懒加载) |
| `loadChildrenFor` / `resetLazyNode` | 主动取数 / 清缓存重取 | [实例方法](/vanilla/api/instance) |

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
