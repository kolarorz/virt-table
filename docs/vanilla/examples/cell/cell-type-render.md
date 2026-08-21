# 单元格独立渲染

用 `setCellRenders()` 给**单个格子**指定内容与编辑器 —— 这一页里 **A~E 五列的每一格都不一样**：
列定义里只有 `key` / `title` / `width`，**一个渲染字段都没有**，每一格长什么样、点开是什么控件，
全由那一格自己的 `render` / `renderEditor` / `cellType` 决定。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-cell-type-render" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/cell-type-render.ts
:::

## 说明

分配规则是 `kinds[(行号 + 列号) % 22]`：往下走每格都换、往右走也每格都换，屏幕上是一条斜向花纹。
**22 种逐格配置覆盖了全部 18 个内置单元格组件**（`VtSelect` 单值 / 多值各算一种）**+ 3 个核心内容类型**
（`cellType: 'option' / 'image' / 'checkbox'`），全程没有一行自己拼的 HTML。

```ts
/** 一种 kind = 一份配置 + 一个形状匹配的值 */
const kinds = [
  { config: asCell(VtInput, { maxLength: 24 }),          value: (i) => `文本 ${i}` },
  { config: asCell(VtProgress, { max: 100, thresholds }), value: (i) => (i * 7) % 101 },
  { config: asCell(VtDateRangePicker, {}),                value: (i) => [dayStr(a), dayStr(b)] },
  { config: { cellType: 'option' },                       value: (i) => ({ label: `枚举 ${i}`, color: '#2563eb' }) },
  // …22 种
];

// 行数据：每一格的值形状由它自己的 kind 决定
row[key] = kinds[(i + colIndex) % kinds.length].value(i);

// 逐格登记，一次写完只刷新一次
table.setCellRenders(
  rows.flatMap((_, i) =>
    COLS.map((colKey, c) => ({ rowKey: String(i), colKey, config: kinds[(i + c) % kinds.length].config })),
  ),
);
```

三个实现上的关键点：

1. **配置与值必须配对**。一格装 `VtDatePicker`，那格的值就得是 `'YYYY-MM-DD'`；装 `VtDateRangePicker`
   就得是 `['YYYY-MM-DD', 'YYYY-MM-DD']`；装 `cellType: 'option'` 就得自己带 `{ label, color }`
   ——内容类型只按值画，没有列上的字典可查。所以示例把「配置」和「造值」绑在同一个对象里，
   加一种 kind 不会漏掉另一半。
2. **配置对象可以共享**。`asCell()` 的产物里没有任何行状态（组件写回走 `ctx.column.key`，从不读
   `opts.key`），所以 2.5 万个格子共用 21 个配置对象，不是造 2.5 万份。
3. **`asCell()` 整对写入 `render` + `renderEditor`**。逐格手写配置最容易只给 `render`，配出
   「展示是进度条、点开却是列上的下拉」；走工厂就不可能配错。列专属选项（`key` / `width` /
   `sortable` …）在类型上被拒——真正的列键来自 `setCellRender` 的 `colKey`。

优先级是**粒度越细越优先、同粒度内越具体越优先**：

| 本例里的哪一格 | 配在哪 | 表现 |
| --- | --- | --- |
| A~E 每一格 | 单元格级 `render` + `renderEditor`（`asCell(…)`） | 逐格不同：文本 / 数字 / 胶囊 / 进度条 / 人员 / 星级 / 日期 / 区间 / 时间 / 级联 / 建议 / 开关 / 勾选 / 多行 / 链接 / 按钮组 |
| A~E 里的三格 | 单元格级 `cellType` | `'option'` / `'image'` / `'checkbox'` ——内容类型不带编辑器，值自己带内容 |
| 状态列（3n+1 行） | 单元格级 `cellType: 'option'` | **赢过列级 `VtTag` 的 render** |
| 状态列（4n+2 行） | 单元格级 `asCell(VtSelect, { display: 'tag' })` | 同一份胶囊外观，点它弹选择面板 |
| 状态列（其余行） | 列级 `VtTag` | 只读胶囊，点了没反应 |
| 勾选列（7n 行） | 单元格级 `asCell(VtTag, …)`（**穿透功能列**） | 画成「锁」胶囊，同列其他行仍是勾选框 |
| 表级 | 没配（`options.cellType` 留空） | 兜底是 `'text'` |

最后一列「状态（列级兜底）」是**粒度优先**的对照：列上明明配了 `VtTag`，3n+1 行的 `cellType` 仍然
胜出——而且它显示的是原始值 `active` 而不是「活跃」，因为 `cellType` 只按内容类型画，拿不到列上
那份字典。抢得过，但抢过去之后内容得自己带。完整模型见
[API · 单元格级](/vanilla/api/cell)。

::: warning 穿透只改 UI，不改选择态
「锁」那几行没有勾选框，但它们仍在选择作用域里 —— 表头「全选」照样会选中。要真正禁止选中，
在 `onCheckChange` / `onCheckAll` 里自己挡。
:::

::: tip 旧写法仍兼容
往行数据挂 `_cellRenders` 依然可用（优先级低于 `setCellRender`），但不推荐：函数进了数据对象会
污染 `JSON.stringify` / 深拷贝 / diff，React / Vue 端也拿不到 VNode 包装。
:::

::: tip 想先看三个粒度各自怎么配
那是另一页：[渲染粒度：表级 / 列级 / 单元格级](/vanilla/examples/cell/render-levels) —— 每个按钮一次配置动作，现场看回落。
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `setCellRender(rowKey, colKey, config \| null)` | 给单独一格配 `render` / `cellType` / `renderEditor` | [单元格渲染](/vanilla/api/cell#单元格级渲染-setcellrender) |
| `setCellRenders(entries)` | 批量，整批只刷新一次 | [单元格渲染](/vanilla/api/cell#单元格级渲染-setcellrender) |
| `cellType` | 六种内容类型与期望的值形状 | [单元格渲染](/vanilla/api/cell#内容类型-celltype) |
| `asCell(Component, opts)` | 把内置组件装到单个格子上 | [单元格组件](/vanilla/api/components#装在单个格子上-ascell) |

优先级（单元格级 > 列级 > 表级）与穿透功能列见[渲染粒度](/vanilla/examples/cell/render-levels)。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
