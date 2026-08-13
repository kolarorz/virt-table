# React 自然语言查询

`vtAIQuery`：一句话 → 筛选 / 排序 / 列显隐。插件把模型产出的 JSON 先**校验纠错**，再经 `setState()` 落地。`@virt-table/react` 直接透传插件与类型。

::: warning demo 里没有真的在调模型
示例的 `resolve` 是**本地关键词规则**——文档站不该要求访客准备 API key，也不该把 key 放进前端。它故意包含几种真实模型常犯的偏差（填 label 而不是 value、数字写成字符串、幻觉列名），好让你看见校验层在干什么。
:::

## 使用的 API

```tsx
import { VirtTableReact, vtAIQuery, vtColumnFilter, type AIQueryResolveInput } from '@virt-table/react';

const plugins = React.useMemo(
  () => [
    vtColumnFilter(),
    vtAIQuery({
      // 接真实模型时把这里换成一次请求，插件其余部分不用动
      async resolve({ text, prompt, jsonSchema, signal }: AIQueryResolveInput) {
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
  [],
);

// 实例方法（ref 上调用）
tableRef.current?.openAIQueryBar();       // Cmd/Ctrl + K 也可唤出
tableRef.current?.askAITable(text);
tableRef.current?.undoAIQuery();
tableRef.current?.getAIPromptContext();
tableRef.current?.getAIToolSchema();
```

服务端那一侧：把 `prompt` 作为 system message，`jsonSchema` 作为 tool / function calling 的 `input_schema`，把模型返回的参数对象原样回给前端。

完整语义（校验规则、`AIQuery` 形状、撤销栈、服务端预校验）见 [Vanilla · 自然语言查询](/vanilla/examples/plugins/ai-query)。

## 示例

<PlaygroundHost framework="react" example-id="react-ai-query" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/AIQuery.tsx
:::
