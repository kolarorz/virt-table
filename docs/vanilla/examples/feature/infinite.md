# 无限滚动 infinite

配置 `infinite` 并给一个取数实现，滚到底部就自动加载下一批。

::: tip 分工
**库负责**「何时该取数、取数期间的状态、取回后怎么并进虚拟滚动」；**你负责**「怎么取数」（fetch / axios / GraphQL / TanStack Query 都行）。
因此这里没有缓存、重试策略、HTTP 包装 —— 只有编排。
:::

## 两个入口，同一内核

**糖层 `loadData`** —— 返回 Promise，库替你接进来：

```ts
const table = new VirtTable(el, {
  list: [],
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  infinite: { pageSize: 50 },
  async loadData(req) {
    const res = await fetch(`/api/rows?offset=${req.offset}&limit=${req.pageSize}`);
    const { rows, total } = await res.json();
    return { rows, total }; // total 用于判断是否还有更多
  },
});
```

**受控层 `onLoadMore`** —— 你自己发请求，用 `ctx.done` / `ctx.fail` 交付（想接管请求库时用它）：

```ts
{
  infinite: { pageSize: 50 },
  onLoadMore: async (ctx) => {
    try {
      const { rows, nextCursor } = await api.list({ cursor: ctx.cursor, limit: ctx.pageSize, signal: ctx.signal });
      ctx.done(rows, { cursor: nextCursor });   // cursor === null 即到底
    } catch (e) {
      ctx.fail(e);                              // 底部条切错误态 + 重试按钮
    }
  },
}
```

`ctx.done()` 不带数据时表示「仅解锁」——适合你已经自行 `setList` 的场景。

## 库替你处理掉的事

| 问题                                                        | 处理方式                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| `toBottom` 每次向下滚动都会触发，会连发十几个请求           | 在途加锁 + `hasMore` 门禁，重复触发直接忽略                     |
| 用户连点筛选/排序，先发的响应后到，把新数据覆盖了           | 代次 + 序号双重校验，旧代响应一律作废，并 `abort` 旧请求        |
| 追加数据后滚动位置乱跳                                       | 追加保留行 DOM 池，`inViewBegin` 不动；前插做偏移补偿           |
| 到底了还继续请求                                             | `hasMore` 推导：显式 > 游标 > 总数 > 满页启发式                 |
| 加载中把已有数据遮住                                         | 首屏/换参用全屏遮罩，追加只亮底部状态条                        |
| 请求失败后数据丢了                                           | 保留已加载数据，状态条给重试入口（`retryLoad()` 复用同一参数）  |

## 配置

```ts
infinite?: {
  enabled?: boolean;          // 默认 true
  pageSize?: number;          // 每批条数，默认 50
  distance?: number;          // 距底/距顶多少 px 触发，默认 200（写入内核 edgeThreshold）
  autoLoadFirst?: boolean;    // 首屏自动取第一批；默认「没有初始 list 就取」
  manual?: boolean;           // 只显示「加载更多」按钮，不自动触发
  direction?: 'down' | 'up' | 'both';  // 加载方向，默认 down
  showNoMore?: boolean;       // 到底后显示「没有更多」，默认 true
}
```

## 响应元信息

```ts
interface DataResponse<T> {
  rows: T[];
  total?: number;        // 总条数：驱动分页条与 hasMore
  cursor?: string | null;    // 向下游标，返回 null 表示到底
  prevCursor?: string | null;// 向上游标
  hasMore?: boolean;     // 显式声明（优先级最高）
  hasPrev?: boolean;
  footerData?: string[][];   // 服务端聚合行，直接接管表尾
}
```

**游标与页码不必二选一**：请求里 `page` / `offset` / `cursor` 同时下发，后端认哪个用哪个；状态机内部只维护「已加载多少 / 还有没有更多」，没有两条代码路径。

## 向上加载（历史消息式）

`direction: 'up' | 'both'` 时到顶触发 `onLoadPrev` / `loadData`（`req.channel === 'prev'`），前插数据后表格把滚动位置往下推回等量距离，视口内容不跳。

向上/向下是**两条独立通道**，可并发、各自加锁、各自维护游标与「是否还有更多」：

```ts
{
  infinite: { pageSize: 50, direction: 'both' },
  async loadData(req) {
    if (req.channel === 'prev') {
      const { rows, prevCursor } = await api.older({ before: req.prevCursor, limit: req.pageSize });
      return { rows, prevCursor };   // prevCursor === null → 向上到头
    }
    const { rows, cursor } = await api.newer({ after: req.cursor, limit: req.pageSize });
    return { rows, cursor };         // cursor === null → 向下到底
  },
}
```

**补偿是逐帧收敛的**：新行首帧按 `estimatedSize` 占位，`ResizeObserver` 随后写入实测高度（每行零点几 px 的差累积成十几 px），因此表格会跟着总高变化持续校正，直到连续几帧稳定为止（硬上限约 650ms）。校正期间**用户一滚动就立刻让位**，不会把人拽回去。

给准确的 `estimatedSize`（或开 `fixedSize: true`）能让首帧就基本对齐，减少收敛过程中的细微位移。

::: tip 状态条常驻占位
上下状态条用 `visibility` 而非 `display` 隐藏——它**常驻占位**（约 34px）。因为出现/消失会改变滚动容器高度，虚拟滚动会跟着抖一下，`scrollTop` 也会被浏览器就近夹取。要调整高度覆盖 `.vt-infinite-bar` 的 `min-height` / `padding` 即可。
:::

## 手动管理数据

不想用库的取数编排，只想要状态条与触发时机：

```ts
{
  infinite: { manual: true },
  // 不给 loadData / onLoadMore
}
// 自己拿到数据后：
table.appendRows(rows);
table.setHasMore(rows.length === pageSize);
```

## 方法

| 方法                        | 说明                                          |
| --------------------------- | --------------------------------------------- |
| `loadMore()` / `loadPrev()` | 手动触发下一批 / 更早一批                     |
| `reload()`                  | 清空已加载数据，重新取第一批                  |
| `refresh()`                 | 一次性重拉当前已加载区间，**保留滚动位置**     |
| `retryLoad()`               | 重试上次失败的请求（复用同一批参数）           |
| `getRemoteState()`          | 读取 `{ page, pageSize, total, cursor, hasMore, hasPrev, loading, loadingMore, loadingPrev, error, loadedCount, initialized }` |
| `appendRows()` / `prependRows()` | 手动追加 / 前插（前插含滚动补偿）        |
| `setHasMore(bool, dir?)` / `setCursor(cursor, dir?)` | 手动模式下控制闸门与游标 |

状态条文案通过 `locale.infinite` 定制（`loadMore` / `loading` / `noMore` / `error` / `retry`），随 `setLocale` 即时切换。

## 限制

- **与 `pagination` 互斥**：分页是页视图（replace，当前页是唯一状态），无限滚动是累积流（append，页码只表示取到第几批）。同时给出时以 `pagination` 为准、忽略 `infinite` 并在控制台告警。
- **合并单元格（`merges`）与无限滚动不兼容**：`merges` 基于扁平行索引，追加后索引语义漂移。需要合并时请改用分页。
- `showSummary` 的本地聚合在服务端模式下只覆盖**已加载数据**。要全量口径请让服务端返回 `footerData`。
- 导出 / 打印同理，只覆盖已加载数据。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-infinite" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/feature/infinite.ts
:::
