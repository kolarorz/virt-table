# React 响应式更新

**表格自己不侦测数据变化，侦测交给 React。** `@virt-table/react` 内部一个 effect 盯着
`options.list` 的**引用**：换了新数组它替你调 `setList()`；**原地改字段谁都察觉不到**，
得自己补一刀 `forceUpdate()`。

但**换引用只是让那个 effect 认出来的信号，本身不是好事**。巨量数据下「每轮 `map` 出一份新
数组」的代价按行数收（10 万行每轮 10 万个临时对象，堆峰值能到基线的 7 倍多，见下面实测），
而 `forceUpdate()` 一个对象都不新建、宿主也不重渲染。所以大表高频刷新的默认选择是
**数据放 `useRef` 原地改 + `forceUpdate()`**，把 `useState` 那条路留给低频、小数据量的场景。

## 示例

<PlaygroundHost framework="react" example-id="react-reactive" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/basic/Reactive.tsx
:::

## 两个出口，怎么选

判据只有一个：**行集合变了没有**。

```tsx
import React from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';

function Demo() {
  const tableRef = React.useRef<VirtTableRef>(null);
  // 巨量数据：数组放 ref 里，宿主一次都不因数据变化重渲染
  const rowsRef = React.useRef<Row[]>(createRows(100000));
  const [list, setRows] = React.useState<Row[]>(rowsRef.current);

  // options 必须 memo 化：每次渲染都造一个新对象会让适配层以为数据换了
  const options = React.useMemo(
    () => ({ list, itemKey: 'id', estimatedSize: 40 }),
    [list],
  );

  // ① 只改字段（行没增没删、顺序不变）—— 原地改，拿 ref 通知。零分配，宿主不重渲染
  const bumpPrice = (i: number, price: number) => {
    rowsRef.current[i].price = price;
    tableRef.current?.forceUpdate();
  };

  // ② 增删、改序、或改了参与排序/筛选的字段 —— 必须走 setList，让表格重跑管线
  //    把新数组同时写回 ref，宿主下次因别的原因重渲染时传下去的还是同一份
  const append = (row: Row) => {
    rowsRef.current = [...rowsRef.current, row];
    setRows(rowsRef.current);          // 或 tableRef.current.setList(rowsRef.current)
  };

  return <VirtTableReact ref={tableRef} columns={columns} options={options} />;
}
```

① 这条路便宜的原因就是它绕开了 React：不 `setState`、不复制数据，只有可视区那几十行 DOM 重建。

`forceUpdate()` 内部会重算总高度与可视区间，所以扁平表下原地增删再 `forceUpdate()` 也是对的。
它顶不住的是**派生列表**：开了排序 / 筛选 / 分组 / 树形 / 客户端分页后，表格渲染的是管线算出的
那份派生数组，原地 push 进去的新行不在里面；改了参与排序的字段也只更新内容、不会重排。
另外**头部插入的滚动位置补偿**与**追加时的贴底跟随**只长在 `setList()` 那条路上。
（这几条都有 DOM 契约测试钉着，见 `packages/vanilla/src/reactive-update.dom.test.ts`。）

::: warning 别指望「改完什么都不做」
表格持有的就是你传进来的那个数组对象，原地改动到的就是它。所以只要随后恰好发生一次滚动，
被改过的那些行的 DOM 被回收又重建，新数据就会冒出来 —— 但没有那次滚动时它不会。
这种时好时坏比彻底不工作更难查，所以改完请明确走上面两条通道之一。
:::

## 巨量数据：别为了通知去克隆

`rows.map((r) => ({ ...r, tick }))` 要遍历 n 项、分配 n 个新对象，**哪怕真正变了的只有一项**。
10 万行 × 10 字段，连续刷 50 轮（Node 23 / arm64，`--expose-gc`，基线堆 77 MB）：

| 写法 | 每轮耗时 | 堆峰值 | 每轮新建对象 |
|---|---|---|---|
| 克隆整份 `map((r) => ({ ...r, tick }))` | 6.00ms | **569 MB** | 100000 |
| 只展开命中的那项 `map((r) => (hit ? { ...r } : r))` | 0.53ms | 93 MB | 1 |
| 原地改 + `slice()` 换引用 | 0.19ms | 107 MB | 1 个数组 |
| 原地改，引用不变（`forceUpdate()` 档） | 0.13ms | 92 MB | 0 |

第一行就是「内存暴涨」的来源：每轮 10 万个短命对象，V8 来不及回收，堆一路涨到基线的 7 倍多；
换到帧上就是周期性卡顿。而这笔钱只换到「可视区那几十行能显示新值」——不可见行的克隆全部浪费。

所以在 React 这边按需要挑：

- **想留在「框架自动同步」这条路上** → 原地改完 `setRows(rowsRef.current.slice())`。
  元素全部复用，只新建一个数组，effect 照样命中。
- **纯高频刷新、不需要 React 参与** → 原地改 + `tableRef.current.forceUpdate()`。零分配，
  宿主一次都不重渲染。
- **克隆整份** → 只在数据量小、或本来就走不可变数据流（要做 diff / undo / `memo` 比较）时用。

## 已经渲染出来的行不会自己重填

表格对可视区内的行做的是增量 patch：**行池里已有的 key 不会重新渲染单元格**
（这是增量 patch 的核心优化，滚动时只有真正进出视口的行才建 / 拆 DOM）。所以「同一个 key
的行、字段变了」这件事，如果不通知，行就停在挂载那一刻的内容上。

`setList()` 与 `forceUpdate()` 都是通过**清空行池**来解决这件事的 —— 可视区内的行全部拆掉
重建，内容自然是最新的。代价也在这里：一次刷新的开销与可视区行数、列数成正比，与总行数无关。

## 示例在演示什么

示例每隔一段时间把所有行的价格、涨跌幅、轮次推进一轮，四档更新方式的**视觉结果完全一样**
（除了最后一档），区别写在状态栏的「本轮新建对象」上——把行数调大再对比：

- **克隆整份（effect 自动 setList）**：`setRows(rows => rows.map(row => ({ ...row })))`，
  每轮新建「行数」个对象。上表第一行就是它。
- **原地改 + `slice()` 换引用**：元素复用，每轮只新建一个数组，effect 照样命中。
- **原地改 + `forceUpdate()`**（默认档）：新建 0 个对象，宿主不因数据重渲染，巨量数据首选。
- **原地改（不通知）**：绕开 `setState` 直接改字段，React 与表格都察觉不到，轮次停住。
  点「手动 forceUpdate()」就会一次追上（也可以试着滚动一下，被回收重建的那些行会提前露出
  新值，就是上面那条 warning 说的情形）。

## 高频刷新怎么写

既然一次通知就重建一遍可视区，**通知次数才是成本，改了多少条不是**。所以：

- 一批变更攒在一起，末尾只通知一次；别每收到一条推送就 setState
- WebSocket / 定时器这类高频源，用 `requestAnimationFrame` 或节流把一帧内的变更合并
- 交互中的那一格不必整表刷：部分内置单元格组件（`@virt-table/vanilla/components`，
  如 `VtSwitch`）被操作后自己改自己那一格的 DOM，不走 `forceUpdate()`

```tsx
const dirty = React.useRef(false);
function onPush(rows: Row[]) {
  applyToList(rowsRef.current, rows);      // 先只原地改数据，不通知、不克隆
  if (dirty.current) return;
  dirty.current = true;
  requestAnimationFrame(() => {
    dirty.current = false;
    tableRef.current?.forceUpdate();       // 一帧最多通知一次，零分配
    // 有增删时换成 setRows(rowsRef.current.slice())（走 effect）或 setList(rowsRef.current)
  });
}
```

::: tip 远程模式下 `options.list` 只作为初始值
一旦提供了 `loadData` / `onLoadMore`，那个 effect 就会**跳过** `list` 同步 —— 否则父组件重建
`options`（含新的 `list: []` 字面量）会把表格刚累积的数据清空。远程模式下数据归表格管，
要改数据用 `reload()` / `appendRows()`，见 [React API · 数据与远程](/react/api/data)。
:::

## 两种更新手段的分工

| 手段 | 什么时候用 | 顶不住的情况 | 数据侧代价 |
|---|---|---|---|
| `forceUpdate()`（拿 `ref` 调） | 只改了字段（行没增没删、顺序不变） | 开了管线后的增删；改了参与排序/筛选的字段；头部插入的位置补偿、追加的贴底跟随 | **0 分配**，宿主不重渲染 |
| 换引用（框架代劳 `setList`） | 增删、改序、改了参与排序/筛选的字段，或需要贴底/位置补偿 | —— | `slice()` 是 1 个数组；克隆整份按行数收 |

两者在表格侧的重绘代价相同：清空行池、重建可视区行 DOM，与总行数无关。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `options.list` | 换引用即触发同步（适配层 effect） | [React API · 组件 Props](/react/api/table#组件-props) |
| `setList(list)` | 命令式换数据（框架端一般不用手调） | [实例方法](/vanilla/api/instance) |
| `forceUpdate()` | 原地改字段后触发重绘 | [实例方法](/vanilla/api/instance) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
