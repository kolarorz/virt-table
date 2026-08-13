# React AI 列

`vtAIColumn`：一列的值由模型从同行其他列算出来，边算边写。重点是**调度**——只为屏幕上看得见的行付钱。

示例里表有 **5 万行**，但「已调用」永远只随你滚过的屏数增长，而不是 5 万。滚走时未完成的请求会被 abort。不虚拟化的表格做不到这个优化：它们的 DOM 里所有行都在，没有「可见」可用。

::: warning demo 里没有真的在调模型
示例的 `compute` 是本地模板 + 假延迟，演示的是调度与流式写入，不是模型能力。
:::

## 使用的 API

```tsx
import { VirtTableReact, vtAIColumn } from '@virt-table/react';

const plugins = React.useMemo(
  () => [
    vtAIColumn({
      column: { key: 'aiSummary', title: 'AI 摘要（流式生成）', width: 280 },
      concurrency: 4,
      // async generator：逐段 yield 就是逐段写进单元格
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
      onCellChange: () => renderStat(),
    }),
  ],
  [renderStat],
);

// 实例方法（ref 上调用）
tableRef.current?.computeAIColumn();          // 为当前渲染窗口内的行计算
tableRef.current?.recomputeAIColumn(rowKey);  // 忽略缓存强制重算一格
tableRef.current?.clearAIColumn();            // 清缓存并中止在途请求
tableRef.current?.getAIColumnStats();         // { done, error, inflight, queued }
```

::: tip 计数用 ref 而不是 state
`compute` 在建表时被插件捕获，示例里的「已调用 / 已取消」计数走 `useRef`——用 state 会拿到建表那一刻的闭包值。
:::

完整语义（并发与队列、缓存键、abort 时机、错误态展示）见 [Vanilla · AI 列](/vanilla/examples/plugins/ai-column)。

## 示例

<PlaygroundHost framework="react" example-id="react-ai-column" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/AIColumn.tsx
:::
