# 渲染粒度：表级 / 列级 / 单元格级

一格画什么，由**四层**决定：三层决定它**常态**（没进入编辑时）长什么样，第四层在打开编辑时
叠在上面。先分层，层内再按粒度排 —— 只需要记两句话，而不是一张表。

本页这张表上每个按钮都是一次真实的配置动作 —— 按完看单元格怎么变，再看状态栏里
`resolveCellRender()` 报出来的最终结果。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-cell-render-levels" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/render-levels.ts
:::

## 四层

```
会话层  编辑态 renderEditor —— 可选，需 vtCellEditor；粒度只有 单元格级 > 列级
        浮层挂在滚动容器上，不在这一格的 DOM 里
════════ 打开编辑时盖在下面三层之上 ════════
接管层  ① 合成行（分组行 / 展开行）              整行接管，不进单元格链
        ② 功能列 col.type（tree 除外）           独占单元格
──────────────────────────────────────────────────────────────────
内容层  ③ 单元格级   render → cellType
        ④ 列级       render → cellType
        ⑤ 表级       cellType
        ⑥ 默认       String(row[key])
──────────────────────────────────────────────────────────────────
容器层  tree 缩进/箭头 · mergeKey 的 sticky 内层 · textOverflow
        align / vAlign · cellClass / cellStyle
        —— 不参与竞争，对 ③④⑤⑥ 一律叠加
```

下面三层之间不是「谁赢」，而是「谁包含谁」，连读就是一句话：**谁来画（接管层）→ 画什么
（内容层）→ 怎么装（容器层）**。**会话层**是另一回事 —— 它有开 / 关生命周期、盖在上面，
所以不参与那条优先级链（见[会话层](#会话层-编辑态的独立回落)）。

::: tip 「常态」不等于「只读」
常态只是「没进入编辑时这一格的样子」，与能不能交互无关 —— `VtSwitch` / `VtCheckbox` /
`VtRate` / `VtActions` 的点击与写回全都发生在常态里（它们刻意不提供 `renderEditor`）。
这也是这个词不叫「展示态」的原因。
:::

## 内容层：一条规则

> **粒度越细越优先；同粒度内越具体越优先**（`render` 比 `cellType` 具体）。

注意「单元格级 `cellType`」高于「列级 `render`」：**粒度优先是刻意的** —— 否则给某一格配了
`cellType` 却毫无反应（被列级 `render` 吃掉），无从解释。完整的六档优先级表在
[API · 单元格渲染](/vanilla/api/cell#内容层)。

| 粒度 | 配在哪 | 能给什么 | 本页哪一列 |
| --- | --- | --- | --- |
| **表级** | `options.cellType` | 只有 `cellType`（**刻意没有表级 `render`** —— 那等于所有列画得一样，真实需求是 `cellClass` / `cellStyle`） | 「名称」「描述」两列什么都没配，吃的就是它 |
| **列级** | `col.cellType` / `col.render` / `col.renderEditor`，单元格组件也装在这一级 | 整列统一 | 富文本 / 头像 / 标签是 `col.cellType`；分数是 `col.render`；状态是列级组件 `VtSelect` |
| **单元格级** | `table.setCellRender(rowKey, colKey, cfg)`（批量 `setCellRenders`） | 就这一格，还能**穿透功能列** | 工具栏按钮现场配给第 3 / 5 / 7 行 |

```ts
// 表级：只能在建表时给（切换它要重建表格）
const table = new VirtTable(el, {
  cellType: 'text',                                   // 没配 render / cellType 的列按它渲染
  columns: [
    { key: 'name',  title: '名称', width: 130 },                              // 吃表级
    { key: 'html',  title: '富文本', width: 190, cellType: 'rich-text' },     // 列级 cellType
    { key: 'score', title: '分数', width: 160, render: ({ value }) => `${value} 分` }, // 列级 render
    VtSelect({ key: 'status', title: '状态', width: 150, options: STATUS }),  // 列级组件
  ],
  plugins: [vtCellEditor()],
});

// 单元格级：粒度更细，一律胜出
table.setCellRender('3', 'score', { cellType: 'number' });                 // 赢过列级 render
table.setCellRender('3', 'score', { render: ({ value }) => `${value} 分（这一格自定义）` });
table.setCellRender('3', 'score', null);                                    // 清除 → 回落列级
table.setCellRender('7', 'sel',   asCell(VtTag, { options: LOCK }));        // 穿透功能列
table.setCellRender('5', 'status', asCell(VtTag, { options: STATUS }));     // 覆盖列级组件

table.resolveCellRender('3', 'score');   // → 这一格最终生效的 { render, cellType, renderEditor }
```

### 单元格级配置存在实例里

`setCellRender` 的配置存在**表格实例**上，不写进你的数据对象：

```ts
table.setCellRender('42', 'name', {
  render: ({ value }) => `<b>${value}</b>`,
  renderEditor: ({ row, column }) => makeInput(row, column.key),
});

table.setCellRender('42', 'tag', { cellType: 'option' });   // 也可以只指定内容类型

// 批量：整批写完只刷新一次
table.setCellRenders([
  { rowKey: '1', colKey: 'score', config: { render: ({ value }) => `${value} 分` } },
  { rowKey: '2', colKey: 'score', config: null },   // null = 清除该格配置
]);

table.clearCellRenders('42');   // 清一行
table.clearCellRenders();       // 全清
```

::: tip 为什么不推荐往行数据挂 `_cellRenders`
旧写法 `row._cellRenders = { name: { render } }` **仍然兼容**（优先级低于 `setCellRender`），
但把函数塞进数据对象会污染 `JSON.stringify` / 深拷贝 / 数据 diff；而且在 React / Vue 端
拿不到适配层的 VNode 包装，返回 JSX / VNode 会渲染失败。

需要类型提示时让行类型继承 `VirtTableRowExtras`，它同时声明了 `_treeLevel` / `_groupLevel`
等内核写入的只读字段：

```ts
interface Row extends VirtTableRowExtras<Row> {
  id: number;
  name: string;
}
```
:::

### 没有「行级」

只有单元格级、列级、表级三个粒度。往行数据上挂的 `_cellRenders` **是单元格级的兼容写法**
（键是列 key），不是行级。

「整行都不一样」的需求由**接管层**承担：分组行、展开行（`renderExpandRow`）本来就是整行接管。

## 容器层：一律叠加

`textOverflow`（[省略号 / tooltip](/vanilla/examples/basic/overflow)）、`mergeKey` 的 sticky 内层、
`align` / `vAlign`、`cellClass` / `cellStyle` 对**四种内容来源一律生效**，与内容从哪来无关。

早期版本里 `textOverflow` 与 `mergeKey` 的 sticky 内层只在「没配 `render`」时才装配，配了
`render` 就静默失效 —— 现在不会了，并且有测试守着。

## 会话层：编辑态的独立回落

`renderEditor` **不在**内容层那条链上，它自己一条：**单元格级 > 列级**。

这不是「例外」，是结构使然 —— 编辑内容压根不在这一格的 DOM 里：`vtCellEditor` 打开一层
`.vt-cell-cover` 盖在单元格上方、挂在滚动容器上（不是挂进 `<td>`），自己维护定位。
它有明确的开 / 关生命周期（Esc 撤销、同时只有一个、可 `openCellEditor()` 进入），所以叫**会话**。

**独立回落是双刃剑**。好的一面：支持「只改这一格的常态、编辑照旧」。坏的一面：能配出
「常态是只读胶囊、点开却是列上的下拉」—— 单元格级只给了 `render`，`renderEditor` 就照旧
回落到列级。`renderEditor: undefined` 不算「没有编辑器」，只算「这一级没配」；要真封掉得
显式给一个返回 `null` 的函数。装内置组件一律用 [`asCell()`](#单元格组件不是链上的一档)
（它整对写入），就配不出这种错配。

正反两面在下面的按钮 ⑥ 与 ⑦ 上各有一个。

## 按钮对应的规则

| 按钮 | 动作 | 该看到什么 |
| --- | --- | --- |
| ① | 表级 `text` ⇄ `rich-text`（重建表格） | 「描述」列里的 `<b>重点</b>`：`text` 原样显示、`rich-text` 才加粗。重建后单元格级配置也没了——**它存在表格实例里，不在数据上** |
| ② | 第 3 行分数加单元格级 `cellType: 'number'` | 「90 分」变回「90」：**单元格级 `cellType` 赢过列级 `render`**（粒度优先） |
| ③ | 第 3 行分数加单元格级 `render` | 又变成「90 分（这一格自定义）」：**同粒度内 `render` 比 `cellType` 具体** |
| ④ | 传 `null` 清除 | 回落到列级 `render`，重新显示「90 分」 |
| ⑤ | 第 7 行勾选格穿透 | 勾选框换成一枚「锁」胶囊，同列其他行照旧 |
| ⑥ | 第 5 行状态装 `asCell(VtTag)` | 常态变只读胶囊，但状态栏仍报**有 `renderEditor`**——点开还是列级 `VtSelect` 的下拉 |
| ⑦ | 再给一个返回 `null` 的 `renderEditor` | 这才是真只读：点开什么都不画 |

::: tip `cellType` 与值的形状必须配对
②用的是 `'number'` 而不是 `'option'`：`option` 只认标签字符串或 `{ label, color }`，
给它一个数字会画出**空格子**。同理 `image` 要 URL、`checkbox` 要布尔。取值清单见
[API · 内容类型](/vanilla/api/cell#内容类型-celltype)。
:::

::: warning `resolveCellRender()` 报的是内容层
勾选列在**接管层**独占单元格，所以没配单元格级时它报的是表级兜底的 `cellType`，
而屏幕上仍然是勾选框——两层是叠在一起的，不是同一条链。返回的 `render` 与 `cellType`
最多只有一个有值（它们走同一条内容链）。
:::

::: tip 想看「同一列里每一格都不同」
那是另一页：[单元格独立渲染](./cell-type-render) —— 22 种逐格配置，往下、往右都不重复。
:::

## 单元格组件不是链上的一档

[内置单元格组件](./vt-input)（`VtInput` / `VtSelect` / `VtSwitch` …）交付的是「一格该长什么样
+ 怎么改值」。它们**装在哪一级，就以那一级的身份参与内容层解析**，所以不存在「组件和 `render`
谁赢」这个问题：组件**就是** `render`（外加一个配套的 `renderEditor`）。

- 装在列上（最常见）：把工厂的返回值当列用 —— `columns: [VtSelect({ key, title, width, options })]`。
- 装在单个格子上：`asCell(Component, opts)`。

```ts
import { VtSelect, asCell } from '@virt-table/vanilla/components';

table.setCellRender('42', 'status', asCell(VtSelect, { options: STATUS }));
```

`asCell` 做三件事：

1. **不用编造 `key` / `title` / `width`** —— 真正的列键来自 `setCellRender` 的 `colKey`
   （组件写回走 `ctx.column.key`，从不读 `opts.key`）；
2. **整对写入 `render` + `renderEditor`** —— `renderEditor` 是独立回落的，手写单元格级配置
   很容易只给 `render`，结果这一格展示是进度条、点开却是列上的下拉；
3. **列专属选项在类型上被拒**（`fixed` / `sortable` / `align` …）—— 它们在单元格级本来就会
   被丢弃，不该静默失效。`validator` 是例外，它由组件自己消费，照常生效。

要让 `onChange` / `validator` 的 `row` 有类型，用实例化表达式把行类型传给工厂：

```ts
asCell(VtSelect<Row>, { options: STATUS, onChange: (v, row) => save(row.id, v) });
```

## 速查

| 你想要 | 哪一层 / 哪一级 |
| --- | --- |
| 整表所有列一个默认外观 | 内容层 · 表级 `cellType` |
| 一列都这样画 | 内容层 · 列级 `cellType` / `render` |
| 一列用一个控件（含编辑态） | 内容层 · 列级，装单元格组件 |
| 只有某一格不一样 | 内容层 · 单元格级 |
| 功能列里某一格不要那个控件 | 单元格级**穿透**接管层，见[功能列](../feature-columns/#单元格级可以穿透) |
| 整行接管 | 接管层：分组行 / 展开行 |
| 一列的编辑器 | 会话层 · 列级 `renderEditor` + `vtCellEditor` |
| 只有这一格不能编辑 | 会话层 · 单元格级 `renderEditor` 返回 `null` |

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `options.cellType` | 表级内容类型兜底 | [表格配置](/vanilla/api/table#virttableoptions) |
| `col.render` / `col.cellType` / `col.renderEditor` | 列级三个入口 | [列配置](/vanilla/api/column#virttablecolumn) |
| `setCellRender` / `setCellRenders` / `clearCellRenders` | 单元格级读写 | [单元格渲染](/vanilla/api/cell#单元格级渲染-setcellrender) |
| `resolveCellRender` | 查某格最终生效的内容层配置 | [单元格渲染](/vanilla/api/cell#单元格级渲染-setcellrender) |
| `asCell(Component, opts)` | 把内置组件装到单个格子上 | [单元格组件](/vanilla/api/components#装在单个格子上-ascell) |

> 六档优先级表、`cellType` 取值表、四层的完整定义都在 [API · 单元格渲染](/vanilla/api/cell)。
