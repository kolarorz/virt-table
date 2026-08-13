# vtAIQuery 自然语言查询

一句话描述你要看的数据，表格自己完成筛选、排序与列显隐。

**插件不发网络请求，也不认识任何模型厂商。** 它做两端 —— 把「表格能被怎么查」描述成
schema 交给你，再把模型吐回来的 JSON 校验、纠错、经 `setState()` 一次性落地；中间那步
调模型由你在 `resolve` 回调里实现。这样 key 不落前端，企业自研网关、服务端代理、
本地模型都能接。

## 快速上手

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtAIQuery } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/core.css';
import '@virt-table/vanilla/plugins/ai-query.css';

const table = new VirtTable(el, {
  columns,
  list,
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

Cmd/Ctrl + K 唤出输入条；也可以纯命令式：`await table.askAITable('华东区销售额前十的客户')`。

## 服务端怎么写

`resolve` 拿到的四样东西正好对应一次 tool calling：

| 字段         | 用途                                                        |
| ------------ | ----------------------------------------------------------- |
| `text`       | 用户说的话                                                  |
| `prompt`     | 拼好的上下文（列名对照、可用算子、枚举候选、今天的日期），作 system message |
| `jsonSchema` | 作 tool / function calling 的 `input_schema`，已用 `enum` 收窄列 key 与算子 |
| `signal`     | 关闭输入条或发起新一轮时会 abort，透传给 `fetch`            |

把模型返回的参数对象原样回给前端即可。想在服务端就先校验一遍，引纯逻辑入口：

```ts
import { validateAIQuery } from '@virt-table/vanilla/ai-query';

const { query, issues, actionable } = validateAIQuery(modelOutput, columns);
```

`@virt-table/vanilla/ai-query` 不含任何 CSS 与 DOM 依赖，可以在 Node 里直接跑。

## 为什么必须有校验层

核心的筛选求值是**宽容**的 —— 未知列、不完整的条件一律视为「通过」，这样 UI 上编辑到
一半的条件不会把表瞬间筛空。但模型幻觉出一个列名时，同样的宽容会变成「筛了却没效果」，
用户完全无从判断。所以插件在应用前把问题挑出来，反馈区可以展开看：

| 模型常犯的偏差                       | 校验层的处理                                        |
| ------------------------------------ | ---------------------------------------------------- |
| 幻觉出不存在的列                     | 丢弃该条件，报 `error`；其余条件照常应用             |
| 用了该列不支持的算子                 | 丢弃并报 `error`；`eq` 在只留 `in/notIn` 的列上会被救成 `in` |
| 枚举列填了 label（`'华东区'`）       | 按候选项回译成 value（`'east'`），报 `warn`          |
| 数字写成字符串（`'1,000,000'`）      | 转成数字（容忍千分位）；转不动则丢弃并报 `error`     |
| 日期写成无法解析的说法               | 丢弃并报 `error`                                     |
| `between` 只给一端                   | 当作单边界，正常应用                                 |
| 条件树自引用 / 嵌套过深              | 超过 10 层截断，不打穿调用栈                          |

`columns` 全部无效时整体忽略 —— 否则会把所有可隐藏列一并藏掉，等于清空表格。

## Options

| 参数       | 类型                                                | 说明                                                        |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------- |
| `resolve`  | `(input) => Promise<unknown>`                       | **必填**。把自然语言交给你的模型服务                        |
| `ui`       | `boolean`                                           | 是否挂输入条，默认 `true`；关掉则只能用 `askAITable()`        |
| `hotkey`   | `string \| null`                                    | 唤出快捷键，默认 `'mod+k'`（`mod` = Cmd/Ctrl），`null` 关闭 |
| `schema`   | `{ now?: Date; maxEnumValues?: number }`            | 注入「今天」让相对时间可测；限制枚举候选进 prompt 的条数（默认 50） |
| `confirm`  | `(result) => boolean \| Promise<boolean>`           | 应用前确认，返回 `false` 则不应用（可先给用户看 `explanation`） |
| `onResult` | `(result) => void`                                  | 每次解析完成后触发，无论是否应用                            |
| `onError`  | `(err) => void`                                     | `resolve` 抛错时触发（abort 不触发）                        |

## 方法

| 方法                     | 说明                                                     |
| ------------------------ | -------------------------------------------------------- |
| `askAITable(text)`         | 走完整链路，返回 `Promise<AIQueryResult>`                |
| `applyAIQuery(query)`    | 跳过模型直接应用一个查询，同样走校验                     |
| `undoAIQuery()`          | 撤销上一次应用，恢复到应用前的视图状态（含列宽与列序）   |
| `getAITableSchema()`     | 当前表格对模型的结构化描述                               |
| `getAIPromptContext()`   | 拼好的 prompt 上下文                                     |
| `getAIToolSchema()`      | 可直接用作 `input_schema` 的 JSON Schema                 |
| `openAIQueryBar()` / `closeAIQueryBar()` / `toggleAIQueryBar()` | 输入条开关；关闭会作废在途请求       |

## 模型该产出什么

```ts
interface AIQuery {
  filter?: FilterGroup | null;   // 条件树，null 表示显式清空
  sort?: { colKey: string; order: 'asc' | 'desc' }[];
  columns?: string[];            // 「只看这几列」
  search?: string;               // 关键词搜索
  explanation?: string;          // 一句中文复述，给用户确认用
}
```

`filter` 用的就是高级筛选的条件树（与 `setFilterModel()` 同构），所以自然语言查询和
筛选构建器 `VtFilterBuilder` 产出的是同一种东西 —— 用户可以说一句话生成条件，再手动改。

::: tip 三点说明
- `explanation` 请务必让模型填。用户需要看见「它理解成了什么」才敢信，撤销按钮就在旁边。
- `search` 只写入查询状态（服务端模式下进 `RemoteQuery.search`），命中高亮需要另装 `vtSearch`。
- 撤销只保留**一步**快照。需要多步回退请自行在 `onResult` 里维护 `getState()` 栈。
:::

## 示例

<PlaygroundHost framework="vanilla" example-id="table-ai-query" />

::: warning 关于这个 demo
`resolve` 是**本地关键词规则**，不是真的在调模型 —— 文档站不该要求访客准备 API key。
它故意保留了几种真实模型常犯的偏差（枚举填 label、数字写成字符串、点「毛利大于 0」
会幻觉出一个不存在的 `profit` 列），好让你看见校验层在做什么。接真模型只需替换
`resolve` 一个函数。
:::

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/ai-query.ts
:::
