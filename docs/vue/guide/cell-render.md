# 单元格渲染

一个格子画什么，不是一条线性的优先级链，而是**分层的**：三层决定它**常态**（没进入编辑时）
长什么样，第四层在打开编辑时叠在上面。先分层，层内再按粒度排 —— 这样你只需要记两句话，
而不是一张表。

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
（内容层）→ 怎么装（容器层）**。**会话层**是另一回事 —— 它有开/关生命周期、盖在上面，
所以不参与上面那条优先级链（见下面「会话层」一节）。

::: tip 「常态」不等于「只读」
常态只是「没进入编辑时这一格的样子」，与能不能交互无关 —— `VtSwitch` / `VtCheckbox` /
`VtRate` / `VtActions` 的点击与写回全都发生在常态里（它们刻意不提供 `renderEditor`）。
这也是这个词不叫「展示态」的原因。
:::

## 内容层：一条规则

> **粒度越细越优先；同粒度内越具体越优先**（`render` 比 `cellType` 具体）。

展开就是：

| 优先级 | 来源 | 配置方式 |
| --- | --- | --- |
| 1 | 单元格级 `render` | `tableRef.value.setCellRender(rowKey, colKey, { render })` |
| 2 | 单元格级 `cellType` | `tableRef.value.setCellRender(rowKey, colKey, { cellType })` |
| 3 | 列级 `render` | `col.render` |
| 4 | 列级 `cellType` | `col.cellType` |
| 5 | 表级 `cellType` | `options.cellType` |
| 6 | 默认取值 | `String(row[col.key])` |

注意第 2 条高于第 3 条：**单元格级 `cellType` 赢过列级 `render`**。粒度优先是刻意的 ——
否则你给某一格配了 `cellType` 却毫无反应（被列级 `render` 吃掉），没法解释。

```vue
<script setup lang="ts">
import { h, ref } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';

const tableRef = ref<InstanceType<typeof VirtTableVue>>();

const columns: VueTableColumn[] = [
  { key: 'name',   title: '名称', width: 160 },                        // 吃表级兜底
  { key: 'status', title: '状态', width: 120, cellType: 'option' },    // ④
  { key: 'score',  title: '评分', width: 100, render: ({ value }) => h('b', `${value} 分`) }, // ③
];

// ⑤ 整表兜底写在 options 里：{ list, itemKey: 'id', estimatedSize: 40, cellType: 'text' }

function markCells() {
  tableRef.value!.setCellRender('42', 'score', { cellType: 'option' }); // ② 改画胶囊，不再走列级 render
  tableRef.value!.setCellRender('43', 'score', { render: () => h('span', '—') }); // ①
}
</script>
```

单元格级的 `render` / `renderEditor` 可以直接返回 VNode —— 挂载与行回收由适配层处理。
（往行数据挂 `_cellRenders` 拿不到这层包装，返回 VNode 会失败，见[没有「行级」](#没有-行级)。）

### 内容类型（`cellType`）

省掉手写 `render` 的常见样式，三个粒度语义完全相同：

| `cellType` | 期望的值 | 渲染成 |
| --- | --- | --- |
| `text` | 任意 | 纯文本（**不解析 HTML**） |
| `number` | 数字 | 纯文本；不做千分位/精度（那是格式化职责） |
| `rich-text` | HTML 字符串 | 按 HTML 插入，**自负安全** |
| `image` | URL 字符串 或 `{ url, alt }` | `<img class="vt-cell-image">`，高度锁在行高内 |
| `option` | 标签字符串 或 `{ label, color }` | 圆角标签，底色由 `color` 经 `color-mix` 派生 |
| `checkbox` | 布尔 | 只读勾选框 |

::: tip 为什么没有表级 `render`
表级 `render` 等于「所有列画得一模一样」，真实需求（整表的外观、类名）是
`cellClass` / `cellStyle` 的职责。所以表级只提供 `cellType`。
:::

## 接管层：功能列与穿透

功能列（`col.type` 为 `index` / `checkbox` / `radio` / `expand` / `drag`）**独占单元格**：
配在这些列上的 `render` / `renderEditor` / `cellType` 会被忽略，并在控制台告警。

`tree` 是唯一例外 —— 它其实属于**容器层**：只画缩进与折叠箭头，内容照常走内容链，
因此也能吃到 `textOverflow`、`cellType`。

**单元格级可以穿透功能列**：

```ts
// 勾选列里，这一行不给勾选框，改画一把锁
tableRef.value!.setCellRender('42', 'sel', { render: () => h('span', '🔒') });
```

为什么只放开单元格级：列级配了 `render` 却又配 `type`，那是**配置写错了**（整列都不要
勾选框，就别配 `type`）；而「就这一行不给勾选 / 序号换成图标」是真实需求，在此之前没有
任何出口。

::: warning 穿透只改 UI，不改选择态
勾选框没画出来，但该行仍在选择作用域里 —— 表头「全选」照样会选中它。要真正禁止选中，
在 `onCheckChange` / `onCheckAll` 里自己挡。
:::

## 容器层：一律叠加

`textOverflow`（省略号 / tooltip）、`mergeKey` 的 sticky 内层、`align` / `vAlign`、
`cellClass` / `cellStyle` 对**四种内容来源一律生效**，与内容从哪来无关。

## 会话层

`renderEditor` **不在**内容层那条链上，它自己一条：**单元格级 > 列级**。

这不是「例外」，是结构使然 —— 编辑内容压根不在这一格的 DOM 里：

```
packages/vanilla/src/plugins/cell-editor.ts
ctx.clientEl.appendChild(overlayEl);   // .vt-cell-cover 挂在滚动容器上，不是挂进 <td>
```

`vtCellEditor` 打开一层 `.vt-cell-cover` 盖在单元格上方、自己维护定位，浮层内容再挂
`.vt-root`。它有明确的开/关生命周期（Esc 撤销、同时只有一个、可 `openCellEditor()` 进入），
所以叫**会话**：它既不属于内容层（不参与那条链），也不属于容器层（不包裹格内内容）。

会话结束后单元格上会留下**激活态**（当前单元格描边）：编辑态一消失就什么痕迹都不剩的话，
用户想不起刚改的是哪一格。这是 `vtCellEditor` 的默认行为，开关是 `vtCellEditor({ activeCell })`
—— 装了 `vtCellSelection` 时默认关，那张表已经有一圈会跟着走的「当前单元格」了。

独立回落是有用的：它支持「只改这一格的常态、编辑照旧」。代价是你可以配出「常态是进度条、
点开却是列上的下拉」这种错配 —— 所以装内置组件请用 `asCell()`（见下面「单元格组件」一节），
它整对写入。

```ts
tableRef.value!.setCellRender('42', 'score', { cellType: 'option' });
// 这一格的常态变了，但编辑器仍是列上那个 renderEditor
```

要看某一格**最终生效**的配置，用 `resolveCellRender(rowKey, colKey)`：返回
`{ render, cellType, renderEditor }`，其中 `render` 与 `cellType` 最多只有一个有值
（它们走同一条内容链）。

## 单元格组件

[内置单元格组件](/vanilla/examples/column/vt-input)（`VtInput` / `VtSelect` / `VtSwitch` …）
交付的是「一格该长什么样 + 怎么改值」。它们产出的是原生 DOM，适配层原样透传，所以
Vue 端可以直接用 —— 从 `@virt-table/vanilla/components` 引入：

```ts
import { VtSelect, asCell } from '@virt-table/vanilla/components';
import '@virt-table/vanilla/components/index.css';

// 装在列上（最常见）
const columns = [VtSelect({ key: 'status', title: '状态', width: 120, options: STATUS })];

// 装在单个格子上
tableRef.value!.setCellRender('42', 'status', asCell(VtSelect, { options: STATUS }));
```

它们**不是优先级链上的一档** —— 装在哪一级，就以那一级的身份参与内容层解析。所以不存在
「组件和 `render` 谁赢」这个问题：组件**就是** `render`（外加一个配套的 `renderEditor`）。

`asCell` 做三件事：不用编造 `key` / `title` / `width`（真正的列键来自 `colKey`）；
整对写入 `render` + `renderEditor`；把列专属选项（`fixed` / `sortable` / `align` …）
在**类型上**拒掉 —— 它们在单元格级本来就会被丢弃，不该静默失效。

## 没有「行级」

只有单元格级、列级、表级三个粒度。往行数据上挂的 `_cellRenders` **是单元格级的兼容写法**
（键是列 key），不是行级。它在 Vue 端尤其不该用：拿不到适配层的 VNode 包装，
返回 VNode 会渲染失败；函数塞进数据对象还会污染 `JSON.stringify` / 深拷贝 / 数据 diff。

「整行都不一样」的需求由**接管层**承担：分组行、展开行（`renderExpandRow`）本来就是整行接管。

## 速查

| 你想要 | 配在哪 |
| --- | --- |
| 整表所有列一个默认外观 | `options.cellType` |
| 一列都这样画 | `col.cellType` / `col.render` |
| 一列用一个控件（含编辑态） | 单元格组件，如 `VtSelect({ … })` |
| 只有某一格不一样 | `setCellRender(rowKey, colKey, { render \| cellType })` |
| 只有某一格用某个控件 | `setCellRender(rowKey, colKey, asCell(VtSelect, { … }))` |
| 功能列里某一格不要那个控件 | 单元格级配置（可穿透） |
| 整行接管 | 分组行 / 展开行 `renderExpandRow` |
| 一列的编辑器 | `col.renderEditor` + `vtCellEditor` 插件 |
