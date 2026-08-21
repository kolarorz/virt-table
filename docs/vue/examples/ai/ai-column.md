# Vue AI 列

`vtAIColumn`：一列的值由模型从同行其他列算出来，边算边写。重点是**调度**——只为屏幕上看得见的行付钱。

## 示例

<PlaygroundHost framework="vue" example-id="vue-ai-column" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/ai/AIColumn.vue
:::

## 说明

示例里表有 **5 万行**，但「已调用」永远只随你滚过的屏数增长，而不是 5 万。滚走时未完成的请求会被 abort。不虚拟化的表格做不到这个优化：它们的 DOM 里所有行都在，没有「可见」可用。

::: warning demo 里没有真的在调模型
示例的 `compute` 是本地模板 + 假延迟，演示的是调度与流式写入，不是模型能力。
:::

完整语义（并发与队列、缓存键、abort 时机、错误态展示）见 [Vanilla · AI 列](/vanilla/examples/ai/ai-column)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtAIColumn(options)` | AI 列：值由模型从同行其他列算出，**只为渲染窗口内的行**发起调用 | [插件机制](/vanilla/api/plugins) |
| `computeAIColumn` / `recomputeAIColumn` / `clearAIColumn` | 触发与清理 | [插件机制](/vanilla/api/plugins) |
| `getAIColumnState` / `getAIColumnValues` / `getAIColumnStats` | 逐格状态与统计 | [插件机制](/vanilla/api/plugins) |

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
