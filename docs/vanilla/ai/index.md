# AI 场景

模型的产出有三个共同点：**流式到达、按行到达、按量计费**。这三点恰好都落在虚拟化表格的强项上——它天生只渲染看得见的那几十行，于是「只渲染可见行」顺理成章变成「**只为可见行付费**」。

下面三个场景都可以直接上手玩。

<AiScenarios framework="vanilla" />

## 为什么这件事非虚拟化表格不可

拿 AI 列举例：一张 5 万行的表，要给每行生成一句摘要。

| | 普通表格 | virt-table |
| --- | --- | --- |
| DOM 里有多少行 | 5 万行全在 | 只有可视区 + buffer 那几十行 |
| 「哪些行需要算」怎么判断 | **判断不了** —— 所有行都"在场" | 渲染窗口就是答案 |
| 首屏要发多少次请求 | 5 万次（或者自己写一套可见性检测） | 二十来次 |
| 用户滚过 10 屏的总开销 | 仍是 5 万次 | 二十来次 × 10 |
| 滚走的未完成请求 | 继续跑完、继续计费 | 自动 `abort()` |

差别不是「快一点」，是**两个数量级的账单差异**。虚拟化在这里不再只是渲染优化，它成了调度的依据。

## 三个能力怎么配

| 场景 | 插件 | 谁在动 | 典型用法 |
| --- | --- | --- | --- |
| 让用户用说话代替点筛选器 | `vtAIQuery` | 视图状态（筛选/排序/列显隐） | BI 看板、运营后台的自助查询 |
| 让模型补一列算不出来的信息 | `vtAIColumn` | 单元格内容 | 工单摘要、情绪分类、字段清洗 |
| 让 agent 的结果边跑边显示 | `vtAIStream` | 行与列本身 | agent 任务结果、日志/事件流 |

三者互不依赖，可以单独装，也可以叠在同一张表上。

::: warning 文档站的 demo 没有真的在调模型
上面三个示例里，「模型」都是**本地假实现**：`vtAIQuery` 用一套关键词规则，`vtAIColumn` 用模板 + 假延迟。
文档站不该要求访客准备 API key，也不该把 key 放进前端。

它们演示的是**链路与调度**，而这部分与真模型完全一致：换成一次 `fetch` 即可，插件其余部分不用动。
`vtAIQuery` 的假实现还刻意保留了几种真实模型常犯的偏差（填 label 而不是候选值、数字写成字符串、幻觉列名），
好让你看见校验层在干什么。
:::

## 接真实模型

三个插件的接入点都只有一个回调，服务端形状也都一样：把 `prompt` 当 system message、`jsonSchema` 当 tool 的 `input_schema`，模型返回的参数对象原样回给前端。

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtAIQuery } from '@virt-table/vanilla/plugins';

const table = new VirtTable(el, {
  list,
  columns,
  itemKey: 'id',
  plugins: [
    vtAIQuery({
      async resolve({ text, prompt, jsonSchema, signal }) {
        const r = await fetch('/api/table-query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, prompt, jsonSchema }),
          signal,
        });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      },
    }),
  ],
});
```

想在服务端先校验一遍，引 `@virt-table/vanilla/ai-query` 的 `validateAIQuery()`——那个入口是纯逻辑，不含任何 CSS 与 DOM 依赖。

## 下一步

- [vtAIQuery 自然语言查询](../examples/plugins/ai-query) —— 校验规则、`AIQuery` 形状、撤销栈
- [vtAIColumn AI 列](../examples/plugins/ai-column) —— 并发与队列、缓存键、abort 时机
- [vtAIStream 流式表格](../examples/plugins/ai-stream) —— 帧调度、列推断规则、跟随态
