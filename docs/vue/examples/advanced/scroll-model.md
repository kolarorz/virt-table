# Vue 滚动模型

纵向滚动位置由 JS 掌管，横向保留原生 scrollport，两条滚动条都是自绘的浮层轨道。
写「跟着滚动走」的逻辑（浮层定位、无限滚动、滚动埋点）之前先看这一页 —— 有几个原生表格
的直觉在这里不成立。

| 轴 | 位置来源 | 滚动条 |
| --- | --- | --- |
| 纵向 | `@virt-list/core` 的偏移量 + 表体残差 `top` | 自绘，按**行索引**映射 |
| 横向 | 原生 `scrollLeft`（`overflow-x: auto`） | 自绘，按**像素**映射、驱动原生 |

横向刻意保留原生 scrollport：固定列、分组表头标签、自动合并标签三处 `position: sticky`
都以它为参照，改成 JS 位移会同时失效。

## 三条与原生不同的地方

::: warning 破坏性变更
以下几条随虚拟滚动内核（`@virt-list/core`）的重构一起变化。
:::

**1. `scroll` 事件的载荷不是 DOM `Event`**，而是 `VirtScrollEvent`：

```ts
{ offset, delta, direction, clientSize, scrollSize, maxOffset, atStart, atEnd, source }
```

容器的 `overflow-y` 是 `hidden`，没有原生纵向 scroll 事件可转发，伪造一个只会让
`e.target.scrollTop` 读到恒定的 `0`。`source` 是 `'user' | 'program' | 'adjust'`，
其中 `'adjust'`（库为保持视口内容不跳做的内部补偿）通常应当判掉。

**2. `clientEl.scrollTop` 恒为 `0`**，不再代表滚动位置 —— 用 `tableRef.value?.getTable()?.getOffset()`（这个方法没有直接挂到 ref 上，走 `getTable()` 取底层实例）。
自己算浮层位置时也不要再加 `scrollTop`（横向的 `scrollLeft` 仍然有效）。

**3. `rangeUpdate` 由表格自己派生**（内核已移除该事件），语义不变：可视区间**真的变化**时
才触发，不随每帧滚动刷。

## 相关 API

| 方法 / 事件 | 作用 | 详见 |
| --- | --- | --- |
| `getTable()?.getOffset()` | 当前纵向偏移量（替代 `scrollTop`）；ref 未直接转发 | [实例方法](/vue/api/instance) |
| `scrollToIndex` / `scrollToCell` / `scrollToTop` / `scrollToBottom` | 编程式滚动 | [实例方法](/vue/api/instance) |
| `scroll` 事件 / `VirtScrollEvent` | 滚动回调载荷 | [类型定义](/vue/api/types) |
| `edgeThreshold` | 触发 `toTop` / `toBottom` 的阈值（旧名 `scrollDistance`） | [表格配置](/vue/api/table#virttableoptions) |
| `scrollbarAutoHide` / `scrollbarMinThumbSize` | 自绘滚动条外观 | [表格配置](/vue/api/table#virttableoptions) |

靠滚动位置驱动的两页：[无限滚动](/vue/examples/advanced/infinite)、[服务端数据](/vue/examples/advanced/server-data)。
