# vtToolbar 工具栏

表格上方一条按钮条，每颗点开一个面板。它是一个**贡献点** —— **自己一颗按钮都没有**，
谁有按钮谁来注册：各面板插件、`vtSearch` / `vtExport`、付费插件，以及使用方自己。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-toolbar" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/toolbar.ts
:::

## 装载

```ts
import { vtToolbar, vtToolbarPanels } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/toolbar.css';
// 面板样式跟着各自的插件走 —— 装了哪个引哪个
import '@virt-table/vanilla/plugins/field-config.css';
import '@virt-table/vanilla/plugins/filter-config.css';
import '@virt-table/vanilla/plugins/group-config.css';
import '@virt-table/vanilla/plugins/sort-config.css';

new VirtTable(el, { list, columns, itemKey: 'id', estimatedSize: 40, plugins: [
  vtToolbar(),
  ...vtToolbarPanels(),             // 四颗面板；只要一颗就写 vtSortConfig()
  // vtToolbar({ bar: false }),     不画按钮条，只提供面板与 API
] });

// bar: false 时按钮由你放，把它当锚点传进来
table.toggleToolbarPanel('sort', myBtn);
```

`bar: false` 是「单独用」的形态：面板还在，按钮放哪儿由你决定。

## 它自己一颗按钮都没有

工具栏只提供**摆放**：一个注册表 + 一套面板基元。**要哪颗按钮就装哪个插件** —— 一条规则，零例外。

```ts
plugins: [vtToolbar(), ...vtToolbarPanels()]   // 四颗面板，一行装齐
plugins: [vtToolbar(), vtSortConfig()]         // 只要排序那一颗
plugins: [vtToolbar()]                         // 空货架（会 warn 一句说明怎么加）
```

`vtToolbarPanels()` 就是那四个插件的一行写法，没有额外行为。要给某个面板传选项传在它里面
（`vtToolbarPanels({ fieldConfig: { canToggleColumn } })`），或者干脆展开成四行显式写。

为什么不做成「工具栏配置里挑几个内置项」：付费甘特的「甘特图配置」按钮核心不可能认识，
所以这条贡献点无论如何要存在；既然存在，让面板也走同一条路才只有一套心智。它还顺带买到两件事 ——
`toolbar.css` 不必 `@import` 全部面板（「只要排序面板」不再吞下筛选管理器那 14KB），
以及每个配置只有一处入口（`canToggleColumn` 不再是工具栏与字段配置两处都能传）。

每个面板都有自己的一页（它们与框架无关，Vue / React 端只是 re-export，用法一个字不差）：
[vtFieldConfig 字段配置](/vanilla/examples/plugins/column-visibility) ·
[vtFilterConfig 高级筛选](/vanilla/examples/plugins/filter-config) ·
[vtGroupConfig 分组配置](/vanilla/examples/plugins/group-config) ·
[vtSortConfig 排序配置](/vanilla/examples/plugins/sort-config) ·
[vtRowHeightConfig 行高](/vanilla/examples/plugins/row-height)（不在 `vtToolbarPanels()` 预设里）

```ts
plugins: [
  vtToolbar(),
  vtFieldConfig({ reorder: false }),   // 这颗「字段配置」换成不带换序的那一档
]
```

还有三个插件会**自己**往工具栏放按钮，它们与工具栏的关系是同一条握手：

```ts
plugins: [vtToolbar(), vtRowHeightConfig(), vtSearch(), vtExport()],
// 七颗：字段配置 / 筛选 / 分组 / 排序 / 行高 / 搜索 / 导出
```

**「工具栏里的搜索」不是另一份实现，就是 `vtSearch`** —— 搜索框、命中高亮、上/下一个都是同一份
代码，差别只在谁来唤出它。所以两个入口是同一个插件的两个选项：

| 写法 | 入口 |
| --- | --- |
| `vtSearch()` | 快捷键 + 工具栏按钮 |
| `vtSearch({ toolbar: false })` | 只有 Ctrl/Cmd+F |
| `vtSearch({ hotkey: false })` | 只有那颗按钮 |

`toolbar` 这个选项**所有会往工具栏放按钮的插件都有**（四个面板 + 行高 + 搜索 + 导出），
语义一致：`false` = 不占那条按钮条的位置，能力照旧。它与 `vtToolbar({ bar: false })` 是同一件事的
两半 —— 那个说「不画按钮条」，这个说「我不上那条按钮条」。

反过来，这四个插件**不装工具栏也能用** —— 那时它们自己开浮层，按钮由你放：

```ts
plugins: [vtFieldConfig()],
// ...
table.toggleFieldConfig(myBtn);
```

## 四个面板都落在核心的查询状态上

| 面板 | 面板里能做什么 | 落到哪 |
| --- | --- | --- |
| 字段配置 | 勾选控制列显隐、拖手柄调列序 | `setColumnVisible()` / `moveColumn()` |
| 筛选 | AND/OR 条件树（就是 `VtFilterBuilder`） | `setState({ filterModel })` |
| 分组 | 多级分组维度 + 每级的排序 | `setGroupConfig()` |
| 排序 | 排序规则列表 | `setState({ sort })` |

所以它与**列头点击排序、列头筛选下拉、`getState()/setState()` 的持久化是同一份状态**：
在面板里排的序，列头上的箭头也会亮；`setState()` 还原一份视图，面板打开就是新值。

有生效内容时按钮上会出现**一个前置的数字**，与标签连成一句读下来 —— 「1 分组」「3 筛选」
（几条条件 / 几级分组 / 几条排序 / 隐藏了几列），同时图标走主色。用户回到界面时第一个问题
往往是「我上次筛了什么、少了哪一列」，所以给的是数量而不只是「动过没动过」。

外观上按钮是**浅色槽里的白色药片**：不画边框（一排各画一圈 1px 读起来像五个独立输入框）、
不画下拉箭头。高度走 `--vt-toolbar-button-height`（默认 `28px`），要改就覆盖这个变量 ——
它刻意不与面板里控件的 `--vt-control-height` 共用一个值。

三条如实说出来的边界：

- **`sortable: false` 的列不进排序候选**：那是使用方明确说过「这列不排序」。
- **表格没开 `sortMode: 'multiple'` 时只允许一条排序规则**，面板不给「添加」并说明原因 ——
  `setState` 在单列模式下会静默截断成第一条。
- **分组候选排除「逐行唯一的列」与日期列**：按名称或开始日期分组会得到一堆只有一行的分组，
  那不是分组，是把表打散。

## 「勾不掉」有两种，别混

| 写法 | 表现 | 什么时候用 |
| --- | --- | --- |
| 列上 `hideable: false` | **压根不出现在面板里** | 这列与用户无关（内部标识、渲染用的辅助列） |
| `vtFieldConfig({ canToggleColumn })`（或 `vtToolbar` 的同名选项） | 出现但**置灰 + 鼠标停上去说明原因** | 有原因不能藏，而用户该知道那个原因 |

核心自己只硬拦一条：**最后一列不许勾掉**（全勾掉会得到一张只有表头的空表，
`setColumnVisible` 不拦这个）。别的约束由知道原因的一方传进来 —— 付费甘特就用它拦「任务列是
甘特的冻结列」（冻结列按含隐藏列的列序挑，藏掉它会让冻结落在一个隐藏列上）。

## 它是一个贡献点

```ts
// 使用方：不写插件也能加按钮，返回值是反注册函数
const off = table.registerToolbarItem({
  key: 'reload',
  label: '刷新',
  side: 'right',          // 靠右那一组
  badge: () => count || null,   // 每次刷新都现读
  onClick: () => reload(),
});

// 写插件的人：在自己的 onMounted 里握手
const toolbar = ctx.inject<ToolbarService>('toolbar');
toolbar?.register({ key: 'mine', label: '我的', panel: (p) => { p.ui.title('我的面板'); } });
```

两型按钮：**动作型**（给 `onClick`，点一下就干活）与**面板型**（给 `panel`，点开浮层）。
面板内容用 `p.ui` 那套基元画（`title` / `row` / `divider` / `hint` / `select` / `switch` /
`segmented` / `ruleRow` / `addButton` / `footer` / `button`）—— 各自 `createElement` 的话，
行距与控件外观很快就会不一致，而它们是同一个下拉里的几张脸。

**这是可选依赖，且与插件声明顺序无关**：服务表在所有插件间共享，而 `onMounted` 排在全部
`setup` 之后。拿不到就什么都不做（各自照旧提供命令式 API）。核心自己的 `vtSearch` /
`vtExport` 就是这么接进来的，付费的甘特（「甘特图配置」，靠右）与撤销/重做也一样。

## 按钮条挂在哪

解析顺序：`mount` 选项 → 别的插件通过 `provide('toolbarSlot', () => el)` 提供的槽 →
自动在 `.vt-root` 外面包一层纵向 flex（按钮条在上、表格吃掉剩下的高度）。

中间那条是给「表格外面还有别的东西」的插件用的：付费甘特把外壳顶部那条槽交出去，
于是按钮条**横跨任务面板与时间轴**，而不是只盖住左表。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `toggleToolbarPanel(key, anchor?)` | 开合某一项的面板 | [插件机制](/vanilla/api/plugins) |
| `registerToolbarItem(item)` | 加一项，返回反注册函数 | [插件机制](/vanilla/api/plugins) |
| `refreshToolbar()` | 重算徽标与禁用态 | [插件机制](/vanilla/api/plugins) |
| `setGroupConfig()` / `getGroupConfig()` | 「分组」面板落地的地方 | [实例方法](/vanilla/api/instance) |
| `getState()` / `setState()` | 「筛选」「排序」落地的地方 | [状态持久化](/vanilla/examples/advanced/state-persist) |
| `locale.toolbar` | 全部内置项文案 | [国际化](/vanilla/examples/advanced/i18n) |
