# VtLink 链接

链接列。有地址时渲染 `<a>`，没有则渲染 `<button>` —— 不给一个无 `href` 的 `<a>`，那种元素键盘聚焦不到、读屏也不报「链接」，是个只有外观没有语义的空壳。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-link" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-link.ts
:::

## 说明

两条支路：**只读**（默认，纯展示，不需要插件）与**可编辑**（`editable: true`，文案与地址都住在值里，激活后在下拉面板里分别改，走 `renderEditor`，**必须装 `vtCellEditor` 插件**）。

安全上两条硬约束：`target: '_blank'` 一律补 `rel="noopener noreferrer"`（不补的话新页面能通过 `window.opener` 反向操作本页，而表格里的地址常常来自后端数据）；地址过白名单校验，名单外（`javascript:` 之类）按「没有地址」处理。

## 可编辑的链接列

配 `editable: true` 之后，单元格**激活即展开一个下拉面板**，里面两栏分别改「文案」与「链接」，
`Enter` / 确定写回，`Esc` / 取消丢弃：

```ts
import { VtLink, type VtLinkValue } from '@virt-table/vanilla/components';

interface Row { id: number; ref: string | VtLinkValue }

VtLink<Row>({
  key: 'ref', title: '参考链接', width: 240,
  editable: true,
  target: '_blank',
  placeholder: '双击添加链接',
  urlLabel: '地址',            // 两栏的标签与占位都可改
  onChange: (v, row) => save(row.id, v),
});
```

**值的形状**：文案与地址存在同一格里。

| 行数据 | 展示 | 说明 |
| --- | --- | --- |
| `{ text: '需求文档', url: 'https://…' }` | `<a>需求文档</a>` | 有地址就是对象 |
| `'待补链接'` | `<button>待补链接</button>` | 只有文案时是**纯字符串**，不是 `{ text, url: '' }` |
| `''` / `null` | `placeholder` | — |
| `{ url: 'https://…' }` | `<a>https://…</a>` | 没文案就拿地址当文案（否则是个看不见的格子） |

写回时按「有没有地址」定形状：有地址写对象，地址被清空则**退回纯字符串**。这一列的值还要被
排序、筛选、框选复制反复消费，能是标量的时候就别变成对象。

**这一支不许配 `href` / `protocol` / `text`**（类型上就拒）：它们是「文案或地址另有来源」的
开关，配了之后面板改完会被它们盖掉 —— 那是一次静默失效，比编译错误难查得多。要用
`protocol: 'mailto'` 之类的糖，就保持这一列只读。

几个要知道的点：

- **触发方式建议 `vtCellEditor({ trigger: 'dblclick' })`**。链接元素常常铺满整格，`click`
  触发时「点链接跳转」与「点单元格进编辑」抢同一次点击。组件为此**只拦 `mousedown` /
  `click`，放 `dblclick` 冒泡过去**；`trigger: 'click'` 下则只有单元格左右两条内边距能进编辑态。
- **地址过协议白名单**（`http` / `https` / `mailto` / `tel` / `ftp` + 相对地址）。名单外的
  （`javascript:`、`data:`，含 `java\tscript:` 这种夹控制字符的变体）按「没有地址」处理，
  渲染成 `<button>` —— 面板里的地址是用户手打的，落到 `<a href>` 上就是一次存储型 XSS。
- **排序**：`sortable: true` 时默认按文案比较（对象值走默认比较等于永远相等，点表头没反应）。
  自己给了 `sortMethod` 就用你的。
- **框选复制**走 `String(row[key])`（核心行为），对象值会复制成 `[object Object]`。需要好看的
  TSV 就别在这一列存地址，或者在 `onChange` 里同时往另一个纯文本列写一份。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `editable` | 切到可编辑支路（面板里分别改文案与地址） |
| `href` / `protocol` / `text` | 只读支路专属，可编辑支路类型上被拒 |
| `target` / `underline` / `onClick` | 两支共通 |
| `textLabel` / `urlLabel` | 可编辑支路的两栏标签 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtlink)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
