# Vue 自然语言查询

`vtAIQuery`：一句话 → 筛选 / 排序 / 列显隐。插件把模型产出的 JSON 先**校验纠错**，再经 `setState()` 落地。`@virt-table/vue` 直接透传插件与类型。

## 示例

<PlaygroundHost framework="vue" example-id="vue-ai-query" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/ai/AIQuery.vue
:::

## 说明

::: warning demo 里没有真的在调模型
示例的 `resolve` 是**本地关键词规则**——文档站不该要求访客准备 API key，也不该把 key 放进前端。它故意包含几种真实模型常犯的偏差（填 label 而不是 value、数字写成字符串、幻觉列名），好让你看见校验层在干什么。
:::

服务端那一侧：把 `prompt` 作为 system message，`jsonSchema` 作为 tool / function calling 的 `input_schema`，把模型返回的参数对象原样回给前端。

完整语义（校验规则、`AIQuery` 形状、撤销栈、服务端预校验）见 [Vanilla · 自然语言查询](/vanilla/examples/ai/ai-query)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtAIQuery(options)` | 自然语言查询：一句话 → 筛选 / 排序 / 列显隐。**不发请求、不绑厂商**，调模型由 `resolve` 实现 | [插件机制](/vanilla/api/plugins) |
| `askAITable(text)` / `applyAIQuery` / `undoAIQuery` | 问一句 / 应用 / 撤销 | [插件机制](/vanilla/api/plugins) |
| `getAITableSchema` / `getAIPromptContext` / `getAIToolSchema` | 喂给模型的表结构与工具声明 | [插件机制](/vanilla/api/plugins) |
| `setFilterModel` / `sort` / `setColumnVisible` | 它最终落到的这几个能力 | [实例方法](/vanilla/api/instance) |

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
