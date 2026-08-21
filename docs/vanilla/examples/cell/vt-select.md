# VtSelect 下拉选择

下拉选择列 —— **「从候选集里选」的唯一入口**。两根轴都是参数：元数（`multiple`）× 展示形态（`display: 'text' | 'tag'`）。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-vt-select" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/cell/vt-select.ts
:::

## 说明

编辑态是**自绘面板**（不是原生 `<select>`：后者的下拉列表由操作系统渲染，吃不到 `--vt-*` 令牌，不跟暗色主题）。`↑↓` 移动、`Enter` 选中、`Esc` 关闭；清除「×」在控件右侧、**默认就有**（面板里只能换选另一项，没有「选回空」这一项 —— 不给等于「这一列填过一次就填不回空」），激活后按 `Delete` / `Backspace` 同效，必填列传 `clearable: false` 关掉。走 `renderEditor`，**必须装 `vtCellEditor` 插件**。

四个预设是同一个内核（面板、搜索、键盘、清除、`+N` 折叠都来自内部的 `createEnumEditor`）：

| | 纯文本 | 彩色胶囊 | 头像胶囊 |
| --- | --- | --- | --- |
| 单值 | `VtSelect` | `VtSelect({ display: 'tag' })` | [`VtPerson`](./vt-person) |
| 多值 | `VtSelect({ multiple })` | `VtSelect({ display: 'tag', multiple })` | `VtPerson({ multiple })` |

**元数与样式是参数，不是组件名**：曾经「单值彩色标签」叫 `VtTag({ editable: true })`、「多值彩色标签」叫 `VtMultiSelect`，同一件事有了多种拼法。`display` 用**判别联合**声明，所以 `display: 'text'` 时传 `variant` / `maxCount` 会直接编译报错（那些只对胶囊有意义）。

两个例外留作独立组件，因为它们不只是「样式」：

| 组件 | 为什么不并进 `VtSelect` |
| --- | --- |
| [`VtTag`](./vt-tag) | 它**没有候选集**：值本身就是内容（`options` 只是「值→文案+配色」的字典，可不给），配色能按行算。这一半职责与「选择」无关，和 `VtProgress` / `VtLink` 同类。胶囊外观与 `VtSelect({display:'tag'})` 共用 `createTagChip`，所以两者必然长得一样 |
| [`VtPerson`](./vt-person) | 头像 fallback 与首字哈希色、悬停名片（`renderCard` / `email` / `phone` / `fields`）、`avatarOnly`、副标题参与搜索 —— 一整套额外交互与数据契约（8 个专属选项），并进去会让一个组件挂着三套互斥选项 |

面板、搜索、`↑↓`/`Enter`、清除 `×`、`+N` 折叠、值形状（`valueType` / `separator`）都来自同一份
实现（`_enum.ts` 的 `createEnumEditor`），所以这些能力在 `VtSelect` 与 `VtPerson` 上**行为一致**；
各预设只决定「值形状 / 面板项长什么样 / 常态一项长什么样」。

[`VtCascader`](./vt-cascader) 不在这一家（树形面板是分栏的，只共享锚点 / 清除 × / 浮层基元），
[`VtAutocomplete`](./vt-autocomplete) 也不在（值不受候选集约束）。

## 常见配方

| 要做的事 | 怎么写 |
| --- | --- |
| 只读的状态标签列 | `VtTag({ key, options })`（`options` 可不给，值即文案） |
| 按行动态上色的标签 | `VtTag({ key, color: (row) => … })` |
| 可选的状态标签（单值） | `VtSelect({ key, options, display: 'tag' })` |
| 多值标签 + 折叠 `+N` | `VtSelect({ key, options, display: 'tag', multiple: true, maxCount: 2 })` |
| 只读的多值标签 | `VtSelect({ …, display: 'tag', multiple: true, disabled: true })` |
| 候选很多要搜索 | `VtSelect({ …, searchable: true })` |
| 多值存逗号分隔字符串 | `VtSelect({ …, multiple: true, valueType: 'string' })` |
| 运行时切换展示形态 | 重建列定义再 `table.setColumns(...)` —— 下面 demo 里的「🏷️ 一键切换标签样式」就是这么做的，行数据不动 |

两处命名上的取舍：

- **语义色叫 `variant` 而不是 `type`**：`type` 在列上已经是**功能列**（`checkbox` / `index` /
  `tree` …），而组件 options 就是从 `VirtTableColumn` 派生的，复用这个名字会直接顶掉功能列字段。
- **标签胶囊复用 `cellType: 'option'`** 的那套派生色（`--vt-cell-option-color` + `color-mix`），
  `VtTag` 与 `VtSelect({display:'tag'})` 共用 `createTagChip` 一份实现 —— 否则换主题要改两处。

## 自绘浮层挂在哪

`VtSelect` / `VtCascader` / `VtAutocomplete` / `VtPerson` / `VtTextarea` 的浮层挂在 **`.vt-client`** 上 ——
**与 `vtCellEditor` 的编辑浮层 `.vt-cell-cover` 同一层、排在它之后、用同一套定位公式**
（不是 `document.body`，不是 `.vt-root`，也不是塞在编辑浮层里面）。原因有四条，缺一条都不行：

1. `--vt-*` 只声明在 `.vt-root` / `.vt-fb` 上，`body` 的子节点继承不到，整批 `var()` 会静默失效；
2. `.vt-cell-cover` 的高度**就是单元格高度**（且 `> * { height: 100% }`），在 40px 的格子里
   塞下拉 / 文本域要么被压回一行、要么撑破那个盒子 —— 所以是它的**兄弟**而不是子节点；
3. 浮层带 `data-vt-popup` 标记，`vtCellEditor` 的 outside-click 认这个属性放行，
   否则点一下下拉项就把编辑器连同锚点一起关掉；
4. `.vt-client` 就是横向的原生 scrollport —— 浮层与 `.vt-cell-cover` 由同一个 scrollport 搬运，
   **横滚时两者逐像素同步**（写进 `style.left` 的是内容坐标，含 `scrollLeft`）。挂在 `.vt-root`
   上时浮层不在 scrollport 内，只能逐帧追单元格，与编辑浮层之间必然差一帧。

浮层会随锚点移动自动跟随（纵向滚动由 JS 掌管、列宽变化、排序筛选换行），锚点离开 DOM
（滚动回收、编辑关闭）时自毁。

在浮层上滚滚轮 / 触摸滑动**只滚浮层自己的列表**，不会滚到底下的表格上（`wheel` / `touchstart` /
`touchmove` 在浮层根节点被截住，否则表格的纵向输入接管会把面板的原生滚动 `preventDefault` 掉，
长名单直接滚不动）。滚到列表尽头也不会续传给表格。

两种定位模式的对照表见 [API · 自绘浮层挂在哪](/vanilla/api/components#自绘浮层挂在哪)。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `options` | 候选集（必填） |
| `multiple` / `valueType` / `separator` | 元数与值形状 |
| `display` / `variant` / `color` / `maxCount` | 展示形态（判别联合） |
| `searchable` / `showActions` / `emptyText` | 面板行为 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtselect)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
