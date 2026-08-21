# vtAIColumn AI 列

一列的值由模型从同行其他列算出来，边算边写。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-ai-column" />

::: warning 关于这个 demo
`compute` 是**本地模板 + 假延迟**，不是真在调模型 —— 文档站不该要求访客准备 API key。

重点看工具栏上那个计数器：表里 **5 万行**，但「已调用」永远只随你滚过的屏数增长，
而不是 5 万。快速滚动时能看到「已取消」跟着涨 —— 那是滚走的行把在途请求 abort 掉了。
:::

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/ai/ai-column.ts
:::

## 虚拟化在这件事上是决定性优势

一列 AI 值在 10 万行表上全量跑一遍，是 **10 万次模型调用**；而屏幕上同时只有二十来行。
所以这个插件默认**只为渲染窗口内的行付钱** —— 滚到哪算到哪，滚走了还没开始的直接出队、
已在途的 `abort()`。

不虚拟化的表格做不到这个优化：它们的 DOM 里所有行都在，没有「可见」这个概念可用。

## 快速上手

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtAIColumn } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/core.css';
import '@virt-table/vanilla/plugins/ai-column.css';

const table = new VirtTable(el, {
  columns,
  list,
  plugins: [
    vtAIColumn({
      column: { key: 'summary', title: 'AI 摘要', width: 280 },
      async compute(row, { signal }) {
        const r = await fetch('/api/summarize', {
          method: 'POST',
          body: JSON.stringify({ text: row.content }),
          signal,           // 行滚出视口时会 abort，务必透传
        });
        return (await r.json()).text;
      },
    }),
  ],
});
```

插件会把 `column` 追加到列树末尾；列树里**已有同 key 的列**则直接接管那一列的渲染
（想把 AI 列放中间，自己在 `columns` 里先占好位置）。

## 流式写入

`compute` 返回 `AsyncIterable<string>` 就逐段写进单元格 —— 模型流式输出时一个字一个字往外冒，
比转圈等着好看得多：

```ts
vtAIColumn({
  column: { key: 'summary', title: 'AI 摘要', width: 280 },
  async *compute(row, { signal }) {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ text: row.content }),
      signal,
    });
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      yield value;
    }
  },
})
```

每段只重画**那一格**（`td.textContent`），不走整帧 `forceUpdate` —— 逐字更新时那个开销无法接受。

## 值不写回行数据

生成的值存在插件自己的缓存里，按 `rowKey` 索引。行数据是你的，AI 生成的东西混进去之后就
分不清哪些是原始数据了（导出、提交、对比都会踩坑）。要取用：

```ts
table.getAIColumnValues();   // { '0': '积极反馈…', '2': '中性反馈…' }
```

## Options

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `column` | `VirtTableColumn` | — | **必填**。要插入/接管的列 |
| `compute` | `(row, ctx) => Promise<string> \| string \| AsyncIterable<string>` | — | **必填**。算一格的值 |
| `concurrency` | `number` | `4` | 同时在途的最大请求数 |
| `visibleOnly` | `boolean` | `true` | 只算渲染窗口内的行。设 `false` 则把当前视图全部排队 —— 只在数据量小、或确实要全量生成时用 |
| `auto` | `boolean` | `true` | 是否自动开算。设 `false` 则只有手动 `computeAIColumn()` 才动 —— 一格一次模型调用，有些场景不该在用户只是滚过去时就花钱 |
| `abortOnHide` | `boolean` | `true` | 行滚出视口时中止在途请求 |
| `retryable` | `boolean` | `true` | 失败的格子可点击重试 |
| `onCellChange` | `(rowKey, state) => void` | — | 单格状态变化 |

`compute` 的第二个参数：`{ signal, rowKey, rowIndex, columns }`。

## 方法

| 方法 | 说明 |
| --- | --- |
| `computeAIColumn(rowKeys?)` | 手动开算；不传就是当前渲染窗口内的行 |
| `recomputeAIColumn(rowKey)` | 忽略缓存强制重算一格 |
| `clearAIColumn(rowKey?)` | 清缓存；不传则清全部并中止在途 |
| `getAIColumnState(rowKey)` | `{ status: 'pending' \| 'computing' \| 'done' \| 'error', text, error }` |
| `getAIColumnValues()` | 已算出的值（只含成功的格子） |
| `getAIColumnStats()` | `{ done, error, inflight, queued }` |

## 几个刻意的行为

- **失败的格子不会被自动重排。** 否则每次滚过去都重试一遍，等于无限重试烧钱。要重试就点它（或 `recomputeAIColumn`）。
- **被 `abort` 的行不算失败**，状态直接丢弃，等下次进屏重新排队。
- **滚回已算过的行走缓存**，不重复调用。
- 数据换了（排序/筛选/新数据）**不清缓存** —— 值是按 `rowKey` 存的，那些行只是暂时不在视图里。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtAIColumn(options)` | AI 列：值由模型从同行其他列算出，**只为渲染窗口内的行**发起调用 | [插件机制](/vanilla/api/plugins) |
| `computeAIColumn` / `recomputeAIColumn` / `clearAIColumn` | 触发与清理 | [插件机制](/vanilla/api/plugins) |
| `getAIColumnState` / `getAIColumnValues` / `getAIColumnStats` | 逐格状态与统计 | [插件机制](/vanilla/api/plugins) |
