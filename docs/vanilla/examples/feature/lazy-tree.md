# 树形懒加载 lazy tree

树形数据按需取子节点：首屏只给根节点，首次展开某节点时才去请求它的 `children`。

配 `loadChildren` 即启用（配合 `type: 'tree'` 列）。

```ts
const table = new VirtTable(el, {
  list: rootRows,          // 只给根节点
  columns: [{ key: 'name', title: '名称', width: 320, type: 'tree' }, /* … */],
  itemKey: 'id',
  estimatedSize: 40,
  // 未加载时靠它决定要不要显示展开箭头；默认读 row.hasChildren
  hasChildren: (row) => !!row.hasChildren,
  async loadChildren(row, ctx) {
    const res = await fetch(`/api/children?parent=${row.id}`, { signal: ctx.signal });
    return res.json();     // 返回的行会写进 row.children
  },
  onChildrenLoaded: (row, children) => {},
  onChildrenLoadError: (row, err) => {},
});
```

## 行为约定

| 场景                       | 行为                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| 未加载但「可能有子节点」   | 照常显示展开箭头（由 `hasChildren` 判定，默认读 `row.hasChildren`） |
| 取数期间                   | 该节点箭头变小 spinner；**点击被忽略**（见下）                     |
| 同一节点重复触发           | 在途只请求一次；已加载过不再请求（走缓存）                        |
| 返回空数组                 | 记为「确实没有子节点」，箭头变叶子，不会重复请求                   |
| 取数失败                   | 回到折叠态并触发 `onChildrenLoadError`，**再点一次即重试**         |
| 表格销毁                   | 中断所有在途请求                                                  |

::: tip 加载中为什么忽略点击
若允许翻转，连点会按奇偶决定最终折叠态，数据到达时展开与否就变得随机；而此时箭头已经是 spinner（`cursor: progress`），本就不该可点。
:::

## 与 `defaultExpandAll` / `expandAll()` 的关系

两者**只作用于已加载的节点**——否则初始化就会把整棵树递归拉下来，与懒加载的意图相反。懒节点的初始状态恒为折叠。

需要预展开某条路径时，逐级调用 `loadChildrenFor(rowKey)`（它会取数并在数据到位后展开）。

## 方法

| 方法                                        | 说明                                                        |
| ------------------------------------------- | ----------------------------------------------------------- |
| `loadChildrenFor(rowKey)`                   | 主动取某节点的子节点（等价于用户首次展开）                    |
| `resetLazyNode(rowKey, clearChildren = true)` | 清掉该节点的「已加载」标记（并可选清空 `children`），下次展开重新取数——用于刷新子树 |

## 与其他能力的关系

- 子节点数据写进 `row.children`，因此**筛选/排序/合计只覆盖已加载的部分**（未展开的子树对表格不可见）。
- 与 `groupConfig`（分组）叠加时，懒加载只作用于树层级。
- 与无限滚动是两件独立的事，可同时使用：外层滚动追加根节点，展开时懒取子节点。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-lazy-tree" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/feature/lazy-tree.ts
:::
