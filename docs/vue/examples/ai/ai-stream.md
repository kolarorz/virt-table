# Vue 流式表格

`vtAIStream`：一边收数据一边渲染，**列自己长出来**。表格初始没有任何列配置（`columns: []`），首批数据到达时由 `inferColumns()` 推断出列——类型、标题、宽度、对齐都是算出来的。

## 示例

<PlaygroundHost framework="vue" example-id="vue-ai-stream" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/ai/AIStream.vue
:::

## 说明

接收中往上滚会脱离底部跟随，滚回底部自动恢复。

完整语义（帧调度与 `maxRowsPerFlush`、列推断规则、跟随态、中断与错误）见 [Vanilla · 流式表格](/vanilla/examples/ai/ai-stream)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtAIStream(options?)` | 流式表格插件：攒帧落地 + stick-to-bottom + 首批推断列 | [插件机制](/vanilla/api/plugins) |
| `consumeAIStream(source, opts?)` | 接一个异步可迭代 / ReadableStream | [插件机制](/vanilla/api/plugins) |
| `startAIStream` / `pushAIStreamRows` / `endAIStream` / `abortAIStream` | 手动推流 | [插件机制](/vanilla/api/plugins) |
| `getAIStreamState` / `isAIStreamFollowingBottom` / `setAIStreamFollowBottom` | 状态与跟随开关 | [插件机制](/vanilla/api/plugins) |

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
