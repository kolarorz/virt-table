# 单元格独立渲染

用 `setCellRenders()` 给**单个格子**指定内容与编辑器，同一列的不同行可以各不相同。
本例把内容层的四种来源摆在同一张表里，好对照优先级。

```ts
// 数据保持干净，渲染配置存在表格实例里
table.setCellRenders([
  { rowKey: '0', colKey: 'name',   config: { render: ({ value }) => `<b>${value}</b>` } },
  { rowKey: '0', colKey: 'score',  config: { renderEditor: ({ row, column }) => makeInput(row, column.key) } },
  { rowKey: '1', colKey: 'tag',    config: { cellType: 'option' } },                     // 只指定内容类型
  { rowKey: '2', colKey: 'status', config: asCell(VtSelect, { options: STATUS }) },       // 装一个单元格组件
  { rowKey: '7', colKey: 'sel',    config: { render: () => '🔒' } },                     // 穿透功能列
]);
```

优先级是**粒度越细越优先、同粒度内越具体越优先**：

| 本例里的哪一列 | 配在哪 | 表现 |
| --- | --- | --- |
| 姓名 / 分数 / 状态 / 进度 / 备注 | 单元格级 `render` | 按行不同（每 5/3/4/2/6 行一条） |
| 分类（3n+1 行） | 单元格级 `cellType: 'option'` | 画成胶囊，**赢过该列的 `render`** |
| 分类（其余行） | 列级 `render` | 画成 `[A 类]` |
| 头像 | 列级 `cellType: 'image'` | 值即内容，不用写 render |
| 状态（4n+2 行） | `asCell(VtSelect, …)` | 装了单元格组件，点它弹选择面板 |
| 勾选列（7n 行） | 单元格级 `render`（**穿透功能列**） | 画成 🔒，同列其他行仍是勾选框 |

「分类」那两行是**粒度优先**的实证：列上明明配了 `render`，但某几格的 `cellType` 仍然胜出 ——
否则你给一格配了 `cellType` 却毫无反应，无从解释。完整模型见
[指南 · 单元格渲染](/vanilla/guide/cell-render)。

::: warning 穿透只改 UI，不改选择态
🔒 那几行没有勾选框，但它们仍在选择作用域里 —— 表头「全选」照样会选中。要真正禁止选中，
在 `onCheckChange` / `onCheckAll` 里自己挡。
:::

::: tip 旧写法仍兼容
往行数据挂 `_cellRenders` 依然可用（优先级低于 `setCellRender`），但不推荐：函数进了数据对象会
污染 `JSON.stringify` / 深拷贝 / diff，React / Vue 端也拿不到 VNode 包装。
:::

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  type: 'checkbox';  // 功能列（单元格级配置可穿透）
  cellType: 'text' | 'number' | 'rich-text' | 'image' | 'option' | 'checkbox';  // 内容类型
  render: (ctx) => string | HTMLElement;  // 自定义渲染
  renderEditor: (ctx) => HTMLElement | null | void;  // 编辑器渲染
}

type CellRenderConfig = {
  render?: (ctx) => string | HTMLElement;  // 这一格的内容
  cellType?: CellContentType;  // 这一格的内容类型（与列级同形）
  renderEditor?: (ctx) => HTMLElement | null | void;  // 这一格的编辑器
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
  textOverflow: 'ellipsis' | 'tooltip';  // 全局文本溢出处理
}
```

## 示例

<PlaygroundHost framework="vanilla" example-id="table-cell-type-render" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/cell-type-render.ts
:::