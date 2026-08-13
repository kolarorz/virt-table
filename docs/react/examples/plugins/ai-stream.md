# React 流式表格

`vtAIStream`：一边收数据一边渲染，**列自己长出来**。表格初始没有任何列配置（`columns: []`），首批数据到达时由 `inferColumns()` 推断出列——类型、标题、宽度、对齐都是算出来的。

接收中往上滚会脱离底部跟随，滚回底部自动恢复。

## 使用的 API

```tsx
import { VirtTableReact, vtAIStream, type AIStreamState } from '@virt-table/react';

const columns: ReactTableColumn[] = [];  // 故意留空 —— 列由 vtAIStream 推断

const plugins = React.useMemo(
  () => [
    vtAIStream({
      inferOptions: { minWidth: 96 },
      onStateChange(state: AIStreamState) {
        // state.status / received / buffered / following
      },
    }),
  ],
  [],
);

// 实例方法（ref 上调用）
tableRef.current?.startAIStream();
tableRef.current?.pushAIStreamRows(rows);   // 攒到下一帧统一落地
tableRef.current?.endAIStream();
// 或者直接吃一个 AsyncIterable（SSE / ReadableStream / 异步生成器）
tableRef.current?.consumeAIStream(rowsFromSSE('/api/rows'));
```

完整语义（帧调度与 `maxRowsPerFlush`、列推断规则、跟随态、中断与错误）见 [Vanilla · 流式表格](/vanilla/examples/plugins/ai-stream)。

## 示例

<PlaygroundHost framework="react" example-id="react-ai-stream" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/AIStream.tsx
:::
