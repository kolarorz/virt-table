# 插件机制

内置插件清单、按需引入与样式、以及怎么自己写一个。插件注入的实例方法在三端 `ref` 上自动透出。

可选的 UI / 交互层以插件形式装载，未引入的插件代码可被 tree-shake。核心能力（虚拟化、固定列、合并单元格、表头/表尾渲染、数据管线）不做插件。

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtContextMenu } from '@virt-table/vanilla/plugins';

new VirtTable(el, {
  columns,
  plugins: [
    vtContextMenu((ctx) => [
      { label: `删除第 ${ctx.rowIndex + 1} 行`, action: () => remove(ctx.row) },
      { divider: true, label: '导出', action: () => table.exportCsv() },
    ]),
  ],
});
```

内置插件：

| 插件 | 说明 | 注入的实例方法 |
| --- | --- | --- |
| `vtContextMenu(provider)` | 右键菜单，见 [示例](/vanilla/examples/plugins/context-menu) | `hideContextMenu()` |
| `vtExport(options?)` | 导出 CSV/Excel + 打印，兼工具栏上的「导出」按钮，见 [示例](/vanilla/examples/plugins/export)。`toolbar: false` 只留 API | `exportCsv()` / `exportExcel()` / `print()` |
| `vtClipboard(options?)` | 选区复制/粘贴（`requires: vtCellSelection`），见 [示例](/vanilla/examples/plugins/clipboard) | — |
| `vtCellSelection(options?)` | 单元格区域框选 + 边缘自动滚动，见 [示例](/vanilla/examples/plugins/cell-selection)。`clearOnOutside`（默认 `true`）点到单元格以外就清空选区 —— 与核心的 `clearActiveCellOnOutside` 同一条判断，两者要一起开关 | `getCellSelection()` / `setCellSelection(range)` / `clearCellSelection()` |
| `vtKeyboardNav()` | 键盘导航（`requires: vtCellSelection`），见 [示例](/vanilla/examples/plugins/keyboard) | — |
| `vtCellEditor(options?)` | 单元格编辑浮层，见 [示例](/vanilla/examples/plugins/cells-render)。编辑态按 `rowKey` + `colKey` 归属：被编辑的行滚出渲染窗口只是**隐藏**浮层，滚回来带着未提交的输入原样显形；关闭只发生在点到别处或按 Esc。选项 `trigger: 'click' \| 'dblclick'`、`chrome?: boolean`（浮层是否画外观，用第三方组件时设 `false`，见[编辑浮层的外观归属](./cell#编辑浮层的外观归属)）、`activeCell?: boolean`（点开一格时同时打上激活态描边，默认开，装了 `vtCellSelection` 时默认关，见[激活态](./cell#激活态)） | `openCellEditor(row, col)` / `closeCellEditor()` / `isCellEditing()` |
| `vtColumnFilter(options?)` | 列头筛选下拉，见 [示例](/vanilla/examples/plugins/filter) | `openColumnFilter(colKey)` / `closeColumnFilter()` |
| `vtColumnMenu(options?)` | **列头菜单**：每列表头一颗 ☰，点开是这一列的动作清单（排序 / 筛选 / 冻结 / 隐藏 / 自适应列宽 / 按此列分组），见 [示例](/vanilla/examples/plugins/column-menu)。菜单里的「筛选」**不自己画面板**，而是让 `vtColumnFilter` 把它那份开在菜单按钮上 —— 没装它、或这一列没配筛选时那一项**不显示**（而不是点了没反应）。选项 `items`（只留哪几组，顺序按给的来）/ `texts` / `disabled`（哪些列不挂 ☰）/ `extraItems`（追加自定义条目）/ `autoWidthRange` | `openColumnMenu(colKey, anchor?)` / `closeColumnMenu()` / `isColumnMenuOpen(colKey?)` |
| `vtImport(options?)` | **基础导入**：CSV / TSV / xlsx 文件 → 表格的行，兼工具栏上的「导入」按钮，见 [示例](/vanilla/examples/plugins/import)。认格式**先看字节头再看扩展名**（xlsx 就是 zip）；默认只换行不换列，`autoColumns: true` 才按表头推断并 `setColumns()`；`transform` 是落表前唯一那道校验口（返回 `false` 取消）。解析层单独可用，见下方 `sheet-import` | `importFile(src?, opts?)` / `readSheets(src?, opts?)` |
| `vtColumnDrag(options?)` | 列拖拽排序，见 [示例](/vanilla/examples/plugins/column-drag) | — |
| `vtRowDrag(options?)` | 行拖拽排序，**支持树形与分组**（跨层级落点 / 成为子节点 / 落进分组），见 [示例](/vanilla/examples/plugins/row-drag) | — |
| `vtSearch(options?)` | Ctrl/Cmd+F 搜索 + 工具栏上的「搜索」按钮（**同一份实现，两个入口**），见 [示例](/vanilla/examples/plugins/search)。`toolbar: false` 只留快捷键、`hotkey: false` 只留按钮 | `openSearch()` / `closeSearch()` / `search(term)` / `nextMatch()` / `prevMatch()` / `getSearchMatches()` |
| `vtFieldConfig(options?)` | **字段配置**面板：勾选显隐 + 拖手柄换序，见 [示例](/vanilla/examples/plugins/column-visibility)。选项 `reorder`（给不给换序）/ `canToggleColumn`（拦某列的显隐并给出原因）/ `texts` | `toggleFieldConfig(anchor?)` / `openFieldConfig(anchor?)` / `closeFieldConfig()` / `isFieldConfigOpen()` |
| `vtFilterConfig(options?)` | **高级筛选**面板：AND/OR 条件树（`VtFilterBuilder`），落到 `setState({ filterModel })`，见 [示例](/vanilla/examples/plugins/filter-config) | `toggleFilterConfig(anchor?)` / `openFilterConfig(anchor?)` / `closeFilterConfig()` / `isFilterConfigOpen()` |
| `vtGroupConfig(options?)` | **分组**面板：多级分组维度 + 每级排序，落到 `setGroupConfig()`，见 [示例](/vanilla/examples/plugins/group-config) | `toggleGroupConfig(anchor?)` / `openGroupConfig(anchor?)` / `closeGroupConfig()` / `isGroupConfigOpen()` |
| `vtSortConfig(options?)` | **排序**面板：排序规则列表，落到 `setState({ sort })`，见 [示例](/vanilla/examples/plugins/sort-config) | `toggleSortConfig(anchor?)` / `openSortConfig(anchor?)` / `closeSortConfig()` / `isSortConfigOpen()` |
| `vtRowHeightConfig(options?)` | **行高设置**：低 / 中 / 高三档，一档同时换密度类与虚拟化行高（30 / 40 / 50）。**只在 `fixedSize: true` 下开放**（不定高时行高由内容决定），装了 `vtToolbar` 会多出一颗「行高」按钮 —— 与上面四个不同，工具栏**不自带**这一项。见 [示例](/vanilla/examples/plugins/row-height)。选项 `value`（初始档）/ `sizes`（每档行高）/ `onChange`（持久化用）/ `toolbar` / `texts` | `setRowHeightLevel(level)` / `getRowHeightLevel()` / `toggleRowHeightConfig(anchor?)` / `openRowHeightConfig(anchor?)` / `closeRowHeightConfig()` / `isRowHeightConfigOpen()` |
| `vtToolbar(options?)` | **一条按钮条 + 一个贡献点，自己一颗按钮都没有**：要哪颗就装哪个插件（上面那五个面板 / `vtSearch` / `vtExport` / 付费包 / `table.registerToolbarItem()`），见 [示例](/vanilla/examples/plugins/toolbar)。`bar: false` 不画按钮条、只提供 `toggleToolbarPanel(key, anchor)` |
| `vtToolbarPanels(options?)` | **预设**：`[vtFieldConfig(), vtFilterConfig(), vtGroupConfig(), vtSortConfig()]` 的一行写法 —— `plugins: [vtToolbar(), ...vtToolbarPanels()]`。要给某个面板传选项就传在这里（`{ fieldConfig: { canToggleColumn } }`），别用了预设再单独装一个同名插件（会撞 key） | — | `toggleToolbarPanel(key, anchor?)` / `openToolbarPanel(key, anchor?)` / `closeToolbarPanel()` / `isToolbarPanelOpen(key?)` / `registerToolbarItem(item)` / `refreshToolbar()` |
| `vtAIQuery(options)` | 自然语言查询：一句话 → 筛选/排序/列显隐，见 [示例](/vanilla/examples/ai/ai-query)。**不发请求、不绑厂商**，调模型由 `resolve` 回调实现 | `askAITable(text)` / `applyAIQuery(query)` / `undoAIQuery()` / `getAITableSchema()` / `getAIPromptContext()` / `getAIToolSchema()` / `openAIQueryBar()` / `closeAIQueryBar()` / `toggleAIQueryBar()` |
| `vtAIStream(options?)` | 流式表格：攒帧落地 + stick-to-bottom + 首批自动推断列，见 [示例](/vanilla/examples/ai/ai-stream) | `consumeAIStream(source, opts?)` / `startAIStream()` / `pushAIStreamRows(rows)` / `endAIStream()` / `abortAIStream(err?)` / `getAIStreamState()` / `isAIStreamFollowingBottom()` / `setAIStreamFollowBottom(on)` |
| `vtAIColumn(options)` | AI 列：值由模型从同行其他列算出，**只为渲染窗口内的行发起调用**，支持流式逐段写入，见 [示例](/vanilla/examples/ai/ai-column) | `computeAIColumn(rowKeys?)` / `recomputeAIColumn(rowKey)` / `clearAIColumn(rowKey?)` / `getAIColumnState(rowKey)` / `getAIColumnValues()` / `getAIColumnStats()` |

插件注入的方法在类型上通过 `VirtTablePluginApi` 声明（class / interface 声明合并），未装载对应插件时运行时不存在。

### `vtRowDrag(options?)`

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `wholeRow` | `boolean` | `false` | 整行可拖（表体任意位置起拖）；默认只有 `type:'drag'` 手柄列能发起。三条门槛：**触屏不启用**（表体单指手势归滚动，触屏仍走手柄）、避开输入框/按钮/链接这类交互内容、**与 `vtCellSelection` 不宜同装**（一次按下要么拖行要么框选） |
| `crossLevel` | `boolean` | `true` | 允许跨层级。`false` 退化成同级拖拽：只在同一父级的兄弟之间换位，落点只有上/下两档 |
| `hoverExpandDelay` | `number` | `500` | 悬停在折叠节点中段多久（ms）自动展开；`0` 关闭 |
| `canDrag` | `(row) => boolean` | — | 这一行能不能被拖起来 |
| `allowDropInto` | `(parent, row) => boolean` | — | 能不能落进这个父级。`parent` 是新父级（数据行 / 分组行），落到根层时为 `null`；返回 `false` 连指示线都不画 |

落点由核心 [`moveRowTo()`](./instance#行拖拽) 落数据，插件只负责手势与指示线。

指示线按层分段（走过的层级淡色 + 目标层级起点的箭头），拖带子节点的行会**先把它收起**（否则自己的子树会把可放区域切碎），拖完保持收起。

## 按需引入与样式

插件**不从主入口 `@virt-table/vanilla` 导出**——放主入口的话插件代码与样式都会被算进核心产物。
两种引法产物完全一致，按喜好选：

```ts
import { vtSearch, vtExport } from '@virt-table/vanilla/plugins';  // barrel
import { vtSearch } from '@virt-table/vanilla/plugins/search';     // 精确到单个插件
```

带独立样式的插件需要额外引一份 CSS（都只依赖 `core.css` 的 `--vt-*` 变量，与引入顺序无关）：

| 插件 | 需引入的 CSS |
| --- | --- |
| `vtContextMenu` | `@virt-table/vanilla/plugins/context-menu.css` |
| `vtSearch` | `@virt-table/vanilla/plugins/search.css` |
| `vtCellSelection` / `vtKeyboardNav` | `@virt-table/vanilla/plugins/cell-selection.css` |
| `vtCellEditor` | `@virt-table/vanilla/plugins/cell-editor.css` |
| `vtColumnFilter` | `@virt-table/vanilla/plugins/column-filter.css` |
| `vtColumnMenu` | `@virt-table/vanilla/plugins/column-menu.css` |
| `vtFieldConfig` | `@virt-table/vanilla/plugins/field-config.css` |
| `vtFilterConfig` | `@virt-table/vanilla/plugins/filter-config.css`（已内联筛选管理器的样式，不必再引 `vt-filter-builder.css`） |
| `vtGroupConfig` | `@virt-table/vanilla/plugins/group-config.css` |
| `vtSortConfig` | `@virt-table/vanilla/plugins/sort-config.css` |
| `vtRowHeightConfig` | `@virt-table/vanilla/plugins/row-height-config.css` |
| `vtToolbar` | `@virt-table/vanilla/plugins/toolbar.css`（只有按钮条 + 面板基元。**面板样式跟着各自的插件走** —— 装了哪个面板引哪个，所以「只要排序面板」不必吞下筛选管理器那 14KB） |
| `vtColumnDrag` / `vtRowDrag` | `@virt-table/vanilla/plugins/drag-sort.css` |
| `vtAIQuery` | `@virt-table/vanilla/plugins/ai-query.css` |
| `vtAIStream` | `@virt-table/vanilla/plugins/ai-stream.css` |
| `vtAIColumn` | `@virt-table/vanilla/plugins/ai-column.css` |
| `vtExport` / `vtClipboard` / `vtImport` | 无（纯命令式，不渲染 UI；工具栏那颗按钮的样式在 `toolbar.css` 里） |

嫌麻烦就引全量 `@virt-table/vanilla/style.css`（核心 + 全部插件 + 内置组件）。

内置单元格组件（`VtInput` / `VtTag` / `VtActions` / `VtFilterBuilder` …）同理走
`@virt-table/vanilla/components`，样式为 `components/index.css` 与
`components/vt-filter-builder.css`。完整清单见[单元格组件](./components)。

## 工具栏与面板的关系

`vtToolbar` **一颗按钮都不认识**，它只提供摆放：一个注册表 + 一套面板基元。谁有按钮谁来
`register()`（各面板插件、`vtSearch` / `vtExport`、付费的甘特配置与撤销/重做、以及使用方自己）。

```ts
plugins: [vtToolbar(), ...vtToolbarPanels()]        // 四颗面板，一行装齐
plugins: [vtToolbar(), vtSortConfig()]              // 只要排序那一颗
plugins: [vtSortConfig()]                           // 不要工具栏：面板自己开浮层
plugins: [vtToolbar()]                              // 空货架（会 warn 一句说明怎么加）
```

为什么不做成「工具栏配置里挑几个内置项」：付费甘特的「甘特图配置」按钮**核心不可能认识**，
所以贡献点无论如何要存在；既然存在，让内置面板也走同一条路才只有一套心智。`vtSearch` 是同一个
道理的另一面 —— 搜索框、命中高亮、快捷键是一份能力，工具栏那颗按钮只是它的入口之一，
塞不进工具栏的配置项里。

每个面板插件都有 `toolbar: false`（不占那条按钮条的位置，能力照旧），与 `vtToolbar({ bar: false })`
是同一件事的两半。

## 工具栏的外观

按钮是**浅色槽里的白色药片**：无边框、无下拉箭头，生效数量作为**前置数字**与标签连读
（「1 分组」），有生效内容时图标走主色。

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `--vt-toolbar-button-height` | `28px` | 按钮高度。**刻意不与 `--vt-control-height` 共用** —— 后者是面板里下拉/分段那一档，工具栏常驻在界面上，宽松一档才不局促 |

其余颜色、圆角、字号全部取自核心的 `--vt-*`（`--vt-header-bg` 是槽、`--vt-bg` 是按钮、
`--vt-color-primary` 是生效数量），所以暗色主题与自定义主题自动跟随。

## 行高与密度

核心自带三档**密度** token（改的是单元格内边距与字号），而行高在虚拟化里由 `estimatedSize`
决定 —— **两者必须一起换**：

| 档 | 加在 `.vt-root`（或任意祖先）上的类 | 对应 `estimatedSize` |
| --- | --- | --- |
| 低 | `vt-root--compact` / `vt-compact` | `30` |
| 中（默认） | — | `40` |
| 高 | `vt-root--loose` / `vt-loose` | `50` |

三个数是「行高 = `--vt-line-height` + `--vt-cell-padding-y` × 2 + 边框」在该档下的解，由
`css-contract.test.ts` 钉住。只加类不改行高 → 行内容变矮但每行仍占旧高度，行之间露白；
只改行高不加类 → 内容撑不开或被裁。

自己接这两件事就写 `estimatedSize` + 类名；要一个现成的界面就装
[`vtRowHeightConfig`](#插件清单)，它把两件事绑在一起，并且只在 `fixedSize: true` 下开放
（不定高模式下每行多高由内容决定，`estimatedSize` 只是未测量行的估算值）。

运行时改行高的底层入口是实例方法 `setRowHeight(px)` / `getRowHeight()` —— 它同时更新
使用方那份 `estimatedSize`、虚拟化账本的热快照，并重算总高（漏任何一处都只在滚动时才看出来）。

## 键盘导航

由 `vtKeyboardNav` 插件提供，**依赖 `vtCellSelection`**（焦点位置就是选区）：
`plugins: [vtCellSelection(), vtKeyboardNav()]`。同时装了 `vtCellEditor` 才响应 F2。

| 按键 | 行为 |
| --- | --- |
| 方向键 | 移动焦点 |
| Tab / Shift+Tab | 左右移动 |
| Enter | 下移一行 |
| Home / End | 跳到行首 / 行尾列 |
| **Ctrl（或 Cmd）+ Home / End** | 跳到表首 / 表尾单元格 |
| **PageUp / PageDown** | 上翻 / 下翻一屏 |
| Shift + 上述任意导航键（除 Tab / Enter） | 保持锚点扩展选区 |
| F2 | 进入编辑（需 `vtCellEditor`） |

翻一屏 = 视口能放下多少行，按 `clientHeight / estimatedSize` 估。动态行高下是近似值——差一两行无妨，`scrollToCell` 会把目标行滚进视口。Mac 上多数键盘没有独立 Home/End 键，所以 `Cmd` 组合与 `Ctrl` 等效。

## 导出 / 打印

由 `vtExport` 插件提供：`plugins: [vtExport()]`。

| 方法                                | 说明                                 |
| ----------------------------------- | ------------------------------------ |
| `exportCsv(opts?: ExportOptions)`   | 导出 CSV（带 UTF-8 BOM）             |
| `exportExcel(opts?: ExportOptions)` | 导出 Excel（HTML 表格 .xls）         |
| `print(opts?: { title? })`          | 打印全表（新窗口 + 内联样式）        |
| column `exportValue?: (row) => string \| number` | 覆盖导出取值            |

`ExportOptions`：`{ filename?, scope?: 'all' | 'selection', includeHeader?, delimiter? }`。
`scope: 'selection'` 需同时装载 `vtCellSelection` 插件（未装载时会告警并返回空结果）。

## 写一个插件

```ts
import type { VirtTablePlugin } from '@virt-table/vanilla';

function myPlugin(): VirtTablePlugin {
  return {
    name: 'myPlugin',          // 唯一名，供 requires 依赖与告警定位
    requires: [],              // 依赖的插件名；缺失时本插件被跳过并告警
    setup(ctx) {
      // ctx.rootEl / clientEl / tableEl / theadEl / tbodyEl / tfootEl —— 核心创建的 DOM
      // ctx.getOptions() / getColumns() / getList() / getRowData(key) / getLocale() —— 状态快照
      // ctx.table —— 宿主公共方法白名单（scrollToCell / forceUpdate / setList …）
      ctx.on('onCellRendered', (td, col, row, rowIndex) => { /* … */ });
      ctx.provide('myService', { /* 供其它插件 inject */ });

      return {
        api: { myCommand: () => { /* 自动挂到实例，三端 ref 也自动透出 */ } },
        destroy: () => { /* 解绑事件、移除自建 DOM */ },
      };
    },
  };
}
```

可用钩子（`ctx.on`）：

| 钩子 | 时机 |
| --- | --- |
| `onMounted` | 全部插件装载完、首帧渲染就绪 |
| `onRowCreated(tr, row, rowIndex)` | 行 DOM 新建（虚拟滚动复用行时不触发） |
| `onCellRendered(td, col, row, rowIndex)` | 数据单元格填充完成 |
| `onHeaderCellRendered(th, col, headerRow)` | 表头单元格填充完成 |
| `onRendered()` | 一帧渲染完成。行 DOM 与位置都已就位，适合重绘依赖行几何的浮层 |
| `onDataChanged(list)` | 数据管线重建（换数据/排序/筛选/折叠展开） |
| `onCheckedRowsChanged(keys)` | 单行勾选、全选、`setCheckedRows` 或 `clearCheckedRows` 后；保留用户原有勾选回调 |
| `onScroll(scrollLeft, offset)` | 横向或纵向滚动 |
| `onColumnsChanged()` | 列结构变化（`setColumns` / 列显隐） |
| `onRowHeightChanged(size)` | `setRowHeight` 后 |
| `onLocaleChanged(locale)` | `setLocale` 后 |
| `transformSourceRows(rows) → rows` | **唯一有返回值的一条**，见下 |

`ctx.table.getSourceRowKeys()` 返回源行主键的字符串副本，包含树子节点和筛选/分页隐藏行，适合追加导入前检查冲突。

### `transformSourceRows`：在管线最前面换掉整份数据

其余钩子都是「通知」，这一条是「变换」。它插在数据管线的**最前面**：

```
_originList → transformSourceRows → 筛选 → 排序 → 分页 → 聚合 → 结构展开 → 提交
```

所以变换出来的行会**照常**享受筛选、排序、树形折叠、合计行 —— 这也是透视表能直接复用
「树 + 分组表头」的原因（见[企业版 · 透视表](/vanilla/enterprise/pivot)）。

```ts
ctx.on('transformSourceRows', (rows) => rows.filter((r) => !r.deleted));
```

约定：

- 返回的是**新数组**，别就地改 `rows`（那是使用方的数组）
- 抛异常 → 这一次变换被跳过（用原始数据继续）并告警，表格不会白屏
- 返回非数组 → 同样跳过并告警；返回**空数组是合法的**（真的一行都不剩）
- 注册了它的插件在装载完成后会触发一次强制重建 —— 否则首帧是插件装载**之前**算的

### 插件提供的服务（`ctx.inject`）

| 服务名 | 谁提供 | 拿到什么 |
| --- | --- | --- |
| `cellSelection` | `vtCellSelection` | `getSelection()` / `setSelection()` / `clearSelection()` / `buildSelectionRows()` / `refresh()` / `subscribe(fn)` |
| `toolbar` | `vtToolbar` | `register(item)`（返回退订函数）/ 面板开关 |
| `columnFilter` | `vtColumnFilter` | `open(colKey, anchor?)` / `close()` / `canFilter(colKey)` |

::: tip 跟着选区刷要用 `subscribe`，不要用 `onChange`
`vtCellSelection({ onChange })` 与表格 `options.onCellSelectionChange` 都只有**一个**槽位，
而且前者顶掉后者 —— 那是留给使用方的。插件要跟着选区更新（状态栏的选区聚合、跟着选区走的
图表）一律走 `service.subscribe(fn)`：它是多消费者的，返回退订函数，某个订阅者抛异常也
只是告警一次、不会连带让框选失灵。
:::

约定与边界：

- 插件只能通过 `ctx` 触达宿主，拿不到 `VirtTable` 私有成员。
- `onRowCreated` / `onCellRendered` / `onHeaderCellRendered` 在渲染热路径上；**无插件注册时核心零开销**，注册后请勿在回调里做 DOM 查询或布局读取。
- 插件间协作用 `provide` / `inject`，并在 `requires` 里声明依赖——运行时会按依赖自动拓扑排序，成环时环内插件全部跳过并告警。
- 插件 API 不得覆盖核心方法或其它插件的同名 API（会被拒绝并告警）。
- 卸载按安装逆序进行（依赖方先走），单个插件抛错不影响其余插件。
- 插件自带样式各成一份文件（如 `plugins/context-menu.css`），依赖核心 `core.css` 提供的 `--vt-*` 变量与 `vt-pop-in` keyframes；见上方「按需引入与样式」。
