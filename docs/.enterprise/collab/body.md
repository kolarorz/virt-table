> 多人光标、单元格评论、修订历史。**⬜ 占位包，尚未实现。**

装上它只会 `console.warn` 一次，**不做任何事**。骨架（构建、类型、许可、测试、发布）都已就位。

---

## 现在装上会发生什么

```ts
import { vtCollab } from '@virt-table-pro/collab';

new VirtTable(el, { list, columns, itemKey: 'id', estimatedSize: 40, plugins: [vtCollab({ currentUser: me })] });
// → [vtCollab] 协同能力 尚未实现，本插件当前不做任何事。
```

- 表格照常工作，插件不改任何行为
- `guardProduct('collab')` 照常跑 —— 没设密钥时右下角**会出现未授权角标**
- `table.addComment()` / `getComments()` / `openRevisionHistory()` **类型上有、运行时没有**，
  调用会抛 `is not a function`

---

## 计划中的 API（草案，实现时可能变）

```ts no-check
interface CollabOptions<T> {
  /** 传输层：由使用方接入 WebSocket / Yjs / 自有长连接 */
  transport?: {
    send(msg: unknown): void;
    subscribe(handler: (msg: unknown) => void): () => void;
  };
  /** 当前用户，用于光标与评论署名 */
  currentUser?: { id: string; name: string; color?: string };
}
```

```ts no-check
// 预期用法
const ws = new WebSocket('wss://example.com/table/42');

const table = new VirtTable(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [
    vtCollab({
      currentUser: { id: 'u_7', name: '可乐', color: '#4f8cff' },
      transport: {
        send: (msg) => ws.send(JSON.stringify(msg)),
        subscribe: (handler) => {
          const onMsg = (e: MessageEvent) => handler(JSON.parse(e.data));
          ws.addEventListener('message', onMsg);
          return () => ws.removeEventListener('message', onMsg);   // 返回取消订阅
        },
      },
    }),
  ],
});

table.addComment('row_12', 'amount', '这笔要走特批');
table.getComments('row_12', 'amount');
table.openRevisionHistory();
```

**不内置传输层**是刻意的：协同的后端形态差异极大（自有长连接、Yjs/CRDT、Firebase、
甚至轮询），本包负责的是光标与评论的**呈现与锚定**，以及一份可插拔的消息协议。

---

## 动工前核心需要先补什么

| 要做的事 | 现在能怎么做 | 缺口 |
| --- | --- | --- |
| 多人光标 | `onRendered` + `getSelectionRect()` 画浮层 | ✅ 不缺 |
| 评论锚点 | 稳定行 key 有（`itemKey`）；挂载点只能在 `onCellRendered` 里往 `<td>` 上挂 | 🟡 够用但不够干净 —— 缺单元格级的浮层挂载点 |
| 修订历史 | — | ❌ **缺数据写入的统一钩子**。与 `formula` / `undo` 是同一个缺口（核心没有 `onCellEdit`），可以一起补 |

「核心没有编辑事件」这条缺口的代价现在就能看到：
`@virt-table-pro/undo` 因此只能自动撤销**查询状态**，数据编辑必须由使用方显式录制。
修订历史面对的是同一个问题 —— 没有钩子就没法知道「谁在什么时候改了哪一格」。

---

## 在那之前怎么办

**评论的锚点**可以先自己挂。`onCellRendered` 是渲染热路径，里面只做加 class / 设属性这类
常数级操作：

```ts
import type { VirtTablePlugin } from '@virt-table/vanilla';

/** 有评论的格子右上角点个小红点，点击时打开自己的评论面板 */
const vtCommentMarks = (comments: Map<string, number>): VirtTablePlugin<Row> => ({
  name: 'vtCommentMarks',
  setup(ctx) {
    ctx.on('onCellRendered', (td, column, row) => {
      const count = comments.get(`${(row as Row).id}:${String(column.key)}`);
      if (count) {
        td.classList.add('has-comment');
        td.dataset.commentCount = String(count);
      }
    });

    const onClick = (e: Event) => {
      const td = (e.target as HTMLElement)?.closest?.('td[data-col-key]') as HTMLElement | null;
      const tr = td?.closest('tr[data-row-key]');
      // data-row-key / data-col-key 是核心的公开 DOM 契约
      if (td && tr) openMyCommentPanel(tr.getAttribute('data-row-key')!, td.getAttribute('data-col-key')!);
    };
    ctx.tbodyEl.addEventListener('click', onClick);
    return { destroy: () => ctx.tbodyEl.removeEventListener('click', onClick) };
  },
});
```

**多人光标**同理：`ctx.on('onRendered', ...)` + `ctx.table.getSelectionRect(range)` 就能把别人的
选区画成一个带名字的框 —— `@virt-table-pro/formula` 的引用高亮层就是这么做的。

**修订历史**在核心补钩子之前只能做到「自己写回数据时顺手记一条」——
与 `@virt-table-pro/undo` 的<ProLink to="undo#手动层-把数据编辑录进来">手动层</ProLink>完全一样的形状。

---

## 为什么它值得收费

SaaS 场景刚需，工程量大。多人光标 + 评论 + 修订历史，自研成本极高。

---

## 进展与排期

kolarorz@gmail.com

## 相关

- [企业版](/enterprise/) —— 授权模式、定价与常见问题
- 已实现的付费包：<ProLink to="views">命名视图</ProLink> · <ProLink to="undo">撤销 / 重做</ProLink> ·
  <ProLink to="formula/column">公式</ProLink> · <ProLink to="gantt/">甘特图</ProLink>
