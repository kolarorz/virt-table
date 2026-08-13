# vtAIStream 流式表格

一边收数据一边渲染，列自己长出来。

现有表格库都隐含两条假设：**列是预先定义好的**、**数据一次性给全**。AI 应用的输出恰好两条都
违反 —— agent 抓回来的数据事前不知道 schema，模型在逐行往外吐，量还可能很大。这个插件补的
就是这两件事。

## 三个缺口

| 缺口 | 处理 |
| --- | --- |
| 逐行 `appendRows` = 逐行走一遍数据管线 | 攒进缓冲，**一帧只落一次**（`flushInterval` 可改成定时器） |
| 收到新行时视口该不该跟着走 | **stick-to-bottom**：在底部就跟随，用户一上滚就脱离，滚回底部自动恢复 |
| 列不知道长什么样 | 首批数据到达时 `inferColumns()` 推断类型、标题、宽度、对齐 |

## 快速上手

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtAIStream } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/core.css';
import '@virt-table/vanilla/plugins/ai-stream.css';

const table = new VirtTable(el, {
  list: [],
  columns: [],          // 留空 —— 列由首批数据推断
  itemKey: 'id',
  plugins: [vtAIStream()],
});

// 吃任何 AsyncIterable：SSE、ReadableStream、异步生成器都行
await table.consumeAIStream(rowsFromSSE('/api/rows'));
```

`consumeAIStream` 的每个 yield 是**一行或一批**，两种都接受。手动推也可以：

```ts
table.startAIStream();
table.pushAIStreamRows([row1, row2]);   // 攒到下一帧
table.pushAIStreamRows(row3);           // 单行不必自己包数组
table.endAIStream();              // 落掉缓冲里的尾巴
```

### 接 SSE

```ts
async function* rowsFromSSE(url: string) {
  const res = await fetch(url);
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split('\n');
    buf = lines.pop()!;                       // 最后一段可能是半行，留到下一轮
    for (const line of lines) {
      if (line.startsWith('data: ')) yield JSON.parse(line.slice(6));
    }
  }
}
```

## 列推断

`inferColumns()` 是纯逻辑，也能单独引（`@virt-table/vanilla/infer-columns`，零 CSS 零 DOM），
所以服务端可以先把列算好随数据一起下发：

```ts
import { inferColumns } from '@virt-table/vanilla/infer-columns';

const columns = inferColumns(rows, { itemKey: 'id' });
```

推断规则（按**多数票**判定，不看第一行 —— agent 数据的第一行常常是 null 或异常值）：

| 值的样子 | 推断结果 |
| --- | --- |
| `number` | 右对齐 + `cellType: 'number'`（千分位）+ 可排序 |
| `boolean` | 居中，宽 90 |
| ISO 日期串 / `Date` | 可排序（不右对齐） |
| 图片 URL（`.png` / `.jpg` …） | `cellType: 'image'`，宽 80 |
| 普通 URL | 按文本，不可排序 |
| 超过 60 字符 | `textOverflow: 'tooltip'` |
| 纯数字**字符串** | 按文本 —— 它可能是订单号 / 手机号 / 邮编，右对齐加千分位反而是错的 |

- 字段集合取所有采样行的**并集**（不同来源拼起来的数据键可能不齐），列序跟随字段首次出现的顺序。
- `_` 开头的字段与 `itemKey` 不建列。
- 列宽取内容 **P90** 显示宽度与标题宽度的较大者（用 P90 而不是最大值：一两行超长内容不该把整列撑到 320px，那种情况交给 tooltip）。中文按双宽计。
- 标题走 `humanizeKey`：`createdAt` → `Created At`，`user_name` → `User Name`，`SKU_CODE` 原样。要中文标题传 `titleOf`。

推断是**尽力而为**，产出的是「能直接用的起点」而不是最终答案 —— 拿到结果再改就行。

## Options

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `flushInterval` | `'raf' \| number` | `'raf'` | 缓冲落地节奏。一帧一次已经够 —— 模型吐得再快，人眼也只看得见 60fps |
| `maxRowsPerFlush` | `number` | `500` | 单次落地上限，超出的留到下一次；防止一批两万行把一帧撑爆 |
| `autoColumns` | `boolean \| 'ifEmpty'` | `'ifEmpty'` | `'ifEmpty'` = 表格当前没有列才推断；`true` = 每轮 `startAIStream()` 后重新推断 |
| `inferOptions` | `InferColumnsOptions` | — | 透传给 `inferColumns()`（`itemKey` 自动带上表格的） |
| `followBottom` | `boolean` | `true` | 是否自动跟随底部 |
| `followThreshold` | `number` | `40` | 判定「在底部」的容差（px）。动态行高下总高会被 `ResizeObserver` 持续修正，判定得留余量 |
| `indicator` | `boolean` | `true` | 右下角的接收指示 |
| `onFlush` | `(rows, state) => void` | — | 每次落地后触发 |
| `onStateChange` | `(state) => void` | — | 状态变化时触发 |

## 方法

| 方法 | 说明 |
| --- | --- |
| `consumeAIStream(source, opts?)` | 消费一个 `AsyncIterable`；`opts.signal` 可取消，`opts.autoEnd` 默认 true |
| `startAIStream()` | 开始新一轮，重置计数与跟随态（**不清数据**，清不清由你 `setList([])` 决定） |
| `pushAIStreamRows(rows)` | 推入一行或一批 |
| `endAIStream()` | 结束接收，同步落掉尾巴 |
| `abortAIStream(err?)` | 中断；**已收到的行保留**（半截数据也是数据） |
| `getAIStreamState()` | `{ status, received, buffered, following, error }` |
| `isAIStreamFollowingBottom()` / `setAIStreamFollowBottom(on)` | 跟随态读写 |

::: tip 两点说明
- 没显式 `startAIStream()` 就直接 `pushAIStreamRows()` 也算开始，少一步仪式。
- 源抛错时 `consumeAIStream` 会 reject 并把状态置为 `error`，但**不回滚已落地的行**。
:::

## 示例

<PlaygroundHost framework="vanilla" example-id="table-ai-stream" />

::: warning 关于这个 demo
表格初始 `columns: []`，列是首批数据到达时推断出来的 —— 注意金额右对齐带千分位、结清居中、
而订单号虽然是数字串却按文本左对齐。接收中往上滚会脱离底部跟随（指示器上的点停止呼吸），
滚回底部自动恢复。「灌 2 万行」验证 `maxRowsPerFlush` 会自动分批，不会把一帧撑爆。
:::

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/ai-stream.ts
:::
