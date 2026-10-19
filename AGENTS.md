# AGENTS.md — virt-table 开发上下文

> 本文件为 AI Agent / 后续开发者提供项目全景与功能上下文。阅读本文即可快速定位代码、理解架构、明确已实现能力与待补齐能力。

## 1. 项目定位

`virt-table` 是一套**高性能虚拟滚动表格**，核心卖点是**行 + 列双向虚拟化**，可承载十万级数据流畅滚动。提供框架无关的 Vanilla 实现，并封装出 React / Vue 组件。

- 语言：TypeScript（ESM，`"type": "module"`）
- 包管理：pnpm workspace（`pnpm@9.15.2`）
- 构建：Vite（库模式，多入口 ESM + CJS，另加一轮 UMD；见 §3.2）；文档站：VitePress
- 测试：Vitest。纯逻辑用默认 node 环境（`merge` / `pipeline` / `summary` / `export` / `filter-model` / `header-group` / `locale` / `pagination` / `plugin` / `remote` / `internal/tooltip`）；DOM 层用 `happy-dom`，**按文件开启**（`// @vitest-environment happy-dom` docblock），见 §5.1

## 2. 仓库结构

```
virt-table/
├─ packages/               # 发布包（真正的源码）
│  ├─ vanilla/             # @virt-table/vanilla —— 核心实现（3200+ 行）
│  │  └─ src/
│  │     ├─ index.ts       # VirtTable 主类：所有表格逻辑
│  │     ├─ merge.ts       # 合并单元格算法（含 merge.test.ts 1600+ 行测试）
│  │     ├─ header-group.ts # 多级分组表头/表尾（列树 → 网格 + 横向虚拟化计划）
│  │     ├─ spreadsheet.ts # 电子表格模式：单元格类型 / 剪贴板序列化
│  │     ├─ plugin.ts      # 插件契约 + PluginRuntime（含 plugin.test.ts）
│  │     ├─ index.css      # 核心样式 → 产物 dist/core.css（可选层样式各自成文件）
│  │     ├─ umd.ts         # 仅 UMD 构建用的全量入口（不进 exports）
│  │     ├─ scrollbar.ts   # 自绘滚动条的**公开子路径**入口（付费包 gantt 的双 pane 复用它）
│  │     ├─ plugins/       # 插件：可选 UI/交互层，各自带 css，入口 /plugins
│  │     │  ├─ index.ts                # barrel：@virt-table/vanilla/plugins
│  │     │  ├─ _panel.css              # 通用面板样式（面板外壳/条目），被多方 CSS @import 内联
│  │     │  ├─ _panel-ui.css           # 面板基元样式，被工具栏与四个面板插件 @import 内联
│  │     │  ├─ context-menu.ts / .css   # vtContextMenu
│  │     │  ├─ export.ts               # vtExport（导出 CSV/Excel + 打印，无 CSS）
│  │     │  ├─ clipboard.ts            # vtClipboard（选区复制/粘贴，无 CSS）
│  │     │  ├─ search.ts / search.css   # vtSearch（Ctrl/Cmd+F）
│  │     │  ├─ field-config.ts / .css   # vtFieldConfig（字段配置：列显隐 + 拖手柄换序）
│  │     │  ├─ filter-config.ts / .css  # vtFilterConfig（高级筛选面板 = VtFilterBuilder）
│  │     │  ├─ group-config.ts / .css   # vtGroupConfig（分组面板）
│  │     │  ├─ sort-config.ts / .css    # vtSortConfig（排序面板）
│  │     │  ├─ row-height-config.ts / .css # vtRowHeightConfig（行高三档，工具栏不自带）
│  │     │  ├─ toolbar.ts / .css        # vtToolbar（按钮条 + 贡献点，自带上面四项）
│  │     │  ├─ cell-selection.ts / .css # vtCellSelection（框选，provide cellSelection）
│  │     │  ├─ keyboard-nav.ts         # vtKeyboardNav（requires cellSelection，无 CSS）
│  │     │  ├─ cell-editor.ts / .css    # vtCellEditor（编辑浮层，provide cellEditor）
│  │     │  ├─ column-filter.ts / .css  # vtColumnFilter（列头筛选下拉）
│  │     │  └─ drag-sort.ts / .css      # vtColumnDrag + vtRowDrag（行拖拽支持树形/分组，见 §7.24）
│  │     ├─ internal/      # 多方共享的手势/滚动/面板基元（不对外导出）
│  │     │  ├─ panel-ui.ts             # 面板基元 createPanelUi（工具栏与四个面板插件共用）
│  │     │  ├─ panel-popup.ts          # 面板的独立浮层壳（不装工具栏时那半边）
│  │     │  ├─ panel-columns.ts        # 分组/排序的候选列推断（两个插件共用）
│  │     │  ├─ drag.ts                 # startDrag / swallowNextClick（resize + 两个拖拽插件）
│  │     │  ├─ auto-scroll.ts          # 边缘自动滚动（框选 + 行拖拽）
│  │     │  └─ tooltip.ts / .test.ts   # textOverflow:'tooltip' 的浮层（定位是纯函数，有单测）
│  │     └─ components/    # 内置单元格组件（工厂函数，见 §7.14 / §7.17），入口 /components
│  │        ├─ index.ts                # barrel：@virt-table/vanilla/components
│  │        ├─ shared.ts               # 公共类型 + commitValue / stopCellInterference / 锁高容器
│  │        ├─ _popup.ts               # 自绘浮层基元（挂 .vt-client + data-vt-popup，见 §7.14）
│  │        ├─ 编辑态：vt-input / vt-number-input / vt-textarea / vt-select /
│  │        │          vt-multi-select / vt-cascader / vt-autocomplete /
│  │        │          vt-date-picker / vt-date-range-picker / vt-time-picker
│  │        ├─ 直接可点：vt-checkbox / vt-switch / vt-rate / vt-actions
│  │        ├─ 纯展示：vt-tag / vt-progress / vt-link
│  │        ├─ _image-viewer.ts / .css      # 图片查看器实现（CSS 由下面两处 @import）
│  │        ├─ image-viewer.ts              # ↑ 的**公开子路径**入口（付费包 floating-image 复用它，见 §7.23）
│  │        ├─ vt-filter-builder.ts / .css  # 单独成入口（CSS 416 行）
│  │        ├─ components.css          # .vt-comp-* 轻 DOM 外观（@import 共享 _panel.css）
│  │        └─ components-contract.test.ts / components.dom.test.ts
│  │     ├─ class-contract.test.ts  # JS 写出的 class ↔ CSS 选择器（见 §5.3）
│  ├─ react/               # @virt-table/react —— 薄封装（273 行）
│  └─ vue/                 # @virt-table/vue —— 薄封装（252 行）
├─ docs/                   # VitePress 文档站 + 三端 playground（apps/{react,vue,vanilla}）
│  ├─ vanilla|react|vue/   # 各端 guide / examples / api 文档（顶栏合成一个「文档 Docs」入口）
│  ├─ demos/               # 经典案例（ag-grid 风格），无框架前缀，只有 vanilla 一份实现
│  └─ apps/vanilla/src/demos/  # 案例本体 + index.ts 注册表（新增案例只改这一处）
├─ package.json            # workspace 根，脚本入口
└─ tsconfig.base.json
```

> ⚠️ **注意**：README 中描述的 `packages/core`、`packages/dom` 目录**当前不存在**。纵向虚拟滚动内核来自**外部依赖 `@virt-list/core`**（见 `node_modules/@virt-list/core`），不在本仓库维护。本仓库只维护 `vanilla / react / vue` 三个包。
>
> 该依赖**从 npm 安装**（`^0.0.6`，声明在根 `package.json` 与 `packages/vanilla/package.json`），不再是指向兄弟仓库的 `link:`。要联调上游改动，用 `pnpm overrides` 或临时 `pnpm link`，别把 `link:` 写回 `package.json`。

## 3. 架构分层

```
┌──────────────────────────────────────────────┐
│         React / Vue 适配层 (薄封装)            │  packages/{react,vue}/src/index.ts
│  VNode/JSX ↔ DOM 桥接、生命周期、列转换         │  依赖 react-dom createRoot / vue render
├──────────────────────────────────────────────┤
│         插件层（可选，按需引入）                │  packages/vanilla/src/plugins/*
│  14 个插件：框选/键盘/编辑/筛选/拖拽/搜索/…      │  契约在 src/plugin.ts
├──────────────────────────────────────────────┤
│         VirtTable (vanilla) —— 核心            │  packages/vanilla/src/index.ts
│  列管理 | 固定列 | 横向虚拟化 | 合并单元格      │
│  树形/分组/展开 | 排序 | 筛选谓词 | 列宽拖拽     │
│  多级表头/表尾 | 单元格几何 | 列/行重排          │
├──────────────────────────────────────────────┤
│         VirtListCore (外部 @virt-list/core)    │  node_modules
│  纵向虚拟滚动引擎（框架无关，不操作 DOM）        │
└──────────────────────────────────────────────┘
```

**关键设计原则**：
- 所有 2D 表格逻辑集中在 vanilla 层，React/Vue **不各自重复实现**，仅做框架 VNode → DOM 挂载与回收（行被虚拟滚动回收时清理框架组件树，见 `onRowRemoved`）。
- `VirtListCore` 只负责一维纵向窗口计算（`ListState`：`itemsTotalSize / leadingSize / inViewBegin / renderBegin / renderEnd` 等）。
- 横向列虚拟化由 vanilla 自己实现（`_calcColRange` / `_buildColPrefixSums` / `_onHScroll` / `colBuffer`）。

**DOM 结构**（简化）：

```
.vt-root
  ├─ .vt-client (overflow-x:auto; overflow-y:hidden; tabindex=0)
  │    └─ .vt-table       position:relative + top 残差 —— 只剩 tbody，虚拟滚动每帧改它
  ├─ .vt-header          absolute top：独立 <table> + colgroup + thead（含置顶固定行）
  │                      账本槽位 dataset.id="stickyHeader"
  ├─ .vt-footer          absolute bottom：独立 <table> + colgroup + tfoot（含置底固定行）
  │                      账本槽位 dataset.id="stickyFooter"
  ├─ .virt-scrollbar--vertical     自绘竖条（来自 @virt-list/vanilla）
  └─ .virt-scrollbar--horizontal   自绘横条
```

表头/表尾**刻意不在 body table 里**：`<table>` 是整体布局上下文，tbody 每帧变化会让 thead 一起失效、重新光栅化，主线程忙时就是整条表头闪白（实测 41% → 0%）。三份 colgroup 由 `_rebuildColgroup()` 同步。详见 §7.12。

滚动模型见 §7.13：**纵向**位置归 JS（`.vt-skeleton` 那个撑滚动高度的占位块已删除），**横向**保留原生 scrollport。

### 3.1 插件机制

目的：把「可选的 UI / 交互层」从 5900 行的 `VirtTable` 主类里搬出去，实现按需引入与 tree-shaking。契约在 `plugin.ts`（`VirtTablePlugin` / `PluginContext` / `PluginHooks` / `PluginRuntime`），有 `plugin.test.ts` 覆盖。

**边界**（别搞混）：
- **核心不做插件**：行/列双向虚拟化、固定列、合并单元格、thead/tfoot 渲染（含多级分组）、行 DOM 池、数据管线 `_rebuildData`、loading/empty/theme/locale/ARIA、列宽拖拽 `_startResize`。这些互相耦合且人人都要。
- **插件化的判定标准**：有清晰的 setup/destroy 边界，且依赖面能收敛进 `PluginContext`。

**接线点**（新增插件时只碰这三处）：
- 装载：`index.ts` 的 `_setupPlugins()`（在 `_buildDOM()` 末尾调用），只读 `options.plugins`；
- 卸载：`destroy()` 里 `this._pluginRuntime?.destroy()`（逆序，插件自己不用管顺序）；
- 钩子派发：`onMounted`（构造函数末尾）/ `onRowCreated`（`_patch` 新建行分支）/ `onCellRendered`（`_applyCellContent` 包装层）/ `onHeaderCellRendered`（`_applyHeaderContent` 包装层）/ **`onRendered`（`_patch` 末尾，整帧渲染完成——选区/焦点框靠它重绘）** / `onDataChanged`（`_rebuildData`）/ `onScroll`（`_onHScroll`，在早返回**之前**）/ `onColumnsChanged`（`setColumns`）/ `onLocaleChanged`（`setLocale`）。

**约定**：
- `_applyCellContent` / `_applyHeaderContent` 是**包装层**，真实逻辑在 `_applyCellContentInner` / `_applyHeaderContentInner`——因为 Inner 里对功能列有多处早返回，只有在包装层收口才能保证插件收到每个单元格的通知。改渲染逻辑请改 Inner。
- 三个热路径钩子由 `PluginRuntime.hasRowHooks / hasCellHooks / hasHeaderCellHooks` 保护，**无插件注册时零开销**。
- 插件 API 走 `PluginHandle.api` 自动合并到实例，三端 ref 用 Proxy 自动透出（`packages/{react,vue}/src/index.ts` 的 `withPluginApi`），**不要再逐个手写转发**。
- **不给插件配 option 糖**。包未发布，没有兼容负担；双通道会让 `VirtTableOptions` 随插件数量膨胀、每个能力多一条实现与文档路径，抵消插件化的收益。能力入口只有 `plugins`。
- 插件 API 的类型走声明合并：vanilla 在 `index.ts` 的 `VirtTablePluginApi` + `export interface VirtTable<T> extends VirtTablePluginApi {}`；React 在 `packages/react/src/index.ts` 的同名 interface（被 `VirtTableRef` 继承）。运行时由 `Object.assign` 注入，核心里**没有**任何空壳转发方法。
- **插件只从 `@virt-table/vanilla/plugins` 导出，主入口不 re-export**（内置组件同理走 `/components`）。主入口带着它们的话，插件代码与各自的 CSS 都会落进核心 chunk，子路径 exports 就白加了。`VirtTablePluginApi` 里要用到的 `ExportOptions` / `SearchMatch` 用 `import type` 引，不产生运行时引用。
- **拖拽类手势一律走 `internal/drag.ts` 的 `startDrag`（Pointer Events），并给发起元素设 `touch-action`**。少了 `touch-action` 触屏上完全不工作：浏览器决定滚动后就不再派发 move，而 `preventDefault()` 对 `pointermove` 拦不住滚动。粒度见 §7.3。
- 插件样式独立成 `plugins/<name>.css`，只写具体规则，`--vt-*` 变量与 `vt-pop-in` keyframes 仍由核心 `index.css`（产物 `core.css`）提供。
- **「点到单元格以外就收起当前状态」只有一份判断**：`internal/outside-cell.ts` 的
  `isOutsidePointer(e, tbodyEl)`，核心的激活态（`clearActiveCellOnOutside`，默认开）与
  `vtCellSelection` 的选区（`clearOnOutside`，默认开）共用它。界内 = 本表格的单元格（换格不是
  离开，且**必须排除** —— document 监听在冒泡链末端，不排就成了「先设置再清掉」）、编辑浮层
  `.vt-cell-cover`、任何 `[data-vt-popup]`、右键与中键。**挂 `document` 而不是 `.vt-root`**：
  「别处」经常不在 root 里 —— 付费甘特的时间轴 pane 与 root 是兄弟节点，工具栏按钮条也在
  root 外面，而那两处恰恰最常点。用户报的原始现象是「甘特里点开一格，去点时间轴，描边还亮着」。
- **「点到外面就关掉」一律听 `pointerdown`，不许听 `mousedown`**（`events-contract.test.ts` 守着）。`vtCellSelection` 的拖选起手在 pointerdown 里 `preventDefault()`，而那会连带取消「派发兼容 mouse 事件」—— 装了框选的表格里**表体内根本不存在 mousedown**（CDP 实测点单元格：`pointerdown 1 / mousedown 0 / click 1`）。听 mousedown 的浮层/菜单/面板点表格里的格子就关不掉，理由与实测见 §7.3。元素级的 mousedown（浮层内部的选项、按钮、拖拽把手）不受这条约束。
- **所有浮层一律 `ctx.rootEl.appendChild`，不要挂 `document.body`**。`--vt-*` 只声明在 `.vt-root` / `.vt-fb` 上，body 的子节点继承不到，整批 `var()` 声明会静默失效（拖拽 ghost 曾踩过：实测退化成「透明底 + 16px 黑字」，暗色也不跟随）。`position: fixed` 挂在 root 里依然按视口定位，且不被 root 的 `overflow: hidden` 裁掉（无 transform 之类的祖先），所以挂进去不损失任何东西。唯一例外是 `export.ts` 里那个临时 `<a download>`，它不需要样式。
- **被多方复用的 CSS 放 `plugins/_panel.css`，用 CSS `@import` 引而不是 JS import**：`.vt-filter-panel` / `.vt-filter-list` / `.vt-filter-item` 被 `vtColumnFilter`、`vtFieldConfig`、`VtFilterBuilder` 三方共用；面板基元（`.vt-toolbar-panel-*`）同理放 `plugins/_panel-ui.css`，被 `vtToolbar` 与四个面板插件各自 `@import`。走 JS import 会被 Rollup 提成 hash 命名的公共 chunk，用户没法引；`@import` 在构建时内联，每个插件的 CSS 产物自包含。唯一例外是 `.vt-filter-checkbox`——它与核心勾选框逗号共用同一套规则，留在 `index.css` §7。

**已迁移（14 个）**：`vtContextMenu` / `vtExport` / `vtClipboard` / `vtSearch` / `vtFieldConfig` / `vtFilterConfig` / `vtGroupConfig` / `vtSortConfig` / `vtCellSelection` / `vtKeyboardNav` / `vtCellEditor` / `vtColumnFilter` / `vtColumnDrag` / `vtRowDrag`。

**插件依赖图**（`requires` 硬依赖 / `inject` 软依赖）：
```
vtCellSelection ──provide('cellSelection')──┬─→ vtClipboard      (requires)
                                            ├─→ vtKeyboardNav    (requires)
                                            ├─→ vtExport         (inject，仅 scope:'selection')
                                            └─→ vtContextMenu    (inject，仅 ctx.selection 字段)
vtCellEditor ────provide('cellEditor')──────→ vtKeyboardNav      (inject，仅 F2)
vtToolbar ───────provide('toolbar')─────────┬─→ vtRowHeightConfig (inject，没有就自己开浮层)
                                            ├─→ vtFieldConfig     (inject，没有就自己开浮层)
                                            ├─→ vtFilterConfig   (同上)
                                            ├─→ vtGroupConfig    (同上)
                                            ├─→ vtSortConfig     (同上)
                                            ├─→ vtSearch         (inject，加一颗「搜索」)
                                            ├─→ vtExport         (inject，加一颗「导出」)
                                            └─→ 付费的甘特配置 / 撤销·重做
```
四个面板插件与工具栏是**双向可选**的：没装工具栏它们自己开浮层，没装它们工具栏也照样自带那四项
（`toolbar.ts` 静态 import 它们的项工厂）。所以那条箭头是「谁来开这张面板」，不是「谁依赖谁」。

**不再迁移**：分页条（查询状态耦合 + UI 太薄 + 行业无先例）、服务端取数/无限滚动（51 处接线，是**数据源策略**不是 UI 层，需另设「行模型扩展点」，参考 AG Grid 的行模型模块）。理由详见 README。

**两条边界经验**（迁移时先照这两条判断）：
1. **查询状态留核心，UI 进插件**。搜索词进 `RemoteQuery.search` 参与服务端取数，所以 `_searchTerm` + `setSearchTerm()/getSearchTerm()` 留在核心，`vtSearch` 只管搜索框、命中高亮与跳转。筛选同理（谓词在 `pipeline.ts`，下拉 UI 待迁）。
2. **多插件共享的能力：分清「状态」与「计算」**。状态归插件并 `provide`，依赖核心私有数据的计算留核心并挂 `VirtTableHost`。
   - 框选：选区状态 + overlay 在插件；`getSelectionRect` / `expandSelectionForMerges` / `cellFromPoint` 留核心（依赖列宽前缀和、固定列偏移、`_merges`、`_rowDataMap`）。
   - 拖拽：手势 + ghost + 指示线在插件；`moveColumn` / `moveRow` / `canReorderRows` 留核心（依赖列树、`_originList`、数据管线）。
3. **纯手势/工具类基元抽到 `internal/`**，不放插件也不放核心：`internal/drag.ts` 被列宽 resize（核心）与两个拖拽插件共用，`internal/auto-scroll.ts` 被框选与行拖拽共用。判断标准是「跨越核心与插件边界的复用」。
4. **不提供逐格 `spanMethod`**（el-table / vxe 那种每格回调返回 `[rowspan, colspan]`）。它们能那么做是因为不虚拟化。这里两条路都不成立：全量求值 O(行×列) 次回调（50 万行 × 10 列 = 500 万次，秒级）；只对窗口求值则拿不到窗口外的段起点，结果是错的。真实需求基本都是「按某个值成段」，用 `mergeKey` 表达；任意几何用静态 `merges`。
5. **开关移除，回调保留**。`enableCellSelection` / `enableKeyboardNav` / `columnDraggable` / `rowDraggable` / `cellEditTrigger` 这类开关随插件移除（装载即启用，触发方式进插件配置）；`onCellSelectionChange` / `onColumnOrderChange` / `onRowOrderChange` / `onFilterChange` 这类**回调留在 options**（插件用 `ctx.getOptions()` 读，插件配置优先）。

### 3.2 构建与入口布局

`@virt-table/vanilla` 是多入口包。改构建前先看清这几处，它们互相牵制：

| 文件 | 职责 |
| --- | --- |
| `vite.config.ts` | ESM + CJS 多入口：`index`、`plugins/*`（按目录自动枚举）、`components/index`、`components/vt-filter-builder`。`cssCodeSplit: true` + `cssPerEntry()` 插件把 CSS 产物按入口命名 |
| `vite.config.umd.ts` | UMD 全量单文件（`src/umd.ts` 入口），`cssCodeSplit: false` 顺带产出全量 `style.css`。UMD 只能单入口，必须独立一轮构建（`emptyOutDir: false`） |
| `package.json` | `sideEffects: ["**/*.css"]` + `exports` 子路径 |
| `tsconfig.build.json` | 只出 `.d.ts`，目录结构镜像 `src/`，所以子路径 types 天然对齐 |

坑位记录：

- **`exports` 里 `./plugins/*.css` 必须显式写在 `./plugins/*` 之前**（Node 按「`*` 前缀等长则后缀更长者优先」排序）。少了它，`plugins/search.css` 会被 `./plugins/*` 匹配成 `dist/plugins/search.css.js`。
- **Vite 给拆分 CSS 命名时只取 chunk 文件名部分**，于是全平铺在 dist 根、且 `src/index.ts` 与 `src/components/index.ts` 撞成 `index.css`/`index2.css`。`assetFileNames` 回调拿不到 chunk 信息，只能在 `generateBundle` 里按 `chunk.viteMetadata.importedCss` 重命名（`cssPerEntry()`）。
- **`output` 写成数组（每格式一份），不要用 `lib.formats` + 单个 `output`**。多入口会产生公共 chunk，而 `chunkFileNames` 只有一份，CJS chunk 会落成 `.js`；包是 `"type": "module"`，Node 就按 ESM 解析它（Node ≥22.7 有 CJS 回退兜着，18/20 直接 `exports is not defined`）。数组形式下 `entryFileNames` / `chunkFileNames` 各自带对的扩展名。
- **别 external `@virt-list/core` / `lodash-es`**。都是 ESM-only，`@virt-list/core` 的 exports 没有 require 条件、内部还有无扩展名相对引用，external 出去 `dist/index.cjs` 直接 `ERR_PACKAGE_PATH_NOT_EXPORTED`。实测打进来也不吃亏（使用方 Rollup 照样摇掉没用的 lodash）。
- **别给 `plugins/index.ts` 加聚合 CSS**。`sideEffects: ["**/*.css"]` 会让那个 CSS import 无法被摇掉，`import { vtExport } from '.../plugins'` 就会拖进全部插件样式。全量样式的入口是 UMD 构建产出的 `style.css`。
- 三端 playground / 文档站的 `resolve.alias` 必须用**数组 + 正则**：对象形式是前缀匹配，`@virt-table/vanilla/plugins` 会被替换成 `.../src/index.ts/plugins`。

## 4. 已实现功能清单（截至当前）

### 基础
- 行虚拟滚动 + 列虚拟滚动（双向）、缓冲区（`buffer/bufferTop/bufferBottom/colBuffer`）
- 固定行高模式（`fixedSize`，跳过 ResizeObserver）/ 动态行高（默认，`estimatedSize` 预估）
- 固定列（左/右 `fixed: 'left'|'right'`，带阴影 `.vt-fixed-shadow`）
- 边框 `border` / 斑马纹 `stripe` / 无表头 `showHeader` / 空状态 `emptyText`
- 序号列 / 复选框列（`type: 'index'|'checkbox'`）
- **单元格内容分层模型**（接管层 / 内容层 / 容器层 + 叠在上面的会话层，见 §7.17）
  - 内容层三个粒度都接受 `render` 与 `cellType`：单元格级（`setCellRender`）/ 列级 / 表级（`options.cellType`，只有 cellType）
  - 排序规则一条：粒度越细越优先，同粒度内 `render` 比 `cellType` 具体。解析唯一实现 `_resolveCellContent`
  - 单元格级配置**可穿透功能列**（「这一行不给勾选框」）；列级撞功能列仍告警忽略
  - `renderEditor` 不在这条链上，独立回落（单元格级 > 列级）
- 对齐（水平 `align` + 垂直 `vAlign`，表头/表尾独立配置）
- 文本溢出 `textOverflow`（全局 + 列级覆盖）、换行
  - `'ellipsis'` 只裁 / `'tooltip'` 裁 + 内置浮层（`internal/tooltip.ts`）
  - **`'title'` 已移除，别再加回来**：实测渲染与悬停都没有性能优势（10 万格 48.4 vs 48.3ms），却延迟不可控、不换行、不跟主题，且无条件挂属性——短文本也弹一个与眼前内容重复的气泡，还每格在 DOM 里多存一份全文。唯一失去的是「原生浮层不受容器裁剪」—— 但**挂 body 已明确否掉**（fixed 定位要靠 JS 跟随外层滚动，必然卡顿，见 §7.2），所以这不构成保留 `title` 的理由
  - 浮层走 **tbody 事件委托**（行 DOM 会复用，逐格绑监听会累积）、**挂在 `.vt-root` 内**（为了继承 `--vt-*` 与明暗主题，代价是要自己翻转/夹取以躲开 `overflow: hidden`），首个 tooltip 单元格渲染时才懒创建
  - 延迟可配：`tooltipDelay`（默认 150ms，0 为立即）
  - **截断判定（读 `scrollWidth`）必须留在延迟计时器里，别挪回 `mouseover`**：那是强制重排，布局干净时 0.15µs、脏了 20µs+（实测差 100 倍以上）。滚动时指针底下的行在动，`mouseover` 会在布局脏时连续触发；放计时器里则横扫一排不产生任何重排，只有停下来那一格付一次
  - 只作用于**没有 `render` 的单元格**；表头不参与（`th` 直接写 `textContent`）
  - **动态行高下可用**（CDP 实测无抖动/漂移，见 §7.4）；代价是合并块在窗口边缘被裁短时那几行会变高。要绝对稳定的行高就配 `fixedSize: true`
  - 长段（段首被窗口裁掉）的 primary 格套 `.vt-merge-label` sticky 内层钉在可见数据区上缘，消除滚动抖动；短段与静态 `merges` 不套，保留格内居中。几何变量 `--vt-body-view-t` / `--vt-body-view-h` 由 `_syncGeometryVars()` 写（**只在容器/列宽/表头表尾变化时写，不随滚动**）
- 高亮：悬停行 / 选中行 / 选中列 / 选中单元格
- 自定义 class/style（行/单元格/表头，支持函数式）
- 列宽拖拽调整（`resizable` + `minWidth/maxWidth`，`.vt-resize-line`）

### 数据展现
- 多级表头（`headerData` + `headerMerges` 手写）
- **多级分组表头 / 表尾**（列 `children` 组成列树，`header-group.ts`；表头、表尾与表体一同横向虚拟化）
  - 表尾与表头同序、共用同一份网格；内容优先级 `renderFooter > footerValue > summary 聚合 > 合计标签`
  - 分组格聚合 = 覆盖的「全部叶子列 × 全部行」摊平后聚合（`computeCellSummary`）
  - **分组格必须 `white-space: nowrap`**：裁剪宽度随滚动变化，允许折行会导致 sticky 表头/表尾高度抖动
  - 分组格标题的对齐走列上的 `headerAlign`（默认居中，左/右同样支持，写在 sticky 内层上而不是 `th` 上）。付费甘特的年月表头就用 `'left'` 吸左：跨两屏的「2026年8月」居中会飘在屏幕正中、与哪一列都对不上。`header-structure.dom.test.ts` 守着
  - **分组标签用 CSS sticky 跟随横滚**（`.vt-group-label`，仅中间段）：裁剪按整列取整、滚动按像素，直接格内居中会漂移+跳半列。靠 `--vt-fixed-left-w` / `--vt-center-view-w` 两个变量定位（`_syncGeometryVars`，只在容器/列宽变化时写，不随滚动）。⚠️ 承载它的格子必须 `overflow: visible`——祖先非 visible 会让内层 sticky 彻底失效
- 表尾（`footerData` + `footerMerges`）
- 合并单元格（表体 `merges` / 表头 / 表尾，算法在 `merge.ts`）
- **按值自动合并**（列 `mergeKey` + `mergeMaxSpan`，`merge.ts` 的 `buildMergeRuns` / `findMergeRun` / `clampMergeRunsToWindow`）
  - 分段索引（`Int32Array` 存段起点）在 `_rebuildData` 末端建，每帧按渲染窗口裁剪成 `MergeCell[]` 追加进 `_renderMerges` —— 下游 `planRowCells` / `getMergeInfo` / 固定列偏移一行未改
  - **绝不要把自动合并展开成全量 `MergeCell[]` 塞进 `_merges`**，两个都实测过：① `buildRowMergeIndex` 按覆盖行数建 Map，100 万覆盖行 = 64.8ms 且 WeakMap 按数组身份缓存、每次排序/筛选全额重建；② `calcRenderRect` 把渲染起点拉回段首，`rowspan=50000` 时 materialize 5 万个 `<tr>`，虚拟滚动失效
  - 与静态 `merges` 的关键差别：**不禁用排序**（分段在排序之后算）。所以判断要区分「静态 merges 存在」和「有自动合并」，别合并成一个条件
  - 固定列不在合并坐标系里 → 配了就告警并忽略；自动合并下 `canReorderRows()` 返回 false
  - `expandSelectionForMerges` 查**真实段**（`findMergeRun`），不查窗口裁剪结果 —— 选区可以远超渲染窗口，用裁剪结果会把选区截在窗口边界上
  - 对外两个 getter 语义不同：`getMerges()` 只给静态配置（自动合并是派生状态、跨度随数据变），`getEffectiveMerges(begin?, end?)` 给真实生效的合并块（`mergeRunsInRange`，不裁剪）
  - `vtClipboard` / `vtExport` 从来不读合并信息（逐行取值），所以自动合并在那边没有额外接线
- 树形数据（`type: 'tree'`，`children` 字段，展开/折叠）
- 分组（`groupConfig` 多字段层级分组，支持组内 asc/desc）
  - 运行期换维度走 `setGroupConfig()`（付费甘特工具栏的「分组」按钮就是它）
  - **分组行的 `.vt-group-content` 兼任「遮住左冻结区」**：分组行没有冻结列（它是一个 colSpan 铺满整行的格子），所以插件的绝对定位覆盖层横滚时会浮到任务列上面。这个 sticky 内层 `min-width` 铺满 `--vt-fixed-left-w`、`z-index: 4`（与冻结列同层）、`background: inherit`，行为与数据行的冻结列对齐
  - 为此**分组格自己不留上下与左内边距**（`padding: 0 x 0 0`），全部交给内层 —— 两个都是实测过的坑：① 内边距在格子上时内层只有一行文字那么高（21px vs 行高 43px），上下各留 10/12px 的缝，覆盖层从缝里压在冻结列上面；② sticky 只会把元素往前推、不会拉到静态位置之前，格子留 10px 左内边距的话横滚前 10px 分组标题会跟着内容往左漂
  - 最后 1px 由 `.vt-group-content::after` 收口：分组格自己的上下边框在 padding box 之外，内层背景铺不到，覆盖层还能在那 2px 上画东西（实测里程碑竖线正好压在分隔线上露出两点）。伪元素往上下各反向长出一个边框宽吃掉它，并**把那两条分隔线照原样重画一遍** —— 单纯遮住会让分隔线在冻结区断掉几百 px
  - **分组格 `position: relative` 但不给 z-index**：`relative` 让它排在 DOM 里更靠前的已定位覆盖层之上（时间轴装饰不该从结构分隔行身上透出来）；给了 z-index 就成层叠上下文，内层那个 4 会被困住
- 展开行（`type: 'expand'` + `renderExpandRow`）
- 默认全展开 `defaultExpandAll`

### 交互
- 单元格区域框选（**已插件化**：`plugins: [vtCellSelection()]`，回调仍可写 `onCellSelectionChange`）
- 剪贴板复制/粘贴（**已插件化**：`plugins: [vtClipboard({ onCopy, onPaste, mimeType })]`）
- 单元格编辑（**已插件化**：`plugins: [vtCellEditor({ trigger: 'dblclick' })]`，列上仍配 `renderEditor`）
- 内置单元格组件（18 个工厂，`/components` 入口，见 §7.14；装单个格子用 `asCell()`，见 §7.17）
  - 编辑态（需装 `vtCellEditor`）：`VtInput` / `VtNumberInput` / `VtTextarea` / `VtSelect`
    （`multiple` × `display: 'text'|'tag'`，「从候选集里选」的唯一入口）/ `VtCascader` /
    `VtAutocomplete` / `VtPerson` / `VtDatePicker` / `VtDateRangePicker`（两者共用**自绘日历
    面板**：区间版双月并排、点起点→hover 预览→点终点；`native: true` 切回原生控件）/
    `VtTimePicker`（仍是原生 `input[type=time]`）/ `VtLink`（配 `editable: true`，面板里分改文案与地址）
  - 直接可点（不给 `renderEditor`，点一下就写回）：`VtCheckbox` / `VtSwitch` / `VtRate` / `VtActions`
  - 纯展示（不改值，但可以有交互）：`VtTag`（无候选集，值即内容）/ `VtProgress` / `VtLink`（默认支路）/
    `VtImage`（缩略图 + 点开图片查看器，取图排到空闲期做，见 §7.14.3）/ `VtPerson`（不配 `options` 时）
- 列筛选两种入口（状态独立，最终 AND）：
  - 表头快捷筛选（**下拉 UI 已插件化**：`plugins: [vtColumnFilter()]`；列配置与 `onFilterChange` 不变）
  - 高级筛选管理器（`filterModel` AND/OR 条件树 + `VtFilterBuilder`，`onFilterModelChange`）
- 搜索（**已插件化**：`plugins: [vtSearch()]`，Ctrl/Cmd+F 弹出搜索框，高亮 + 上/下一个）
- 右键菜单（**已插件化**：`plugins: [vtContextMenu(fn)]`，见 §3.1）
- **四个面板插件**（免费）—— `vtFieldConfig`（字段配置 = 列显隐 + 拖拽换序）/ `vtFilterConfig`
  （高级筛选 = `VtFilterBuilder` 条件树）/ `vtGroupConfig`（分组）/ `vtSortConfig`（排序）。
  全部落在核心公开的查询状态入口上（`setColumnVisible`+`moveColumn` / `setState({filterModel})`
  / `setGroupConfig()` / `setState({sort})`）。
  - **每个都有两种归宿，一份实现**：`onMounted` 里 `inject('toolbar')` 拿到了就把自己注册成工具栏
    上一项，拿不到就走 `internal/panel-popup.ts` 自己开浮层（使用方调 `toggleFieldConfig(anchor)`
    那组 API）。两条路吃同一个 `buildXxxPanel`，所以「单独用」不是降级档。
  - 面板项的构造（key / 图标 / 徽标 / 排序位）在**各自的插件文件**里导出（`fieldConfigToolbarItem`
    这组，`@internal`），工具栏与插件自注册都用它 —— 于是「自带的那份」与「显式装的那份」不可能长得不一样。
- **行高设置 `vtRowHeightConfig`**（免费插件）—— 低 / 中 / 高三档。**一档 = 两件事**：
  密度类（`.vt-root--compact` / `.vt-root--loose`，管内边距与字号）+ 虚拟化行高（30 / 40 / 50，
  三个数是各档「行高 = line-height + padding×2 + 边框」等式的解，`css-contract.test.ts` 钉住）。
  只做一半的表现是行间露白或内容被裁 —— 这个插件的全部价值就是把两件事绑在一起。
  - **只在 `fixedSize: true` 下开放**：不定高模式下行高由内容决定，`estimatedSize` 只是估算值，
    那时给三档是句空话（面板改为说明原因，API 调用 warn 并不生效）。
  - 落地走核心的 `setRowHeight(px)`（`VirtTableHost` 白名单）。那条要同时动**三处**：
    使用方那份 `estimatedSize`、虚拟化账本的热快照、以及总高重算（`forceUpdate()`）——
    `_core.updateOptions()` 只刷快照**不重算总高**，漏了它行会按旧行高摆位，且只在滚动时才看出来。
  - 行高变了另派发 `onRowHeightChanged`：行的摆位靠 `onRendered` 就够了，这个钩子是给
    **表头几何**用的 —— 付费甘特把表头内边距反解成行内值写死，密度换档后必须重解一次，
    否则左表表头比时间轴表头矮 2px。
  - **工具栏不自带这一项**（`vtToolbar()` 仍是四颗），装了本插件才多那颗按钮。
- **工具栏 `vtToolbar`**（免费插件）—— 一条按钮条 + 一个**贡献点**，**自己一颗按钮都没有**。
  `vtToolbarPanels()` 是「那四个面板」的一行预设（`plugins: [vtToolbar(), ...vtToolbarPanels()]`）。
  - 别的插件与使用方通过 `provide`/`inject` 握手往里加按钮：`ctx.inject<ToolbarService>('toolbar')?.register(item)`，
    或 `table.registerToolbarItem(item)`。**可选依赖且顺序无关**（服务表共享，`onMounted` 在全部
    `setup` 之后）—— 四个面板插件、`vtSearch` / `vtExport` 与付费的甘特配置、撤销/重做都是这么接进来的。
  - `bar: false` 只提供面板与 `toggleToolbarPanel(key, anchor)`，按钮由使用方放。
  - **「工具栏里的 X」不该是另一份实现**：搜索就是 `vtSearch`、导出就是 `vtExport` ——
    它们自己 `register()` 那颗按钮，差别只在谁来唤出。所以「有按钮 / 只有快捷键」是**同一个插件的
    选项**（`toolbar` / `hotkey`），不是两个东西。`toolbar?: boolean` 这个选项名在所有会往工具栏
    放按钮的插件上统一（四个面板 + `vtRowHeightConfig` + `vtSearch` + `vtExport`），
    语义都是「不占那条按钮条的位置，能力照旧」—— 它与 `vtToolbar({ bar: false })` 是同一件事的两半。
  - **排序位集中在 `internal/toolbar-order.ts`**，别各插件自己写数字：`vtSearch` 与
    `vtRowHeightConfig` 一度都写着 `order: 50`，同侧同 order 只能按注册顺序排，
    于是「谁在前」变成了使用方 `plugins` 数组顺序决定的事。
  - **为什么不做成「工具栏配置里挑几个内置项」**（2026-08-21 推翻了「自带四项」那一版）：
    付费甘特的「甘特图配置」核心不可能认识 → 贡献点无论如何要存在；既然存在，内置面板走另一条路
    就是两套心智。`vtSearch` 是同一道理的另一面（搜索框+高亮+快捷键是一份能力，按钮只是入口之一，
    塞不进配置项）。「自带」那一版换来四条要记的规则（自带哪几个 / 不自带哪几个 / 同 key 覆盖 /
    `canToggleColumn` 两处入口），还让 `toolbar.css` 必须 `@import` 全部面板 ——
    「只要排序面板」也得吞下筛选管理器那 14KB。现在只有一张注册表，撞 key 一律先到先得。
  - **一项都没有时 warn 一句**：空按钮条与「插件没装上」长得一模一样。
  - **外观**：浅色槽（`--vt-header-bg`）里的白色药片按钮，无边框、无下拉箭头，高度走自己的
    `--vt-toolbar-button-height`（默认 28px，**不与面板控件的 `--vt-control-height` 共用**）。
    生效数量是**前置文字**（图标 → 数量 → 标签，读作「1 分组」）而不是右上角实心角标；
    `is-active` 只给图标上色 —— 不用字重（500/400 宽度不同，一排按钮会在开关分组时位移），
    也不点亮整颗（有生效设置是常态，一排蓝边就是背景噪音）。三条都由 `css-contract` 与
    `toolbar.dom.test.ts` 钉住。
  - 面板基元在 `ctx.ui`（贡献方不自己画 DOM，否则几张脸的行距会各不相同），实现在
    `internal/panel-ui.ts` —— **不能放 `plugins/`**（那里每个文件都会变成一个公开入口），
    而它必须能被四个面板插件在没有工具栏时用到，所以也不能留在 `toolbar.ts` 里。
- 行拖拽排序（**已插件化**：`plugins: [vtRowDrag({ crossLevel })]`）——**扁平 / 树形 / 分组三种结构都支持**，
  落点分上/下/中三档 + 指针横向位置定层级，落数据在核心 `moveRowTo()`，见 §7.24

### 电子表格模式（experimental，`spreadsheet.ts`）
- 单元格类型：text / number / checkbox / option / image / rich-text
- 剪贴板序列化（TSV + HTML + 自定义 payload）、行列增删
- ⚠️ `renderSpreadsheetCellHtml()` 走的是 **DOM → `outerHTML`** 这条路（image / option / checkbox
  三类要建节点），所以任何**只设 DOM 属性、不反射到 attribute**的状态都会在这里丢掉。
  已踩过一次：`cellType: 'checkbox'` 只设 `box.checked`（不反射），电子表格里的布尔列
  恒显示未勾选 —— 修法是同时设 `defaultChecked`（`cell-type.ts`，`cell-type.test.ts` 里有
  「勾选态能活过 outerHTML 序列化」守着）。**新增内容类型时先想清楚它在序列化路径上还剩什么。**
- ⚠️ 只读勾选框恒带 `disabled`，而 `.vt-checkbox:disabled` 与 `:checked` 特异度相同且在后，
  会把主色底顶成浅灰 —— 勾号是固定白色的 data URI，于是白勾隐形。已补 `:disabled:checked`
  (0,3,0) 还回主色底（`css-contract.test.ts` 有断言）。

### 自定义渲染
- `render`（单元格）/ `renderHeader` / `renderExpandRow` / `renderEditor`
- 返回 `string | HTMLElement`（React/Vue 端支持返回 VNode/JSX）
- ⚠️ **字符串一律走 `textContent`，不解析标记** —— 使用方的数据不该能注入 HTML。
  想要结构（套一层胶囊/圆底之类）就必须返回**元素**。付费甘特的「今天圆底」正踩过这条
- `renderHeader` 在表头每次重建（`setColumns` / 列显隐 / 列窗口变化）时都会重新调用，
  返回的元素**不复用**。所以它是声明式的：插件不必在渲染后去补 DOM。`render-header.dom.test.ts` 守着
- 分组表头节点的格子用 `data-group-key`，**叶子列**才是 `data-col-key`（找错属性会一直找不到）

### 分页
- **客户端分页是默认**：传 `pagination` 即由表格切片，`total` 由筛选后的根行数派生
- `manualPagination` / `dataMode:'server'` → 服务端模式（只渲染分页器 + 派发 `onPageChange`）
- 切片在 `_computeDisplayList` 里位于**结构展开之前**，切根行；`_syncDerivedTotal` 先 clamp 再切
- 筛选走 `_commitQueryChange('filter', { resetPage: true })` 回第 1 页；排序不重置

### 状态持久化
- `getState()` / `setState(state)`：列宽 / 列序 / 列显隐 / 排序 / 筛选（列头 + 高级），三端已转发
- 字段全可选，`setState` 只应用出现的字段；「不给字段」= 保持现状，「给空值」= 清空
- 一次列重建 + 一次管线重算，不逐列 `setColumnVisible` / 逐列 `sort`
- 分组表头下列序只在同一分组内还原（分组节点按后代最小位次参与排序）

### 命令式 API（部分）
- 滚动：`scrollToIndex / scrollIntoView / scrollToTop / scrollToBottom / scrollToOffset / scrollToCell`
- 数据：`setList / setColumns / setMerges / setHeaderMerges / setFooterData / forceUpdate / reset`
- 勾选：`getCheckedRows / setCheckedRows / clearCheckedRows`
- 展开/折叠：`toggleExpand / toggleFold / expandAll / collapseAll`
- 分组：`getGroupConfig / setGroupConfig`（运行期换维度；**刻意不进 `getState()`** —— 进去就得把状态 `version` 加一，已存在 localStorage 里的视图会全部作废。付费甘特工具栏的「分组」按钮走这条）
- 列：`setColumnVisible / getVisibleColumns（可见叶子列）/ getLeafColumns / getAllColumns（列树）/ getHeaderDepth`
- 工具栏（`vtToolbar`）：`toggleToolbarPanel(key, anchor?) / openToolbarPanel / closeToolbarPanel / isToolbarPanelOpen(key?) / registerToolbarItem(item) / refreshToolbar`
- 筛选：`setColumnFilter / clearAllFilters / getActiveFilters`；高级筛选 `setFilterModel / getFilterModel / clearFilterModel / hasActiveFilters`
- 框选：`getCellSelection / clearCellSelection`
- `destroy` 释放 DOM 与事件

> 完整 API 见 `docs/vanilla/api/`（按作用对象拆页：`table.md` 表格级 / `instance.md` 实例方法 / `data.md` 数据与远程 / `column.md` 列级 / `group-header.md` 分组表头表尾 / `cell.md` 单元格渲染 / `components.md` 单元格组件 / `merge.md` 合并 / `plugins.md` 插件 / `types.md` 类型；`index.md` 只是导航）。

## 5. 开发定位速查

| 我要改…               | 去看                                                              |
| --------------------- | ---------------------------------------------------------------- |
| 表格主逻辑/新增能力   | `packages/vanilla/src/index.ts`（`VirtTable` 类）                |
| 合并单元格            | `packages/vanilla/src/merge.ts`（+ `merge.test.ts`）             |
| 多级分组表头/表尾     | `packages/vanilla/src/header-group.ts`（+ `header-group.test.ts`）；渲染在 `index.ts` 的 `_buildTheadGrouped` / `_buildTfootGrouped`（两者共用 `planHeaderRow`） |
| 单元格内容优先级      | `packages/vanilla/src/index.ts` 的 `_resolveCellContent`（**唯一实现**，分层模型见 §7.17）；装配出口 `_fillCellContent`；功能列穿透在 `_applyCellContentInner` 的 `pierced` |
| 内容类型渲染          | `packages/vanilla/src/cell-type.ts`（`renderCellContent` / `cellContentText`）|
| 电子表格/单元格类型   | `packages/vanilla/src/spreadsheet.ts`                            |
| 插件机制/新增插件     | `packages/vanilla/src/plugin.ts`（契约 + `PluginRuntime`，见 §3.1）；接线在 `index.ts` 的 `_setupPlugins`；参照 `plugins/context-menu.ts` |
| 右键菜单              | `packages/vanilla/src/plugins/context-menu.ts`（`vtContextMenu` 插件，已迁出主类）|
| 样式/新增 class       | `packages/vanilla/src/index.css`（`.vt-*` 命名，产物 `core.css`）；可选层样式在 `plugins/*.css` / `components/*.css`，见 §3.2 |
| 内置单元格组件            | `packages/vanilla/src/components/*`（工厂函数 + `shared.ts` 公共基元 + `_popup.ts` 浮层，见 §7.14）|
| 筛选模型/算子求值     | `packages/vanilla/src/filter-model.ts`（+ `filter-model.test.ts`）|
| 服务端取数/无限滚动   | `packages/vanilla/src/remote.ts`（`RemoteController` 状态机 + `remote.test.ts`）；接线在 `index.ts` 的 `_initRemote` / `_runFetcher` / `_commitRemoteRows` / `_appendRows` / `_prependRows` / `_renderInfiniteBars` |
| 树形懒加载            | `index.ts` 的 `_isLazyParent` / `loadChildrenFor` / `resetLazyNode` / `_setLazyToggleLoading`；懒节点判定在 `_flattenTree`（`_lazyPending`） |
| 行拖拽落点            | 手势与归约在 `plugins/drag-sort.ts` 的 `vtRowDrag`（`process` / `resolveSpot` / `parentAt`）；落数据在 `index.ts` 的 `moveRowTo` / `_resolveDrop` / `_locateRow`（唯一判定源，`canDropRow` 与它共用），见 §7.24 |
| 筛选管理器 UI         | `packages/vanilla/src/components/vt-filter-builder.ts`（样式 `.vt-fb*` 在同目录 `vt-filter-builder.css`；`--vt-*` token 那份 `.vt-fb` 选择器仍在 `index.css` §1/§2）|
| React 桥接/列转换     | `packages/react/src/index.ts`（`convertColumns`、`createRoot`）  |
| Vue 桥接              | `packages/vue/src/index.ts`                                      |
| 纵向虚拟滚动算法      | 外部 `@virt-list/core`（不在本仓库，只读）                       |
| 文档/示例             | `docs/{vanilla,react,vue}/examples/**`（目录名 = 侧边栏分组名：`basic` / `cell` / `advanced` / `plugins` / `ai` / `merge`）、`docs/**/api/*.md`（按作用对象拆页，`index.md` 是导航）。**职责分开**：api 页只放表格化信息（字段表 / 方法签名 / 取值表 / 优先级表 + 最小接口骨架），示例页放正文（怎么用、边界、设计理由）+ 一节「相关 API」精简表 + 锚点链接。写文档时别把字段说明抄进示例页，也别把长篇讲解写回 api 页 —— 这两件事各只有一处事实源 |
| Demos（经典案例）     | **清单** `docs/.vitepress/demoCases.ts`（唯一一份，侧边栏与画廊都从它派生，`slug` 同时决定路由/demo id/截图名）；**落地页** `docs/demos/index.md` → `theme/components/demos/DemosGallery.vue`（卡片网格 + 下方舞台，**首屏默认挂 `DEFAULT_SLUG`（电子表格）**、点别的卡片即卸载重挂，同时只活一个实例；卡片缩略图底部那条 `.dg-card-veil` 悬停浮出，触屏（`hover: none`）常显）；**案例页** `docs/demos/<slug>.md`；**实现** `docs/apps/vanilla/src/demos/*.ts` + 同目录 `index.ts` 注册表（id 用 `demo-*` 前缀，与示例的 `table-*` 分开）；**截图** `node scripts/shoot-demos.mjs`（需先 `pnpm dev:vanilla`）→ `docs/public/demos/<slug>.png`，尺寸 1560×740 与 `DemosGallery.vue` 的 `aspect-ratio` 绑定。案例=一个业务场景串十几项能力，示例=一个能力一页；案例刻意只做 vanilla 一份（三端各写一遍必然只有 vanilla 保持更新）。`useFramework.ts` 里 `demos` 属于「无框架模块」（框架切换器在这里隐藏） |
| 顶栏与侧边栏          | `docs/.vitepress/config.ts`。顶栏四个入口：**经典案例 / AI 场景 / 指南 / 使用文档**（`useFramework.ts` 的 `NavModule`，顺序即导航顺序）。**「指南」是独立入口**（`/{fw}/guide/*` → `guideSidebars`，只有 指南 / 深入 两组）——「先读一遍」与「按需查一条」是两种阅读方式，混在一份侧边栏里时前者会被下面上百条功能与 API 条目压在最上面。**「使用文档」聚合** `examples` + `api` 两段（`buildDocsSidebar()` → 功能 / API），因为示例页底部的「相关 API」本来就指向后者；功能的 7 个分类一律 `collapsed: true`，VitePress 会自动展开含当前页的那一组。各入口的落地页在 `getModuleLink()`：指南 → `guide/index`、使用文档 → `examples/basic/basic`。API 同样分了四组（表格级 / 列级 / 单元格级 / 其他，见 `buildApiSidebar`）；**三端页名必须一致** —— `getFrameworkLink` 换框架只替换第一段路径段，某端缺页就是 404 |
| 侧边栏分组            | `docs/.vitepress/config.ts` 顶部的 `basicLinks` / `featureColumnLinks` / `cellLinks` / `columnLinks` / `advancedLinks` / `pluginLinks` / `aiPluginLinks` / `mergeLinks` 数组（**三端共用一份**，新增示例加一行即三端出现）；框架差异只走 `frameworkOnlyCellLinks`（组件渲染）/ `thirdPartyLinks`。**分组名 = md 目录名 = playground demo 目录名**，三处一起放：`基础功能`→`basic`、`功能列`→`feature-columns`（只一页，`index.md`，侧边栏 link 末尾**必须带斜杠**，否则 404；排在「单元格渲染」之前 —— 分层图里接管层在内容层之上）、`单元格渲染`→`cell`（机制页 + 18 个内置组件 + 第三方库）、`高级功能`→`advanced`（原「增强功能」已并进来）、`插件`→`plugins`、`AI 插件`→`ai`、`合并单元格`→`merge`。归类标准：**示例主题就是某个插件**才进「插件」组（如「单元格选区」= vtCellSelection）；只是顺带装了插件的不算（如「编辑校验」主题是 `validator`，留在「高级功能」）。侧边栏一级标题是**「功能」而不是「示例」**（与 Demos 的「经典案例」对照），但 URL 段仍是 `/examples/` |
| 文档站样式/换肤       | `docs/.vitepress/theme/styles/design.css`（`--vtd-*` 令牌 + 映射到 `--vp-*`）；示例页排版在同目录 `playground.css`。**全宽布局那段的「给侧边栏让位」必须留在 `@media (min-width: 960px)` 里** —— 那是 VitePress 侧边栏真正占位的断点（窄屏侧边栏是抽屉），无条件写 `padding-left: var(--vp-sidebar-width)` 会把手机上的正文推出屏幕 272px；窄屏 `.VPDoc` 左右内边距要保持 24px，代码块靠 `margin: 16px -24px` 贴边 |
| Playground 外观       | `docs/apps/{vanilla,vue,react}/src/style.css`（`--dm-*` 令牌，取自文档站 `--vtd-*`，三份内容保持一致） |

**约定**：
- 私有成员/方法前缀 `_`（如 `_columns` / `_calcColRange`）。
- 新增能力优先在 vanilla 实现，再在 react/vue 暴露对应类型（React/Vue 列类型通过 `Omit<VirtTableColumn, 'render'|...>` 重写渲染函数签名）。
- **新增「可选的 UI / 交互层」优先做成插件**（`plugins/<name>.ts`），而不是往 `VirtTable` 主类里加 `_initXxx`；判定标准与接线点见 §3.1。核心能力仍然直接写在 `index.ts`。
- CSS 类统一 `.vt-` 前缀，BEM 风格修饰符 `--xxx`。
- **样式一律走变量**：`index.css` 分 9 个章节，§1 是亮色 token、§2 是暗色 token（只重定义变量，不重复写规则）。新增样式**禁止**写字面颜色/圆角/间距，一律引用或新增 `--vt-*` 变量（派生色用 `color-mix(… var(--vt-color-primary) …)` 并在 `@supports` 外给静态兜底）。单元格内边距由 `.vt-td` / `.vt-th` 统一提供（不要再写进内部包装元素），行高默认 40px。虚拟滚动会复用行 DOM，**不要**给 `.vt-td` / `.vt-tr` 加 `background` 过渡，否则快滚会闪色。
- 中文注释为主，与现有风格一致。
- 新增单元格/合并逻辑务必补 `merge.test.ts` 用例。

**本地运行**：`pnpm i` → `pnpm dev`（同时起 docs/react/vue/vanilla）；`pnpm test` 跑 Vitest；`pnpm build` 构建 vanilla 包。

---

### 5.1 DOM 层测试怎么写

`merge.dom.test.ts` 是第一个 DOM 层测试文件，照它写就行。三个环境上的坑：

| 坑 | 处理 |
| --- | --- |
| happy-dom 里所有几何都是 0，虚拟滚动只算出 2 行的区间 | **用 `renderControl: () => ({ begin, end })` 钉住渲染窗口**，别去 stub `clientHeight` / `getBoundingClientRect`。这样既精确又走真实代码路径（`renderControl` → `_mergeRenderControl` → 窗口裁剪 → `planRowCells` → DOM），不碰任何原型 |
| happy-dom 没有 `ResizeObserver` | 用 `fixedSize: true`（固定行高）跳过测量。核心里对 RO 是可选依赖（`typeof ResizeObserver === 'undefined'` 早返回、`this._core.resizeObserver?.observe`），所以不需要 polyfill |
| `@virt-list/core` 的 dist 有无扩展名相对引用，Node ESM 解析器认不出来 | `vitest.config.ts` 里 `test.server.deps.inline: ['@virt-list/core']`，交给 Vite 的解析器。**纯逻辑测试碰不到这条**（它们不 import `index.ts`），所以以前一直没暴露 |

断言读 `td.dataset.colKey` 定位列，不依赖 td 出现顺序（被合并覆盖的行没有该列的 td，这本身就是要断言的事实）。分组默认是折叠的，测数据行要记得 `defaultExpandAll: true`。

**内置单元格组件是例外，不需要造实例**（`components/components.dom.test.ts`）：它们是纯工厂函数，
直接调 `col.render(ctx)` / `col.renderEditor(ctx)` 断言产出的 DOM 与写回结果就行，绕开了
`renderControl` 那一套。两个坑：① `renderEditor` 返回的元素**要自己挂进 DOM**（真实路径里是
cell-editor 挂的），否则 `_popup.ts` 的锚定循环会判定锚点已消失、立刻自毁；② happy-dom 的
反射属性给的是字符串（`textarea.rows` 是 `'5'` 不是 `5`），量几何的断言一律改成量属性或
`style.width` 这种由 JS 写入的值。

### 5.2 类型级测试（`*.test-d.ts`）怎么写

有些契约**只存在于类型层**，运行时测不到 —— 典型是 `asCell()`：它必须**拒**列专属选项
（`key` / `width` / `sortable` …）、又必须**接受**组件自己的选项（`options` / `max` …）。
这类断言放在 `*.test-d.ts` 里，由 `tsc` 检查，不进 vitest（vitest 只收 `*.test.ts`）。

| 部件 | 作用 |
| --- | --- |
| `packages/vanilla/src/**/*.test-d.ts` | 断言本体。第一个是 `components/as-cell.test-d.ts` |
| `packages/vanilla/tsconfig.typecheck.json` | 只检查不出产物：`noEmit` + 排除 `*.test.ts`（那些测试**故意**类型宽松，比如省略 `width`，一起检查会红） |
| `packages/vanilla/package.json` 的 `typecheck` 脚本 | `tsc -p tsconfig.typecheck.json` |
| 根 `pnpm typecheck` | 已把它排在最前面（后面才是 docs / 三端 playground） |
| `tsconfig.build.json` 的 `exclude` | 加了 `src/**/*.test-d.ts` —— 否则产物里会多出一个没用的 `.d.ts` |

**`@ts-expect-error` 是双向守卫**：期望的错误消失时 TS 会报「Unused '@ts-expect-error'
directive」，所以「该报错的不报」与「不该报的报了」都会红。正向断言用普通代码 + 显式类型标注
（`const id: number = row.id`）就够，不必引 `expectTypeOf` 那套。

⚠️ **写完要验一次守卫真的会红**，否则等于没写。做法：把被测签名故意改坏，确认 `tsc` 报错，
再还原。`as-cell.test-d.ts` 实测过：把 `asCell` 的泛型退回 `<O extends BaseColumnOptions<any>>`
（那个静默落回约束的写法）→ **5 个错误**；还原 → 绿。顺带这份文件第一次跑就抓到一个真问题：
`asCell(VtLink, { href: (row) => … })` 里 `row` 会被推成 `unknown`，要 `VtLink<Row>` 才有类型。

**vanilla playground 也进了 typecheck**（`pnpm -C docs/apps/vanilla typecheck`）。它本来有
`tsconfig.json` 却没挂脚本 —— 17 个单元格组件 demo 一直没人守。接上时实测是 0 错误，所以是
纯白捡的一道关。

### 5.3 契约测试（静态扫描）怎么写

**契约测试 = 断言「跨文件的约定」，不断言行为。** 单测问「这个函数算得对不对」，契约测试问
「这两个地方的约定还对得上吗」。它读的是**文本**（CSS 源码、TS 源码），不造实例、不跑浏览器，
所以极快（全部加起来 ~120ms），适合守那些**编译器管不到、运行时也测不出来**的耦合。

本仓四份（外加文档站的 `styles-contract.test.ts`），各守一类耦合：

| 文件 | 守什么 | 典型失败 |
| --- | --- | --- |
| `css-contract.test.ts` | `index.css` 的**令牌算术**（行高等式）与**选择器特异度**关系 | 有人把 `--vt-line-height` 改成无单位比例 → 行高 40.69px → 十万行下滚动几何崩（§7.11 真踩过） |
| `components-contract.test.ts` | `components.css` 的**声明级规则**（内容元素锁高、`inline-flex` 必配 `vertical-align`） | 新组件自己发明一套撑高方式，把 40px 的行顶成 42px |
| `class-contract.test.ts`（08-12 新增） | **JS 写出的 class ↔ CSS 里的选择器** | 改名只改了一侧、或留下没人消费的死类名 —— 两种都**静默通过** |
| `events-contract.test.ts`（08-14 新增） | **「点外面关掉」用的事件名**：不许出现 document / tbody 级的 `mousedown`，且五处浮层必须都还在听 `pointerdown` | 装了 `vtCellSelection` 后表体内没有 mousedown（它的 `preventDefault` 连带取消兼容 mouse 事件），于是浮层「点表格里的格子关不掉」—— 而单测与类型都发现不了，见 §7.3 |

第三份补的是这个仓库**唯一没人守的跨文件引用**。标识符改名敢一次动 272 处（`renderEdit →
renderEditor`）是因为漏一处就 tsc 报错；class 名没有这个保障，所以「要不要顺带把 class 也
改名」一直只能答「不敢」。有了它，class 名也变成「漏一处就红」。

写这类测试的三条经验（都是这次踩出来的）：

1. **先给扫描器本身上一条断言**（`expect(used.size).toBeGreaterThan(100)`）。正则被改坏时
   扫到 0 个 class，其余用例会**全部通过** —— 静默失效的守卫比没有守卫更坏。
2. **降噪要针对假阳性的来源，而不是往白名单里堆**。第一版扫出 8 个「缺失」，4 个是假阳性：
   注释里写着历史 class（`` `.vt-skeleton` ``）、模块路径被拆出 class（`from './vt-cascader'`）。
   对策是**先剥注释**、**跳过含 `/` 的字面量**，之后白名单只剩 4 条真抓手。
3. **白名单自身也要有过期检查**：条目必须仍被 JS 使用、且仍然没有 CSS 规则。否则它会慢慢
   变成「把红的都加进来」的垃圾场。

⚠️ 和 §5.2 同一条要求：**写完必须验证守卫真的会红**。`class-contract` 实测了两种失败形状 ——
① 把 `vt-td-text` 在 JS 侧改名而不动 CSS → 报 `vt-cell-body（index.ts）`；
② 把死类名 `vt-client--highlight-select-cell` 加回去 → 两条用例同时红。

## 6. 竞品对比与功能查缺补漏

对标行业主流表格：**AG Grid、TanStack Table、vxe-table、Element Plus Table、Ant Design Table、RevoGrid**。

### 6.1 优势（本项目已做且做得好）
- ✅ **行 + 列双向虚拟化**（多数轻量库只做行虚拟化，本项目对标 AG Grid / vxe-table 水平）
- ✅ 框架无关内核 + React/Vue 薄封装，一套逻辑三端复用
- ✅ 合并单元格（表体/表头/表尾）算法完善且有充分测试
- ✅ 单元格框选 + 剪贴板 + 电子表格模式（超出多数 UI 库表格）
- ✅ 动态行高虚拟滚动（ResizeObserver 自动测量）

### 6.2 竞品功能补齐（已全部实现 ✅）

对标缺口已全部补齐。核心实现均在 `packages/vanilla/src/index.ts`；纯逻辑抽到 `pipeline.ts` / `summary.ts` / `export.ts`（有 vitest 覆盖）。API 详见 `docs/vanilla/api/` 下对应那页（原来集中在 `index.md` 的「新增能力」章节，已按作用对象分散）。

| 优先级 | 功能                | 实现要点                                                                                          |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------- |
| ✅ P0  | **列排序**          | `sortable`/`sortMethod`/`defaultSort`，`sortMode` 单/多列，表头三态，`sort()/clearSort()`。有 merges 时禁用。 |
| ✅ P0  | **加载态 loading**  | `loading`/`loadingText` option + `setLoading()`，`.vt-loading-mask` 遮罩 + `aria-busy`。         |
| ✅ P0  | **键盘导航**        | **已插件化** `vtKeyboardNav`（requires `vtCellSelection`）：方向键/Tab/Enter/F2/Shift 扩选。       |
| ✅ P1  | **数据导出**        | `exportCsv()/exportExcel()`（`export.ts` 纯函数 + 单测），`exportValue` 列级取值。               |
| ✅ P1  | **合计/聚合行**     | `showSummary` + 列 `summary`/`summaryMethod`（`summary.ts` + 单测），管线末端算叶子，随视图更新。分组表尾下逐格聚合走 `computeCellSummary`。 |
| ✅ P1  | **列拖拽排序**      | **已插件化** `vtColumnDrag`；重排在核心 `moveColumn()`，手势基元在 `internal/drag.ts`。            |
| ✅ P1  | **行拖拽排序**      | **已插件化** `vtRowDrag`，**树形 / 分组都支持**（见 §7.24）；落数据在核心 `moveRowTo()`/`canDropRow()`/`canReorderRows()`，自动滚动在 `internal/auto-scroll.ts`。|
| ✅ P1  | **暗色主题/变量**   | `.vt-root` 上 `--vt-*` 变量 + `.vt-root--dark`，`theme` option + `setTheme()`。                   |
| ✅ P1  | **无障碍 ARIA**     | `role=grid/row/columnheader/gridcell` + `aria-sort/rowindex/rowcount/colcount/busy`。            |
| ✅ P2  | **列显隐/面板**     | 列 `hidden`/`hideable`，`setColumnVisible()`/`getVisibleColumns()`/`toggleFieldConfig()`（`vtFieldConfig` 插件）。全量列存 `_allColumns`。 |
| ✅ P2  | **富筛选 UI**       | 列 `filterType: enum\|text\|number-range\|date-range`，`matchFilter` 在 `pipeline.ts`。          |
| ✅ P2  | **高级筛选管理器**  | AND/OR 任意嵌套条件树（`filter-model.ts` + `filter-model.test.ts`），`setFilterModel()`/`getFilterModel()`/`clearFilterModel()`/`hasActiveFilters()`；可视化构建器 `VtFilterBuilder`（`components/vt-filter-builder.ts`，挂在表格外部，三端均有封装）。与列头筛选**状态独立、管线里 AND 组合**。 |
| ✅ P2  | **固定/置顶行**     | `pinnedTop`/`pinnedBottom` + `setPinnedRows()`，渲染进 sticky thead/tfoot（随横向滚动、冻结）。  |
| ✅ P2  | **编辑校验**        | 列 `validator`，编辑器实时标错（`.vt-comp-input--invalid`），`validateAll()` 批量校验。          |
| ✅ P2  | **单选行 radio**    | 列 `type:'radio'` + `onRadioChange`，`getSelectedRadio()`/`setSelectedRadio()`。                 |
| ✅ P3  | **打印**            | `print()`，复用导出 HTML 构造，新窗口内联样式。                                                   |
| ✅ P1  | **树形懒加载**      | `loadChildren(row, ctx)` + `hasChildren(row)`：首次展开才取子节点，节点级 spinner，在途/已加载去重，失败可重试；`loadChildrenFor()` / `resetLazyNode()`。加载中忽略点击（避免连点按奇偶随机决定折叠态）。 |
| ✅ P1  | **服务端数据/无限滚动** | `remote.ts` 纯状态机（`RemoteController` + `remote.test.ts`）。两个入口一套内核：受控层 `onLoadMore/onLoadPrev(ctx)` 与糖层 `loadData(req)`；三个细粒度开关 `manualSorting/manualFiltering/manualPagination`（`dataMode:'server'` 是三者快捷方式）。`infinite` 开无限滚动（down/up/both、manual 按钮态）。状态条 `.vt-infinite-bar` 四态，文案 `locale.infinite`。 |

**统一数据管线枢纽 `_rebuildData()`**（新增，见 `index.ts`）：`原始 → 筛选 → 排序 → 结构展开(_flattenTree) → 聚合 → 提交`。筛选阶段把「列头筛选谓词」（`buildColumnFilterPredicate`）与「高级筛选谓词」（`buildFilterModelPredicate`）组合成单个谓词，交给 `filterPreserveStructure` 走一趟遍历（避免树被重复浅克隆）。修复了原「筛选/树形互不感知、`_unfilteredList` 换数据失效」的隐患。所有数据变更（setList/排序/筛选/折叠展开/拖拽）都汇入此处。

服务端模式（`manualSorting` / `manualFiltering`）会**跳过对应管线阶段**：排序/筛选状态变化不再本地重算，而是经 `_commitQueryChange()` 交给 `RemoteController.reload()` 重新取数。无限滚动追加/前插走 `_rebuildData({ keepPool: true })`——已渲染行内容未变，保留行 DOM 池避免整屏重建；前插另做滚动偏移补偿（动态行高下 rAF 内二次校正）。

### 6.3 范围外（暂未实现）
- **电子表格公式引擎**（`=SUM()` 等，独立大工程）
- **撤销 / 重做**：计划做成插件（暂名 `vtUndo`）。电子表格案例里原本手写过一版（快照对 + Cmd/Ctrl+Z），2026-08-14 连同「切换合并单元格」按钮一起删掉了 —— 撤销要拦下**所有**改数据的入口（编辑、粘贴、合并、将来的删行删列），那是表格级的通用能力，写在单个案例里既不完整也无法复用。做插件时可以翻 git 历史拿那份快照对的思路（`cellsBefore/cellsAfter` + `mergesBefore/mergesAfter`：合并会同时改内容与合并表，只存一半撤不干净）。

**Demos 待做的案例**（清单唯一一份在 `docs/.vitepress/demoCases.ts`，规划中的那条打 `planned: true`）：

| 案例 | 打算证明的事 | 要串的能力 | 备注 |
| --- | --- | --- | --- |
| 金融行情看板 | 高频推流下的帧稳定性 —— 双向虚拟化最难被替代的场景，也是 AG Grid 的招牌 demo | 定时/推送批量更新 · 涨跌闪烁（`cellClass` 瞬时类）· 十万行 · `pinnedTop` 指数行 · 色阶与千分位 | 闪烁类要避开 `.vt-td` 的 background 过渡禁令（§7 那条：行 DOM 池化，加过渡会闪色）——用 `animation` 而不是 `transition` |

「项目管理 WBS」**已经上线**（`docs/apps/vanilla/src/demos/project-wbs.ts`）：甘特那一层由付费插件
`@virt-table-pro/gantt` 出（时间轴 pane、条形层、配置面板、工作日历），核心这边出的是树形 WBS、
`VtDatePicker`/`VtProgress` 等单元格组件、`vtRowDrag` 的手柄换序与筛选/搜索/导出。当年那条备注
（「自绘甘特条 + 甘特列很宽要不要退出列虚拟化」）没有成立：时间轴最后搬进了插件自己的 pane，
根本不是核心的列。

> 补齐任一功能的改动链路：`packages/vanilla/src/index.ts`（核心）→ 纯逻辑进 `pipeline/summary/export.ts` 并补测试 → `docs/vanilla/api/` 下对应那页（表级配置进 `table.md`、列字段进 `column.md`、数据管线进 `data.md`…） → 需要新实例方法时补 `packages/{react,vue}/src/index.ts` 的 ref 转发（普通 option/列字段自动透传，改后须 `pnpm -C packages/vanilla build` 刷新 dist 供三端类型检查）。

## 7. 决策记录（含实测数据）

散在各处代码注释里的取舍集中在这里。**能量化的都带实测数字**——数字是最贵的部分，重新测一遍要装无头浏览器 + 写 CDP 脚本，所以留在这儿；纯设计取舍（命名、API 语义）没有数字，「实测」列写的是判断依据。想推翻某条决策没问题，但请先看它当初被否掉的原因，别凭直觉改回去。

测量环境：Chrome 无头（`--headless=new`），通过 CDP 驱动真实 playground / 真实 `VirtTable` 实例；纯逻辑用 vitest。取 7 次中位数。

§7.10 是**还没拍板**的事项，别当成已有结论；§7.11 是行高几何那条硬约束；§7.14 是内置单元格组件那套约定；§7.15 是「浮层不能绑行 DOM 元素」那条（行 DOM 会被池化复用）；§7.16 是跟随 `@virt-list/core` 改名的迁移记录；**§7.17 是单元格渲染的现行模型**（四层 × 粒度，含术语定稿），它取代了 §7.5 里那条一维优先级链。

### 7.1 打包与产物

| 决策 | 实测 | 结论 |
| --- | --- | --- |
| **可选层移出主入口**（插件走 `/plugins`、内置组件走 `/components`） | 只加子路径不够：主入口继续 re-export 的话，插件代码与 CSS 仍落进核心 chunk | 主入口不 re-export；`VirtTablePluginApi` 用到的类型改 `import type` |
| **多入口 + `sideEffects`** | 基础表格消费方产物：改造前 179.8 kB → 改造后 179.8 kB（**JS 持平**）；CSS 44.5 → 27.1 kB；`dist/index.js` 236 → 168 kB；全量 242.3 kB | JS 侧对 Rollup 用户本来就能摇（旧版是单文件 bundle）。真收益是 **CSS 少 17 kB** + 让 webpack/esbuild/免打包 ESM 也能按需 |
| **不 external `@virt-list/core` / `lodash-es`** | external 后 `require()` 直接 `ERR_PACKAGE_PATH_NOT_EXPORTED`（两者都 ESM-only、无 require 条件、内部还有无扩展名相对引用）；而内联与 external 的消费方产物**都是 179.8 kB** | 打进来。零代价，且保住 CJS 与 Node ESM |
| **`output` 写成数组（每格式一份）** | 用 `lib.formats` + 单个 `output` 时，公共 chunk 只有一份 `chunkFileNames`，CJS chunk 落成 `.js`；包是 `"type": "module"`，Node ≥22.7 有 CJS 回退兜着，18/20 直接 `exports is not defined` | 数组形式，扩展名跟着格式走 |
| **CSS 产物名在 `generateBundle` 里重写** | Vite 给拆分 CSS 命名只取 chunk 文件名部分 → 全平铺 dist 根，且 `src/index.ts` 与 `src/components/index.ts` 撞成 `index.css`/`index2.css`；`assetFileNames` 回调拿不到 chunk 信息 | 用 `chunk.viteMetadata.importedCss` 重命名（`cssPerEntry()`） |
| **`exports` 里 `./plugins/*.css` 写在 `./plugins/*` 之前** | Node 按「`*` 前缀等长则后缀更长者优先」排序；少了它 `plugins/search.css` 会被解析成 `dist/plugins/search.css.js` | 显式写 |
| **`_panel.css` 用 CSS `@import`，不用 JS import** | 被 3 个模块共享，走 JS import 会被 Rollup 提成 hash 命名的公共 chunk，用户没法引 | `@import` 构建时内联，每个插件 CSS 产物自包含（重复的 3.4 kB 规则完全相同） |
| **UMD 单独一轮构建**（`vite.config.umd.ts`） | UMD 只支持单入口，与多入口互斥 | 独立 config + `emptyOutDir: false` 追加执行；顺带 `cssCodeSplit: false` 产出全量 `style.css`，一份配置解决两件事 |
| **`.vt-filter-checkbox` 不随 `_panel.css` 迁出** | 它与核心勾选框是逗号共用同一套规则（约 150 行），拆出去就得整段复制 | 留在核心 `index.css` §7。面板项的其余类正常迁出 |
| **不给 `plugins/index.ts` 加聚合 CSS** | `sideEffects: ["**/*.css"]` 会让那个 CSS import 无法被摇掉 → `import { vtExport } from '.../plugins'` 拖进全部插件样式 | 全量样式的入口是 UMD 构建产出的 `style.css` |

### 7.2 浮层与 token

| 决策 | 实测 | 结论 |
| --- | --- | --- |
| **所有浮层挂 `rootEl`，不挂 `document.body`** | 拖拽 ghost 曾挂 body：`background` `rgba(0,0,0,0)`、`color` 黑、`font-size` 16px、`border-radius` `0px`、`box-shadow` `none`，暗色不跟随。挂 root 后六项全部生效（`rgb(37,99,235)` / 白 / 12px / 6px / 有阴影 / 暗色 `rgb(76,141,255)`） | `--vt-*` 只声明在 `.vt-root` / `.vt-fb` 上，body 子节点继承不到。`position: fixed` 挂 root 里仍按视口定位、也不被 `overflow: hidden` 裁（实测拖出表格外 68px 仍可见），所以挂进去零损失。**顺带修正一处我自己的错**：`_panel.css` 里曾有一条给 `.vt-filter-panel` 的 `prefers-reduced-motion` 降级，注释写着「面板挂在 body 上」——实际四个面板全都 `ctx.rootEl.appendChild`，核心那条 `.vt-root *` 已经覆盖，该规则是 no-op，已删 |
| **tooltip 走 tbody 事件委托，不逐格绑监听** | 虚拟滚动复用行 DOM，`_applyCellContent` 会反复重填同一批 `td` | 逐格 `addEventListener` 会随复用不断累积（既漏内存也重复触发）。委托只有一对监听，且不随单元格数量增长（实测每次 `mouseover` 约 0.5µs） |
| **tooltip 不做 `aria-describedby` 关联** | 单元格的文本节点**始终是完整的**（省略号只是 CSS 视觉裁剪），读屏本来就能读到全文 | 浮层设 `aria-hidden`。为每个单元格生成 id 再关联是纯粹的开销，别因为「无障碍审查」加回来 |
| **tooltip 截断判定放在延迟计时器里，不放 `mouseover`** | 读 `scrollWidth` 强制刷新布局：布局干净 0.15µs / 脏 21.8µs（**差 145 倍**）。2000 次 `mouseover`：改前干净 2.8ms / 脏 ~45ms，改后 3.5ms / 3.2ms | 滚动时指针底下的行在动，`mouseover` 会在布局脏时连续触发。放计时器里 → 横扫一排零重排，只有停下那一格付一次 |
| **删除 `textOverflow: 'title'`** | 渲染 10 万单元格：`ellipsis` 49.4ms / `title` 48.4ms / `tooltip` 48.3ms（**三者同价**）。`title` 悬停时主线程零工作，但每格在 DOM 里多存一份全文 | 性能不是差异点。`title` 延迟不可控（约 1s 起）、不换行、不跟主题、**无条件挂属性**（短文本也弹重复气泡）→ 只剩「更差的 tooltip」，删掉 |
| **tooltip 挂 root 内的代价：接受** | 会被 `.vt-root` 的 `overflow: hidden` 限制，窄表格（260px）长文本被压成 252×90 的高窄块 | 已决定**不改挂 body**（见下一条）。窄表格下靠换行消化，不再为此保留 `title` 这类二等模式 |
| **明确不把 tooltip 挂 `document.body`（已拍板，别再提）** | 挂 body 只能用 `position: fixed`，fixed 锚在**视口**：页面一滚，锚定的单元格移动而浮层不动 → 必须在**每一层祖先滚动容器**上挂监听逐帧重算位置，视觉上必然卡顿。挂 `.vt-root` 内用 `position: absolute` 是相对 root 定位，root 滚它就跟着滚，**零 JS** | 注意问题不在表格内部滚动（`.vt-client` 滚动时本来就直接隐藏），而在**外层 / 页面滚动**。token 继承（body 子节点拿不到 `--vt-*`）只是第二个理由。<br>真要解决裁剪问题，正路是 CSS anchor positioning（`anchor-name` / `position-area`）+ popover——由浏览器做锚定，不需要 JS，正好绕开上面这条。浏览器支持还没铺开（Chromium 已有，其余引擎滞后），等铺开再评估 |

### 7.3 触屏 / Pointer Events

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **`internal/drag.ts` 走 Pointer Events，一处覆盖三处手势** | 迁移前顺带发现：注释写着「三处都要用（列宽 / 列拖 / 行拖）」，但 `_startResize` 自己另写了一套 mousemove 循环，`index.ts` 里那个 `startDrag` import 是**死引用** | 把 `_startResize` 也接到 `startDrag`（`threshold: 0` 保持跟手手感），注释才名副其实。触屏实测：列宽 200→308.75、列序 `a,b,c`→`b,a,c`、行序 `0,1,2,3`→`1,2,0,3` |
| **不用 `setPointerCapture`** | 手势一旦开始（`touch-action` 已让浏览器放弃滚动），事件流会持续送到 document | 捕获会把事件重定向到发起元素，元素在拖拽中被虚拟滚动回收时还得处理 `releasePointerCapture` 抛错。document 监听 + `pointerId` 过滤更简单 |
| **必须按 `pointerId` 过滤 + 处理 `pointercancel`** | 多指同时按会有多条事件流；系统接管手势（来电、多指缩放）只发 `pointercancel` 不发 `pointerup` | 不过滤会串；不处理 cancel 则 `selecting` 一直挂着、`autoScroll` 的 rAF 循环停不下来 |
| **`touch-action` 的粒度：专用手柄用 `none`，可拖列头用 `pan-y`** | 实测：`.vt-resize-trigger` / `.vt-drag-handle` 是 8px 级的专用手柄，设 `none` 不影响表格滚动（tbody 仍是 `auto`，触摸滑动照样滚 242px） | 列拖拽从整个表头单元格发起，设 `none` 会连纵向滚动一起吃掉 → 用 `pan-y`：横向（= 列拖拽方向）归我们，纵向留给浏览器。代价是「在表头上横滑滚动表格」失效——装了 `vtColumnDrag` 就等于选了这个语义，表体横滑照旧 |
| **框选只对 mouse / pen 生效，touch 不启动** | 表体上手指拖动的语义是「滚动表格」。要把它变成框选就得给 tbody 设 `touch-action: none`，那会**直接废掉表格滚动** | 代价远大于收益。触屏框选需要另设入口（长按启动 / 选区手柄 / 显式选择模式），那是一次交互设计而不是事件迁移，见 §7.8。实测：触屏滑表体 → 滚动 242px 且 `getCellSelection()` 为 null；鼠标框选无回归 |
| ~~**面板的 dismiss handler 保持 `mousedown` 不动**~~ → **2026-08-14 推翻：一律 `pointerdown`** | 旧结论的前提是「没坏」，而它**是坏的**：`vtCellSelection` 的拖选起手在 pointerdown 里 `preventDefault()`，而 pointerdown 的默认行为里就包含「派发兼容 mouse 事件」—— 装了框选的表格里**表体内根本不存在 mousedown**。CDP 实测 document 上收到的次数：点单元格 `pointerdown 1 / mousedown 0 / click 1`，点表格外面才是 `1 / 1 / 1` | 用户报的现象：**在单元格里输入后点别的单元格，编辑浮层与右键菜单都关不掉**。同一根因一次咬了 6 处（编辑浮层 / 右键菜单 / 列筛选 / 列设置 / `components/_popup.ts` / 核心三个 `highlightSelect*` 落当前行列的监听）。旧结论担心的「点开关按钮会闪一下又开」没有发生 —— 两处排除都是**按元素**判定（`e.target === currentAnchor`、`closest('.vt-filter-icon')`）而不是按时机，`setTimeout(0)` 延后绑定也还在。实测开关按钮点三次：开 / 关 / 开。`events-contract.test.ts` 守住「源码里不许再出现 document 级 mousedown」 |
| **`trigger: 'click'` 时不许在 pointerdown 里抢着关编辑浮层** | 关闭会 `forceUpdate()`，指针底下那个 `<td>` 当场被换掉 —— 紧随的 `click` 就落不到单元格上（实测 click 直接不派发），新格子的编辑器再也打不开 | 只有 `trigger: 'dblclick'` 那一支自己收尾（单击不触发 `onCellTrigger`，没人关）；click 模式仍由 `onCellTrigger` 接管。两种模式的 A→B 切换都实测过：旧格子写回、新格子开编辑器 |

### 7.4 按值自动合并

| 决策 | 实测 | 结论 |
| --- | --- | --- |
| **不把自动合并展开成全量 `MergeCell[]` 塞进 `_merges`** | ① `buildRowMergeIndex` 按**覆盖行数**建 Map：20 万覆盖行 12.2ms、100 万 64.8ms，且**只有 40 个 merge 时也要 13ms**（成本与 merge 个数无关）。WeakMap 按数组身份缓存 → 每次排序/筛选全额重建。② `calcRenderRect` 把渲染起点拉回段首：`rowspan=50000` 时渲染 **50000 个 `<tr>`**（基线 16） | 只存段起点索引，每帧按窗口裁剪 |
| **段起点索引用 `Int32Array`** | 建索引：10k 行 0.1ms / 100k 0.3ms / 500k 1.7ms / **1M 3.3ms、781KB** | 比展开成 merges 快 20 倍且零对象分配 |
| **查询用二分，不建 Map** | 10 万次查询：Map 路径 3–9.7ms、二分 0.4–2.3ms（**快 2–8 倍**），且二分零构建成本 | 同列的段天然有序不重叠 |
| **每帧按渲染窗口裁剪（接受「重锚」）** | 开自动合并后滚动到 9.3 万行长段中间：渲染 `<tr>` **25**（与不开自动合并一致）；滚动帧中位 8.3ms / p95 9.2ms，**与不开完全一致**；初始化 3.5 → 7.9ms | 裁剪后起点永远 ≥ 窗口起点 → 上面两个坑同时消失，下游一行不改。代价是长段重锚（AG Grid Cell Span 同样如此，且重锚发生在 buffer 内、屏幕外） |
| **`mergeKey` 不禁用排序** | 静态 `merges` 禁用排序是因为合并按绝对行号、排序会错位；自动合并的分段在**排序之后**算 | 判断要区分「静态 merges 存在」与「有自动合并」，**别合并成一个条件** |
| **选区扩张查真实段，不查窗口裁剪结果** | 选区可以远超渲染窗口：一个 5 万行的段，选中其中一格要扩成 0–49999（DOM 测试有断言） | `expandSelectionForMerges` 走 `findMergeRun`（O(log n)）。**很容易顺手改成读 `_renderMerges`**，那样选区会被截在窗口边界上 |
| **`getMerges()` 与 `getEffectiveMerges()` 语义刻意不同** | 自动合并是派生状态，跨度随数据变 | `getMerges()` 只给静态配置（返回副本，改它不影响表格）；`getEffectiveMerges(begin?, end?)` 给真实生效的合并块。混成一个会让调用方误以为拿到的东西能改 |
| **叫 `mergeKey` 而不是 `spanBy` / `autoMerge`** | — | 它准确表达的是「同键成段」这一机制，而不是「魔法自动合并」；使用方看到名字就知道要返回一个键，也知道键相同才合并 |
| **长段的 primary 格套 sticky 内层（`.vt-merge-label`），钉在可见数据区上缘** | 窗口裁剪按**整行**取整、滚动是逐像素的 → 格内垂直居中的文字每帧随内容上移 8px、每 5 帧回跳 +32px（CDP 实测锯齿：60 帧里 11 次大跳、幅度 32px）。修后文字 Y 恒为 42px，逐帧位移全 0 | 与横向分组标签（`.vt-group-label`）**同一个问题的纵向版本**，思路照搬。三个坑都踩过：<br>① `height: min(100%, var(--vt-body-view-h))` **不可行** —— 表格单元格里的百分比高度在 CSS 里未定义（内容决定高度的 td，子元素 `height:100%` 按 auto 处理），实测算成一行文字的 21.7px；横向那套能用是因为 `width:100%` 在 `table-layout: fixed` 下能解析。所以**改成只钉上缘、不做垂直居中**，绕开百分比。<br>② 列上的 `vAlign` 是**内联样式**，CSS 类压不过；而只要标签还被垂直居中，它的自然位置就永远停在视口中部、够不到 sticky 的 `top` 阈值 —— **sticky 一次都不会触发**（第一版就是这么白做的）。所以 JS 里 `td.style.verticalAlign = 'top'`。<br>③ 只对**段首被窗口裁掉**的格子套（`rowIndex <= _renderRowBegin`）。静态 `merges` 与段首在窗口内的段位置本来就稳，套了反而把它钉歪、也白丢了格内居中 |
| **`buildMergesFromSpan()` 做成导出的纯函数，而不是 option** | 回调次数正好 `行数 × 列数`（有单测断言） | 代价显式摊在调用点上：使用方能看见它遍历了多少行、自己决定何时重算。做成 option 就变成隐形的性能悬崖 |
| **动态行高下 `mergeKey` 可用**（实测过，不再只是「建议配 `fixedSize: true`」） | 2000 行、合并列放会换行的长文本（组内 5 行同值）：不合并时每行 518px；开 mergeKey 后每行 **104px**、rowspan 5（5×104≈518，合并省下 4 倍高度）。窗口边缘出现过 `rowspan: 4`（= 裁短的组），**同一行走开再回来高度一致**（104=104），滚动往返回到同一行 | 没有抖动也没有漂移。总滚动高度在滚动中会漂（121081→123273），但**不开 mergeKey 同样漂**（122476→124953）——那是动态行高 + 虚拟化的固有现象（AG Grid 也这么描述），不是合并引入的。<br>真实代价：5 行的组被裁成 4 行时那 4 行要共担同样内容 → 每行变高（104→~130），再滚一行又变回来，**行高随窗口边缘扫过而变**。`fixedSize: true` 下没有这个。<br>happy-dom 没有 `ResizeObserver` 也没有布局引擎，这条只能靠 CDP 验（见 §7.9），没有 DOM 层用例守着 |
| **跨行合并格一律不显示斑马纹** | 开 `stripe` 后 CDP 实测：一个 `rowspan=3` 的合并格坐在斑马起始行上，整块是 `rgb(250,251,252)`，而它覆盖的三行是「灰-白-灰」、右边数据列照常交替 → 合并区底色和覆盖的行完全对不上（行数为偶的段更明显，首尾同色）。长段还叠加第二个问题：重锚让 primary 行号每滚一行变一次 → 奇偶翻转 → 灰白频闪 | 抹平成 `transparent`（与非斑马行**同一个值**，才能证明像素一致，而不是依赖「透明穿透到的正好是 `--vt-bg`」）。亮/暗色都验过。选择器 `.vt-tr.is-striped > .vt-td:where([rowspan]:not([rowspan='1']))`，三个坑：<br>① **必须排 `[rowspan='1']`** —— DOM 池复用分支无条件写 `td.rowSpan = cell.rowSpan`，会在非合并格上反射出 `rowspan="1"`（实测一屏 34 个），只写 `[rowspan]` 会误杀整表斑马纹。<br>② **必须套 `:where()`** —— 裸写是 (0,5,0)，**压过了 hover 高亮的 (0,4,0)**，实测后果是合并格「落在非斑马行能 hover 变色、落在斑马行不能」，比原来的对不齐更糟。`:where()` 参数不计特异度 → 退回 (0,3,0)，与基础斑马纹规则同级、靠顺序压住它，而 hover / 选中行自然赢（三态都 CDP 验过）。语义也对：抹平斑马是静态底色的事，不该吃掉交互反馈。<br>③ 只针对 `.vt-td`，不碰固定列 —— 固定列不参与合并，且必须保持不透明才能遮挡滚动内容。<br>DOM 契约（命中集合 = 真实跨行格集合）由 `merge.dom.test.ts` 守，特异度关系由 `css-contract.test.ts` 算特异度守 |
| **不提供逐格 `spanMethod`** | 虚拟滚动下两条路都不成立：全量求值 O(行×列) 次回调（50 万行 × 10 列 = 500 万次，秒级）；只对窗口求值则拿不到窗口外的段起点，结果是错的 | el-table / vxe 能那么做是因为不虚拟化。真实需求基本都是「按某个值成段」→ `mergeKey`；任意几何 → 静态 `merges` |

### 7.5 单元格渲染契约

起因是一次架构审查：三条渲染路径（列级 `render` / 单元格级 / 内置 `type`）与两个横切能力
（`textOverflow`、`mergeKey` 的 sticky 内层）之间的关系是错的，实测确认了三个问题。

> ⚠️ 这一节记的是**当时**收成的那条一维链。优先级模型后来又改过一次（一维链 → 三层 ×
> 粒度，`cellType` 升到每个粒度上、单元格级可穿透功能列），**现行模型看 §7.17**。
> 本节的容器层结论（装配与内容生成分开、tree 是装饰器）没有变。

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **容器装配与内容生成分开，收口到 `_fillCellContent`** | 装配原先写在「没有 render」的 else 分支里：配了 `render` 的列，`.vt-td-text` 与 `vt-td-text--ellipsis` **都不存在**，`mergeKey` 长段（`rowSpan=20`）也不套 `vt-td--merge-sticky` / `.vt-merge-label` —— 两个特性静默失效，无告警、文档也没写 | `textOverflow` 与 sticky 内层属于**单元格容器**关注点，与内容从哪来无关。现在 slot（td / sticky label / tree 内容区）三者共享同一套装配 |
| **优先级解析只留一处**（当时叫 `_resolveCellRenderer`，§7.17 起是 `_resolveCellContent`） | tree 分支（3854）与普通分支（3929）各存了一份**逐字复制**的 `_cellRenders?.[key]?.render ?? col.render` | 新增路径只改一处。tree 从「第二条渲染路径」降级成**装饰器**：画完缩进 + 箭头就把内容交回统一链，因此它也开始支持 `textOverflow` |
| **tree 列内容套 flex 行（`.vt-tree-row`）** | CSS 里 `.vt-tree-toggle` / `.vt-tree-indent` 早写着 `flex-shrink: 0`，但 `td` 是 `table-cell`，那两条一直是死规则；inline 排布也给不了省略号一个确定宽度 | 内容区拿 `flex: 1 + min-width: 0`。实测三级缩进下文本区宽 166/146/126px、截断全部生效、文字不被箭头覆盖 |
| **功能列 + `render` 改为告警，不再静默吞** | 实测 `type: 'checkbox'` + `render`：render **一次都没被调用**，输出内置勾选框 | `_warnTypeWithRender()` 在构造与 `setColumns` 时扫一遍（非热路径）。`tree` 不在告警范围 |
| **单元格级渲染改存实例 Map（`setCellRender`）** | 旧入口是行数据上的 `_cellRenders`：下划线前缀本意「内部」却要使用方手写、无类型（demo 里得 `as Record<string, any>`）、函数进数据对象污染 `JSON.stringify`/深拷贝/diff，且与 `_treeLevel`/`_groupLevel`/`_sheetCells` 挤在同一命名空间 | `Map<rowKey, Map<colKey, cfg>>` 存实例里。`_cellRenders` 保留为兼容读取路径（优先级更低）。另导出 `VirtTableRowExtras` 把那批下划线字段的契约类型化 |
| **React / Vue 必须覆写 `setCellRender`** | 适配层只包装了 `col.render`（`mountReact` / `mountSlot` + 行回收清理），`_cellRenders` 里的函数**完全绕过**这层 —— 也就是说单元格级渲染在三端一直是**不可用**的（返回 JSX/VNode 得到一个对象，核心 `appendChild` 不认） | 抽 `wrapRender` / `wrapRenderEditor` / `wrapCellConfig`，列级与单元格级共用同一份包装（否则又是「同一件事两处实现」）。mountKey 前缀区分：`r:` 列级、`c:` 单元格级、`e:`/`ce:` 编辑器 |
| **内容类型升为核心 `col.cellType`，与功能列 `col.type` 分开** | 这套类型原先只在 `spreadsheet.ts`：几个纯函数 + 核心不认识的 `row._sheetCells`，要使用方自己在 `col.render` 里接线。两个概念都叫 type、地位还不对等 | `cellType` 当时排在优先级链第 3 位（`render` 之后、默认取值之前），照常吃容器能力；**后来升成每个粒度都有的一档，见 §7.17**。`spreadsheet.ts` 复用同一渲染器，只保留自己的样式字段（bgColor 等） |
| **`renderCellContent` 返回判别式结果，不返回 HTML 字符串** | 旧实现统一拼字符串 + `escapeHtml` 兜底，转义责任散落在每个分支 | `{kind:'text'|'html'|'node'}` —— 只有 `rich-text` 走 `innerHTML`，`text` 只可能进 `textContent`。有单测断言 `<img onerror=...>` 不被解析 |
| **`cellType` 的内容元素高度必须锁在 `--vt-line-height`** | 我自己踩的：`.vt-cell-option` 第一版用 `padding: 2px 8px` + `line-height: 1.5`，12px 字号算出 22~23px，demo 实测**行高从 40 变 42**，直接破了 §7.11 的不变量。图片同理，`--vt-cell-image-max-h` 给 28px 时行高 47 | 锁 `height: var(--vt-line-height)`，图片用 `max-height: var(--vt-cell-image-max-h)` 且该变量指向 line-height。`css-contract.test.ts` 有断言守着 |
| **锁高之后还要 `vertical-align: top`** | 光锁高不够：`inline-flex` 参与基线对齐，底部 descender 空间把行盒顶高 —— 标签自身 21px，`.vt-td-text` 却是 22.8px，行高 41.8。`middle` **无效**（它仍以基线为参照），`top` 才行 | 修后逐列内层高全部 21px、行高 40，标签垂直居中（偏移 9px = padding-y） |

### 7.6 密度变体走 `--vt-density-*` 间接层

审查 `cellType` 时顺带发现**密度功能是坏的**，与渲染无关但同源于 CSS 变量规则：

| 事实 | 实测 |
| --- | --- |
| 密度类加在外层容器上**完全无效** | 父元素上 `--vt-line-height: 19px` 存在，但 `.vt-root` 自己声明 21px，行高照旧 40（期望 30）。CSS 变量里「元素自己声明的值胜过继承」，与特异度无关 |
| 唯一能生效的写法使用方做不到 | `.vt-root--compact` 需要加在核心创建的 root 上，而**没有任何代码会加它**（grep 无结果），也没有 density option |
| 文档当时是错的 | `theme.md` / `api/index.md` 都写着「可加在任意外层容器上」，还配了 40/30/50 对照表 —— 那是我上一个任务写进去的 |

修法：`.vt-root` 里的密度 token 改成 `var(--vt-density-x, 默认值)`，密度类只设 `--vt-density-*`。
实测三种用法都成立：外层容器 `.vt-compact` → 30、`.vt-loose` → 50、直接覆盖最终 token → 36。
`css-contract.test.ts` 加了两条断言（密度块不得直接声明最终 token；base 块的密度 token 必须经过间接层）。

⚠️ 教训：**happy-dom 测不出这类问题**（没有布局引擎），行高/基线相关的改动一律要 CDP 实测。
上面两条「我自己引入的行高破坏」都是靠真实浏览器逐列量内层高度才发现的。

### 7.7 测试环境

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **DOM 环境按文件开，不全局开** | 纯逻辑测试（11 个文件）在 node 环境下 environment 耗时 0ms；开 happy-dom 后每个文件多约 90ms | `// @vitest-environment happy-dom` docblock 只给 `*.dom.test.ts`。全局开会让全部测试白付环境成本 |
| **用 `renderControl` 钉渲染窗口，不 stub 几何** | happy-dom 里 `clientHeight` / `clientWidth` 恒为 0，虚拟滚动只算出 2 行的区间 | `renderControl: () => ({ begin, end })` 既精确又走真实代码路径（`renderControl` → `_mergeRenderControl` → 窗口裁剪 → `planRowCells` → DOM）。stub `HTMLElement.prototype.clientHeight` 会污染全局且绕过真实路径 |
| **`server.deps.inline: ['@virt-list/core']`** | 不加就 `Cannot find module .../dist/VirtListCore`：该包 dist 里有无扩展名的相对引用，Node ESM 解析器认不出来 | 交给 Vite 的解析器。**这是同一个依赖第二次咬人**（第一次是尝试 external 时，见 §7.1），纯逻辑测试碰不到它是因为不 import `index.ts` |
| **选 happy-dom** | 没有对 jsdom 做对比测量 | 按「更轻更快」的通行印象选的。如果后面遇到 API 缺失（`<table>` 相关、`Range`、布局属性），换 jsdom 是合理的备选，不必守着这个选择 |

### 7.8 对外 API 语义

| 决策 | 依据 | 结论 |
| --- | --- | --- |
| **`tooltip?: { delay }` 用对象，不用扁平的 `tooltipDelay`** | 扁平命名对齐 `emptyText` / `loadingText`，但 tooltip 明显还会长出 `maxWidth` / `placement` / `showOnUntruncated` | 包未发布，趁早收进对象，省掉后面一次 breaking change。**新增浮层配置项加在这个对象里，别再开扁平 option** |
| **状态持久化做成一个 `getState()`/`setState()`，字段全可选** | AG Grid v31+ 也是 `api.getState()`；但它把列状态与 sort/filter model 分成多个 API | 单一入口更好用，「字段可选 + 只应用出现的字段」同时满足「只想存一部分」的需求。**「不给字段」与「给空值」必须语义不同**（前者保持现状、后者清空），否则没法表达「只存列宽、排序每次回默认」 |
| **`VirtTableState.version` 必须有，且不匹配就整体忽略** | — | 状态存在 localStorage 里会跨版本存活。改状态形状时 `version` 加一，旧状态自动作废并告警，比让 `setState` 去猜旧结构安全得多 |
| **`setState` 里所有改动批量提交** | `setColumnVisible` / `sort` / `setColumnFilter` 每个都自带一次 `setColumns` 或 `_commitQueryChange` | 逐个调用 = N 次列重建 + N 次管线重算。`setState` 直接改列树与 `_sortState` / `_activeFilters`，最后一次 `setColumns` + 一次 `_commitQueryChange`。加字段时**别图省事改回逐个调用** |
| **列宽持久化的是逻辑宽度（`column.width`），不是渲染宽度** | 渲染宽 = `column.width * _widthScale`，`_widthScale` 由容器宽度决定 | 存渲染宽度的话，换个窗口尺寸打开会把上次的拉伸系数固化进列宽，越开越宽 |
| **`getState` 与 `getRemoteState` 是两回事** | — | 前者是可持久化的视图状态，后者是服务端取数状态机的运行时状态（不该持久化）。名字容易混，文档里写明了 |
| **`getCheckedKeys()` 返回勾选顺序，不排成显示顺序** | 这个方法存在的意义就是拿到「已勾选但**不在当前页**」的 key（服务端分页），那些 key 根本没有显示顺序 | 直接摊 `Set`（插入序即勾选序，`setCheckedRows(keys)` 沿用传入顺序），零成本。需要当前页显示顺序的场景 `getCheckedRows()` 已经给了 —— 两个方法分工，不重复 |

| **客户端分页做成默认，用已有的 `manualPagination` 关掉，不新加 `mode` 开关** | `_serverPage` 这个 getter 本来就存在（`manualPagination ?? dataMode==='server'`），但当时只用来 gate `_remote.goToPage` —— 因为没有切片这一段可跳过 | 补上切片后三个 manual 开关终于对称。代价是**原有行为变了**：不开 `manualPagination` 的现有用法会开始切片，所以把 `feature/pagination` 示例加上了这个开关。包未发布，此时改最便宜 |
| **切片切「根行」且放在结构展开之前** | 切展开后的扁平行会把父节点和子节点分到两页 | 树形/分组在切完的那一页上再展开；`total` 数的也是根行数。这条**不能为了「total 数扁平行更直观」而改** |
| **合计行算当前页** | 管线里聚合本来就在切片之后，注释写的是「天然反映当前视图」 | 与 el-table 一致。要全量合计请走服务端模式自己算 |
| **筛选回第 1 页，排序不回** | 筛选换了行集合，停在第 5 页看到的是完全不同的数据；排序只是换顺序 | 用 `_commitQueryChange('filter', { resetPage: true })` 的开关实现，**而不是无条件重置** —— `setState` 还原页码时必须能不被顶掉 |
| **`total` 不进持久化状态** | 客户端模式下它是派生的，服务端模式下由使用方取数后给 | 存下来只会在数据变了之后骗人 |
| **客户端模式下 `setTotal()` 告警并跳过** | 它与派生的 total 冲突，静默忽略会让人以为生效了 | 想自己管 total 就开 `manualPagination` |
| **翻页步长按 `clientHeight / estimatedSize` 估，不读核心渲染区间** | `_inViewRowBegin` / `_inViewRowEnd` **只在装了合并单元格时才维护**（走 `_mergeRenderControl`），当通用数据源不可靠 | 实测 400px 客户区 / `estimatedSize: 40` → 步长 10，`Ctrl+End` 后 `scrollTop` 正好等于 `maxScroll`。动态行高下是近似值，差一两行无妨（`scrollToCell` 会把目标滚进视口）。**因此键盘那部分零核心改动** |

### 7.9 怎么复现这些测量

纯逻辑走 vitest。DOM 行为与性能走 CDP：起 `pnpm dev:vanilla`（7901 端口），用 `--headless=new --remote-debugging-port=<port>` 拉 Chrome，`fetch http://127.0.0.1:<port>/json` 拿 target 的 `webSocketDebuggerUrl`，Node 内置 `WebSocket` 连上后发 `Runtime.evaluate`。要在页面里造真实实例就 `await import('/@fs/<abs>/packages/vanilla/src/index.ts')`（Vite dev 的 `/@fs` 能读 workspace 内的文件）。

### 7.10 还没拍板的（别当结论用）

**已修（表头）／仍在（数据区）：快速拖拽滚动条时闪白**

> **当前状态（2026-08-06）**：
> - **表头/表尾已修**：把 `thead` / `tfoot` 从 body table 移到滚动容器内的独立 sticky table
>   （见下面的 §7.12），表头空白帧 **41% → 0%**。
> - **数据区仍在**：那是虚拟滚动固有的「新位置还没 DOM 可画」，要靠压每帧主线程工作量
>   或引入滚动占位骨架，本质上换机制才能根除。
>
> 根因**不是** sticky、不是布局、不是 DOM —— 已排除的假设见下表，别再往那些方向查。

**现象序列**（用户录屏 + 量化实测一致）：数据区先空白，更严重时表头跟着空白。

| | 帧数 | 占比 |
| --- | --- | --- |
| 数据区空白 | 206 / 234 | **88%** |
| 表头空白 | 92 / 234 | **39%** |
| 两者同时 | 92 | 39%（= 表头空白数，**表头空白必然伴随数据区空白，从不单独发生**） |

（测法：人为每帧阻塞主线程 30ms + `Input.synthesizeScrollGesture` 快速滚动，按区带平均亮度 > 253.5 判空白。）

**因果链**：

```
拖拽滚动条 → scrollTop 瞬间跳几万 px
合成器立刻把内容层平移到新位置（它不等主线程）
  ↓ 新位置要有东西可画，得走完：主线程 _patch 生成行 DOM → layout → paint → 光栅化
  ↓ 跟不上 → 合成器只能显示空白（checkerboard）
数据区先空（图块面积最大、内容最多），表头有独立层撑得久一些，更严重时也空
```

**虚拟滚动放大了这件事**：普通长列表滚动时 DOM 一直在，光栅化只是把已有内容画出来；虚拟滚动下
新位置**根本没有 DOM**，必须等主线程 JS 跑完才有东西可画。所以同样滚动速度下空白窗口天生更长。

**每帧工作量是窗口长度的直接因子**：自动合并 demo（三列 `mergeKey`）表头空白 **42%**，
对照的斑马纹 demo **12%**，差 3.5 倍全在 `_patch` + 合并窗口裁剪。

**已排除的假设（别重复走）**：

| 假设 | 怎么测的 | 结果 |
| --- | --- | --- |
| **sticky 偏移依赖主线程，主线程一卡表头就脱位** | 纯 CSS 长表格对照（无 JS 参与）：A = `<table>` + `thead sticky`，B = `div` + sticky。主线程同步阻塞 **500ms**，期间合成器手势滚动（A 实滚 1794px），抓 35 帧量像素 | **已证伪**。两者都恒定在 顶+4 / 高 80 设备px，**各 0/35 异常**。sticky 由合成器处理，主线程卡死也不脱位；`<table>` 里的 `thead` 与普通 div **无差别** |
| 布局层面表头脱位或高度塌陷 | 用户真机拖拽 + 被动 rAF 探针，**1249 帧** | `thead.top` 恒 0、高度正常、`th` 数量正常，**异常 0 条** |
| 表头 DOM 被改动 | MutationObserver（childList/attributes/characterData），含真机拖拽 1249 帧 | **变更 0 次** |
| 合成层提升不稳定 | A/B 空白帧率：无声明 42% / `will-change: transform` 40% / `translateZ(0)` 42%；`compositingReasons` 三种 sticky 结构（thead/th/div）**全都只报 `Overlap`**，无 `StickyPosition` | 三者无差异，已证伪；改动已撤销。**`compositingReasons` 分辨不出 sticky 结构差异，别拿它当判据** |
| `<table>` 只覆盖窗口附近导致 sticky 包含块跑出视口 | 主线程阻塞 + 合成器滚动，页面内 rAF 采样 144 次 | `thead.top` 恒 0，table 从不离开视口 |
| 文档站（qiankun + VitePress）祖先链破坏 sticky | 遍历 `.vt-root` 祖先链查 transform/filter/contain/will-change/perspective/isolation/zoom | 干净，只有 `.vt-root` 自己的 `overflow: hidden` |
| 省掉 scroll 回调里的强制同步布局能缓解 | `_updateFixedShadow()` 从早返回**前**移到**后**（纵向滚动时 `scrollLeft`/`scrollWidth`/`clientWidth` 都不变，白读一次 `scrollWidth` 就是一次强制布局）。CPU profile：`_onHScroll` self time **5.1% → 3.9%**，idle 86.6% → 90% | 改动**已保留**（正确且零风险），但对现象**无实质改善**：严格 A/B 下表头空白 40%→39%、数据区 90%→88%，在噪声内。瓶颈不在这 1.2%，而在整条链 |

⚠️ **两个测量陷阱**：`Input.dispatchMouseEvent` **拖不动滚动条**（scroll 事件 0 次，只有 thumb 变色），要驱动真滚动用 `Input.synthesizeScrollGesture`；判空白必须**同时看表头带和数据区带**，只看表头会把「整屏空白」和「表头单独空白」混为一谈（实测后者根本不存在）。

⚠️ **区分表头底色与斑马灰要用严格匹配**：`--vt-header-bg` 是 `(248,250,252)`、斑马灰是 `(250,251,252)`，只差 2。用容差 4 量会把两者混起来，我因此一度误判成「数据行上移 42px」（实际数据行处在正常滚动位置，只是表头没画出来）。

**可能的缓解方向（未实施）**：
1. **压每帧主线程工作量** —— 直接缩短空白窗口，但压不到 0（只要「新位置的 DOM 要等主线程生成」这个前提不变）。
2. **滚动中降级为占位**（AG Grid 的做法）—— 检测滚动速度，超阈值时先渲染骨架灰条，停下再填真实内容。视觉上从「闪白」变成「闪灰条」，是最可能让人接受的方案。
3. 减小 `buffer` 能少生成几行，但会让空白边缘更容易露出，方向相反。

### 7.11 行高几何：`--vt-line-height` 必须是 px

这条是**硬约束，不是风格偏好**。改 `.vt-td` 的内边距 / 行高 / 边框之前先读完。

**要守的等式**：

```
line-height + 上下内边距 + `.vt-td` 的 1px 下边框 = 该密度声称的行高 = 使用方要传的 estimatedSize
默认   21 + 9×2  + 1 = 40
紧凑   19 + 5×2  + 1 = 30
宽松   21 + 14×2 + 1 = 50
```

`css-contract.test.ts` 守着它（纯数字断言，谁动了 padding / line-height 立刻红）。

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **`--vt-line-height` 用 px，不用无单位比例** | 原来是 `1.55`：14px × 1.55 = 21.7px → 行高 **40.69px**，而 `estimatedSize` 是 40。三种密度实测 40.69 / 31.14 / 50.69，全都与文档声称的 40 / 30 / 50 不符 | 改成 px 后精确落在 40 / 30 / 50。倒推得来：默认要 21px，紧凑要 19px（它另外覆盖了 `--vt-font-size: 13px`），宽松沿用 21px |
| **为什么这 0.69px 是灾难性的** | `fixedSize: true` 按 `estimatedSize` 建滚动几何 → 模型总高 100000×40 = 4,000,000，但真实 `scrollHeight` 到了 4,001,046 → `scrollTop` 能滚到 4,000,446，减去表头后 offset 4,000,405 **超出模型总高** → `@virt-list/core` 的 `_calcRange()` backward 分支线性扫描找不到匹配、**不 clamp、原地不动** → 窗口永久冻结在半路（实测停在第 5996 行），下方留 **376 万 px** 空白。静置 / 反向滚 / `forceUpdate()` 都救不回来 | 修后滚到底首行 99987、`scrollHeight` 4,000,042、不冻结 |
| **为什么这个 bug 时隐时现** | 从 `scrollTop = 0` 直接跳到底是好的 —— 那一刻 `scrollHeight` 还没被撑大，算出的 offset 仍在模型范围内。必须**先滚过一段**（表格已因超高行"长胖"）**再跳**，才会越界 | 复现序列：增量快滚 → 跳到底 |
| **不选「把 `border-bottom` 换成 inset 阴影」** | 也验证过可行（行高 40.00、冻结消失） | 但那是绕开症状；px 行高是从根上让令牌加起来是整数，还顺手让文字高度不再是小数、让 CSS 里那三句"行高 ≈ 30/50px"的注释变成真的 |
| **不选「强制 `.vt-td { height: 40px }`」** | 实测**无效**：`display: table-cell` 上的 `height` 是**下限不是上限**（CSS 2.1 §17.5.3：单元格高 = max(声明值, 内容最小高)）。40 < 40.69，声明被内容盖过；再加 `overflow: hidden` 也不裁剪。只有先把内容最小高压到 40 以下（比如 line-height 降到 20）它才开始生效 | 也就是说 `box-sizing: border-box`（本来就有）不是缺的那一环 |
| **根因其实在依赖里，我们只是让越界不再发生** | `_calcRange()` 越界后应该 clamp 到 `list.length - 1` 而不是原地不动 | 亚像素、页面缩放、字体回退仍可能让实际≠模型再触发它。**应给 `@virt-list/core` 报 issue**；在那之前 `css-contract.test.ts` 是我们的护栏 |

✅ **「冻结」那条已随 §7.13 的滚动模型消失**（2026-08-10）。越界的前提是「浏览器的 `scrollHeight` 与账本对不上」，而纵向已经没有浏览器滚动了：偏移量以账本 `getTotalSize() - clientSize` 为唯一权威，`_writeOffset` 每次写入都 clamp，不存在两套数字打架。

但**上面那个等式仍然要守**，理由换了：`fixedSize: true` 下账本按 `estimatedSize` 算总高，行的实际高度与它不符时，滚到底会与真实内容差出「误差 × 行数」（十万行 × 0.69px ≈ 6.9 万 px），表现为滚到底仍有空白、或最后几行到不了。不再是永久冻结那种灾难，但依然是可见的错。`css-contract.test.ts` 继续守。

⚠️ 使用方改 `--vt-font-size` / `--vt-cell-padding-y` 时必须一并调 `--vt-line-height`，并让等式重新成立、`estimatedSize` 跟着改。文档已写明（`theme.md`、`notes.md`）。


### 7.12 表头 / 表尾住在独立 table 里（治闪白）

`thead` / `tfoot` **不在 body table 里**，而是各自一个独立 `<table>`，与 body table 平级放在
滚动容器内：

```
.vt-root (position: relative)
├─ .vt-client (overflow-x: auto; overflow-y: hidden)   ← 只横向滚动，纵向归 JS（§7.13）
│   └─ .vt-table                      position:relative + top 残差，只剩 tbody，每帧变它
├─ .vt-header   ← absolute; top: 0; right: var(--vt-scrollbar-w); overflow: hidden
│    └─ <table position:relative>  ← 横向偏移落在**内层**，外层钉在可视区内
│         + 自己的 colgroup + <thead>（含 .vt-tr--pinned-top）
└─ .vt-footer   ← absolute; bottom: var(--vt-scrollbar-h); right: var(--vt-scrollbar-w)
     └─ <table position:relative> + 自己的 colgroup + <tfoot>（含 .vt-tr--pinned-bottom）
```

横向由 `_syncSectionX()`（scroll → 改内层 table 的 `left`）同步。

> 上面那两个「等高空占位块」（`.vt-header-spacer` / `.vt-footer-spacer`）与 `.vt-skeleton`
> 已于 §7.13 删除：表头表尾改为在账本里登记成 `stickyHeader` / `stickyFooter` 槽，
> 占位由 `getSlotSize()` / `getMaxOffset()` 表达，不再需要 DOM 里的实体。

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **把 thead/tfoot 移出 body table** | `<table>` 是整体布局上下文（行高列宽相互依赖）。虚拟滚动每帧改 tbody（padding 行高度 / 行内容 / rowSpan）→ 整个 table 布局失效 → `<thead>` **内容没变也跟着失效**，要重新 paint + 光栅化，主线程忙时来不及提交就是整条表头闪白。CDP 实测（阻塞主线程 30ms/帧 + 快速滚动）表头空白帧 **41% → 0%**，唯一变量就是「在不在 body table 里」 | 这也解释了几个此前想不通的点：`will-change` 无效（它给了稳定合成层，但没改变 thead 属于那个每帧重新布局的 table）；sticky 对照实验里 thead 稳如磐石（那个测试的 table 内容完全静止，没有 tbody 每帧变化去触发无效化） |
| **仍留在滚动容器内**（而非像 el-table 挂到容器外） | 留在容器里，横向滚动时它随内容被合成器平移：实测横滚 30 帧最大偏差 **0.03px**（纯亚像素舍入），静止 0。挂容器外要 `scroll` + `transform` 同步，主线程一卡横向就滞后 —— 等于把纵向的锅甩给横向 | 横向**零 JS、零滞后**。方案④（`absolute` 挂 `.vt-root`）实测同样能把表头做到 0%，但白付横向同步的代价，故不采用 |
| **仍然是 `<table>`，不改成 div 网格** | 多级分组表头重度依赖 `rowSpan`/`colSpan`。实测改造前后完全一致：`rowSpan=3` → 126px（=3×42）、`rowSpan=2` → 84px | table 的「跨行格高度 = 跨越行高之和」特性完全保留；换 div 就得自己算高度 |
| **`width: max-content` 不能省** | div 默认宽度 = 容器宽度，那横向滚动时它没有可滚动部分、压根不动，表头与内容立刻错开 | 配 `min-width: 100%` 兜住列很少的情况 |
| **colgroup 同步三份** | 列宽走 `<colgroup><col>`，三个 table 各一份 | `_rebuildColgroup()` 一处收口，同时设三个 table 的 `width`。**它只在列变化时跑**（列宽拖拽 / 容器缩放 / 列显隐），不在滚动路径上 —— 与「每帧同步横向位移」完全是两回事 |
| **`_rebuildColgroup()` 的调用必须在三份 colgroup 都建好之后** | 踩过：原来它在 body colgroup 刚建时就调用，那时表头/表尾那两份还不存在，被静默跳过 → 列数 `[0, 52, 0]`、表格宽度为空、横向对齐偏差最大 **4707px** | 移到 `_buildDOM` 末尾统一填一次 |
| **`.vt-footer` 容器无条件创建**（即使当下没有表尾内容） | 有 **4 处**代码做惰性插入：`tfoot` 没父级时 append 到 body table（服务端聚合 / `setFooterData` / `showSummary` 运行时 / `_rebuildPinnedRows`）。踩过：`table-pinned` demo 的置底固定行掉回 body table，而 sticky 已移到容器上 → 它落到表格末尾，实测位置在容器下方 **400px 外、完全不可见** | 先把 tfoot 放进容器，它就永远有父级，那 4 处判断都不触发，其它代码零改动。空 tfoot 时容器高度 0、不占位 |
| **内容撑不满容器时，JS 给 body table 补 `min-height`** | `position: sticky; bottom: 0` 只在元素**会被滚出视口**时生效，没有可粘余量就回落到静态位置 —— 紧跟末行下方。实测 3 行 + 400px 容器：表尾停在距容器底 **198px** 处，用户看到的就是「表尾滚动中跑到上面去了」。旧结构里 tfoot 在 body table 内被 tbody 顶到底，没暴露 | `_syncBodyMinHeight()` 把表体撑到「容器高 − 表头 − 表尾」，挂在 `_syncGeometryVars()` 末尾（同源：都依赖容器高与表头表尾高）。**试过 flex 但不可行**：`.vt-client` 改 `display: flex` + 表尾 `margin-top: auto` 会让 `.vt-skeleton`（`float: left; width: 0` 的滚动高度占位块）失效 —— 实测十万行 `scrollHeight` 从 400 万塌成 **642px**，虚拟滚动整个废掉 |
| **`observeSlotEl` 观察 sticky 容器而不是 thead** | 内核用它把顶部固定区高度算进滚动偏移，现在占住顶部那一段的是 `.vt-header` | 回落 `?? this._theadEl`，`showHeader: false` 时容器不存在 |
| **sticky 从 `.vt-thead` / `.vt-tfoot` 移到容器上** | 两个 section 自身只留底色 | ⚠️ 别把 sticky 加回 thead/tfoot：容器已经承担，加回去会双重 sticky |

**四种定位方式的实测对比**（360px 容器 / 纵滚 2000px / 横滚 400px）：

| 定位方式 | 纵滚后 top | 横滚后 left | 纵向钉住 | 横向跟随 |
| --- | --- | --- | --- | --- |
| **`sticky`（当前）** | 2 | −398 | ✓ | ✓ |
| `absolute` 挂**滚动容器** | **−1998** | −398 | ✗ | ✓ |
| `fixed` | 2 | **2** | ✓ | ✗ |
| `absolute` 挂**容器外** + JS 同步 | 2 | −398 | ✓ | ✓ 但滞后 |

- `absolute` 挂**滚动容器**没用：它相对包含块定位，而滚动容器的内容整体被滚走，绝对定位元素也在其中 —— 纵滚 2000px 后跑到 −1998，压根没钉住。这是最容易想当然的一条。
- `fixed` 相对视口，横向完全不跟随（left 恒 2），表头与列立刻错开。

**最终选了 `absolute` 挂容器外（`.vt-root`）+ JS 横向同步**，理由见下一节。

⚠️ 澄清一个因果：**治好闪白靠的是「thead/tfoot 移出 body table」，不是换定位方式**。
sticky 不是闪白的病因（主线程阻塞 500ms 的对照实验里它位置稳如磐石）—— 但它在**纵向定位**上另有问题，见下。

**为什么最终放弃 sticky、改用 `absolute` + 占位块**

sticky 的粘性余量由**主线程每帧算出的布局**决定。主线程跟不上时余量是旧值，元素就被摆到半路。
表尾方向尤其致命 —— 它的余量直接来自 body table 的高度，而那正是虚拟滚动每帧在改的东西。

染色抓帧实测（表头染青、表尾染洋红，阻塞主线程 30ms/帧 + 快速滚动）：

| 阶段 | 表尾贴底 | 表尾错位 |
| --- | --- | --- |
| ① 表尾用 `sticky; bottom: 0` | **4%** | 70%（61% 跑到中间 + 8% 跑到顶部） |
| ② 表尾改 `absolute` 挂 `.vt-root` | **99%** | 0 |
| ③ 表头也一并改 `absolute` | **100%** | 0 |

表头方向本来没暴露这个问题（上方没有会随帧变化的内容），但为了两者行为一致、也避免以后
在别的场景踩同一个坑，一并改成 `absolute`。

**占位问题**原来用等高空占位块解决（`.vt-header-spacer` / `.vt-footer-spacer` 留在滚动容器内，
替真身占住顶部/底部那一段，否则首行会被表头盖住、末行被表尾盖住），高度由
`_syncSectionSpacers()` 跟随真实高度（实测 42/42、40/40、无表尾时 0/0）。

§7.13 起改为**在账本里登记槽位**：表头 wrap 挂 `dataset.id="stickyHeader"`、表尾 wrap 挂
`"stickyFooter"`，两者都 `observeSlotEl()`。`getSlotSize()` 计入这两个槽 →
`getMaxOffset()` 自动为上下两段留出空间，表体的起始位置也直接从 `stickyHeaderSize` **算**出来
（`_applyBodyOffset`）。DOM 里的占位实体与 `_syncSectionSpacers()` 一并删除。

⚠️ 踩过：`dataset.id` 一度写在 `<thead>` 上，而 `observeSlotEl()` 传的是 wrap —— 两者错位，
core 的 ResizeObserver 回调里 `id` 是 `undefined` 直接 `continue`，**表头高度在账本里一直是 0**。
原生滚动时期靠占位块兜住了没暴露；新模型下这会让末行被表尾盖住。id 必须写在**被 observe 的那个元素**上。

**代价与已验证的边界**：横向要 JS 同步（`_syncSectionX`，单向 body → section，不存在
AG Grid 那种双向回环、也不用 `Math.floor` 处理小数 `scrollLeft`）。主线程卡顿时横向滞后一帧
—— 这个取舍是明确的：横向慢半拍远比纵向乱跳可接受。实测横滚 700px 后表头与表尾对齐偏差**都是 0**。

⚠️ **同步必须改 `left`，不能用 `transform`**：transform 会给后代建立包含块，固定列表头的
`position: sticky; left` 会失去参照、跟着整体被推走。踩过：`table-fixed` / `table-header-group`
横滚 1500px 后固定列表头偏差 **1500px**（与表体完全错开），改 `left` 后偏差 0。

⚠️ 一并删掉了 `_syncBodyMinHeight()`：它是 sticky 时代为了「给表尾制造粘性余量」加的，
改 absolute 后成了死代码（实测强制 `min-height: 0` 与保留它的行为完全一致）。

**滚动条不能被盖住**（表头表尾挂在 root 上、铺满整个宽度，必须主动让位）：

§7.13 起两条滚动条都是**自绘的 overlay 浮层**、原生滚动条整体隐藏，所以下面这段分类
已经不适用了（保留作为历史，它解释了「让位」这套机制的由来）：

| 滚动条类型 | 特性 | 措施 |
| --- | --- | --- |
| 经典（占位） Windows / macOS「总是显示」 | 占布局宽度，`offsetWidth - clientWidth` 量得到 | `_syncScrollbarVars()` 写出 `--vt-scrollbar-w/-h`，表头表尾用 `right`/`bottom` **收窄边界** |
| overlay（macOS 默认、移动端） | **不占布局空间**（量出来恒为 0），画在内容之上 | 收窄让不出任何东西 → 只能 `pointer-events: none` 让指针**穿透** |

第一版只做了收窄，用户反馈「滚动条还是被遮住」—— 正是因为 overlay 下变量恒为 0，收窄等于没做。
不解决的后果不只是视觉遮挡：`pointer-events` 吃掉事件后，表头/表尾高度那两段里滚动条**拖不动**。

**现在（自绘）两条措施仍然都要，但理由变了**：轨道的 `z-index`（30）高于表头表尾（10），
视觉上不会被盖住，所以 `right`/`bottom` 让位是纯粹为了**不压在轨道上**；而
`pointer-events: none` 仍然必需 —— 表头表尾横跨整个宽度、会先吃掉指针事件，
**§7.13 起这两条措施都不再需要**：两条滚动条都是自绘的 overlay 浮层，
`--vt-scrollbar-w/-h` 恒为 `0px`，表头表尾**贴边不让位**（让位 + 自动淡出是自相矛盾的组合，
见 §7.13）。`pointer-events: none` 与滚动条也无关了 —— 轨道 `z-index: 30` 本就在表头表尾（10）
之上，命中测试同样按层叠顺序走，滑块拿得到事件；那条规则留着只是为了让单元格空隙穿透。

事件由内部 `<tr>` 收回（`.vt-header > .vt-table > * > tr { pointer-events: auto }`），
所以排序点击、列宽拖拽、筛选按钮都正常 —— 真机验过：排序图标点击后激活、列宽拖拽 200 → 250。
只给 `<tr>` 开而不给容器开，单元格之间的空隙仍然穿透。

⚠️ headless Chrome **强制 overlay 滚动条**，`::-webkit-scrollbar` 的宽度覆盖无效、
`scrollbar-width: auto` 也无效，`offsetWidth - clientWidth` 恒为 0。这个环境测不出经典滚动条的
真实遮挡，只能手动设变量验证收窄逻辑；overlay 那一半靠 `pointer-events` 的计算值验证。

**横向偏移必须落在内层 `<table>` 上**：外层要被 `right` 钉在可视区内（否则连滚动条一起推走），
所以偏移交给内层。外层加 `overflow: hidden` 裁掉超出部分，同时它也成为内部固定列 sticky 的参照。
实测横滚 400px：外层右边界不变、内层 `left: -400px`、普通列与固定列偏差**都是 0**。

**AG Grid 怎么做的**（核实过 v33.3.2 源码，不是凭印象 —— 之前几次口头说的「用 transform 同步」是错的）：

它的表头 `.ag-header` **不用 sticky、也不在滚动容器里**（全文只有两处 `position: sticky`，都与表头对齐无关），
而是 `.ag-root` flex 列布局下的**兄弟节点**：

```
.ag-root (flex column)
├─ .ag-header                      自己不滚动
│    └─ .ag-header-viewport        overflow: hidden ← 靠改它的 scrollLeft 来「滚」
└─ .ag-body
     └─ .ag-center-cols-viewport   overflow: hidden ← 真正的滚动源
```

同步在 `GridBodyScrollFeature`：`horizontallyScrollHeaderCenterAndFloatingCenter()` →
`setScrollLeftForAllContainersExceptCurrent()`，**同步的是 `scrollLeft` 而非 transform**
（v29.3.0 起还专门移除了 `.ag-header-container` 上的 transform）。要维护 `lastScrollSource`
防双向同步回环，`scrollLeft` 还得 `Math.floor`（Chrome 会报 250.342234 这类小数，破坏边界判断）。

| | AG Grid | virt-table（方案③） |
| --- | --- | --- |
| 表头位置 | 滚动容器**外**（flex 兄弟） | 滚动容器**内** |
| 横向同步 | **JS**：scroll → 设 `scrollLeft` | **无**，合成器带着走 |
| 主线程卡顿时 | 表头滞后（同类结构实测 120ms 内不动） | 零影响（偏差 0.02px） |
| 表头结构 | div 网格 | 真 `<table>` |

**它必须用 JS 是因为表头在容器外，没有别的选择**；我们留在容器内就能免费拿到横向跟随，这点上结构更优。
代价在另一头：它用 div 网格，多级分组表头要自己算高度与跨列；我们保留 `<table>`，`rowSpan` 自动分配高度。
它选 div 是为了支持列虚拟化 + 拖拽 + 自动列宽的复杂组合，那套用 table 布局确实难做。

旁证：AG Grid issue #9172「移动端带 pinned 列时表头 vibrate/glitch」正是 JS 同步方案的典型症状。

**验证覆盖**：13 个 demo 真机回归（表头 absolute 化后重跑过）（basic / fixed / stripe / pinned / filter / column-drag / header-group /
no-header / body-merge / auto-merge / summary / empty / pagination），全部满足「表头 top 恒 0、
表尾 bottom 恒 0、横向对齐偏差 ≤ 0.02px」。另外单测四种内容量：3 行（不足撑满）、十万行、
十万行滚到底、无表尾，`scrollHeight` 与 skeleton 高度均正常。`header-structure.dom.test.ts` 7 个用例守 DOM 结构与三份 colgroup 同步
（happy-dom 没有布局引擎，位置与空白帧率只能靠 CDP，数字都记在本节）。

### 7.13 滚动模型：纵向归 JS，横向留原生（自绘滚动条）

跟随 `@virt-list/core` 的重构（virt-list 侧 `bf18aea 添加虚拟滚动条` → `83c3ef5 重构`）改造，
2026-08-10。**两个轴刻意不对称**，这是整节的核心：

| 轴 | 位置来源 | 滚动条 | 输入 |
| --- | --- | --- | --- |
| 纵向 | core 的虚拟偏移量 + `.vt-table` 的残差 `top` | 自绘，按**行索引**映射 | `InputController` 接管（滚轮 / 触摸 / 惯性） |
| 横向 | **原生 `scrollLeft`**（`overflow-x: auto`） | 自绘，按**像素**映射、驱动原生 | `InputController` 作为**交叉轴**接管（`crossEl`），只写 `scrollLeft` 不接管位移 |

`Scrollbar` / `InputController` / `positionToRatio` / `ratioToPosition` 全部**从
`@virt-list/vanilla` 引入**，不在表格里重写一份。皮肤自己写（`index.css` §3.1）：
把 `--virt-scrollbar-*` 映射到 `--vt-scrollbar-*`，于是暗色主题与换肤自动跟随。

| 决策 | 理由 / 实测 | 结论 |
| --- | --- | --- |
| **横向必须保留原生 scrollport** | `td.vt-fixed-left/right`、`.vt-group-label`（分组表头）、`.vt-merge-label`（自动合并）三处 `position: sticky` 都以 `.vt-client` 为参照。横向改成 JS 位移后它们**同时失效**，得重写整套固定列 / 分组 / 合并的定位 | 只把纵向的**位移**交给 JS（输入是另一回事：两条轴的滚轮 / 触摸都归 `InputController`，见下面 `touch-action` 那条）。代价是外观要靠自绘横条统一，而不是靠"两边都自绘"天然统一 |
| **表体用 `position: relative` + `top`，不用 transform** | 这是与 virt-list 唯一的实现分歧。`.vt-table` 是固定列 `<td>` 的祖先，**transform 会给后代建立包含块**，让 `position: sticky; left` 失去参照、跟着内容被推走 —— 与 §7.12 里表头横向同步踩的是同一个坑（那次实测横滚 1500px 后固定列表头偏差 1500px） | `top` 不建包含块，sticky 照常工作。代价：每帧一次表体布局失效（transform 本可只走合成）。可接受 —— 表体只有一屏 DOM（约 30 行），虚拟滚动本来每帧都在重建行、布局早就要算 |
| **写入的是「残差」而不是绝对位置** | `top = stickyHeaderSize + leadingSize − offset`。量级不超过一屏多一点，永远碰不到浏览器对位移量的上限（Chrome 实测 33,554,400px） | 顺手消掉两个老坑：① 元素高度上限（原来 `.vt-skeleton` 高度 = itemsTotalSize，超限那部分行永远滚不到）；② §7.11 的「滚不到底 / 窗口永久冻结」 |
| **`.vt-skeleton` 与两个 spacer 一并删除** | 新模型下没有任何元素的几何尺寸随行数增长 | 撑滚动高度、顶部占位、表头表尾占位这三件事全部由账本表达。`tr.vt-padding` 保留但不再写 height —— 它只是 `_patch` 里行插入的锚点 |
| **`_onVScroll` 要显式补做原生 scroll 顺带的事** | 纵向没有原生 scroll 事件了，过去"免费"的几件事都得手动：内容就位、滑块跟随、`_removeResizeLine()`、`_tooltip.hide()`（行 DOM 会复用，滚过之后指针底下那格已换内容）、`_updateActiveCellOverlay()`（浮层不在滚动层里，不再免费跟随）、`emitScroll`（插件浮层靠它） | 漏掉任何一条都是可见 bug，不是保险起见 |
| **用户输入必须走 `scrollFromUser()` 而非 `scrollToOffset()`** | 只有前者触发 `toTop` / `toBottom` 判定与自动续拉 | 走错的话滚轮 / 拖滑块到底都**不会触发 `loadMore`**，无限滚动整个失效。滑块拖拽、滚轮、触摸、边缘自动滚动四条路径都走它 |
| **拖拽热路径不用 `scrollToIndex`** | 它会挂渐进修正任务，那个任务会和下一次 `move` 抢偏移量 | 拖拽中走 `scrollFromUser`，修正只在松手（`onDragEnd`）时做一次 |
| **滑块按行索引映射，不按像素** | 不定高表格的 `itemsTotalSize` 随实测行高回填一直在变，按像素算滑块会在手指底下反复跳 | 分母取 `getIndexByOffset(getMaxOffset())`（滚到底时视口顶部那一行）。用 `list.length - 1` 是错的：那样滚到底滑块只走到 `(len − 可见行数) / len`，碰不到轨道尽头。`frac` 让高行内部也能连续移动 |
| **轨道挂 `.vt-root` 而不是 `.vt-client`** | `.vt-header` / `.vt-footer` 是 `.vt-root` 的子节点且 `z-index: 10`，而 `.vt-client` 自身没有 z-index —— 挂在视口内的轨道整棵子树都会被表头表尾盖住 | 轨道 `z-index: 30`。竖向轨道用 `--vt-body-view-t/-h`（`_syncGeometryVars()` 本来就在维护，原是给 `.vt-merge-label` 用的）限制在表体带内，不横穿表头表尾 |
| **显形选择器必须重写，不能直接用 virt-list 的 scrollbar.css** | 那份写的是 `.virt-list__client:hover > .virt-scrollbar`（轨道是视口的直接子节点），而这里容器叫 `.vt-client`、轨道挂在 `.vt-root` 上，**既不同名也不是父子关系** | 改成 `.vt-root:hover > .virt-scrollbar`。鼠标在表头上时滚动条也可见 |
| **键盘让给 `vtKeyboardNav`** | 插件在 `.vt-root` 上监听 keydown，`InputController` 挂在 `.vt-client`（后代），冒泡时**先**于它触发 → 一次方向键会既滚一段又移一格 | 装了该插件时给 `InputController` 传 `keyboard: false`（它自己已实现 PageUp/Down、Home/End）；没装时保持接管，补回原生 `overflow: auto` 时代免费的方向键滚动 |
| **`touch-action` 不放行任何单指平移**（`none` 打底 + `pinch-zoom`），横向作为交叉轴一并交给 `InputController` | 2026-08-14 移动端实测的 bug：竖向滚起来之后**横向完全滚不动**，只有竖向分量恰好为 0 或已顶到边界时才横滚得动。根因是 `preventDefault` 没有「只拦一条轴」的粒度 —— 纵向一拦，同一个手势里的横向分量也一起没了，而当时没传 `crossEl`、没人替横向补上。桌面端触摸板斜向横扫同样被吃掉。曾经的 `pan-x` 还有第二层问题：浏览器的方向判定**先于** JS，它一旦启动原生 pan-x，后续 `touchmove` 的 `cancelable` 变 `false`，轴锁失效且 `_scrollCross` 会叠成横向双倍速 | 传 `crossEl: this._clientEl`（横向 scrollport 就是它自己，不像 virt-list 另有滚动层）。`pinch-zoom` 保双指缩放，前面的 `none` 是 Safari < 13 的兜底 —— 无效声明会让 `touch-action` 落回 `auto`，两条轴全被浏览器抢回去。位移机制一行未动：横向仍是 `scrollLeft`，sticky 照旧，写入照常触发 `_onHScroll` |
| **手势中途 `touchstart` 的 target 被 DOM 回收 → 滚动静默断掉** | 2026-08-14 报的第二个移动端 bug：**手指按在自动合并格上滚不动**。touch 事件的 target 在 `touchstart` 时就固定，后续 move / end 全派发给它；`.vt-merge-label`（及其内层 `.vt-td-text`）是 `_mergeCellSlot` 每帧新建的，合并行结构一变就走 `_fillRowCells` 的 `tr.innerHTML = ''` —— target 一被摘走，事件路径里再没有 `.vt-client`，`InputController` 就收不到了。**CDP 实测**（headless + mobile emulation，按在 sticky 内层上竖滑 8 帧）：`.vt-client` 上只收到 3 次 `touchmove`、`document` 同样 3 次、**没有 `touchcancel`**，残差 `top` 从第 3 帧起卡死；而挂在 target 自己身上的监听收到全部 **8** 次。对照组（按在复用的普通 `td` 上）三个计数都是 8 | 修在 `InputController`（虚拟列表回收 item DOM 时是同一个坑）：`touchstart` 时额外把 `touchmove`/`touchend` 挂到 target 上，**仅当 `!_el.contains(e.target)` 时**才接手，否则让给冒泡路径（两边都消费会滚双倍）。修完实测：8 帧全部生效、每帧跟手 30px、窗口正常推进。⚠️ 治本是别每帧重建 label（复用或移动节点），没做 —— 兜底已经够，但 label 的每帧重建对 hover / tooltip / 点击态仍有影响 |
| **表头 / 表尾要作为 `InputController` 的额外输入源** | 2026-08-14 报的第四个问题：**表头和表尾上滚不动**，PC（滚轮）与移动端（触摸）都不行。这两段是 `absolute` 挂在 `.vt-root` 上的浮层、是 `.vt-client` 的**兄弟**（§7.12 的取舍），所以那里的事件冒泡永远到不了挂在视口上的 `InputController`。移动端还叠了第二层：浏览器眼里表头不在任何可滚容器里，`touch-action` 留着 `auto` 时纵滑会去滚**外层页面** | `InputController` 加 `sources` 选项（同一个状态机，轴锁与惯性只有一份），virt-table 传 `[_headerWrapEl, _footerWrapEl]`；两段的 `touch-action` 同样收紧成 `none` + `pinch-zoom`。固定行渲染在这两段里，一并生效。⚠️ **不能图省事传 `_rootEl`**：插件浮层（列面板 / 筛选 / 编辑器）也挂在根上，它们内部要滚，冒泡上来会变成表格跟着动。CDP 实测：表头滚轮 #23→#38、表头触摸 #38→#45、表尾滚轮 #45→#56、表尾触摸 #56→#68，且 `window.scrollY` 全程不变 |
| **表头能滚之后，从表头发起的拖拽要做方向门控** | 一根手指同时产出 touch 与 pointer 两套事件：拖拽吃 pointer，而表头上的 touchmove 现在会冒泡给 `InputController` —— 不处理的话触屏上纵滑会**同时**拽起一列并滚表格。`startDrag` 原来的阈值判定是 `\|dx\| < t && \|dy\| < t`，任意方向 4px 就开拖 | `startDrag` 加 `axis?: 'x' \| 'y'`：越过阈值那一刻主导轴不符就整个手势作废（与 `InputController` 的轴锁同一套启发式）。`vtColumnDrag` 传 `axis: 'x'` —— 纵滑落回滚动，横滑照旧拖列；拖拽开始后在 `document` 捕获阶段 `stopPropagation` 掉 touchmove，免得横滑时表格跟着横滚。`.vt-resize-trigger` 那 8px 手柄直接吞掉 touch 事件（它整个属于拖拽）。`.vt-th--draggable` 的 `touch-action` 从 `pan-y` 改成 `none`+`pinch-zoom` —— 旧值的注释写着「纵向留给浏览器滚动」，那个前提在纵向归 JS 之后就不成立了，放行纵向 pan 只会去滚外层页面 |
| **列虚拟化占位格 `.vt-cell-pad` 必须进复用池** | 2026-08-14 报的第三个移动端问题：**合并格上滚动很卡**。pad 没有 `_ci`（不对应任何列），于是 `_updateCenterCells` 的清理循环把它当"不需要的格子"每帧 `remove()`，插入循环再 `createElement` 建一遍。CDP 实测（自动合并 demo，触摸滚动 3×700px，CPU 4x 节流）：tbody 的 **3595** 条 DOM 变更里 **3264 条是 pad 的删+建**（占 90%），而同样距离下无合并的 `table-basic` 总变更只有 **71** 条 —— 差 50 倍。pad 身上唯一会变的属性就是 `colSpan` | 单独维护 `padPool`：收集阶段把 pad 收进池、清理循环跳过它们，插入阶段 `pop()` 复用并只在 `colSpan` 变了时才写，循环末尾把多余的摘掉。实测 DOM 变更 3595 → **331**，Script 128→75ms、Layout 68→45ms、RecalcStyle 115→69ms、累计任务 640→417ms。剩下的 `+td.vt-td×195`（合并 rowSpan 变化必须新建的格子）与 `±tr.vt-tr×68`（行进出窗口）是合理量级。⚠️ headless 里测不出"卡"（80% idle、几乎无长帧），所以**流畅度只能靠真机验**，这里量的是 DOM 变更量与三项耗时 |
| **触摸手势对齐 iOS：起步阈值 + 方向锁定 + 双轴同曲线惯性** | 表格的阅读单位是行与列：竖向浏览时列漂几十像素，眼睛就得重新找列（冻结表头与固定列存在的全部理由）。Android 的自由 2D 滚动没有「不想漂」这个选项；iOS 的「锁 + 持续斜推可解锁」两种能力都给。另外锁轴时每帧只驱动一条轴，另一条的重渲染（`_onHScroll` 曾占 5.1% self time）直接省掉 | 实现在 `virt-list` 的 `InputController`（一个手势状态机，必须同时看两轴，不能两边各写一份）：起步 9px 内不滚、越过阈值按位移方向锁轴、另一轴净移动超 40px 解锁、抬手两轴按同一条指数曲线衰减（`INERTIA_DECAY` 0.95 → 0.967，对齐 iOS 的 0.998/ms）。橡皮筋回弹**没做**，触边即停 |
| **两条滚动条都是 overlay 浮层，谁都不让位** | 走过一段弯路，值得记下来：先是让位（表头表尾 `right`/`bottom` 各收 10px）+ 轨道自动淡出，这两者**自相矛盾** —— 让位留出的空带，遮挡物却会自己消失。表现：拖竖条时横条淡出，底部那条 10px 空带露出下方仍在滚动的行内容。中间试过把轨道底色改成不透明去遮，那是让「一个会自动消失的东西」去当遮罩，方向就错了 | `--vt-scrollbar-w/-h` 恒为 `0px`（保留变量只为兼容使用方样式），表头表尾贴边，`.vt-client` 不收窄，轨道底色回到 `transparent`。要么两边都让位且常驻，要么都不让位——选了后者，与 macOS 浮层滚动条一致。代价：滑块显形时压住内容最右/最下 10px（含右固定列），1200ms 后淡出 |
| **`clientWidth` / `clientHeight` 不需要扣轨道** | overlay 不占布局空间，这两个值直接就是可见区尺寸 | 曾因让位方案短暂加过 `_trackGutter()` 扣减，改回 overlay 后一并删除。⚠️ 若将来改回让位，`--vt-body-view-h` / `--vt-center-view-w` 都必须显式扣 —— 隐藏原生条之后浏览器不再自动把滚动条尺寸从 client 尺寸里扣掉，漏扣会让纵向轨道高出 10px、分组标签钉宽偏大、`.vt-merge-label` 居中偏下 5px |
| **表头表尾的 `pointer-events: none` 与滚动条无关** | 轨道 `z-index: 30` 本就在表头表尾（10）之上，命中测试同样按层叠顺序，滑块拿得到事件 | 那条规则留着是为原本的用途（让单元格空隙、以及改回原生条时的那一条穿透）。别再把它写成「滑块可拖的前提」 |
| **表头/表尾高度量 wrap 而非 `<thead>`/`<tfoot>`** | 占住上下两段的是 `.vt-header` / `.vt-footer` 这两个 wrap，它们也正是被 `observeSlotEl()` 观察、登记成账本槽位的元素 | 两处用同一测量对象，账本（`_applyBodyOffset` 用的 `stickyHeaderSize`）与 CSS 变量才不会错开 |
| **`overflow-anchor: none` 必须显式关** | `overflow: hidden` 依然是个 scrollport，浏览器的滚动锚定照样会在内容高度变化时**静默**改 `scrollTop`（且不派发 scroll 事件） | 与我们自己维护的偏移量打架。另外 focus / `scrollIntoView` 造成的漂移由 `InputController._onNativeScroll` 读出、归零、折算进虚拟偏移量 |

**`clientEl.scrollTop` 恒为 0** —— 所有「+ scrollTop」的浮层定位都要去掉（`scrollLeft` 仍有效）：
`_updateActiveCellOverlay` / `getSelectionRect` / `_startResize`（`index.ts`）、
`plugins/cell-editor.ts`、`plugins/drag-sort.ts`。
`internal/auto-scroll.ts` 的 `scroller.scrollTop += dy` 换成新增的 `scrollByY` 回调，
调用方（`drag-sort` / `cell-selection`）经 `ctx.table.scrollByY()` 走回 `scrollFromUser`。

**API 变化**（对外，已写进 `docs/vanilla/api/instance.md` 的「滚动模型」一节）：
- `scroll` 事件载荷从 DOM `Event` 变成 core 的 `VirtScrollEvent`（带 `source: 'user' | 'program' | 'adjust'`）；
- 新增实例方法 `getOffset()` / `scrollByY()`，新增选项 `scrollbarAutoHide` / `scrollbarMinThumbSize`；
- `rangeUpdate` 事件 core 已移除，改由表格从 `update` 的 `state.inViewBegin/End` 派生（**保留区间去重**，
  否则使用方会被滚动中的每一帧打中）；
- `state` 的类型 `ListState` → `ListState`（字段完全相同，纯改名）。

**验证覆盖**：`scroll-model.dom.test.ts` 守残差公式、槽位登记、`.vt-skeleton` 已消失、
`rangeUpdate` 去重、`getOffset`/`scrollByY`。happy-dom 无布局引擎，滚动手感 / 像素对齐 /
sticky 标签不漂移这些只能手验（清单在下面的「待手验」）。

### 7.14 内置单元格组件（`/components`）

一组**工厂函数**：`VtSwitch(opts)` 返回一个配好 `render` / `renderEditor` 的
`VirtTableColumn`。18 个，分三类交互模型（清单见 §4）。下面几条是踩出来的，新增组件前先读。

> 术语：曾经叫「列组件」，2026-08-11 改称**单元格组件** —— 装在列上只是最常见的用法，
> 配 `asCell()` 也能只装在单个格子上。改名理由与 `asCell` 的三个缺口见 §7.17。

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **「直接可点」的组件刻意不提供 `renderEditor`** | 给了的话，装 `vtCellEditor`（默认 `trigger: 'click'`）的人点一下开关，得到的是一个**盖住开关的编辑浮层**，要点第二下才生效 —— 对开关型控件是纯粹的多余 | `VtCheckbox` / `VtSwitch` / `VtRate` / `VtActions` 只有 `render`，点击即写回。代价是这些列不参与「编辑态」语义（Esc 撤销、`openCellEditor()`）—— 布尔值本来也没有可撤销的中间状态 |
| **可交互的 `render` 必须 `stopCellInterference`** | 不拦的话装了插件就**双重响应**：`vtCellSelection` 把 `mousedown` 当框选起点、`vtCellEditor` 把 `click` 当进入编辑 | `shared.ts` 里收口，`mousedown` / `click` / `dblclick` 三个都 `stopPropagation`。**只停传播不 `preventDefault`** —— 勾选框的原生切换、按钮的原生聚焦都还要 |
| **编辑浮层的外观归属可切换（`editorChrome`）** | 默认那套「浮层画边框 + focus 环，编辑器退化成纯内容层」是**为内置 `vt-*` 设计的隐式契约**（`.vt-comp-input` 自己 `border: none; background: transparent`）。第三方组件库不可能知道，它自带一整套外观 → ① 两层边框且对不上；② `> * { height: 100% }` 把 `el-input--small` 的 24px 拉满单元格，激活前后高度不一致；③ focus 环叠两层 | 列上 `editorChrome: false`，或整表 `vtCellEditor({ chrome: false })`（**列级优先**）。浮层加 `.vt-cell-cover--bare`：去掉全部 box-shadow、`> *` 的 height 改 `auto`，**背景保留**（得盖住底下那一格的查看态）。class 必须在调 `renderEditor` **之前** toggle —— 组件常在挂载时测自己的尺寸（EP 的 select 要算下拉宽度） |
| **对齐内边距只能加在 `--bare` 上，绝不能加基类** | 浮层的 rect 等于**整个 td**（含 td 的 `--vt-cell-padding-x`），自己却 `padding: 0` —— 内容起点从查看态的 14px 变成 2px（border），激活瞬间左跳。修它的诱惑是给 `.vt-cell-cover` 补 padding，**踩过一次**：全部内置编辑器的输入区凭空窄一个 padding，而且 `VtTextarea`（cover 模式）与 `VtAutocomplete` 这两个**没传 `geometry`**、默认拿 anchor 当几何基准的组件，浮层宽度跟着缩、位置跟着偏 —— `VtSelect` / `VtMultiSelect` / date 系列因为显式传了 `geometry: ctx.el` 才躲过 | `padding: 0 var(--vt-cell-padding-x)` 只写在 `.vt-cell-cover--bare` 里。裸模式用 `border: none` 归零，**不要**改成 inset box-shadow —— inset 阴影会被有背景色的子元素盖掉（`.vt-comp-input--invalid` 带 `background !important`）。默认路径的 CSS 一个字节都不动 |
| **自绘浮层挂 `.vt-client`（与 `.vt-cell-cover` 同层），并打 `data-vt-popup`** | 三条理由缺一不可：① 不能挂 body —— `--vt-*` 只声明在 `.vt-root` / `.vt-fb` 上，挂 body 整批 `var()` 静默失效（§7.2 有实测）；② 不能塞进 `.vt-cell-cover` —— 它高度**就是单元格高度**且 `> * { height: 100% }`，40px 的格子里塞不下 4 行文本域或下拉；③ 不在白名单里的话，点一下下拉项 `vtCellEditor` 的 outside-click 就把编辑器连锚点一起关掉。**在 `.vt-root` 与 `.vt-client` 之间选后者**：cover 就挂在 `.vt-client`，同层才能共用一套定位公式、横滚时由同一个 scrollport 一起搬（见下一条） | 基元 `_popup.ts` 一处实现，宿主 `closest('.vt-client')`，退 `.vt-root`（组件被拿到表格骨架外单独用）再退 body 只为不抛异常。**顺带在 `plugins/cell-editor.ts` 的 `onOutsideClick` 加了一条 `[data-vt-popup]` 放行**（原来只有 `.el-popper` / `[data-popper-placement]` 两个第三方后门） |
| **浮层定位与 `.vt-cell-cover` 逐字同一套公式** | 用户要求「定位要跟 `vt-cell-cover` 一样，元素也放到它下面」。原来浮层挂 `.vt-root` —— 那不在横向 scrollport 里，横滚只能靠 rAF 锚定循环逐帧追 cover，两者之间必然差一帧；纵向可视高度也按 root 算（含表头表尾那两条），与真正会裁掉浮层的盒子不是同一个 | 挂 `.vt-client`（DOM 里就在 cover 之后），并照抄 `plugins/cell-editor.ts` 的 `position()`：`top` 取「相对容器可视区上缘」的差值（`overflow-y: hidden` → `scrollTop` 恒 0），`left` **加上 `host.scrollLeft`**（横向是原生 scrollport，浮层跟着内容滚，写的必须是内容坐标）。below 模式的水平夹紧仍在**可视区坐标**里做，夹完才 `+ scrollLeft` —— 反过来先加再夹，横滚后夹的是另一个区间，面板会被按到左边缘。`z-index: 30` 高过 cover 的 5。CDP 实测（600px 视口 / 940px 内容，横滚 180 与 340 各测一次）：**cover 模式浮层与 `.vt-cell-cover` 逐像素同框**（`left/top` 237,182 → 200,182 全程相等，高 39 vs 40 是刻意的，见下文那条）；below 模式面板 `left` 与单元格同为 340 / 160，而写进 style 的内容坐标横滚前后恒为 `320px` —— 也就是横滚期间**一次重定位都不需要**。（面板刚弹出那一帧量到 341.8@196.4 是 `.vt-filter-panel` 的 `vt-pop-in` 缩放动画没跑完，等 400ms 后回到 340@200，不是定位误差） |
| **浮层两种定位模式：`below` / `cover`** | `VtTextarea` 第一版做成「在单元格下方弹一个面板」，观感是「旁边开了个东西」而不是「这一格在编辑」 | `cover` 模式：左上角对齐单元格、宽度取齐、初始等高、随内容长高，顶出容器下缘时整体上移。**仍然是 cover 的兄弟而不是子节点**（上一条的理由 ② 没变，塞回 `.vt-cell-cover` 一长高就被压回一行）。cover 不套 `.vt-filter-panel` 面板皮肤 —— 它是内联编辑框不是面板，边框对齐 `.vt-cell-cover` 的 2px 主色边 |
| **浮层必须截住 `wheel` / `touchstart` / `touchmove`，不许冒到 `.vt-client`** | 挂进 scrollport 的代价。核心把纵向滚动整个接管了（`InputController` 挂在 `.vt-client` 上，**非 passive、会 `preventDefault`**）——浮层成了它的后代之后，在下拉长名单上滚一下会同时坏两件事：表格在浮层底下滚起来（锚点跟着走，浮层追着锚点动），而 `.vt-filter-list`（`max-height: 260px; overflow-y: auto`）自己的原生滚动被 `preventDefault` 吃掉 → 名单滚不动 | `_popup.ts` 在浮层根节点上 `stopPropagation` 这三个事件，**只截传播不拦默认行为**（面板内部该滚的照样由浏览器滚）。滚到列表尽头也刻意不续传给表格 —— 浮层锚在某个单元格上，把它底下的表格滚走没有合理语义。CDP 实测：在面板里滚 `deltaY: 240`，首行仍是 0、`defaultPrevented: false`；同一下滚在 `tbody` 上，首行 0 → 10（截的只是浮层那一支） |
| **`anchor`（存活探针）与 `geometry`（几何基准）必须能分开** | cover 模式要盖住整个单元格，几何基准得是一个**稳定**元素；而存活判定要的是一个**会被清掉**的元素。同一个元素满足不了两者 | `anchor` = `renderEditor` 返回给核心的那个元素（cell-editor 关闭时随 `innerHTML = ''` 消失 → 浮层自毁）；`geometry` = `.vt-cell-cover`（cell-editor 自己维护、位置始终正确）。**别拿 `<td>` 当 geometry** —— 行 DOM 是池化复用的，那个元素滚动后已经属于别的行 |
| **定位要扣掉宿主的边框宽度** | CDP 实测踩到（当时宿主是 `.vt-root`，它有 1px 边框）：写 `left: 241px` 实际落在 250 而不是 249 —— **`absolute` 的参照是 padding-box，而 `getBoundingClientRect()` 给的是 border-box**。below 模式一直偏 1px 只是看不出来，cover 模式「盖住单元格」立刻就露馅 | `position()` 里读 `borderLeftWidth` / `borderTopWidth` 扣掉，算可用余量也改用 padding-box 尺寸。修后左上角精确对齐（249,131 vs 249,131） |
| **cover 的初始高度要扣浮层自己的边框** | 浮层是 `border-box` + 2px 边框，把单元格的 40px 直接给 textarea 会让浮层变成 44、比单元格高一圈 | `baseH = cellH - frameH`。另外**盖 39 而不是 40 是对的**：td 的 40px 含 1px 下边框，那是相邻行共用的分隔线，盖满会压在线上 |
| **`autoGrow` 每次必须先把高度塌回 0 再读 `scrollHeight`** | `textarea.scrollHeight` 不会小于当前 `height` —— 不重置的话删内容时高度只增不减 | `ta.style.height = '0px'` 再读。上限取 `min(maxRows 行高, 容器可视高)`，到顶后 `overflow-y: auto` 内部滚动；没到顶设 `hidden`，否则空行也显示一条灰轨 |
| **`maxRows` 默认不限** | 默认给 8 时，30 行内容只长到 172px 而容器还有 602px 可用 —— 与「随内容撑开」的预期相悖 | 默认只受容器高度约束（实测 30 行长到 594px / 容器 602）。要更克制的观感再配 `maxRows` |
| **在 `renderEditor` 里创建浮层必须传 `owner: ctx.el`** | 这是 DOM 测试抓到的真 bug：cell-editor 是 `renderEditor()` 拿到返回值**之后**才 `appendChild`，所以创建浮层的那一刻锚点**还没进文档**，`anchor.closest('.vt-client')` 恒为 `null` → 浮层落到兜底的 `document.body` 上 → 上一条的理由 ① 立刻成立 | `ctx.el` 是编辑浮层本体，它本来就是 `.vt-client` 的子节点，永远找得到宿主。同理首帧量不到位置，浮层先 `visibility: hidden`，等锚定循环量到真实位置再显形（否则在左上角闪一帧） |
| **浮层用 rAF 锚定循环，而不是只靠事件** | 两件事都只能靠轮询：① 锚点消失就自毁 —— 编辑浮层被清空或承载的 `<td>` 被虚拟滚动回收时，锚点无声离开 DOM，浮层收不到任何事件，会留一个悬空面板；② 锚点移动就跟随 —— 纵向位移归 JS（`.vt-client` 的 `scrollTop` 恒 0，内容靠 `.vt-table` 的残差 `top` 走），列宽变化、排序筛选换行同理，而 cell-editor 的 `onScroll` 只管它自己那层 cover | 每帧一次 `isConnected` + 一次 `getBoundingClientRect`，且只在浮层打开期间跑。**横滚不再需要它**：浮层与 cover 同在 `.vt-client` 这个 scrollport 里，浏览器一起搬，重算出来的内容坐标与上一帧相同 |
| **语义色字段叫 `variant`，不叫 `type`** | tsc 直接报错：组件 options 从 `VirtTableColumn` 派生，而 `type` 在列上已经是**功能列**（`checkbox` / `index` / `tree` …），`'default'` 不在那个联合类型里 | 名字冲突只是表症，真问题是语义会混（`col.type` 功能列 / `col.cellType` 内容类型 / 标签配色，三件事） |
| **`VtSelect` 不用原生 `<select>`** | 第一版用的是原生控件，用户直接反馈「样式不对」。原生下拉列表由**操作系统**渲染：`--vt-*` 一个都吃不到，不跟暗色主题、不跟圆角/阴影/字号，收纳与箭头样式还各平台不同 —— 与同为下拉的多选面板 / `VtCascader`（自绘面板）摆在一起明显是两套东西 | 改成自绘面板，外壳与列表项复用 `_panel.css`（后来这份实现进一步收成 §7.14.1 的 `createEnumEditor`，`VtSelect` 与 `VtPerson` 共用）。CDP 实测：面板 `bg rgb(255,255,255)` / `radius 10px` / 有阴影 / `font 14px`，与多值面板**完全同值**；暗色下 `bg rgb(34,36,43)`、选中色跟到 `rgb(76,141,255)` |
| **面板的几何基准取单元格盒子，不取锚点** | 锚点在 `.vt-cell-cover` 的 2px 边框内侧，比单元格窄 4px；`.vt-filter-panel` 又有 1px 边框而 `min-width` 默认按 content-box 算 —— 两项叠加，实测面板 162.3@93.2 vs 单元格 164.3@91.2，左右都错开 | `geometry: ctx.el` + 给 `.vt-comp-popup` 加 `box-sizing: border-box`。修后 164.3@91.2 精确对齐。三个面板类组件都改了 |
| **选中态不能只靠颜色** | 只把选中项染成主色，对色觉障碍用户等于没有标记 | 加一个对勾（`.vt-comp-check`），未选中时元素仍在、占位，避免勾选让文案左右跳动 |
| **`VtTag` 的标签复用 `renderCellContent('option', …)`** | 那正是 `cellType: 'option'` 的胶囊，颜色走 `--vt-cell-option-color` + `color-mix` 派生底色 | 不另写一套，否则「表格内置的标签」与「单元格组件的标签」会长得不一样，换主题要改两处。同理浮层皮肤复用 `_panel.css`（`components.css` 里 CSS `@import` 内联） |
| **展示元素一律锁高 `var(--vt-line-height)` + `vertical-align: top`** | 与 §7.5 末两条同源。自己又踩了一次：`.vt-comp-link` 写了 `overflow: hidden` 却没配 `vertical-align` —— `overflow != visible` 的 inline-block **以底边缘而不是内部基线参与基线对齐**，行盒会被顶高 | `.vt-comp-cell` 收口（各组件的修饰类**不许再声明 height**）。`components-contract.test.ts` 静态扫 CSS 文本守着，并且做成**通用扫描**：任何 `inline-flex` / `inline-block` 规则不配 `vertical-align: top` 就红（`position: absolute` 的豁免，它不参与行内布局） |
| **`onChange` 走 `commitValue` 统一收口** | 17 个组件各自散着写 `(row as any)[col.key] = v`，加回调就要改十几处，漏一处就是「这个组件不触发 `onChange`」这种说不清的不一致 | `shared.ts` 的 `commitValue(opts, ctx, value)`：先改 row 再通知。**不做受控模式** —— 那需要把值的所有权交给使用方，与 `renderEditor` 直接改 row 的既有契约冲突 |
| **确认气泡 / 面板文案不接表格 i18n** | 单元格组件是纯工厂函数，拿不到 `VirtTable` 实例，读不到 `options.locale` | 默认中文（与默认语言包 `zhCN` 一致），要别的语言在 `confirm` 对象里传 `okText` / `cancelText`。**别为此给工厂函数加 table 参数** —— 那会让「建列」依赖「已有实例」，列定义就没法在模块顶层写了 |
| **`VtCascader` 的 `valueType: 'leaf'` 预建路径索引** | 反查是一次 DFS，放在 `render` 里就是虚拟滚动下每帧几十次 | 工厂里建一次 `Map<value, 路径>`。代价：`options` 必须建列时定下来，运行时换树要重新 `setColumns()` |
| **`VtAutocomplete` 的异步竞态按 `seq` 丢弃** | 防抖只减少请求数，挡不住**乱序返回**：慢请求先发、快请求后到时，旧结果会盖掉新结果（有单测断言） | 递增 `seq` + `input.isConnected` 双重判断 |
| **`clearable` 的清除按钮在控件右侧（一个「×」），不在面板底部** | 用户反馈「清除按钮放在 input 右侧一个 x 按钮」。面板底部那颗「清除」要先展开面板才点得到，而「清空这一格」是个一步动作；而且输入类组件（`VtInput` / `VtNumberInput` / `VtDatePicker` / `VtTimePicker`）一直是右侧一个 `×`（`wrapWithClear`），下拉类自成一套只是不一致 | 收口进 `makeAnchor(placeholder, onClear?)`：复用 `makeClearBtn()`（`.vt-comp-clear`，连 mousedown 的 `preventDefault` + `stopPropagation` 都已经在里面），排在文案与箭头之间，**只在有值时出现**（空值常驻一个灰叉会让人以为能点）。CSS 只加两行把定位从「绝对定位钉在输入框右侧」改成 flex 项。面板类组件一起接上：`VtSelect`（含 `display:'tag'` 与 `multiple`）、`VtCascader`（此前 `clearable` 根本没实现）、`VtPerson`。多值面板底部的「清空」保留 —— 它和「全选」成对，是面板的批量操作，不是控件上的清除。CDP 实测：`×` 18×18、在锚点内、在箭头左侧，点完值清空、回落 placeholder、叉自己隐藏 |
| **`clearable` 的默认值分两档：锚点类默认开、输入类默认关（2026-08-17）** | 用户反馈「下拉选择没有清空按钮，多选也加上，级联加上，日期类型加上」。当时 `clearable` 是全体默认 `false`，于是 demo 里没显式打开的列一律没有 `×`。分界线不是「哪几个组件」而是**这一格能不能用键盘删空**：`VtInput` / `VtNumberInput` / `VtAutocomplete` 的编辑态是真文本框（全选 + Backspace 就清得掉，`×` 只是顺手），而下拉 / 级联 / 人员 / 日期时间的编辑态是**锚点**（`makeAnchor`，不是文本框）—— 一旦有值，界面上再没有任何「变回空」的手段，面板里只能换选另一项。默认不给 `×` 等于「这一列填过一次就填不回空」 | `shared.ts` 加 `clearableOn(opts)`（`opts.clearable !== false`），锚点那一档全部走它：`VtSelect`（含 `multiple`）/ `VtCascader` / `VtPerson` / `VtDatePicker` / `VtDateRangePicker` / `VtTimePicker`；输入类保持 `!!opts.clearable`。`_enum.ts` 的内核不再自己读 `opts.clearable`，改成由预设算好传 `cfg.clearable`（两个预设入口不同）。顺带补了两个死角：`VtDateRangePicker({ native: true })` 从来没渲染过那个 `×`（`clearable` 是死选项），`VtAutocomplete` 同样从没渲染过（文档却写了）—— 两处都补上，后者默认仍是关 |
| **锚点上的 `Delete` / `Backspace` 就是那个 `×`（2026-08-17）** | 用户反馈「能支持清空的单元格都要支持在激活状态下按 del 键清空」。锚点不是文本框，这两个键在它身上本来没有语义，而「选中一格按 Delete 清掉」是表格用户的肌肉记忆（Excel / Sheets）。放在**组件层**而不是插件层：`vtCellEditor` 默认 `trigger: 'click'`，点开一格就进编辑态，「激活」与「编辑态打开」在这批组件上是同一件事；做成插件则要在列上新增「可清空 + 空值形状」的元数据，那是另一层公开 API | 收口在 `makeAnchor`：**只在传了 `onClear`（即 `clearable`）时挂**，于是「能不能按 Delete 清」与「有没有那个 ×」永远是同一件事。`preventDefault()`（Backspace 在部分环境是浏览器后退）+ `stopPropagation()`（不让 `vtKeyboardNav` 再解释一次）。带搜索框的面板（`VtPerson` 默认、`VtSelect({ searchable })`）打开时焦点在输入框里、事件到不了锚点，所以 `_enum.ts` 自己再接一次：**搜索词为空才清**，有词得留给输入框删字 |
| **进度条的编辑态是滑块 + 数字输入框，两个都要（2026-08-17）** | 上一版只有滑块，用户反馈「进度条要支持输入数字百分比」—— 200px 的单元格里滑块一个像素约等于半个百分点，「就要 65」根本点不准。反过来只给数字框也不对：「大概拖到七成」用键入表达很别扭，而且与只读态的条形观感断开 | 滑块 + 数字框共享同一个值（拖滑块刷新数字框、键入反推滑块位置，两边都边改边 `commitValue`）。数字框键入的是**原值** `0 ~ max`（默认 `max: 100` 下就是百分比，才在后面写 `%`；`max: 5` 的得分列不写）。三个边界：越界在 `change` 时夹回、**空框不写回**（`Number('')` 是 0，提交它等于「删到空就先归零」，条会闪一下）、`change` 时回填当前值。数字框占只读态 `.vt-comp-progress-text` 那格的位置与 `min-width`，所以点开时右侧数字不跳。`format` 因此**只作用于只读态**（一个能被 `format` 改成任意文案的输入框没法再当输入框用），焦点也给数字框而不是滑块（点开就能打字覆盖） |
| **人员胶囊 `cursor: pointer`（2026-08-17）** | 用户反馈「人员 hover 的时候应该用手指样式」。`.vt-comp-person` 悬停 200ms 弹名片、点一下进选人面板，却顶着默认的文本光标 —— 一个会响应悬停的东西必须先在光标上说出来，否则看起来就是一段普通文字 | `.vt-comp-person { cursor: pointer }`（与 `.vt-comp-anchor` 对齐）。`components-contract.test.ts` 加了一条清单式断言（`.vt-comp-person` / `.vt-comp-anchor` / `.vt-comp-clear` 都必须有 pointer），以后新增「常态可交互」的展示元素照样被查到 |
| **`VtCascader` 的锚点也要 `focus()`（2026-08-17）** | 加完「锚点按 Delete 清空」后 CDP 实测：下拉与日期都清得掉，**级联毫无反应**。原因不是清除逻辑，而是这一支的 `renderEditor` 从来没聚焦过锚点（`_enum.ts` / `_date-editor.ts` 都有那句 rAF focus，只有它漏了）—— 键盘事件全落在 `document.body` 上，`Esc` 之所以还能用是靠 `_popup` 的 document 级监听兜着 | 补 `requestAnimationFrame(() => anchor.el.focus())`（必须在 rAF 里：此刻锚点还没进文档）。dom 测试加了一条「打开就聚焦锚点」，happy-dom 会跑 rAF，所以守得住 |
| **编辑态的回显必须和常态长得一样** | 用户反馈「单元格激活的样式要和表格渲染的保持一致」。`VtPerson` 第一版锚点走 `setText`，把姓名用「、」拼成一行文字 —— 点一下单元格，整排头像消失变成纯文字，观感是「换了一列」而不是「这一格进入编辑」 | `AnchorHandle` 加 `setNodes(nodes)`（`setText` 保留给纯文本组件），`VtPerson` 的常态与锚点共用同一个 `makeChip()` / `buildChips()`（含 `+N` 折叠）。CDP 实测激活前后：胶囊 `left 103 → 103`、`60×21 → 60×21`，只剩 0.5px 纵向差（`.vt-cell-cover` 高 39 而 td 高 40，见 §7.14 上文那条） |
| **`.vt-comp-anchor` 的左右内边距要扣掉 2px** | 上一条顺带查出来的：锚点在 `.vt-cell-cover` 的 2px 边框**内侧**，直接给 `var(--vt-cell-padding-x)` 会让回显内容比常态右移 2px —— 点一下单元格文字就跳一下。`.vt-comp-textarea` 早就写成 `calc(… - 2px)`，锚点漏了 | 改成 `padding: 0 calc(var(--vt-cell-padding-x) - 2px)`。这是**共享基元**，`VtSelect` / `VtCascader` / `VtPerson` 一起受益 |
| **人员面板项要自己声明 `justify-content: flex-start`** | 用户反馈「下拉列表里没有左对齐」。根因是 §9 那条 `.vt-filter-item[role='option'] { justify-content: space-between }` —— 它是给 `VtSelect`「文案 + 对勾」**两个**子元素写的；人员项有**三个**（头像 / 姓名块 / 对勾），space-between 把中间的姓名块推到行中央，名字长短不同起始位置就参差不齐 | `.vt-comp-person-item` 声明 `flex-start`，对勾用 `margin-left: auto` 顶到右边。CDP 实测七项的头像 left 全为 104、姓名 left 全为 133、对勾 right 全为 304.3。happy-dom 没有布局引擎量不出对齐，改用 `components-contract.test.ts` 静态守这两条声明 |
| **悬停名片：逐个胶囊绑 `mouseenter`，而不是像核心 tooltip 那样走 tbody 委托** | 看着像违反 §7.2，其实前提不同：那条针对 `<td>`（行 DOM 池化复用，同一批 td 被反复重填，逐格绑会累积）；胶囊是每次 `render` **新建**的元素，单元格重填时连元素一起丢掉，监听跟着走。同目录其他组件（`VtActions` 的按钮、`VtSwitch` 的勾选框）一直是这个模式。列工厂也拿不到 `tbody` —— 委托得先有实例 | 名片本体走 `_popup.ts`（挂 `.vt-root`、随锚点移动、锚点被滚动回收时自毁）。判定推到 200ms 的 delay 计时器里做，因为 `shouldShow` 可能要读 `scrollWidth`（强制刷新布局）—— 横扫一排单元格不该每格都付这个代价，与核心 tooltip 同一条理由 |
| **名片可交互（指针能移进去选中复制），靠「胶囊 ∪ 名片」的 hover 桥接** | 第一版设了 `pointer-events: none`（理由是：能被命中的话，指针从胶囊移进名片会先触发胶囊的 `mouseleave` → 名片关闭 → 又不再 hover → 反复闪）。用户要求「鼠标到名片上不消失，好复制内容」—— 于是把当时跳过的桥接补上了 | 三件缺一不可：① hover 状态是 `overAnchor \|\| overCard` 两块区域的**并集**，名片自己也绑 `mouseenter` / `mouseleave`；② 离开后留 **160ms 宽限期**才收 —— 名片与胶囊之间隔着 `_popup.ts` 的 4px 空隙（CDP 实测 `gap: 4`），指针跨过去时必然先触发胶囊的 `mouseleave`，立刻收就永远进不去；③ 收起前校验「名片位现在还归自己」（`activeCard === mine`），否则宽限期里指针已经移到别人身上开出新名片时，旧胶囊的定时器会把**新**名片收掉。<br>另外两个坑：`onClose` 里必须把 `overCard` 复位（名片被 outside-click 销毁时指针正在它上面 → 否则 `overCard` 永久钉在 true，后面的名片再也收不掉，有单测钉住）；从名片挪回胶囊时**不能重建**名片（`mine && activeCard === mine` 直接 return），重建会丢掉用户已经选中的文字 |
| **`vtClipboard` 的 `isEditingTarget` 放行 `[data-vt-popup]`** | 名片能划选之后冒出来的真冲突：「表格里有框选区域」+「在名片里划选文字」同时成立时，Cmd+C 被插件接管、写出的是选区 TSV 而不是用户选中的那行字 | 与 `cell-editor.ts` 的 outside-click 放行同一个属性、同一个理由：浮层有自己的复制语义。新增 `plugins/clipboard.dom.test.ts` 三例（浮层内放行 / 框选内接管写 TSV / 无选区谁都不接管） |
| **只在「有东西可看」时才弹名片** | 一张只重复单元格里已有内容（就一个姓名）的名片是纯噪音 | 条件：候选项带了 `desc`/`email`/`phone`/`fields`，或姓名看不见（`avatarOnly`）、或姓名被列宽截断（`scrollWidth - clientWidth > 1`），或使用方给了 `renderCard`。CDP 实测：纯展示列里只有姓名的人不弹、`avatarOnly` 列的人弹且名片里能看到全名 |
| **`VtPerson` 的「一个人」是一枚胶囊，不是头像 + 姓名裸排** | 用户反馈「头像和名字没在一个区块里，有点割裂」。查下来是**两个间距几乎相等**：头像↔姓名 6px、人↔人 8px —— 一排人读起来是「一排头像 + 一排名字」，看不出哪个名字属于哪个头像 | `.vt-comp-person` 加 `--vt-fill-color` 底 + `--vt-radius-full`（与 `.vt-cell-option` 同一门语言），头像贴胶囊左端当左端帽（不给左内边距）、右侧 `padding-right: 8px`；内部间距收到 5px、姓名降一档到 `--vt-font-size-sm`。`avatarOnly` 走 `.vt-comp-person--bare`（去底色去右内边距）—— 没有姓名要圈时，留着底色就是一枚右边空 8px 的怪胶囊。CDP 实测：胶囊高 21（= `--vt-line-height`）、行高仍恒 40.00、内部 gap 5 / 人间 gap 8 |
| **`VtPerson` 的头像尺寸取 `var(--vt-line-height)`** | 头像是这批组件里唯一「必须是方的」展示元素，随便给 24px 就把 40px 的行顶成 43（§7.11 那条不变量）。CDP 实测锁到行高后：行高恒 40.00、头像 21×21 | 与行内容区等高 = 最大可用圆形，且天然跟着密度档走（紧凑档自动 19px） |
| **头像色块的颜色按 `value` 稳定哈希取，且只从语义色令牌里取** | 两个都踩得到：① 按行号/随机取色 —— 虚拟滚动**复用行 DOM**，同一个人的颜色会随滚动跳变；② 自造一套头像调色板 —— 换主色/切暗色时要单独维护 | `avatarColor()` 对 `String(value)` 做 31 进制哈希，落到 primary/success/warning/danger/次要文字色 五档；底色由 `--vt-avatar-color` 走 `color-mix` 派生（与 `.vt-cell-option` 同款，`@supports` 外给 `--vt-fill-color` 兜底）。有单测钉「同一 value 两次渲染同色」 |
| **图加载失败就把 `<img>` 摘掉，露出首字色块** | 人员头像的外链失效是常态（离职销号、防盗链、内网图挂了），断图占位符比首字更难看 | `img.onerror → img.remove()`，色块的首字本来就在底下（`position: absolute` 的图盖在上面）。CDP 实测把 src 换成 404 后 `imgRemoved: true`、露出「伟」 |
| **首字：中日韩取末字，拉丁取前两段首字母** | 中文取首字的话，一屏「张/李/王」姓氏重复度极高，色块几乎没有区分度 | 「张伟」→「伟」、`John Doe` → `JD`。这是**展示约定**不是数据处理，所以没做成可配项 |
| **头像整体 `aria-hidden`** | 首字在 `textContent` 里，读屏会念成「娜 李娜」 | 姓名要么就在旁边（`.vt-comp-person-name`），要么在 `avatarOnly` 时挂外层 `aria-label` + `title`。顺带确认：剪贴板走 `row[key]`（`cell-selection.ts` 的 `buildSelectionRows`）而不是 `td.textContent`，首字不会污染复制内容 |
| **搜索框放在 `.vt-filter-list` **外面**，且只重画列表** | 两件事：① 搜索框跟着列表滚走的话，长名单里搜一半就看不见输入框了；② 每次过滤都重建输入框会丢焦点与光标位置，「边打字边过滤」直接断 | `.vt-comp-search` 是 `.vt-comp-popup`（flex column + `overflow: hidden`）的固定项，`paintList()` 只动列表。面板打开时焦点默认给搜索框（打开即可打字搜人） |
| **「全选」只作用于当前搜索结果** | 人员列表动辄几百人，搜过之后的「全选」如果仍是全体，等于把面板里看不见的人也塞进去 —— 与「没有搜索框的枚举面板」不是同一个语境 | `picked = visible().filter(o => !o.disabled)`。有单测钉住 |
| **常态也认对象值（`{ id, name, avatar }`）** | 人员字段从接口原样落库成对象是最常见的形状；只认标识的话「一列只读的人员」还得先建 `options` 才画得出来 | `toPerson()` 三种来源都接（`options` 标识 / 对象 / 值本身当姓名），因此**不给 `options` 就是纯展示列**（不给 `renderEditor`，与 `VtTag` 不配 `options` 同理）。代价：通过面板改值一律写回标量 `value`，要保留对象形状得在 `onChange` 里转回去 —— 这条写进了 api 文档 |

**日期与区间日历**（2026-08-12，起因是用户反馈「区间选择器没有直接选范围的交互，要单独设置有点麻烦」——
改造前 `VtDateRangePicker` 是两个原生 `input[type=date]` 并排，起止得分两次点开各自的原生日历）：

| 结论 | 为什么 | 怎么做 |
| --- | --- | --- |
| **日历抽成 `_calendar.ts` 基元，且该文件零运行时 import** | 日期算术是本次唯一「算错了不报错、只是显示成另一个日期」的代码，必须能在默认 node 环境单测；而 `shared.ts` 第 2 行就 `import './components.css'` —— 一旦基元引它，纯逻辑测试就要连带加载样式表 | `_calendar.ts` 只 `import type`（文案类型），纯函数 + `createCalendar` 都在里面；「锚点 + 浮层 + 写回」那层胶水另起 `_date-editor.ts`（它才 import `shared` / `_popup`），两个组件只剩选项解析与值编解码。附带好处：将来 `plugins/column-filter.ts` 的 date-range 输入想复用面板时，文案已经是参数注入（那侧有 `ctx.getLocale()`），不用为文案来源打补丁 |
| **全程本地构造 + 手写格式化，禁用 `toISOString()`** | 两头都按 UTC 切：`new Date('2026-08-11')` 按 UTC 解析、`toISOString()` 按 UTC 输出，东八区一夹就退一天。**demo 自己原来就踩着**（`new Date(2024,0,1).toISOString().slice(0,10)` → `'2023-12-31'`），这次一并修掉 | 解析一律 `new Date(y, m-1, d)` + **回读比对**（`new Date(2026,1,31)` 不报错，会静默滚到 3/3）；格式化一律 `getFullYear/getMonth/getDate` 手拼。`_calendar.test.ts` 里有一条断言**直接扫源码文本**，禁 `toISOString` / `Date.parse` / `new Date('…')` —— 否则换种写法重新引入这个 bug 时，UTC 机器上的用例仍然全绿 |
| **值的形状一个字节都不改** | `pipeline.ts` 的排序（`String()` 字典序）、`cell-selection.ts` 的复制、`export.ts` 的 CSV/Excel/打印全都只做 `String(value)`。改成 `{start, end}` 会让排序静默失效（全部 `'[object Object]'` 相等）、复制出 `[object Object]` | 区间仍 `['YYYY-MM-DD','YYYY-MM-DD']`、单日仍 `'YYYY-MM-DD'`，空值仍 `['','']` / `''`。于是这两列不需要补 `sortMethod`，也没有任何既有消费方要跟着改 |
| **区间点第二下就 commit + 关面板，不做底部「确定」** | 面板只产出**成对**的区间，没有半成品要暂存 —— 这与 `VtLink({ editable })` 的两栏面板正好相反（那边文案与地址各自可空，必须有确定/取消） | 走 `_enum.ts` 单选那条既有路径：`syncAnchor()` → `commitValue()` → `popup.destroy()`。那一格的重绘由 cell-editor 离开编辑态时负责（§7.15.1），组件不碰表格 |
| **第一下点击就清掉旧区间；不做「就近端点延长」** | 留着老带子的话，看不出正在编辑什么；而「延长最近的那一头」要猜用户想动哪一头，猜错就是静默改错数据 | `pick()` 在空闲态把 `sel = null` 后只画一个 `--start`。反向选择由 `normalizeRange` 在第二下统一吃掉，交互层不判方向；点回锚点本身得到一天的区间（合法诉求，刻意不特例） |
| **双月下同一天有两个 DOM 节点 → 格子索引必须是 `Map<DayStr, HTMLElement[]>`** | 左月末尾的补位格与右月开头的实格是同一天。只更新一个的话，跨月区间的带子会在月交界处**断一格** | `paint()` 对同一天的所有节点打同一套 class。CDP 实测直接比对同日两处的 class 集合（除 `--outside` 外必须一致），并在跨月区间上验过 |
| **窄容器降级用实测宽度，不写死断点** | 密度档（`--vt-density-*`）会改字号进而改面板宽，写死 460 在紧凑档会误判 | `relayout()` 拿 `.vt-root` 的 `clientWidth` 与单月实测宽度反推外壳开销；量不出（happy-dom 无布局引擎、或还没挂进文档）就按配置来、不擅自降级 —— 这条分支同时让 DOM 测试里「双月」那批断言稳定 |
| **底部快捷条 `width: 0; min-width: 100%`** | 面板没有外部宽度约束（`minWidth: 0`），宽度按 `max-content` 算，而 `max-content` 会把 `flex-wrap` **摊平** —— 7 颗快捷按钮排成一行，CDP 实测把面板从 448 拉到 **679px** | `width: 0` 让这一行对内在宽度的贡献归零，`min-width: 100%` 再让它渲染时占满，于是按钮真的换行、面板宽度回归由日历网格决定（实测 450×332） |
| **`native: true` 用判别联合 + `?: never` 占位** | 与 `VtLink` 的 `editable` 同一套办法（§7.14.2「按轴拆判别联合」）。`never` 不能省：`asCell()` 的 `Omit<A \| B, K>` 只保留**两支共有**的键，不占位 `asCell(VtDatePicker, { native: true })` 就编译不过 | 原生支路是改造前的实现**逐字保留**，于是 `.vt-comp-date-range` / `-sep` 与 `.vt-comp-date::-webkit-calendar-picker-indicator` 那几条 CSS 仍在生效路径上（不是孤儿，规则上方已注明）。两支的 `min`/`max` 语义**不同**：原生交给浏览器（各家对越界输入不一致），自绘是确定的（越界格不可点、快捷项整段越界丢弃/部分越界取交集）—— 差异写进了 api 文档，别指望它们一致 |
| **快捷项的同 label 视作「就地覆盖」** | 想让 `shortcuts: (b) => [...b, { label: '今天', value: 我的 }]` 表达「换掉内置的今天」，而不是排出两颗今天 | `resolveShortcuts` 去重时**位置取首次出现、值取最后一次**。于是替换/追加/裁剪/改一颗共用同一个入口，不必再开 `overrideShortcuts` 之类的第二个选项。单日模式靠每项的 `mode` 过滤退化成「今天/昨天」两颗 |
| **`locale.ts` 新增子块必须同时改 `mergeLocale`，键还要拍平** | `mergeLocale` 每个子块都要单独写一行浅合并，漏了的话 `{ calendar: { today: 'TD' } }` 会把整块（含 12 个月名）替换成只有一个键的对象 —— 表现是面板标题变 `undefined` 而不是报错。而 `locale.test.ts` 的「键集完全一致」抓不到它（那条比的是语言包结构，不是合并行为） | 加了 `calendar: { ...base.calendar, ...(override.calendar ?? {}) }`，并在 `locale.test.ts` 补了 2 例专钉这个合并（**注掉那一行验证过必红**）。`calendar` 的键全部拍平（快捷项标签没有再套一层 `shortcuts: {}`），省掉第二层展开。顺带给 `DeepPartial` 加了数组分支：`months` / `weekdays` 是「12 个一套」，整体替换，落进递归分支会被映射成 `{ 0?: string; length?: number }` 这种没法传的类型 |
| **删掉 `startPlaceholder` / `endPlaceholder`** | 它们**从未生效** —— 声明了但代码从没读过，而且原生 `input[type=date]` 根本不渲染 placeholder。留着就是「配了没反应」的静默失效 | 全仓只有接口两行 + api 文档一行提及，删除只影响编译、不改任何运行时行为（包 `0.0.1` 未发布）。两端的空态提示改由面板底部回显承担（`texts.pickStart` / `pickEnd`），整格空态仍用 `placeholder` |
| **给 `VtDatePicker` 补了 `render`** | 改造前它没有 `render`，核心回落 `String(value)`；而编辑态锚点必须与常态**逐字一致**（§7.14「点开单元格文字不许跳」），两处各写一份格式化早晚会漂 | 两个组件的 `render` 与锚点回显共用 `formatDay` / `formatRange`。合法值上与 `String(value)` 同结果，两处有意的差别：空值改显示 `placeholder`（本来就是「空值占位」的语义）、非法日期串（`'2026-2-3'`）显示成空。DOM 测试各钉一例 |

**没做的一件事**：`docs/vanilla/examples/cell/vt-date-*.md` 没加说明段落 —— 那个目录下 17 个
示例页全是「标题 + `<PlaygroundHost>`」三行，为两个页面破例会让目录不齐。交互说明写在
api 文档的「日期与区间日历」小节，demo 页顶部的 status 文案里也讲了。

**CDP 实测**（2026-08-12，按 §7.9 的方法，`Input.dispatchMouseEvent` / `dispatchKeyEvent` 发真实鼠标与键盘事件，35 项全过）：

| 量什么 | 结果 |
| --- | --- |
| 行高不变量（编辑前 / 编辑中 / 写回后） | 三次都是 **40.00**，五行无一例外 |
| 面板挂载与皮肤（对照 §7.2 挂 body 的失效表现） | 在 `.vt-root` 内、`parentElement !== body`；`bg rgb(255,255,255)` / `font 14px` / 有阴影 |
| 面板几何 | 双月 **450×332**，2 个 `.vt-comp-calendar-month`、**84** 个格子（2×42，固定 6 行）、7 颗快捷项、首列星期是「一」（默认周一起） |
| 锚点回显 vs 常态 | `.vt-cell-cover` 里的文本与激活前 `td` 的文本**逐字相同**（`2024-01-02 至 2024-02-01`） |
| 真实鼠标三步 | 点起点 → 面板仍开、只有 1 个 `--start`、`in-range` 为 **0**、底部提示切成「选择结束日期」；`mouseMoved` 到第 10 天 → `in-range` 变 **4**；点终点 → 面板消失；点空白退出编辑态 → 那一格重绘为 `2024-01-05 至 2024-01-20` |
| 跨月区间的带子 | 双月里同一天出现两处（补位格），两处的状态类集合**完全一致**（不匹配列表为空）→ 带子在月交界处不断格；`in-range=10 start=2 end=2` |
| 键盘不换单元格 | `→` `↓` 各一次后编辑浮层坐标未动（`89,133 → 89,133`）、面板仍开、`--cursor` 可见；`Esc` 由 `_popup` 接管关闭 |
| 窄容器降级 | `.vt-root` 收到 382px 后重开 → **1 个月**、面板宽 228、左右都未溢出容器 |
| 暗色跟随 | `.vt-root--dark`：面板 `bg rgb(34,36,43)`、端点 `bg rgb(76,141,255)` / 字 `rgb(255,255,255)`、`in-range` 是 primary 的 10% 淡色；宽度恢复后回到双月 |

**顺带修掉的既有问题**：`docs/apps/vanilla/src/components/cell/` 下原有 5 个单元格组件 demo
**都没装 `vtCellEditor`** —— 也就是说那 5 个示例里的编辑态从来触发不了（点单元格没有任何反应）。
新增 demo 一并补上了。

**CDP 实测**（2026-08-11，按 §7.9 的方法：headless Chrome + `?example=` 逐个打开 demo）：

| 量什么 | 结果 |
| --- | --- |
| 12 个新组件 demo 的数据行高 | **全部 40.00px**，无一例外；内容元素（`.vt-comp-cell` / `.vt-comp-link` / `.vt-comp-tag-more` / `.vt-cell-option` / `.vt-cell-bool`）实测高度**全部 21px** = `--vt-line-height`。§7.11 的等式成立 |
| 浮层挂载与 token（对照 §7.2 挂 body 的失效表现） | 四个浮层组件都挂在 `.vt-root` 内：`bg rgb(255,255,255)` / `color rgb(31,41,55)` / `font 14px` / `radius 10px` / 有阴影 —— 六项全部生效（挂 body 时应为透明底、16px、0 圆角、无阴影） |
| 暗色主题跟随 | 加 `.vt-root--dark` 后浮层 `bg rgb(34,36,43)`、文字 `rgb(230,232,236)`、标签色跟到暗色 warning `rgb(251,191,36)` |
| 底部行的浮层翻转（below 模式） | 可视区最后一行：浮层 `bottom 609.6` ≤ 锚点 `top 611`，容器下缘 652 → 翻到上方且未溢出容器 |
| `VtTextarea` 的 cover 定位 | 宽度 260 = 单元格 260；左上角 (249,131) **精确对齐**单元格 (249,131)；初始高 39 = 单元格 40 − td 下边框；输入 1/3/6 行 → 39/81/144px 逐级长高；30 行长到 594px（容器 602）后 `overflow-y: auto` 内部滚动；底部行长高时整体上移（top 608→461），`bottom 647` ≤ 容器 652 未被裁 |
| `VtPerson`（补测于 2026-08-11 晚） | 行高恒 **40.00**（含多人 + `+N` 折叠的行）；头像 **21×21**、`radius 999px`、`object-fit: cover`；胶囊 `.vt-comp-person` 高 21 = `--vt-line-height`（内部 gap 5 / 人与人 gap 8，`bg rgb(241,243,247)` / `radius 999px`，`avatarOnly` 的 bare 变体底色透明、右内边距 0）；面板挂 `.vt-root`、套 `.vt-filter-panel`（`bg rgb(255,255,255)` / `color rgb(31,41,55)` / `font 14px` / `radius 10px` / 有阴影），左边缘 89 / 宽 200 **精确对齐**单元格 89/200；搜索框自动聚焦，输入「李」→ 列表只剩「李娜」，点选后面板关闭、单元格回显「李娜」且行高仍 40；暗色下头像底色/字色跟到 success 暗色档（`rgb(52,211,153)`）；把头像 src 换成 404 → `<img>` 被摘掉、露出首字「伟」。**第二轮**（回归三条反馈）：激活前后胶囊 `left 103 → 103` / `60×21 → 60×21`；面板七项头像 left 全 104、姓名 left 全 133、对勾 right 全 304.3；名片挂 `.vt-root`、宽 220、翻在锚点下方、头像 40×40、字段标签 left 全 116 值 left 全 164，`mouseleave` 后消失。**第三轮**（可交互名片，用 `Input.dispatchMouseEvent` 发真实鼠标事件）：`pointer-events: auto` / `user-select: text`、与胶囊的空隙 `gap: 4`；指针分 6 步跨空隙移进名片后名片仍在；在里面按下并拖拽划选，`window.getSelection()` 读到 `"ina@example.com"`（从第 2 个字符按下，脚本如此）且名片没消失；指针移开两块区域后关闭；名片↔胶囊来回后仍是**同一张**（`dataset.mark` 未变，即没被重建）|

⚠️ 量翻转时**必须挑「完整可见」的那一行**当锚点，不能拿 `trs[trs.length - 1]`：渲染窗口尾部
几行是 buffer，画在容器下缘之外（实测锚点 `top 851` vs 容器下缘 `652`），拿它当锚点量出来的
浮层位置当然也在容器外 —— 第一版就是这么误判成 bug 的。

#### 7.14.1 枚举选择那一家：一个内核 + 四个预设（`_enum.ts`）

用户问「单选、多选、状态标签本质上是不是一套组件的不同功能」。拉差异矩阵之后结论是**是**，
而且这一家有**四个**成员（`VtPerson` 也在里面）：

| | `display: 'text'` | `display: 'tag'` | 人员 |
| --- | --- | --- | --- |
| **单值** | `VtSelect` | `VtSelect({ display: 'tag' })` | `VtPerson` |
| **多值** | `VtSelect({ multiple })` | `VtSelect({ display: 'tag', multiple })` | `VtPerson({ multiple })` |

**「从候选集里选」只有 `VtSelect` 一个入口** —— 元数与样式都是参数。`VtTag` 退成纯展示
（没有候选集、值即内容、配色可按行算），`VtPerson` 留作独立组件（头像 + 名片是一整套交互，
不只是样式）。`VtMultiSelect` 已删除。

真轴只有两个（元数 × 展示形态）。重构前的差异全是**能力分布不均**，而且不是设计决定，纯粹是
三份独立面板实现各自长歪的结果：

| 重构前 | 搜索 | ↑↓/Enter | `+N` 折叠 | 锚点回显 |
| --- | --- | --- | --- | --- |
| `VtSelect` | ✗ | ✓ | — | 文本 |
| `VtMultiSelect` | ✗ | **✗** | ✓ | 文本（**与常态的胶囊不一致**） |
| `VtPerson` | ✓ | ✓ | ✓ | 胶囊 |

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **合实现内核，不合公开 API** | 三条：① 列定义要读得懂 —— `VtSelect({key,title,options})` 一眼是什么，`VtEnum({…, multiple:false, display:'text'})` 要读三个参数；② 类型能管住互斥选项 —— 合成一个之后 `avatarOnly` / `variant` / `checkStrictly` 会挤进同一个 options 类型，`display:'text'` 却传 `avatarOnly` 编译器不会拦；③ 四个都是已发布导出 | `_enum.ts` 的 `createEnumEditor` + `buildChips` / `renderChipCell` 一份实现，四个名字保留为薄预设。各预设只提供三件事：**值形状**（`enumCodec`）、**面板项**（`renderItem`）、**常态 chip**（`chip`） |
| **「长什么样」是参数，不该是组件名（走了两步才到位）** | ① 第一版给 `VtTag` 加了 `multiple`，于是 `VtTag({editable,multiple})` 与 `VtMultiSelect` 是同一个东西的两种写法 —— 用户当场问「现在多选和状态标签感觉完全一样了？」；② 收回 `multiple` 之后仍然别扭：「单值彩色标签」是 `VtTag({editable})`、「多值彩色标签」是 `VtMultiSelect` —— **元数换了组件名，样式也换了组件名**。用户点出根因：「tag 只是单选/多选的一种特殊样式而已」 | `VtSelect` 收口成「从候选集里选」的唯一入口，`display: 'text' \| 'tag'` + `multiple` 两个参数张成四格；`VtMultiSelect` **删除**（包从未发布，`npm view` 404，不需要留 deprecated 别名）；`VtTag` 退成纯展示 —— 它真正独有的那一半是「**没有候选集**：值即内容、配色按行算」，与 `VtProgress` / `VtLink` 同类。`display` 用**判别联合**声明，`display:'text'` 时传 `variant` / `maxCount` 直接编译报错 —— 这也回答了当初「合并会让类型管不住互斥选项」的顾虑：**按轴拆判别联合可以管住，按组件名拆只是绕开**。胶囊工厂下沉成 `_tag-chip.ts`（`VtTag` 与 `VtSelect` 都 import 它，依赖方向不别扭），单测断言两者产出的胶囊 class / 文本 / `--vt-cell-option-color` 完全相同 |
| **`VtPerson` 不并进 `display: 'person'`** | 按同一条逻辑「头像胶囊也只是一种样式」—— chip 那一层确实是，但它还带着头像 fallback 与首字哈希色、悬停名片（`renderCard`/`email`/`phone`/`fields`）、`avatarOnly`、副标题参与搜索：8 个专属选项 + 一套额外交互 | 并进去会让一个组件挂三套互斥选项，判别联合也会被撑得难读。它内部照旧用同一个内核 |
| **代价：按场景找的入口少了** | 侧边栏里「VtMultiSelect 多选」这种可搜的入口消失，得读 `VtSelect` 的参数才知道能做标签和多值 | api 文档补了一张「常见配方」表（只读标签 / 可选标签 / 多值标签 + 折叠 / 只读多值 / 要搜索 / 存字符串 各一行代码）；示例页仍**按场景**保留两个入口（「VtSelect 下拉选择」/「VtSelect 多选」），各带一个「🏷️ 一键切换标签样式」按钮 —— 按一下就地 `setColumns(buildColumns('tag'))`，同一份数据换画法，比再开一个页面更能说明「样式是参数」。`VtTag` 的示例页去掉了（它的能力在这两页的标签态里已经看得到） |
| **搜索默认关，`VtPerson` 例外** | 枚举列常常只有 3~8 项，默认加一行搜索框是噪音；人员列表动辄几十上百人 | 内核默认 `searchable: false`；`VtPerson` 传 `opts.searchable !== false`。**不做「选项超过 N 项自动开」** —— 那会让同一个组件在不同数据下长得不一样 |
| **锚点回显与常态共用同一个 chip 工厂** | 这是把 §7.14 那条「编辑态回显必须和常态一样」从 `VtPerson` 推广到整家：重构前 `VtMultiSelect` 展示是彩色标签、点开却变成「A、B、C」纯文字 | `renderAnchor` 返回节点数组走 `setNodes`。CDP 实测：`VtMultiSelect` 激活后锚点里是 `老客 / 风险 / +1` 三个胶囊；`VtTag[editable]` 锚点里是 `已封禁` 胶囊、面板候选也是胶囊 |
| **单选 `activeIndex` 初始化为当前值的下标，多选为 -1** | 单选面板打开时高亮当前值，↓ 一次就到下一项（既有 `VtSelect` 用例断言这个行为）；多选没有「当前值」这个单点概念 | 内核里按 `cfg.multiple` 分流 |
| **多选 toggle 判定读 `picked` 而不是 DOM 的 `checked`** | 内核每次 toggle 都整列重画（`is-selected` / 对勾 / 批量操作后的全量复位都要跟着变），重画后旧元素已离开 DOM —— 读它的 `checked` 就错了 | 既有用例正是拿重画前的旧元素派发 `change`（`boxes[0]` 在第一次 toggle 后已失效），读 `picked` 才让它继续成立 |
| **行数没有明显下降，但那不是目标** | 家族总行数 1314 → ~1170（含内核 454 行，其中约 130 行是头注与决策记录）。同时新增了 `multiple` × `display` 的全部四种组合、搜索、键盘、胶囊锚点回显，并删掉一个组件（`VtMultiSelect`） | 收益是「面板实现从三份变一份 + 公开面从四个名字收到两个」：以后加能力改一处、所有场合一起拿到，不会再出现「这个组件有搜索那个没有」 |

**回归**：746 个用例（新增 9 例覆盖新能力），**重构本身零改动通过原有 98 个组件用例** ——
这是内核保住既有行为的主要证据。CDP 逐个 demo 复验：四个预设的行高全部 40.00、锚点/面板/
搜索/键盘/名片均正常（数字见上表与 §7.14 的 CDP 表）。

**新增一个单元格组件要碰的地方**（按顺序）：

1. `packages/vanilla/src/components/vt-<name>.ts`；
2. `components.css` 加一节（锁高 + 只用 `--vt-*` 令牌）；
3. `components/index.ts` 导出组件与 Options 类型；
4. `docs/apps/vanilla/src/components/cell/vt-<name>.ts` demo + 同目录 `index.ts` 导出
   + `docs/apps/vanilla/src/main.ts` 的 import 与 `demoBootstrapMap`；
5. `docs/{vanilla,vue,react}/examples/cell/vt-<name>.md` —— 四段式：说明（含交互模型 +
   要不要 `vtCellEditor` + 值形状与取舍）、`## 相关 API`（**只列本组件 3–6 个关键选项**的精简表
   + 指回 `api/components#vt<name>` 的链接，别抄整份 Options）、`## 示例`（`PlaygroundHost`）、
   `## 源码`（`<<<` 折叠块）。**三端正文可以逐字共用** —— 组件是框架无关的工厂，三端 `import`
   都来自 `@virt-table/vanilla/components`，只有标题前缀、`example-id` 与源码路径不同；
6. `docs/.vitepress/config.ts` 的 `columnLinks`；
7. `docs/vanilla/api/components.md` 的「各组件专属选项」加一节 `#### Vt<Name>`（选项表 +
   必要的 interface）—— **全量选项表只在这里维护一份**；
8. 测试：DOM 行为进 `components.dom.test.ts`，新样式自动被 `components-contract.test.ts` 扫到。

⚠️ 第 3 步之后要 `pnpm -C packages/vanilla build` 刷新 `dist`，否则三端 playground 的
类型检查看不到新导出（它们解析的是 `dist/*.d.ts`）。

#### 7.14.2 `VtLink` 的可编辑支路（2026-08-11）

需求是「激活要显示 dropdown，文案与 url 分别配置」。`VtLink` 原本是纯展示（连 `renderEditor`
都没有，点单元格没有任何反应），所以这次要同时定**值住哪儿**和**怎么不破坏既有用法**。

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **地址存进值里（`{ text, url }`），不新开 `hrefKey` 选项** | 三个候选：① 另一个字段（`hrefKey`）；② 当前列存 url、文案走 `text`；③ 值是对象。用户选了 ③ —— 一格自包含，不用为一列链接占两个字段 | 新增 `VtLinkValue { text?, url? }`。`parseLink` 两种形状都认：字符串（老形状，值即文案）与对象。**读值一律走它**，常态与编辑态锚点共用同一个 `resolve()` |
| **没有地址就写回纯字符串，不写 `{ text, url: '' }`** | 这一列的值还要被排序（`sortMethod`）、筛选（`filterMethod`）、框选复制（`String(row[key])`）反复消费。一律对象化等于让每个消费方都先解包 | `serializeLink()` 一处判断。代价是同一列的值形状可能混着标量和对象 —— 但两种都被 `parseLink` 认，且**能是标量的时候就是标量** |
| **`editable` 走判别联合，可编辑支路禁掉 `href` / `protocol` / `text`** | 它们是「文案或地址另有来源」的开关，与「面板里改值」直接冲突：配了 `href` 再开 `editable`，面板改完地址会被 `href` 盖掉 —— 一次静默失效。这与 §7.14.1 `display` 那条同一个方法（**按轴拆判别联合能管住互斥选项，按组件名拆只是绕开**） | `VtLinkOptions = VtLinkReadonlyOptions \| VtLinkEditableOptions`，可编辑支路把三个字段声明成 `never`。实测：`editable: true` + `href` 直接 TS2345 |
| **默认仍是纯展示，`editable` 才有 `renderEditor`** | 无条件加 `renderEditor` 会让**所有既有 `VtLink` 列**（`protocol: 'mailto'`、`href` 函数那些）突然能被点开编辑，而其中一半的地址根本写不回去 | `editable: true && !disabled` 才装 `renderEditor`（`disabled` 压倒 `editable`，与 `VtRate` / `VtSwitch` 的只读回显一致）。api 文档的「三类交互模型」表里 `VtLink` 现在**两支都在**（默认纯展示 / 配 `editable` 属编辑态） |
| **可编辑列放 `dblclick` 冒泡过去，`mousedown` / `click` 照旧拦** | `stopCellInterference` 三个事件全拦（§7.14 那条）。但链接元素常常**铺满整格**，剩给「点空白进编辑」的只有左右两条 `--vt-cell-padding-x`（14px）；而 `trigger: 'click'` 下让 click 过去又会与「点链接跳转」抢同一次点击 | 可编辑支路只吞 `mousedown` / `click`，`dblclick` 放行 → 配 `vtCellEditor({ trigger: 'dblclick' })` 双击整格任意位置都能进编辑。这是**唯一**对 `stopCellInterference` 的例外，写在组件里而不是改共享基元（只有链接会铺满整格并且自己还要响应点击）。单测钉住两支的差异 |
| **面板是「暂存 + 确定」，不是枚举面板那种「勾一下即写回」** | 一次编辑要同时改两个字段，中途写回等于把半成品落库（改完文案还没填地址就先写了一个无地址的值，`onChange` 也会多触发一次） | 暂存在 `parts` 里，确定 / `Enter` 才 `commitValue`；取消 / `Esc` 直接丢。底部按钮复用 `.vt-filter-actions` + `.vt-filter-btn`，输入框复用 `.vt-filter-text` —— 与列头筛选面板同一套皮肤 |
| **面板最小宽 260，不是默认的「与单元格同宽」** | `_popup` 默认 `minWidth = 锚点宽`（下拉与单元格对齐的通用预期）。但这个面板里是两个要装网址的输入框，挂在 120px 的窄列上只剩十来个字符可视宽 | `minWidth: Math.max(260, ctx.el.getBoundingClientRect().width)` —— 宽列仍然对齐单元格 |
| **地址过协议白名单，名单外按「没有地址」处理** | 地址从「后端数据」变成了「用户手打进面板」，`javascript:` 落到 `<a href>` 上就是存储型 XSS（别人打开这张表点一下就执行）。且**必须先剥控制字符再判协议**：浏览器解析 href 时会忽略它们，`java\tscript:alert(1)` 照样执行 | `isSafeUrl()`：`http` / `https` / `mailto` / `tel` / `ftp` + 无协议的相对地址放行，其余渲染成 `<button>`。单测覆盖三种恶意串 + 两种正常串 |
| **可编辑列给默认 `sortMethod`（按文案）** | 对象值走核心的默认比较等于比 `{}` —— 永远相等，点表头**没有任何反应**（不报错，最难查的那种） | `sortable && sortMethod === undefined` 时按 `parseLink().text` 比较；使用方给了就用他的。**框选复制没救**（核心走 `String(row[key])`，拿不到列上的钩子）—— 这条作为已知代价写进 api 文档 |

**CDP 实测**（2026-08-11，按 §7.9 的方法，`?example=table-vt-link`，用 `Input.dispatchMouseEvent`
发真实鼠标事件）：

| 量什么 | 结果 |
| --- | --- |
| 面板挂载与皮肤 | 挂在 `.vt-root` 内、套 `.vt-filter-panel`：`bg rgb(255,255,255)` / `radius 10px` / `font 14px` / 有阴影 |
| 定位与宽度 | 列宽 240 的单元格：面板左缘 **269 = 单元格左缘 269**、`top 195`（单元格 `y 151` + 行高 40 + 4px 间隙）、宽 **260**（`max(260, 240)` 生效） |
| 底部行翻转 | 完整可见的最后一行：单元格 `top 591`，面板 `top 400 / bottom 587` ≤ 591 → 翻到上方，未溢出容器（`clientBottom 669`），宽度仍 260 |
| 锚点回显 | `.vt-cell-cover` 里是 **`<span class="vt-comp-link">`**（同款外观、不跳转），文案与常态一致；焦点自动落在文案输入框（`activeElement.class = vt-filter-text`） |
| 写回落地 | 空值格（placeholder「双击添加链接」）双击 → 填两栏 → 确定 → 锚点变「季度复盘」、面板关闭；外部真实 mousedown 关掉编辑器后 td 渲染成 `<a href="https://example.com/review/3" rel="noopener noreferrer" target="_blank">季度复盘</a>`；`onChange` 收到 `{"text":…,"url":…}` |
| Esc 不写回 | 改了输入框再按 Esc，关面板后单元格文案仍是「待补链接 #4」 |
| 单击 vs 双击（那条 `dblclick` 例外） | **单击链接本身**：无面板、无编辑器（cover 仍 `display:none`）、无框选 —— `mousedown`/`click` 确实被吞；**双击链接本身**：面板打开且两栏预填 `["需求文档 #0","https://example.com/doc/0"]`；**双击单元格空白**：同样打开 |
| 只读列不受影响 | `protocol: 'mailto'` 那列双击：**没有面板**（没有 `renderEditor` → cell-editor 直接 dismiss） |
| 行高不变量 | 编辑前/编辑中/写回后数据行高恒 **40.00**，`.vt-comp-link` 恒 **21px** = `--vt-line-height` |
| 暗色跟随 | 加 `.vt-root--dark` 后面板 `bg rgb(34,36,43)` / 文字 `rgb(230,232,236)` / 输入框 `bg rgb(23,24,28)` / 标签 `rgb(162,169,180)` |

**碰的地方**：`vt-link.ts`（93 → 389 行）、`components.css` §7（面板两栏排布，外壳/输入框/按钮全部
复用 `_panel.css`）、`components/index.ts`（多导出 `VtLinkValue` 与两支 Options 类型）、
vanilla demo（补 `vtCellEditor({ trigger: 'dblclick' })` + 一列 `editable`，数据里三种值形状各一批）、
api 文档（专属选项行 + 新增「可编辑的链接列」小节 + 三类交互模型表）。测试 +9 例，全量 774 通过。

#### 7.14.3 图片单元格 `VtImage` 与图片查看器（2026-08-18）

起因是「加载图片的时候不能影响主线程渲染，点击图片激活图片查看器」。核心早就有
`cellType: 'image'`（`cell-type.ts`）—— 一行 `document.createElement('img')` + `loading="lazy"`，
**同步建在渲染路径上**、一格一张、点了没反应。行 DOM 是池化的（`_fillCellContent` 每次重绘都新建
`.vt-td-text`），所以那条路径在快滚时每帧都在发请求 + 在主线程解码。

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **`render` 只产出占位盒，取图排到空闲期** | `loading="lazy"` 在虚拟滚动里**等于立即加载**：单元格只在渲染窗口内存在，浏览器眼里它一直可见。真正需要「懒」的那一层是虚拟滚动自己，浏览器不知道 | 队列在 `components/_image-loader.ts`：`requestIdleCallback(fn, { timeout: 200 })`，没有它退 `setTimeout(16)`。CDP 实测快滚一屏（12000px）后那一刻 `img` 32 个、占位 170 个；空闲 1.2s 后 `img` 202、占位 0 |
| **出队顺序只有一条规则：先进先出** | 走了两次弯路。① **纯 LIFO**（动机是「快滚十屏后队头全是废任务，用户盯着的那一屏反而最后才出」）→ 一屏图**从最后一行往上**冒，用户直接问「为什么是从下往上」。② 改成**按帧分批、批之间 LIFO + 批内 FIFO** → 初次挂载翻车：核心第一次重绘只画前 6 行、第二次才补到 21 行，而**前 6 行沿用原有 DOM**（占位盒没离开文档 → 任务还活着、还留在第一批），于是出图变成「第 7 行往下走完再回头补前 6 行」—— 用户报的正是这个。**根子在于 LIFO 这个动机本身不成立**：滚走的格子早被回收，`alive()` 一查就跳过（连请求都不发），不需要靠出队顺序去躲废任务 | `queue.shift()`，进队顺序 = 行序 = 出图顺序；「不做废功」交给出队前那次 `alive()`。CDP 实测（MutationObserver 记每帧的出图位图）：初次加载 `1000…` → `1100…` → `1110…`（改之前是 `0000001…`），快滚到新一屏后同样是前缀推进 |
| **`alive()` 双检（出队前 + 解码后）** | 虚拟滚动回收单元格时**不发任何通知**，占位盒无声无息地离开 DOM。这是唯一能问的探针（与 `_popup.ts` 的锚点存活探针同源） | `alive: () => box.isConnected`。解码完成后再查一次，否则会把图 append 到一棵游离的树上 |
| **`img.decoding = 'async'` + `img.decode()`，而不是 `onload`** | 只做空闲期调度但仍然同步解码的话，卡顿只是从滚动帧挪到了空闲帧。`decode()` resolve 之后再 append 才是「插进来的那一帧不会卡」 | `imageIO.load()` 优先 `decode()`，老浏览器（与 happy-dom）退 `onload`/`onerror`。`imageIO` 抽成可替换对象**只为可测** —— happy-dom 没有网络也没有 `decode`，真实现永远不会 settle |
| **只记失败，不记成功** | 成功的图有浏览器自己的内存 / HTTP 缓存，我们再记一份也省不掉「新建 `<img>` + 解码」这两步（每个单元格都要自己的元素），那份记录只是空占内存；坏链反过来 —— 不记的话一列坏链每滚过去一次就重发一轮 | `failed: Set<string>`，上限 300 按插入序淘汰。已知坏链**同步**回调 `onError`（先画占位再变断图等于白闪一次，而这条路径没有任何解码工作） |
| **不给 `size` 选项** | 缩略图写死 56px 会把 40px 的行顶到 75px，而 `estimatedSize` 还是 40 —— 正是 §7.11 那条「滚不到底」 | 缩略图 `height: 100%` + `aspect-ratio: 1`，尺寸恒等于行内容高。要大图就把**行**配高：容器上设 `--vt-density-line-height`（不是 `--vt-line-height`，见 index.css 密度那段）+ 跟着改 `estimatedSize`。CDP 实测：默认档行高 40.00 / 缩略图 21×21；切到 48px 档后行高 67.00 / 缩略图 48×48，多图 + `+N` 的行也一样 |
| **查看器舞台用确定尺寸（`86vw × 76vh`），不是 `max-*` 让内容撑** | **第一版是 `max-*`，实测塌成 0×0**：`viewBox`-only 的 SVG（没有 `width`/`height` 属性）没有固有宽度，作为 flex 项时外壳的 max-content 解析成 0（`naturalWidth` 200 / `complete` true，但 rect 0×0）。真实数据里 SVG 很常见 | 舞台给确定尺寸 + 图 `object-fit: contain`，SVG / 竖图 / 超宽图全都稳（改后实测 1290×722）。代价是「点图旁边的空白」不再关闭 —— 关闭走 `Esc` / ✕ / 点舞台之外的幕布（还留着 14vw / 24vh） |
| **查看器挂 `.vt-root` 内 + `position: fixed`** | 挂 `document.body` 的老问题：`--vt-*` 一个都继承不到（§7.2）。`.vt-root` 不是包含块，所以 fixed 仍以视口为参照 —— `plugins/drag-sort.css` 的拖拽 ghost 一直是这么干的 | 实测 `parentElement` 是 `.vt-root`、rect 1400×900、`z-index: 1000`（ghost 是 999）。幕布派生自 `--vt-tooltip-bg`（两个主题下都是深墨；`--vt-mask-bg` 亮色下是白纱，图压在白纱上看不清），`@supports` 分档兜住不支持 `color-mix` 的浏览器 |
| **查看器的 keydown 必须 `stopPropagation`** | `vtKeyboardNav` 把 keydown 挂在 `.vt-root` 上，浮层是它的后代 —— 不拦的话按 `←` `→` 换图会同时把底下的单元格选区挪走 | 每个分支都 `preventDefault` + `stopPropagation`。实测在 `.vt-root` 上挂监听后按 `→`：收到 **0** 次 |
| **工具栏按钮不用 `--vt-icon-btn-size`** | 那个令牌（20px）是给**表内**图标按钮（排序、折叠箭头）标定的，铺满视口的浮层上小得找不到 —— 用户为此反馈了三轮（20 → 30 → 40 → 46） | 定稿 **46×46 按钮 + 26px 图标**（图标是 `1em`，跟着 `font-size` 走），浮层字号从 `--vt-font-size-sm` 提到 `--vt-font-size`，左右切换箭头 56×56。实测：按钮 46×46 / 图标 26×26 / 工具组 322×46 / 顶栏高 74。**核心那个令牌一个字节没动** —— 改它会连表内所有图标按钮一起变大 |
| **滚轮缩放按 `deltaY` 连续换算，不是「一次事件一档」** | 第一版滚轮和按钮共用 1.25 倍一档 —— 触控板一次两指滑动会连发几十个 `wheel`（每个 `deltaY` 只有个位数），`1.25³⁰` 直接顶到 `SCALE_MAX`，用户反馈「滚轮放大缩小太敏感」 | `scale *= Math.exp(-deltaY × 0.0012)`，`deltaMode` 先折算成像素（1 = 行 ×16、2 = 页 ×400，否则按行上报的设备一次只有 Δ3、几乎不动），单次 `deltaY` 夹在 ±150。实测：触控板 30 × Δ3 → **111%**（原来 800%），鼠标一格 Δ100 → 113% / 127% / 143%（每格 ~1.13），deltaMode 1 的 Δ3 → 106%，上下限仍是 800% / 20% |
| **过渡只给离散动作** | 滚轮与拖拽是连续手势，每个事件都重启一次 120ms 过渡，图会一直追在指针后面（手感是黏的） | `transition: transform` 从基类挪到 `.vt-comp-image-viewer-figure--animated`，JS 只在按钮 / 键盘 / 旋转 / 还原 / 双击那几条路径上加它。实测 `transitionDuration`：滚轮时 **0s**、点按钮时 **0.12s** |
| **查看器的四段必须是流内 flex 项，舞台还要裁剪** | **用户报「点击会关闭预览器」**，根因是两处层叠，都只有真实鼠标才撞得出（之前的自动化用 `el.click()`，绕过命中判定，一路全绿）：① 第一版顶栏与舞台**都是 `position: absolute`**，两个不带 z-index 的定位元素后写的赢 → 舞台整片盖住工具栏，点「放大」被判成「点了幕布」；② 改成流内后又发现**放大到 125% 的图会盖住工具栏** —— transform 过的元素自成层叠上下文、画在流内内容之上，于是点一次放大之后旋转/缩小/还原全部没反应 | 浮层改成一列 flex：顶栏 / 舞台 / 说明 / 列表条四个流内项，舞台 `flex: 1; min-height: 0; overflow: hidden`（裁掉放大的图，也正是查看器该有的观感），顶栏 / 说明 / 列表条 `position: relative; z-index: 1`。左右箭头挂进**舞台**（相对图片居中，且点它们时 `e.target` 不是舞台）。契约测试静态钉住「舞台不许 absolute + 必须裁剪 + 操作区有 z-index」，CDP 用 `Input.dispatchMouseEvent` 发真实鼠标复验 |
| **多图给底部列表条** | 用户问「多图的时候预览器要不要做列表显示」。要：光有 `←` `→` 与 `3 / 8`，「跳到第 6 张」得按五次，也看不出别的几张长什么样 | 一排 56×56 小图，当前那张 `box-shadow` 主色描边（不用 `border` —— 那会改内容盒尺寸，切换时整排抖 1px），横向可滚 + `scrollIntoView({ inline: 'center' })` 跟着当前项走。小图走同一条取图队列，而且**在 `show()` 之后才进队**：同一批内先进先做，正在看的那张大图必须先出来。单图不挂列表条（一格的列表条是纯噪音）。实测 4 图：4 格 56×56、条高 80、真实鼠标点第 3 格 → `3 / 4` |
| **`separator` 默认不拆字符串** | data URI 里就有逗号（`data:image/png;base64,...`），默认按 `,` 拆会把一张内联图劈成两个坏链 —— 静默出错，比多写一个选项糟得多 | 只有显式传 `separator` 才拆。认不出的形状（数字、`{ src }`）当空值处理，显示 `placeholder`，而不是画一个永远失败的断图 |
| **`+N` 复用 `.vt-comp-tag-more` + `buildChips`** | 标签列、人员列、图片列的「还有 N 个」不该长得不一样，也不该各算一遍折叠数 | `buildChips` 追加的最后一个节点按类名认出来再绑点击，**从被折叠的第一张开始看**。实测 4 图 / `maxCount: 3` 的行点 `+1` 打开在 `4 / 4`，首尾循环 `4/4 → 1/4 → 2/4` |

**文案进了 locale**（`imageViewer` 子块，zhCN + enUS）。⚠️ 照 §7.14 那条：**新增子块必须同时在
`mergeLocale` 里补一行浅合并**，`locale.test.ts` 里配了一条专钉它的用例（键集一致那条抓不到）。
与 `calendar` 同一条约束：组件是纯工厂函数、拿不到实例，所以 locale 只是**默认值的单一事实源**，
不跟随运行时 `setLocale()`，要别的语言在列上传 `texts`。

**碰的地方**：新增 `components/_image-loader.ts`（队列 + 坏链表）、`components/_image-viewer.ts`
（浮层）、`components/vt-image.ts`（工厂）、`components.css` §12/§13；`locale.ts`（三处 + 类型导出）；
`components/index.ts` 多导出三个名字。测试 +28 例（`_image-loader.dom.test.ts` 7 例
+ `components.dom.test.ts` 的 `VtImage` 18 例 + 契约 2 例 + locale 1 例），全量 1148 通过。
三端 demo + 三个示例页 + api 选项表 + 侧边栏，另把仓库里「17 个内置组件 / 21 种逐格配置」的
口径统一成 18 / 22（`cell-type-render` 三端各加了一个 `VtImage` kind，紧挨着 `cellType: 'image'`
放 —— 同一份 URL，一个同步一张图、一个异步 + 查看器，摆在一起才看得出分工）。

### 7.14.3 `.vt-fb` 只带变量：token 载体不能兼任某个组件的外观（2026-08-20）

`index.css` 把整套 `--vt-*` 声明在 `.vt-root, .vt-fb` 上 —— 后者是给**表格之外的 DOM** 用的
token 载体（付费插件的外壳、`vtToolbar` 自己包的那层壳都靠它拿变量）。

而 `components/vt-filter-builder.css` 一度把**构建器自己那张面板的外观**（1px 边框 + 阴影 +
圆角 + `padding: 12px 14px`）也画在同一个 `.vt-fb` 上。后果：**任何一个 token 载体都白得一圈
卡片**，而且只在「那份 CSS 恰好在场」时出现 —— 实测撞到的是甘特外壳（`vtp-gantt-shell vt-fb`）
左右各被推进 15px、外面套了一层不属于它的边框与阴影，而它的注释明明写着「`.vt-fb` 只带变量」。
更阴的是触发条件：`plugins/toolbar.css` 开始 `@import` 筛选管理器的样式之后，这条 CSS
在装了工具栏的每个页面都在场，于是那圈卡片从「偶发」变成了「常驻」。

**结论**：token 载体是**一个角色**，组件根节点是**另一个角色**，不许共用一个类名。
外观搬到 `.vt-fb-panel`（构建器自己一起加上），`.vt-fb` 恢复成纯变量载体。
`css-contract.test.ts` 里有一条断言盯着「这份 CSS 里不许再出现裸 `.vt-fb` 的规则块」。

下次给「表格之外的 DOM」加公共类时照这条走：**带变量的类不带外观**。

### 7.14.2 表格之外也要用的三件共享件（2026-08-19）

付费插件的配置面板（甘特的「甘特图配置」下拉）需要**普通表单里**的下拉框与开关，
而 `VtSelect` / `VtSwitch` 是**列工厂** —— 返回的是 `VirtTableColumn`，只能装在单元格上。
于是 `components/` 里多了三件公开的共享件：

| 件 | 文件 | 谁在用 |
| --- | --- | --- |
| `createPopup` | `_popup.ts` | 内置组件的下拉、甘特的配置面板与里程碑浮层 |
| `createSwitch` | `_switch.ts` | `VtSwitch` 列组件**自己也用它**（一处实现），甘特的「仅计算工作日」 |
| `createSelectField` | `_select-field.ts` | 甘特配置面板里那四个下拉 |

三条踩过的理由，别再各自实现一遍：

1. **浮层不能挂 `document.body`** —— `--vt-*` 只声明在 `.vt-root` / `.vt-fb` 上（§7.2），
   挂到 body 整批 `var()` 静默失效；而 `vtCellEditor` 的 outside-click 白名单认
   `data-vt-popup`，自己搭的浮层一点就把别人的编辑器关掉。
2. **浮层里再开浮层**：子浮层挂在宿主上、是父浮层的**兄弟**，父浮层原本会判定为「点到外面」
   把自己关掉（连带清掉子浮层的锚点）。`_popup.ts` 因此维护一个 `OPEN_STACK`：
   点在**更晚打开**的浮层里不算外面；Esc 只收起最上面那一层。
3. **`VtSwitch` 改成套 `createSwitch`**，而不是两份 DOM 结构。搬子节点而不是整个 `sw.el`
   塞进单元格外壳 —— 两层 `.vt-comp-cell` 会让「锁高只能有一处」那条契约测试红。

`createSelectField` 的外观 = `.vt-comp-anchor`（回显 + 箭头）+ 新增的 `.vt-field-select`
（边框 + 自己的高度）。单元格里那份不画边框，因为边框由 `.vt-cell-cover` 给、高度由行高给；
搬到表单里这两样都得自己立起来。

### 7.15 编辑浮层的归属：按 `rowKey` 记，不绑 `<td>` 元素

用户报「`.vt-cell-cover` 没有跟着滚动，滚出视口后就回不来了」。CDP 查下来是 **行 DOM 池化复用**
与「浮层绑 DOM 元素」这两件事撞在一起 —— 不是 §7.13 那套滚动模型的问题（`offsetChange` →
`_onVScroll` → `emitScroll` 这条通知链是通的，插件收得到）。

**证据**（`?example=table-vt-input`，编辑第 2 行，逐级向下滚）：

| 滚动量 | 渲染窗口 | 行 2 在 DOM 里 | 浮层 |
| --- | --- | --- | --- |
| 0 | 0~20 | ✓ | 盖在行 2，top 131 |
| +160 | 0~24 | ✓ | 盖在行 2，top 13 → 正常跟随 |
| +240 | 2~26 | ✓ | 盖在行 2，top −67 |
| +400 | 6~30 | **✗** | `display: flex`、`style.top: −274.5px`，**那个位置没有任何行** |
| +720 及以后 | 14~38 | ✗ | `display: none`，`value` 变 `null` —— 编辑态连未提交的输入一起销毁 |
| 往回滚到 0~20 | 0~20 | ✓ | **仍然 `display: none`，回不来** |

`tbody` 里此刻是 6~30 这批 key，而 `<tr>` 元素是**留用、`data-row-key` 被重写**的 ——
所以原来存 `active.td` 的做法从根上就错：那个元素滚动后已经属于另一行。

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **编辑态按 `rowKey` + `colKey` 记** | 绑元素的两个后果都实测到了：① 浮层贴在被复用的行上（编辑第 2 行的数据、框盖在第 20 行）；② 行离开窗口时浮层冻结在屏幕外的旧 `top` 或被关掉 | 每帧按 key 重查 td（`tr[data-row-key] td[data-col-key]`）。顺带修掉一处旧隐患：「已经在编辑同一格」原来比 `rowIndex`，排序/筛选后同一行的 rowIndex 会变 |
| **行滚出渲染窗口只隐藏，不关闭** | 这才是「回不来」的正解。用户滚开看一眼再滚回来是常见操作，把编辑态连未提交的输入一起丢掉没有道理 | 查不到 td → `display: none` 且**保留 `active`**；回到窗口 → 复位 + 显形 + **把焦点还回去**（不还的话看起来在编辑但打字没反应）。CDP 实测：滚远后 `value` 仍是 `"未提交的草稿内容"`，滚回来原样显形在同一行 |
| **用 `display: none` 而不是 `visibility: hidden`** | 前者让浮层 rect 归零，挂在浮层里的二级弹层（`VtTextarea` 走 `components/_popup.ts`）据此一并隐藏；后者保留布局，二级弹层会留在旧位置 | `_popup.ts` 的 `position()` 加了一条：几何基准 rect 全为 0 或已离开 DOM → 藏起来，别按 0 去定位（否则浮层被扔到容器左上角，一个既不属于任何单元格又明明可见的框） |
| **必须同时订阅 `onScroll` 与 `onRendered`** | 只订阅 `onScroll` 会漏掉「不滚动但换行 DOM」的路径。CDP 验过排序：`sort('score','asc')` 后行序完全变了、一次滚动都没发生 | `onScroll` 管滚动，`onRendered` 管排序 / 筛选 / `setList` / 折叠展开 / 列宽变化。两者都只做「按 key 重查 + 定位或隐藏」，重复调用无副作用 |

**回归测试**：`plugins/cell-editor.dom.test.ts` 7 个用例，用 `renderControl` 钉窗口来模拟
「行离开 / 回到渲染窗口」（happy-dom 没有布局，真滚动测不出来，但窗口进出与几何无关）。
验证过它们**咬得住**：注掉 `ctx.on('onRendered', sync)` 一行，4 个用例立刻红。
像素级跟随仍然只能靠 CDP，数字记在上面那张表里。

#### 7.15.1 离开一格时必须立刻重绘那一格

用户报：「在 A 格选完值、不失焦直接激活 B 格，A 格竟然不更新，要等所有激活态都消失才更新」。

**成因是职责漏了一环**，两边各自都说得通、合起来就漏了：

| 环节 | 它做什么 | 为什么这么做 |
| --- | --- | --- |
| `components/shared.ts` 的 `commitValue` | 只改行数据 + 通知 `onChange`，**刻意不触发渲染** | 编辑期间格子被浮层盖着，逐次按键重绘整帧是纯浪费 |
| `plugins/cell-editor.ts` 的 `onCellTrigger` | 切换目标时只调 `dismiss()`（清空浮层、**不刷新**） | 看着合理：反正马上要打开新的浮层。但离开的那一格从此没人管 |
| 同文件的 `dismissAndRefresh()` | `dismiss()` + `forceUpdate()` | 只在**彻底关闭**（点空白 / Esc / 点到没有 `renderEditor` 的格子）时走到 —— 于是用户看到的就是「等所有激活态都消失才更新」 |

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **修在 cell-editor，不修在 `commitValue`** | 改 `commitValue` 去 `forceUpdate` 的话，`VtInput` 每敲一个字符就重绘整帧（而那一格还被浮层盖着，看不见任何变化） | 谁让格子离开编辑态，谁负责刷新它：`onCellTrigger` 里 `const hadActive = active !== null; dismiss(); if (hadActive) ctx.table.forceUpdate();` |
| **刷新之后要按 key 重查 td 再定位** | `forceUpdate()` 会重填行 DOM。元素大概率还是同一个（行 DOM 池化复用），但不能假定 —— 拿着刷新前的 `td` 去 `position()` 就是 §7.15 那个坑的翻版 | `findTdBy(rowKey, colKey) ?? td`。CDP 实测切换后浮层仍可见、且与 B 格左上角对齐 |
| **回归测试要能咬住** | 新增 3 个用例（切一格 / 连着换三格 / 切换后浮层仍归新格）。**验证过**：注掉 `if (hadActive) ctx.table.forceUpdate();` 一行，2 个用例立刻红 | CDP 实测（`?example=table-vt-select`）：A 格选「活跃」后不失焦去点 B 格，A 格文本**立刻**变成「活跃」，同时 B 的编辑浮层正常打开 |

#### 7.15.2 编辑态消失后要留下激活态（2026-08-12）

用户报：「单元格组件选完内容后编辑态消失，格子上少了激活态，让人感受不到刚才改的是哪个」。

编辑态是**会话**，消失是它的正常生命周期：单选下拉与日历都「选完即关面板」，点到别处整个
浮层收掉。缺的不是「编辑态别走」，而是**会话结束后没有任何痕迹**。

| 决策 | 实测 / 依据 | 结论 |
| --- | --- | --- |
| **复用核心已有的当前单元格描边，不在插件里另画一份** | 核心早有 `.vt-active-cell-overlay`（`highlightSelectCell`），连跟随都齐了 —— 纵向滚动（`_onVScroll`）、横向滚动（`_onHScroll`）、每帧渲染完（`_patch`）、容器 resize（`_onWidthChange`）四处都会重定位。插件另画一份的代价是第二套几何代码，且两个都开时叠出两层框 | 核心把 `_onBodyClick` 里那段抽成 `_setCurrentCell()`，对外开 `setActiveCell(rowKey, colKey)` / `getActiveCell()`（也进 `VirtTableHost` 白名单与三端 ref）。`highlightSelectCell` 从此只是「点击也算一次设置」的开关 |
| **描边浮层改成按需创建** | 原来只在 `highlightSelectCell` 为真时于 `_buildDOM` 建。要求使用方「装了编辑插件还得记得多配一个高亮选项」是把实现细节摊给用户 | `_ensureActiveCellOverlay()`：`_buildDOM` 按选项预建（行为不变），`setActiveCell()` 按需补建。挂 `.vt-client`、`z-index: 6`，所以晚于 `.vt-cell-cover`（5）插入也仍画在它之上 |
| **激活态与「这一格能不能编辑」无关** | 只在有 `renderEditor` 的格子上标记的话，点一下旁边的只读格子，描边赖在上一格不动 —— 看着像卡住了 | `setActive()` 放在 `onCellTrigger` 里 rowKey/colKey 解析之后、`renderEditor` 判定**之前** |
| **装了 `vtCellSelection` 时默认不画** | 那张表已经有一圈会跟着点击与键盘移动的「当前单元格」了。两个都画的结果不只是重复：它们会**分家** —— 选区移到 B2，编辑留下的描边还钉在 A1 | `activeCell?: boolean` 三态：`false` 关、`true` 强制开、不传则「没有 `cellSelection` 服务才开」。`inject('cellSelection')` **在每次触发时查**，不在 setup 里定 —— 两个插件都没声明 `requires`，框选可能声明在后面，setup 阶段问会问空 |
| **回归测试要能咬住** | `plugins/cell-editor.dom.test.ts` 新增 9 个用例（描边出现 / Esc 后仍在 / 跟到只读格 / 切格搬走 / 滚出隐藏滚回显形 / `activeCell:false` / 框选让位 ×2 / 显式 `true` 压过默认）。**验证过**：注掉 `setActive(rowKey, colKey)` 一行，5 个用例立刻红 | 位置是否像素级跟随仍只能靠 CDP —— 它走的是核心那套已有实测（§7.14 的数字）|

### 7.16 跟随 `@virt-list/core` 的一次改名（2026-08-11）

> 📌 **后续变更（2026-08-12）**：依赖已改成从 npm 安装（`@virt-list/core` / `@virt-list/vanilla` 均 `^0.0.6`）。
> 下面这段「符号链接」的描述是**当时**的状态，保留作为改名缘由的记录。

（当时）`node_modules/@virt-list/core` 是**指向兄弟仓库的符号链接**（`../../virt-list/packages/core`），
所以它的产物会在开发过程中变化。这次上游做了一批字段改名，本仓全量跟随：

| 旧名 | 新名 | 归属 |
| --- | --- | --- |
| `itemPreSize` | `estimatedSize` | `VirtListOptions`（**本仓的对外选项**，因为 `VirtTableOptions extends Omit<VirtListOptions, 'horizontal'>`） |
| `fixed` | `fixedSize` | 同上 |
| `virtualSize` | `leadingSize` | `ListState` |
| `listTotalSize` | `itemsTotalSize` | `ListState`（本仓只在注释/文档里出现，代码用的是 `getTotalSize()`） |
| `ReactiveData` | `ListState` | state 的类型名（更早那次改名的遗留） |

**`fixed` → `fixedSize` 必须手术式替换，不能全局 sed**。本仓 `fixed` 有三种互不相干的含义：

| 含义 | 例子 | 处理 |
| --- | --- | --- |
| virt-list 的行高模式 | 表格选项里的 `fixed: true` | **改**（38 处） |
| 列的冻结位置 | `col.fixed: 'left' \| 'right'` | **不改**（本仓自己的 API） |
| CSS `position: fixed` | §7.12 那张四种定位方式对照表 | **不改** |

判别式：**取值是布尔的就是 virt-list 选项**（列上永远是 `'left'|'right'` 字符串）。
另外注意 `docs/apps/vanilla/src/components/cell/*.ts` 里有几个 demo 拿 `fixed` 当**数据字段名**
（「只读」那一列的 key），取值是字符串/数组/数字，也不能动。剩下 5 处不带布尔值的散文/文档表格
（三端 API 文档的选项表行、§4 功能清单、`index.ts` 的一句注释）逐条手改。

**核心代码本身零改动**：我们从不读表格级 `fixed` / `estimatedSize`，选项对象整体透传给
`new VirtListCore(options, events)`，所以改名只落在 demo、测试、文档上。

⚠️ **只靠 tsc 不足以验证这次迁移**。这两个选项是透传的，写错名字时 TS 只在对象字面量上报
excess property；但如果某处漏改成了别的写法，运行时会**静默退化成没传**（`estimatedSize` 没生效
→ 首屏几何不对；`fixedSize` 没生效 → 又走回 ResizeObserver 测量）。所以补了 CDP 实测：
10 万行 + `fixedSize: true` 下行高恒 40、只渲染 16 行、`scrollToBottom()` 后窗口 99987~99999
（末行真的到得了，没有累积误差），另抽查 `auto-merge` / `infinite` / `vt-select` 三个 demo 行高均为 40。

⚠️ 上游在这次会话里改了**三轮**（15:44 / 15:47 / 16:26，`estimatedItemSize` 中途还叫过这个名字）。
迁移前先 `stat` 一下 `node_modules/@virt-list/core/dist/types.d.ts` 的时间、并以
`awk '/^export interface VirtListOptions/,/^}/'` 取当前字段表为准，别凭上一次的印象改。

### 7.17 单元格渲染的分层模型（2026-08-11，术语 08-12 定稿）

§7.5 那次审查把三条渲染路径收成了一条链（单元格级 `render` > 列级 `render` > `cellType` >
默认取值）。这次是接着它往下改：**那条一维链把几种性质不同的东西排在了同一列**，于是
「`type` 到底排第几」这类问题问不清 —— 功能列独占、内容来源、容器装饰根本不是一个维度。

现在的模型是**四层，层内按粒度**：

```
会话层  编辑态 renderEditor —— 可选（需 vtCellEditor），粒度只有 单元格级 > 列级
        .vt-cell-cover 挂在 ctx.clientEl（滚动容器）上，不在这一格的 DOM 里
════════ 打开编辑时盖在下面三层之上 ════════
接管层  ① 合成行（_rowType: group / expand）  _createRow 整行分流，不进单元格链
        ② 功能列 col.type（tree 除外）        独占单元格
─────────────────────────────────────────────────────────
内容层  ③ 单元格级 render → cellType
        ④ 列级     render → cellType
        ⑤ 表级     cellType
        ⑥ String(row[key])
─────────────────────────────────────────────────────────
容器层  tree 缩进/箭头 · mergeKey sticky 内层 · textOverflow · align · cellClass/cellStyle
```

下面三层是「谁包含谁」，不是「谁赢」，它们共同决定这一格的**常态**。层内只有一条规则：
**粒度越细越优先，同粒度内越具体越优先**（`render` 比 `cellType` 具体）。

| 决策 | 依据 | 结论 |
| --- | --- | --- |
| **`CellRenderConfig` 加 `cellType`，与列级同形** | 同一层的不同粒度接受不同形状，是纯粹的坑：改之前「就这一格画成 option 胶囊」只能手写 `render` 去复刻 `.vt-cell-option` 的内置样式（颜色还得自己 `color-mix`） | 三个粒度语义完全一致。适配层要**跟着透传**（`wrapCellConfig` 只挑它认识的字段，漏了就静默吃掉整个配置 —— React/Vue 两处都补了） |
| **粒度优先于具体度：单元格级 `cellType` 赢过列级 `render`** | 反过来的话，给某一格配了 `cellType` 却毫无反应（被列级 render 吃掉），没法向使用方解释 | `_resolveCellContent` 里按 cell→col→table 逐级、每级内 render→cellType。有用例钉住（谁退回成「render 一律优先」立刻红） |
| **解析返回判别式，而不是「render 或 undefined」** | 加进 `cellType` 之后调用方要区分的是**三种来源**；用 undefined 表达就得在外面再补一次 `col.cellType` 判断 —— 那正是 §7.5 要消灭的第二处实现 | `ResolvedCellContent = {source:'render'\|'cellType'\|'value'}`。`_resolveCellRenderer` 撤掉，`_fillCellContent` 与公开的 `resolveCellRender()` 共用同一个方法 |
| **`resolveCellRender()` 的 `render` / `cellType` 最多一个有值** | 它是插件与适配层判断「这格怎么画」的唯一入口。要是它按老写法回落（`perCell.render ?? col.render`），单元格级配了 `cellType` 时它会报告列级 render 生效，而屏幕上是胶囊 —— 插件按一份「理论配置」行事 | 走同一条链，所以答案与 DOM 一致。`renderEditor` 仍**独立回落**（支持「只改这一格展示、编辑照旧」） |
| **单元格级内容配置可以穿透功能列，列级不行** | 「这一行不给勾选 / 序号换成锁图标」在此之前**没有任何出口**（grep 过：既没有 `selectable` 也没有 `checkboxDisabled`）。而列级配了 render 又配 `type` 是配置写错了，继续告警忽略 | `_applyCellContentInner` 里一个 `pierced` 标志，加在 index/expand/checkbox/radio/drag 五个早返回的条件上。**`col.type !== undefined` 放最前面短路** —— 否则每个普通格都要多查一次配置表。⚠️ 穿透只改 UI：该行仍在选择作用域里，表头全选照样选中它（文档里写明了，别当 bug 修） |
| **`tree` 不参与穿透判定** | 它是容器层的装饰器，内容本来就走内容链，单元格级配置早就生效 | 条件里排除 `'tree'`，缩进与箭头照画 |
| **表级只加 `cellType`，不加表级 `render`** | 表级 `render` 等于「所有列画得一模一样」，真实需求（整表外观/类名）是 `cellClass` / `cellStyle`，早就有了 | `options.cellType` 排在内容层最低一级（只比默认取值高） |
| **不加「行级」** | `_cellRenders` 挂在行数据上但**键是列 key**，它是单元格级的兼容写法。真正的「整行不一样」是合成行（分组行/展开行），接管层已经覆盖 | 文档里明确写「没有行级」—— 不写的话，配置挂在行上会让人以为存在这一档 |
| **单元格组件不是优先级链上的一档** | 一旦让它自己占一档，立刻产生「组件 vs render 谁赢」的伪问题，而这问题没有正确答案 | 它是 `(render, renderEditor[, cellType])` 的**生成器**：装在哪一级就以那一级的身份参战。术语也跟着改（下一条） |
| **「列组件」改称「单元格组件」** | 「列」是**用法**不是**身份**：同一个工厂装在列上还是装在一格上，交付的都是那一格的内容与编辑器 | 纯术语改名，**零 API churn**（导出名 `Vt*`、入口 `/components`、CSS 前缀 `.vt-comp-*` 全不动）。「交互组件」被否掉：17 个里有一整类纯展示（`VtTag` / `VtProgress` / `VtLink` / 不配 `options` 的 `VtPerson`），而且「交互」在本仓已经被**插件层**占了（框选/键盘/编辑才是交互） |
| **`asCell(factory, opts)` 装单个格子** | 三个缺口都只在单元格级露馅：`BaseColumnOptions` 强制要 `key`/`title`/`width`（单元格级毫无意义）；`pickColumnProps` 抄到列外壳上的 17 个列属性会被 `setCellRender` 静默丢掉；手写配置很容易只给 `render`，配出「展示是进度条、点开是列上的下拉」 | 塞占位 `key:''` 再丢掉列外壳（组件写回走 `ctx.column.key`，从不读 `opts.key` —— grep 确认过 17 个工厂都只在拼列外壳时用它）；整对取 `render` + `renderEditor`；`CellOnlyOptions` 在类型上剔掉列专属选项（`validator` 例外，它由组件自己消费） |
| **`asCell` 的泛型必须写成 `F extends (opts:any)=>…` + `Parameters<F>[0]`** | 编译器实测：写成 `<O extends BaseColumnOptions<any>>(factory: (opts:O)=>…)` 时，**泛型工厂**（`VtSelect<T = any>`）推断不出 `O`，静默落回约束 → `options` / `max` 这些组件自己的选项全被判成「未知属性」 | 别改回去。要让 `onChange` 的 `row` 有类型，用实例化表达式：`asCell(VtSelect<Row>, {…})` |

**术语（08-12 定稿，未发版所以一次改干净，不留旧名）**：

| 决策 | 依据 | 结论 |
| --- | --- | --- |
| **第一层叫「接管层」，不叫「结构层」** | 「结构」在本仓已经指四种东西：仓库结构、DOM 结构、**结构展开（`_flattenTree`）**、**结构边界（合并断段）**。尤其「结构展开」产出的正是合成行 —— 于是「结构层」听起来只讲合成行，把功能列漏在外面 | 两个成员的共性就是**接管**（合成行整行接管、功能列独占单元格）。三层连读是一句话：**谁来画（接管层）→ 画什么（内容层）→ 怎么装（容器层）** |
| **编辑态是独立的「会话层」，不是内容层的例外** | 查实现才发现是结构使然：`cell-editor.ts:63` 是 `ctx.clientEl.appendChild(overlayEl)` —— `.vt-cell-cover` 挂在**滚动容器**上、由插件维护定位，编辑内容压根不在这一格的 DOM 里 | 所以它既不属于内容层（不参与那条链）也不属于容器层（不包裹格内内容）。这么一分，「`renderEditor` 为什么独立回落」不用再解释 |
| **层名叫「会话层」而不是「编辑层」** | 与「列组件 → 单元格组件」同一个原则：**编辑是成员，不是层的身份**。层的身份是「有开/关生命周期、盖在上面、独立回落」；哪天多一个只读的详情浮层态，叫编辑层就又要改名 | 引入处一律带一句「目前只有编辑态一个成员」，避免读者猜「会话」指什么 |
| **`render` 不改名** | 它在 `render*` 家族里是**裸名 = 默认那个**，也是行业惯例（AG Grid `cellRenderer`、vxe 默认插槽） | 保留 |
| **`renderEdit` → `renderEditor`**（⚠️ 这条推翻了同一次讨论里我先给出的「不改名」结论） | 我起初只拿 AG Grid `cellEditor` 当理由，那是弱理由，所以判成「不值得动」。真正的理由在**仓库内部**：这东西在别处**一律叫 editor** —— `vtCellEditor`(34) / `CellEditorService`(7) / `CellEditorOptions`(5) / `openCellEditor`(4) / `closeCellEditor`(3) / `cellEditor` provide key(3)，共 56 处，只有列上那个字段说 edit，是**孤例**。另外 `render*` 家族的构词法是 `render<它渲染的那个东西>`（表头 / 表尾 / 展开行），只有它渲染的是「编辑」这个**动作** —— 而返回值其实就是被挂进 `.vt-cell-cover` 的那个编辑器元素 | 改。**未发版 + 全程有守**：查过所有字符串形式的用法，6 处全在类型位置（`Omit<…, 'renderEdit'>`、`VirtTableColumn<T>['renderEdit']`、一处 `Object.keys` 断言），**没有按名字的运行时动态访问**，也不涉及 CSS 类名 / data 属性 —— 漏改一处就是 tsc 报错或测试红，不存在静默退化。连带改的派生标识符：`makeRenderEditor`(10) / `wrapRenderEditor`(6) / `userRenderEditor`(6) / `renderEditorFn`(4) |
| **`renderExpand` → `renderExpandRow`** | 和上一条同一条构词法，但这里还有个更硬的理由：`col.type: 'expand'` 已经指**展开列**（箭头所在那一列），而 `renderExpand` 配在**同一个列对象**上、渲染的却是**展开行** —— 同一个词在同一个对象上指两个不同的东西，和当初「两个都叫 type」（`col.type` / `col.cellType`）是同一类毛病 | 改。家族回到 `render<区域>`：`renderHeader` 表头 / `renderFooter` 表尾 / `renderExpandRow` 展开行 / `render` 这一格 / `renderEditor` 编辑器。45 + 2 处，同样被 tsc 守住（字符串形式只有两处 `Omit<…>` 类型位置）。<br>**否掉的候选**：`renderExpandContent` 论字面最准（函数填的是展开行**里的内容**，`<tr>` 是内核建的），但 `renderHeader` 填的也是 `<th>` 里的内容、并没叫 `renderHeaderContent` —— 家族约定是**命名区域**，不为一个成员破例。`detailCellRenderer`（AG Grid）把 master/detail 的**产品语义**塞进 API 名，而展开行里放的可能是子表/图表/日志/表单；`#content`（vxe）太泛。AntD 的 `expandedRowRender` 与本结论同 |
| **`ExpandRenderContext` 不跟着改** | 与 `CellEditContext` 同理：它是「展开这件事」的上下文（`{ column, row }`，row 是父行），不是「展开行」这个对象的上下文 | 保留（10 处） |
| **`CellEditContext` 不跟着改成 `CellEditorContext`** | 它描述的是**这次编辑会话**的上下文（`el` 就是 cover 元素，那是会话的 DOM，不是编辑器的），在会话层模型里比 `CellEditorContext` 更准 | 代价是与 `CellRenderContext ↔ render` 那种 1:1 对应稍松，接受 |
| **中文说法「展示态」→「常态」**（59 处 / 17 个文件，全量替换；「结构层」→「接管层」15 处） | 「展示态」自相矛盾：`AGENTS.md` 里就写着「展示态本身可交互」—— `VtCheckbox`/`VtSwitch`/`VtRate`/`VtActions` 这一整类**刻意不提供 `renderEditor`**，交互 100% 在 `render` 里 | 「常态」= 没进入编辑时这一格的样子，**与是否可交互无关**，正好同时容纳「直接可点」与「纯展示」两类。与「编辑态」是同一维度的两个值 |
| **「渲染态 / 交互态」被否掉** | 三条都是事实问题：① 两支都在渲染，把一支叫「渲染态」等于暗示另一支不渲染，「渲染」是动作撑不起「态」；② 交互恰恰主要发生在 `render` 里（见上一条），而 `VtTag`/`VtProgress`/`VtLink` 的 `render` 毫无交互 —— 这条轴在三类组件上全对不上；③ 「交互」在本仓已被**插件层**占了（`AGENTS.md` 四处写着「可选的 UI / 交互层 = `plugins/*`」），会撞名 | 与否掉「交互组件」同一个理由链 |

**CSS class 名不跟着 JS 改（08-12 结论）**：问题是「JS 改了这么多名字，`.vt-*` 要不要同步」。
答案是不改，理由是**风险结构相反** —— JS 改名漏一处就 tsc 报错，class 名漏一处是静默失效，
而且它还是对外的主题定制面。逐个查下来也没有一个是真错的，其中两处「不一致」是**载荷的**：

| class | 判断 |
| --- | --- |
| `.vt-td--expand` / `.vt-th--expand` | **不能改** —— 由 `` `vt-td--${col.type}` `` 拼出来，改了就与 `type` 取值脱钩 |
| `.vt-expand-content` | 唯一「同词跨列与行」的点，但读作「展开出来的内容」不含糊，收益 < 风险 |
| `.vt-cell-cover` | **刻意不叫 `.vt-cell-editor`**：它是承载编辑器的**罩层**，编辑器是 `renderEditor` 返回、挂在它里面的那个元素。两个概念分开是对的 |
| `.vt-cell-bool`（`cellType: 'checkbox'` 的产出） | 与 type 取值不一致是**故意避让**：勾选功能列已占了 `.vt-td--checkbox` / `.vt-checkbox`，叫 `.vt-cell-checkbox` 才会混 |
| `.vt-comp-*` | 「组件」这个词没变，`comp` 仍准确 |

**副产品**：为了回答这个问题写了一次 JS↔CSS 漂移扫描，249 个静态 class 里有 5 个没有对应
选择器 —— 4 个是无样式的抓手（`vt-tbody` / `vt-pagination-prev` / `vt-pagination-next` /
`vt-comp-link-panel`），1 个是**死类名**：`vt-client--highlight-select-cell`。它的两个兄弟
（`--highlight-select-row` / `--highlight-select-col`）都是 CSS 开关，而单元格高亮走的是覆盖层
（`.vt-active-cell-overlay`），根本不需要祖先类门控。**已删除**，并在原处留注释说明为什么这里
「刻意没有第四个」。死类名比缺类名更坏 —— 读代码的人会以为存在一条 CSS 开关。
这次扫描随后固化成 `class-contract.test.ts`（见 §5.3）。

**验证**：`cell-render.dom.test.ts` +13 例（粒度优先、同级具体度、表级兜底、
`resolveCellRender` 与 DOM 一致、`renderEditor` 独立回落、五个功能列的穿透、穿透不影响全选、
清除后复原、tree 不参与穿透）；`components.dom.test.ts` +4 例（`asCell` 的三件事 + 纯展示
组件不凭空造编辑态）。本节共 +17 例，全套 840 通过，`pnpm build` + `pnpm typecheck` 通过。
术语替换是纯注释/文档改动，不碰任何标识符，所以测试与类型检查对它没有约束力 —— 只能靠
上面那次全量 grep 确认无残留 —— 旧名剩下的那几处**全在解释「为什么不叫它」的句子里**（本节的决策行 + 三端指南的 tip + `components/index.ts` 头注），改动时别顺手也替换掉。

**类型级守卫（08-12 补上，此前是「手验后删掉探针」）**：`asCell` 的两条契约只活在类型层 ——
列专属选项必须被拒、组件自己的选项必须被接受。现在落成 `components/as-cell.test-d.ts` +
`tsconfig.typecheck.json` + 根 `pnpm typecheck` 的第一道，做法与「怎么验守卫真的会红」见 §5.2。
顺带把 vanilla playground（17 个组件 demo，本来有 tsconfig 却没挂脚本）也接进了 typecheck。

**Demo（08-12 补上）**：`docs/apps/vanilla/src/components/cell/cell-type-render.ts` 扩成
「内容层四种来源摆在同一张表里」——「分类」列故意配**列级 `render`** 作基线，每 3n+1 行用
**单元格级 `cellType`** 抢过来（粒度优先的实证）；4n+2 行的「状态」格用 `asCell(VtSelect)`；
7n 行的勾选格**穿透功能列**画成 🔒。CDP 实测（§7.9 的方法）：非 3n+1 行全为 `[X 类]`、
3n+1 行全为 `.vt-cell-option`；7n 行无 `input.vt-checkbox` 且有 🔒、其余行照常有勾选框（无误伤）；
4n+2 行状态格有组件胶囊；**数据行高全部 40.00px**（§7.11 不变量没被新元素破坏）；
头像列 `img.vt-cell-image` 仍在。

**同一份 Demo 的控件全部改用内置组件（08-17）**：那时示例里还剩一半是手写的 ——
四个手写编辑器（`makeInputEditor` / `makeNumberEditor` / `makeSelectEditor` /
`makeCheckboxEditor`，最后那个根本没被引用过）、手写状态徽章、手写 `div` 数据条（写死
`#e5e7eb` / `#22c55e` 这类色值，不跟主题）。示例本身讲的是「四种来源与优先级」，不是
「怎么手搓控件」，照着抄的人会以为得自己画 —— 与首页那次同一个问题（见
`demos-must-use-builtin-cell-components` 那条约定）。现在**控件一律 `asCell()` + 内置组件**：
状态 4n 行 `VtTag`（只读胶囊）／4n+2 行 `VtSelect({ display: 'tag' })`（可选，外观逐字符相同
—— 顺带成了「长什么样是参数，不该是组件名」的实证）、进度 `VtProgress({ thresholds })`
（按档取语义色）、姓名 `VtInput`、分数 `VtNumberInput({ validator })`、备注 `VtTextarea`。
自写 `render` 只留组件给不了的那一层：**条件格式**（分数按档上色）、**文字装饰**（蓝色姓名、
灰斜体备注）、🔒 穿透格；配色也一并换成 `var(--vt-color-*)`。要「组件的编辑器 + 自己的常态
外观」就写 `{ ...asCell(X, …), render }` —— spread 之后只覆盖 `render`，编辑器/校验/写回仍是
组件那一份，避免了 §7.17 说的那种「展示一套、点开另一套」。React / Vue 两份同名示例一并改，
并从行数据 `_cellRenders` 迁到 `setCellRenders()`，自写内容返回 JSX / VNode（走适配层包装，
`_cellRenders` 那条路本来就拿不到）。CDP 实测（§7.9 的方法）：数据行高仍全为 40px
（`.vt-comp-cell` 的锁高接住了新进来的进度条与胶囊）、姓名格双击弹出的是 `.vt-comp-input`
而非手写 input、进度条是 `.vt-comp-progress-bar`、无控制台报错。

**⚠️ 下面这一轮走反了方向，已被第三轮取代 —— 留着是为了别再犯同一个错**（08-17 第二轮）：
把「能用的组件都用上」做成了**一列一个组件**（列级），而这一页的主题恰恰是**同一列里每一格
都不一样**（逐格 `render` / `renderEditor`）。列级铺满组件之后，示例反而变成了「组件大全」，
而组件大全在 `docs/*/examples/cell/` 下已经有 18 页了。**改这一页之前先问自己：改动是在
强化「逐格」这件事，还是在把它变成列级示例？** 上一轮之后还剩四处自写 `render`
（蓝色姓名、按档上色的分数、灰斜体备注、🔒）和一列刻意手写的基线（分类列 `[A 类]`）。
把它们全部删掉，示例改成 **20 列 / 17 个内置单元格组件各占一列**：`VtInput` `VtPerson`
`VtTag` `VtSelect`（单值 + 多值）`VtNumberInput` `VtRate` `VtProgress` `VtSwitch` `VtCheckbox`
`VtDatePicker` `VtDateRangePicker` `VtTimePicker` `VtCascader` `VtAutocomplete` `VtLink`
`VtTextarea` `VtActions`（`VtFilterBuilder` 不是单元格组件，不在内）。**这一页现在没有一行
自己拼的 HTML。**

去掉手写基线之后，「四种来源 × 粒度优先」靠三处组件间的对照来讲，比原来更准：
① 状态列列级 `VtTag`（只读胶囊）→ 3n+1 行单元格级 `cellType: 'option'` **抢过去**（粒度优先
的实证，且顺带说明代价 —— `cellType` 只按内容类型画，拿不到列上的字典，所以显示原始值
`active` 而不是「活跃」）→ 4n+2 行 `asCell(VtSelect, { display: 'tag' })`（同一份 `createTagChip`，
外观逐字符相同，差别只在能不能点开选）；② 分数列列级 `VtNumberInput` → 3n 行换成
`asCell(VtProgress)`（同一列不同格换控件）；③ 勾选列 7n 行**穿透**成 `asCell(VtTag, { options: LOCK })`
的「锁」胶囊（值取行上的 `sel` —— `type: 'checkbox'` 功能列自己不读行值，那个字段正好空着）。
两个状态列分支写成 `else if`：同一格登记两次的话后写的静默盖掉前写的，示例就说不清哪条生效。
数据同时改成**确定式**（去掉 `Math.random()`，日期全程本地构造 + 手拼格式化，见 §7.14 那条
UTC 的坑），这样文档里「3n+1 行显示 active」才对得上。React / Vue 两份同名示例同步到同一
列集与同一份单元格级配置。

CDP 实测（三端）：数据行高全部 40px；**逐列点开编辑器**——`name`/`score` 出 `.vt-comp-input`、
`owner` 出带搜索的人员面板、`priority`/`skills` 出选择面板（多选带底部 actions）、`due` 出
`.vt-comp-calendar--single`、`period` 出 `--range`、`checkin` 出 `.vt-comp-time`、`region` 出三列
`.vt-comp-cascader-col`、`city` 出建议列表、`remark` 出 `.vt-comp-textarea` 浮层；`rate`/`enabled`/
`passed` 点一下就改（无浮层，符合「开关型控件不进编辑态」的设计）；`status`（只读）/`email`
（链接）/`ops`（按钮组）无浮层；全程无控制台 error/warning。

**改成「逐格不同」（08-17 第三轮，现行形态）**：A~E 五列的列定义里**只有 key / title / width**，
渲染完全由 `setCellRenders()` 决定，规则 `kinds[(行号 + 列号) % 22]` —— 往下、往右都不重复，
屏幕上是一条斜向花纹，「同一列的格子彼此无关」一眼可见（2.8 万条逐格配置）。**22 种 kind 覆盖
全部 18 个内置组件**（`VtSelect` 单值 / 多值各一种；08-18 随 `VtImage` 从 21 / 17 加到 22 / 18，
见 §7.14.3）**+ 3 个内容类型**（`cellType: 'option' /
'image' / 'checkbox'`，与组件并列摆着，好看出「内容类型不带编辑器、值得自己带内容」）。
唯一保留列级配置的是钉在右侧的「状态（列级兜底）」列，专门用来对照粒度优先。

三条实现约束（照抄这一页时最容易漏的）：① **配置与值必须配对** —— 装 `VtDateRangePicker` 的格子
存 `['YYYY-MM-DD', 'YYYY-MM-DD']`、装 `cellType: 'option'` 的格子得自己带 `{ label, color }`，
所以 `CellKind` 把「配置」与「造值」绑在同一个对象里；② **配置对象无行状态可共享** ——
2.8 万个格子共用 21 个 `asCell()` 产物，不是造 2.8 万份；③ 胶囊专属的 `maxCount` / `variant` /
`color` **在单元格级传不了**（`VtSelectOptions` 是按 `display` 拆的判别联合，`CellOnlyOptions` 的
`Omit<A | B, K>` 只保留两支共有的键，列级不受影响）—— 编译器直接报错，示例里改用默认阈值 3
并把值给到 4 枚来展示 `+N`。

CDP 实测（三端一致）：A 列行 0~20 逐个点开，**21 种 kind 全部符合预期** —— input / input /
无（VtTag 只读）/ 无（进度条）/ 人员面板带搜索 / 选择面板 / 无（点星即改）/ `--single` 日历 /
选择面板带 actions / 无（开关点即切）/ 级联多列 / 无（cellType option）/ textarea 浮层 /
`.vt-comp-time` / 无（勾选点即切）/ `--range` 日历 / 无（cellType image）/ 建议列表 /
无（cellType checkbox 只读）/ 无（链接）/ 无（按钮组）；前 14 行 × 5 列**没有空格子**、
行高全 40px、无控制台 error/warning。固定列的三种来源也验过：行 0 列级胶囊「活跃」、
行 1 `cellType` 抢占显示原始值 `inactive`、行 2 单元格级 `VtSelect` 胶囊「待审」。

**踩到的坑（验证脚本这边）**：右侧固定列宽 150px 正好压在 E 列上方，按 `getBoundingClientRect()`
算出的点击坐标全落进了固定列 —— 表现是「点了没反应」，看着像单元格级 `renderEditor` 不生效。
CDP 点击验证碰到固定列时，要么改点靠左的列，要么先横滚。

**文档分工：指南只讲架构，用法进示例（08-17 第四轮）**。用户的原话是「guide 中只介绍架构设计，
具体使用放到示例中新增一个 demo（guide 里弄个超链跳过去）」。于是：

- **新增示例 `advanced/cell-render-levels`（三端）**：表级 / 列级 / 单元格级各配一遍，7 个按钮
  **现场**演示回落 —— ① 表级 `text ⇄ rich-text`（销毁重建 / React·Vue 换 `key` 重挂载）、
  ② 单元格级 `cellType` 抢过列级 `render`、③ 同粒度 `render` 又抢过 `cellType`、④ 传 `null`
  清除回落列级、⑤ 穿透功能列、⑥ 单元格级 `asCell(VtTag)` 覆盖列级组件、⑦ 显式关掉编辑器。
  状态栏实时打印 `resolveCellRender()` 的结果 —— 优先级不靠 demo 自己推一遍（那会是第二份实现），
  只问核心。
- **`guide/cell-render.md` 三份瘦身**（214 → 177 行）：删掉所有可运行代码块（`new VirtTable`、
  `setCellRender`、`asCell` 的用法），只留分层图、那条优先级规则、内容类型契约表、设计理由
  （为什么没有表级 `render`、为什么没有行级）、会话层的结构解释；每节末尾链到示例页。
  末尾「速查」表从「配在哪（代码）」改成「哪一层 / 哪一级」。
- **api 三份**：vanilla 在 `## 单元格渲染` 节顶加双链（指南 + 示例）；react / vue 的 api 没有这一节，
  就在 `cellType` 行原有的指南链接后追加示例链接。两个示例页之间也互加了 tip 链接。

示例里刻意写进了三个**踩出来的**真实行为：① `cellType` 与**值的形状必须配对** —— 给 `option`
一个数字会画出空格子（`option` 只认标签字符串或 `{ label, color }`），所以按钮 ② 用的是
`'number'`；② 穿透进功能列的组件读的是 `row[colKey]`，行上没有那个字段（勾选列通常没有）
就只会画个空，示例的行数据里因此专门放了 `sel: 'lock'`；③ **`renderEditor` 独立回落是双刃剑** ——
按钮 ⑥ 把常态换成只读 `VtTag` 之后，`resolveCellRender()` 仍报「有 renderEditor」（回落到列级
`VtSelect`），于是「常态只读胶囊、点开却是下拉」；要真只读得像按钮 ⑦ 那样显式给一个返回 `null`
的 `renderEditor`，`undefined` 不算「没有」，只算「这一级没配」。

**顺手修了 React 适配层一个真 bug**（`packages/react/src/index.ts`）：组件卸载的 effect cleanup 里
同步 `root.unmount()` 所有子 root，撞 React 的「Attempted to synchronously unmount a root while
React was already rendering」—— 只要使用方用 `key` 重挂载 `<VirtTableReact>`（换数据源、换主题、
本示例换表级 `cellType` 都是这么写的）就**必然**触发。改成先取出 root 列表再 `queueMicrotask`
里卸载（`mountReact` 替换旧挂载点时早就这么处理了，这里漏了一处）。

**React / Vue 的 ref 刻意不转发 `resolveCellRender`**：它返回的是**包装之后**的配置（`render`
已被适配层包成「返回 DOM」的函数），不是使用方传进去那个返回 JSX / VNode 的函数，直接暴露只会
让人以为拿到的是自己那份。要查最终生效的配置走 `ref.getTable()?.resolveCellRender()` —— 示例、
示例页文档、指南三处都按这个口径写。

**后续（08-17 第五轮）：`guide/cell-render.md` 三份已删除，模型并入 `api/cell.md`。** 起因是把
1800 行的 `api/index.md` 按作用对象拆成 11 页（见 §7.21），拆出来的 `api/cell.md` 与这份指南
撞了四成内容：内容层那张 6 行优先级表、`cellType` 取值表、「第 2 条高于第 3 条」的论证、
容器层一律叠加、`renderEditor` 独立回落 —— 同一个事实两份拷贝，改一处必漏一处。
现在 `api/cell.md` 一页从模型讲到参考：分层图 → 内容层规则 → `cellType` → `setCellRender` →
没有「行级」→ 接管层与穿透 → 容器层 → 会话层（含外观归属 / 激活态）→ 编辑校验 → tooltip →
组件不是链上的一档 → 速查表。**「指南只讲架构，用法进示例」这条对 cell-render 不再适用**
（其余指南页不变）：模型与参考表本来就该在同一页，示例页仍然承担可运行写法。
入链一并改掉：三端示例页各 1 处、`vanilla/examples/cell/cell-type-render.md`、
`vue|react/api/{table,column}.md` 各 1 处、`api/index.md`、`config.ts` 的 guide 侧边栏、
以及三份 demo 源码头注。react / vue 那两份指南里的源码指针（`packages/{react,vue}/src/plugins/cell-editor.ts`）
本来就不存在，删掉时顺带作废。

**验证**：三端 CDP 逐个按钮点过，7 个动作的 DOM 变化与 `resolveCellRender()` 输出全部符合预期
（含「表级切 rich-text 后描述列的 `<b>` 才生效」「重建后单元格级配置随之清空」），三端无控制台
error/warning；`pnpm -C docs exec vitepress build .` 通过（死链检查在这一步）。

### 7.18 自然语言查询 `vtAIQuery`（2026-08-12）

**它是什么**：一句话 → 筛选/排序/列显隐。分两层 —— 纯逻辑 `ai-query.ts`
（schema 生成 / 校验规范化 / 映射成 `VirtTableState`）+ 插件壳 `plugins/ai-query.ts`
（输入条 UI、`resolve` 编排、撤销）。与 `export.ts` ↔ `plugins/export.ts` 同一分层套路。

| 决策 | 依据 | 结论 |
| --- | --- | --- |
| **不内置任何 LLM SDK，不发网络请求** | key 不该落前端；企业自研网关 / 服务端代理 / 本地模型都得能接；绑了厂商这插件就废一半。同 `remote.ts` 做成受控层的理由 | 调模型由使用方的 `resolve(input)` 回调实现。插件只做两端：给 schema、收 JSON |
| **校验层是这一层存在的主要理由，不是附属品** | `filter-model.ts` 的求值刻意「宽容」——未知列、不完整条件一律视为通过，这样 UI 上编辑到一半的条件不会把表筛空。但模型幻觉出列名时，同样的宽容变成**「筛了却没效果」**，用户完全无从判断 | 在应用**前**把问题挑出来（`AIQueryIssue`，`error` = 已丢弃 / `warn` = 已修正），反馈区可展开 |
| **输出 `VirtTableState` 而不是私有形状** | 复用 `setState()` 已有的批量提交（一次列重建 + 一次管线重算）与版本校验 | AI 这条路不新增任何数据通路 |
| **模型产出用简化投影 `AIQuery`，不直接让它产出 `VirtTableState`** | 后者含 `version` / 列宽 / 分页等与语义无关的字段，塞进 tool schema 只会增加幻觉面 | `AIQuery` 只有 filter/sort/columns/search/explanation |
| **JSON Schema 用 `enum` 收窄列 key 与算子** | 能被 schema 挡掉的幻觉就别指望 prompt 去管；支持 constrained decoding 的服务端会直接把非法取值挡在生成阶段 | `toAIToolJsonSchema()` 产出的 `colKey` / `operator` / `columns` 全是 enum |
| **同时给 prompt 文本和 JSON Schema** | 两者管的不是一件事：JSON Schema 管**结构**，prompt 管**语义**（算子适用性、枚举 label→value 的对应、相对时间的基准日期）。后三样用自然语言说比塞进 schema 的 `description` 更省 token 也更容易被遵守 | `buildAIPromptContext()` + `toAIToolJsonSchema()` 配合用 |
| **`ai-query.ts` 单独开构建入口** | ① 它最该跑在**服务端**（模型的产出在那里就该校验掉），而 `plugins/ai-query.ts` 带 `import './ai-query.css'`，服务端引不得；② 不给入口的话，barrel 与 `plugins/ai-query.ts` 两处引用会让 Rollup 把它和插件本体并成共享 chunk，插件 CSS 就跟着 chunk 名落到 dist 根下，`plugins/ai-query.css` 这个 exports 路径直接失效（实测踩到了） | `exports` 加 `./ai-query`；产物 `dist/ai-query.js`，零 CSS 零 DOM |
| **撤销只留一步快照** | 多步栈要考虑「用户手动改了筛选之后 AI 又改一次」的交织，语义讲不清；而实际诉求是「它理解错了，退回去」 | 应用前存 `{ getState(), getSearchTerm() }`；要多步自己在 `onResult` 里维护栈 |
| **`explanation` 让模型必填** | 用户得先看见「它理解成了什么」才敢信，撤销按钮就在旁边 | 进 `toAIToolJsonSchema` 的 `required` |
| **`search` 只落 `setSearchTerm`** | 它是查询状态（进 `RemoteQuery.search`），但命中高亮属于 `vtSearch`；两个插件之间没有 provide/inject 通路，硬接会把 `ctx.table` 白名单撑破 | 命中高亮需另装 `vtSearch`，已在文档写明 |

**给 `VirtTableHost` 加了 `getState` / `setState`**：插件要整体改查询就该走这个统一入口，
而不是拼几个单独 setter（后者触发 N 次列重建与管线重算）。这是白名单的一次正当扩张 ——
两者本来就是公共 API。

**枚举列的 label 回译**是实测里最高频的一类偏差：用户说「华东区」，候选是
`{ label: '华东区', value: 'east' }`，模型十有八九直接填 `'华东区'`。prompt 里写了「请填
value」也拦不住，所以 `resolveEnumValue()` 兜底（精确 label → 忽略大小写与空白的宽松匹配 →
都不中则原样保留，因为数据里可能真有这个值）。

**Demo 用本地关键词规则模拟模型**，不是真在调 LLM —— 文档站不该要求访客准备 API key。
规则里**故意保留了三种真实口音**（枚举填 label、数字写成字符串 `'1000000'`、提到「毛利」
就幻觉出不存在的 `profit` 列），好让校验层的作用在 demo 里看得见。

**顺带修掉的两个核心缺陷**（都是这次接 AI 时被真实用例撞出来的，与 AI 无关，见 §7.19）。

**验证**：`ai-query.test.ts` 55 例（纯逻辑）+ `plugins/ai-query.dom.test.ts` 23 例（落地链路、
撤销、并发作废、UI）+ `pipeline.dom.test.ts` 6 例（§7.19 的回归守护）；全套 951 通过，
`pnpm build` + `pnpm typecheck` 通过。

**CDP 实测**（10 万行 demo，方法见 §7.9，20/20 通过）：

| 验的事 | 实测 |
| --- | --- |
| 一句话真的筛到了数据 | 「华东区销售额超过 500 万」→ `aria-rowcount` **100000 → 18883**；渲染出的行 `region` 全为 `east`、`amount` 全 > 5,000,000 |
| 枚举 label 回译真的必要 | 同上那句里模型填的是 `'华东区'`；没有回译这一步筛出的会是 0 行 |
| 诊断如实上屏 | 该句产生 warn（label 回译 + 字符串转数字）；「毛利大于 0」产生 error 且**表格不动**，文案点名 `profit` |
| 撤销 | 撤销后 `aria-rowcount` 回到 **100000** |
| §7.19① 的实证 | 「只看客户名称和销售额」把 `industry` 藏掉后，它上面的筛选**依然生效**（行数仍为 25023）—— 修复前这里会跳回 10 万 |
| 「重置全部」 | `filter: null` + `sort: []` + 全部列一次落地，7 列全回来、排序也清了 |
| 行高不变量（§7.11） | 数据行仍为 **40.00px** |
| 控制台 | 0 报错 |

### 7.19 两个被 AI 用例撞出来的核心缺陷（2026-08-12）

都不是 AI 特有的问题，只是「一句话同时改筛选和列显隐」这种组合以前没人走过。

**① 数据管线拿的是可见叶子列，隐藏一列就让它上面的筛选/排序静默失效。**

`_rebuildData` 原本把 `this._columns`（**可见**叶子列）交给 `buildFilterModelPredicate` /
`buildColumnFilterPredicate` / `buildComparator`。而 `buildFilterModelPredicate` 对指向未知列的
条件返回 `null`（= 不筛），于是：

- 在字段配置面板（当时叫 `vtColumnPanel`）里隐藏一列 → 该列的筛选立刻失效、行数突然变多，没有任何提示；
- `setState` 还原「隐藏了某列 + 该列有筛选」的状态 → 筛选丢失。

筛选与排序是**数据层**的事，与列可见性无关（AG Grid / Excel 同此语义）。改成在
`_applyColumnTree` 里顺带派生 `_allLeafColumns = flattenLeafColumns(columns, true)` 交给管线 ——
`_columns` 本来就要走一趟同样的遍历，**零额外成本**。

**② `getState()` 在无高级筛选时省略 `filterModel`，导致 `setState(getState())` 不是恒等操作。**

`setState` 区分「不给字段 = 保持现状」与「给空值 = 清空」（这条本身是对的，§7.8 有记录）。
但 `getState()` 作为**完整快照的生产者**省略字段，就让「先存快照 → 之后加了筛选 → 还原」
清不掉那条筛选。`getState()` 的文档承诺（存 localStorage、下次还原）在这个方向上是坏的。

⚠️ **这条推翻了一个被测试显式锁定的旧行为**（`state.dom.test.ts` 的「没有高级筛选时不带
filterModel 字段」）。推翻的依据是：AGENTS.md 里查不到这条决策的**理由**，它更像实现时的顺手
写法 + 一条描述性测试，而不是论证过的取舍；`setState 往返` 那组也从没覆盖「无 → 有 → 还原回无」
这个方向。现在 `getState()` 恒输出 `filterModel`（无筛选时为 `null`），旧测试改成锁定新语义
并补了清空方向的往返用例。**要推翻回去的话，请先给出「精简 JSON」之外的理由。**

### 7.20 流式表格 `vtAIStream` 与 AI 列 `vtAIColumn`（2026-08-13）

两件事都在「虚拟化 × 异步」的交汇点上 —— 这是本项目相对 headless 表格库（TanStack）与
不虚拟化的 UI 库表格（el-table / AntD）真正独有的地方。

**`vtAIStream`**：一边收数据一边渲染。现有表格库都隐含两条假设 ——「列是预先定义好的」
「数据一次性给全」，AI 应用的输出恰好两条都违反。

| 决策 | 依据 | 结论 |
| --- | --- | --- |
| **攒帧再落，不逐行 `appendRows`** | `appendRows` 已经带 `keepPool`（行 DOM 不重建），但每次仍要走一趟 `_rebuildData`。模型逐行吐时那是每行一次管线 | 缓冲 + rAF（或定时器），一帧一次；`maxRowsPerFlush` 默认 500 防止一批两万行撑爆一帧，超出的排到下一次 |
| **stick-to-bottom 不需要「是我滚的」标志位** | 自己 `scrollToBottom()` 触发的 `onScroll` 回调里，判定结果就是「在底部」，不会误关跟随；用户上滚 → 不在底部 → 关；手动滚回底部 → 恢复。逻辑自洽 | 只用一个 `atBottom()` 判定，没有额外状态 |
| **总高问 `scrollHeight`、位置问 `getOffset()`** | 纵向滚动归 JS（§7.13），`clientEl.scrollTop` 恒为 0；总高由 `.vt-skeleton` 撑出来 | `followThreshold` 默认 40px —— 动态行高下总高会被 ResizeObserver 持续修正，判定必须留余量 |
| **`abortAIStream` 保留已收到的行** | 半截数据也是数据，清掉反而更糟（用户看着的东西突然消失） | 只清缓冲，不动已落地的 |
| **`startAIStream()` 不清数据** | 清不清是使用方的决定（追加一轮 vs 换一批），插件不该替它做 | 要清自己 `setList([])` |

**`inferColumns`（纯逻辑，单独入口）**：按**多数票**判定而不是看第一行 —— agent 数据的第一行
常常是 null 或异常值；字段集合取采样行的**并集** —— 不同来源拼起来的数据每行键可能不齐。
两个刻意的选择：**纯数字字符串不判成数字**（可能是订单号 / 手机号 / 邮编，右对齐加千分位反而是错的）；
**列宽取 P90 而不是最大值**（一两行超长内容不该把整列撑到 320px，那种情况交给 tooltip）。

**`vtAIColumn`**：一列的值由模型算出来。**虚拟化在这件事上是决定性优势** —— 一列 AI 值在
10 万行表上全量跑是 10 万次模型调用，而屏幕上只有二十来行。

| 决策 | 依据 | 结论 |
| --- | --- | --- |
| **默认只为渲染窗口内的行付钱** | 不虚拟化的表格做不到这个优化：它们 DOM 里所有行都在，没有「可见」这个概念可用 | `onRendered` 取整屏差集：新进来的入队、滚走的出队并 abort 在途 |
| **用 `onRendered` 的差集，不用 `onCellRendered` 逐格入队** | 退出逻辑需要知道「谁不见了」，逐格钩子只能知道「谁在」 | 可见集合每帧整体刷新 |
| **值不写回行数据** | 行数据是使用方的，AI 生成的东西混进去就分不清哪些是原始数据（导出、提交、对比都会踩坑） | 存插件自己的 `Map<rowKey, state>`，`getAIColumnValues()` 取用 |
| **每段只重画那一格，不 `forceUpdate()`** | 流式逐字更新时整帧重渲染的开销无法接受 | 按 `rowKey` + `colKey` 定位 td 改 `textContent`（同 `vtSearch` 的高亮做法） |
| **失败的格子不自动重排** | 否则每次滚过去都重试一遍 = 无限重试烧钱 | 点它重试，或 `recomputeAIColumn()` |
| **被 abort 的行不算失败** | 主动取消不是错误，不该留个红字在那 | 状态直接丢弃，等下次进屏重排 |
| **窗口外的行也要能算** | `ctx.getRowData()` 只覆盖渲染窗口内的行（`visibleOnly: false` 与显式传 key 的场景拿不到行数据，实测撞到了） | 懒建 `listIndex`（从 `getList()`），`onDataChanged` 时作废 |

⚠️ **`queueMicrotask` 那个闸门是必须的，别顺手删掉**。首帧的 `onRendered` **以及 `onMounted`**
都在 `new VirtTable()` 返回**之前**同步派发（`onMounted` 在构造函数末尾），那时使用方的
`const table = new VirtTable(...)` 还在 TDZ 里 —— 回调里碰 `table` 直接
`Cannot access 'table' before initialization`（CDP 实跑时真的撞出来了）。更要紧的是这是
**花钱的调用**，不该在使用方拿到实例、有机会取消之前就发出去。所以首帧只入队，微任务里才开泵。
`ai-column.dom.test.ts` 有两例守着（构造期零调用 + 闸门不影响后续滚动触发）。

**给 `VirtTableHost` 加了 `appendRows` / `prependRows` / `setColumns`**：都是既有公共 API，
`vtAIStream` 落数据与推断列都要用。

**两个纯逻辑层各自单独成构建入口**（`ai-query` / `infer-columns`）。第二次踩同一个坑才总结出规律：
**barrel 与插件两处引用同一个非入口模块，Rollup 就把它和插件本体并成共享 chunk，插件的 CSS
跟着 chunk 名落到 dist 根下**，`plugins/<名>.css` 这个 exports 路径直接失效。以后再加「纯逻辑 +
插件壳」这种搭配，记得给纯逻辑那半也开入口。

**验证**：`infer-columns.test.ts` 33 例 + `plugins/ai-stream.dom.test.ts` 29 例 +
`plugins/ai-column.dom.test.ts` 27 例；全套 1040 通过，`pnpm build` + `pnpm typecheck` 通过。

**CDP 实测**（方法见 §7.9，25/25 通过，控制台 0 报错）：

| 验的事 | 实测 |
| --- | --- |
| 列真的是推断出来的 | `columns: []` 起步，首批数据到达后表头变成 8 列；金额列 `text-align: right` 且带千分位、结清列 `center`、**订单号虽是数字串却仍是 `left`** |
| 攒帧落地不破坏几何 | 「灌 2 万行」→ `aria-rowcount` **108 → 20198**，数据行高仍 **40.00px** |
| stick-to-bottom | 接收中上滚 → 指示器切到 `--paused`；停止后指示器撤掉 |
| **只为可见窗口付钱** | 5 万行表：首屏 **17 次**调用；滚过 6 屏后 **45 次**（不是 5 万）；同时 `已取消 20` —— 滚走的行把在途请求 abort 了 |
| 流式写入 | 单元格里能看到逐字累积的片段与 `--computing` 扫光态 |

### 7.21 API 文档按作用对象拆页（2026-08-17）

`docs/vanilla/api/index.md` 长到 **1820 行**，vue / react 各 400 余行。一页装下 Options 全表、
列全表、渲染模型、单元格组件、插件、类型定义之后，既翻不动也搜不准（浏览器内搜索命中十几处，
分不清哪处是定义）。按**作用对象**拆成 11 页（三端同构）：

| 分组 | 页面 |
| --- | --- |
| 表格级 | `table`（Options 全表 / 加载态 / 主题 / i18n / 状态持久化 / ARIA）· `instance`（方法 + 属性 + 滚动模型）· `data`（分页 / 服务端与无限滚动 / 树形懒加载 / 筛选 / 合计行 / 固定行 / 单选行） |
| 列级 | `column`（Column 全表 / 功能列 / 排序 / 显隐 / 拖拽）· `group-header`（分组表头与表尾） |
| 单元格级 | `cell`（分层模型 + 渲染参考，见 §7.17 末尾）· `components`（内置单元格组件）· `merge`（`MergeCell` + `mergeKey`） |
| 其他 | `plugins`（清单 / 按需引入 / 键盘导航 / 导出打印 / 写插件）· `types` |

`index.md` 只留导航（四组表格 + 每页装了什么）。几条踩点：

- **三端页名必须一致**。`useFramework.ts` 的 `getFrameworkLink` 换框架时只替换第一段路径段，
  vanilla 有 `api/components` 而 vue 没有就是 404。所以 vue / react 侧的 `cell` / `components` /
  `plugins` 三页是新写的（封装层特有的部分：VNode/JSX 渲染、`setCellRender` 走 ref、
  插件与组件的 import 路径、`plugins` 只在 mount 时读一次），再加一条深链指回 vanilla。
- **锚点保持不变**。VitePress 的 slug 由标题文本决定，标题只升降级不改字就不会失效；跨页链接
  改的只是路径。全站 63 个文件里指向旧单页 8 个锚点的链接一次性改完
  （最多的是 `/vanilla/api/#单元格组件` 54 处）。
- **拆页时顺手修的**：「键盘导航」一节里一对空的表头残留；`[setActiveCell](#方法)` 指向不存在的
  锚点（标题是「实例方法」）；「见『合并单元格的坐标系』」是纯文本没链。
- 侧边栏在 `buildApiSidebar()` 里按四组给 `collapsed: true` 的子分组，与示例那八组同一种写法。


### 7.22 文档职责分离：api 只放表，示例页放正文（2026-08-17）

上一节把 api 拆成 11 页之后，还有两处混着：**api 页一半是长篇讲解**（`cell.md` 327 行、
`components.md` 365 行、`table.md` 190 行），查字段要在散文里翻；**示例页每页手抄一段
「使用的 API」类型块**（三端 203 页），字段说明与 api 各维护一份。反过来 `column/*.md` 里那
18 份 `VtXxxOptions` 比 api 的「各组件专属选项」表更详细 —— 事实源其实在示例页那边。

现在的分工：

| | 答什么 | 放什么 |
| --- | --- | --- |
| `api/*.md` | **有什么** | 字段表 / 方法签名表 / 取值表 / 优先级表 + 最小接口骨架；每张表上方最多一句话，要展开就写「用法与边界见 ⟨示例页⟩」 |
| `examples/**` | **怎么用、为什么** | 正文（含设计理由与已知代价）+ 一节 `## 相关 API`（本例用到的 3–6 个字段 + 锚点链接）+ demo + 源码 |

搬迁是**双向**的：长篇讲解 api → 示例（`cell.md` 的分层图去了 `cell/render-levels`、日期日历
去了 `cell/vt-date-range-picker`、状态持久化与滚动模型各新建一页纯文字示例页…）；字段清单
示例 → api（18 份类型块收进 `api/components.md`，每组件一张小表 + 一个 interface）。
结果：`cell.md` 327→115 行，全站示例页不再出现手抄类型块。

顺带做的结构重整（同一次改动）：

- **分组名 = md 目录名 = playground demo 目录名**。原来「增强功能」的目录叫 `feature`、
  「单元格组件」的目录叫 `column`，对不上；现在七组各自对应 `basic` / `feature-columns` / `cell` / `advanced` /
  `plugins` / `ai` / `merge`，`docs/apps/*/src/components/` 下同名。
- **「增强功能」并进「高级功能」**。那条界线从来没说清：「树形懒加载」在增强、「树形」在高级；
  「高级筛选」在高级、「分页」在增强。
- **「渲染粒度 + 单元格组件」合成一组「单元格渲染」**。拆成两组时读者看不出组件**就是**列级
  `render` + `renderEditor` 的一种装法。
- **功能列合成一页**。`index` / `checkbox`（原在基础功能）与 `radio`（原在增强功能）讲的是同一件事
  （接管层独占单元格），合成 `feature-columns/index.md`（自己一组，排在「单元格渲染」之前 ——
  分层图里接管层就在内容层之上）；三个 demo 也合成一个（一页只能挂一个
  `PlaygroundHost` —— 三端 qiankun appName 固定，同页两个实例会冲突）。
- 侧边栏一级标题**「示例」→「功能」**（与 Demos 的「经典案例」对照），**URL 段仍是 `/examples/`**。
- 顺手删掉两处死页：`{vue,react}/examples/basic.md`（与 `basic/basic.md` 重复、侧边栏没引用）、
  `vanilla/examples/experimental/literal.md`（`example-id="literal"` 全仓无注册，打开就是加载失败）；
  顺手修掉 `plugins/column-drag` / `row-drag` 两页写的 `columnDraggable` / `rowDraggable` ——
  这两个 option **早就不存在了**，入口只有 `vtColumnDrag()` / `vtRowDrag()`。

**三端已对齐（2026-08-18）**：vue / react 两端的 78 页示例页现在与 vanilla 同一套结构
（示例 → 源码 → 说明 → 原有小节 → 相关 API），旧的「使用的 API」手抄类型块清零。生成方式分两类：

| 类别 | 页数 | 做法 |
| --- | --- | --- |
| 正文框架无关 | 50 | 从 vanilla 页生成，只换标题前缀 / `PlaygroundHost` / `<<<` 路径 / 主包 import；站内互链换本端，**api 链接保留指向 vanilla**（那份是事实源） |
| 含 vanilla 专属调用 | 27 | **保留端页原有代码块**（框架写法本来就是对的），只注入 vanilla 的「相关 API」+ 统一结构 |

踩到的两个坑，下次批量改端页时注意：

- **别用机械改写把 `new VirtTable(el, {...})` 变成端写法**。带对齐注释的多行 options 一改就散
  （`columns` 还得从 options 里摘出来 —— 两端它是组件 prop 不是 option），试过一次就回滚了。
  真要同步这类页，代码块从端页原样保留。
- `basic/reactive` 与 `cell/render` 这两页**不能从 vanilla 生成**：前者的结论在框架端是反的
  （vanilla「没有任何响应式」，而两端 `options.list` 换引用会被 watch / effect 接住自动
  `setList()`），后者 vanilla 根本没有。这两页各端手写。

**验证锚点别靠肉眼**：VitePress 的 slug 规则与「按标题猜」不一致（`### 内容类型（\`cellType\`）`
→ `#内容类型-celltype`）。`pnpm build:docs` 之后从 `dist/**/*.html` 里 grep `id="..."` 与 md 里的
`](/vanilla/api/xxx#yyy)` 对一遍，比读源码可靠。

### 7.23 浮动图片：先在核心做完，再整包移到 pro（2026-08-18）

`vtFloatingImage`（全表浮动图片：内容坐标系里摆图，拖动 / 四角缩放 / 旋转 / 点开看大图）
**已不在本仓库** —— 它是付费插件 `@virt-table-pro/floating-image`。实现细节、CDP 实测数字、
以及踩过的坑都记在那边的包 README 与 pro 仓库 AGENTS.md 里，这里只留下**对核心有约束的三件事**：

**1. 核心为它新开了一个公开子路径：`@virt-table/vanilla/components/image-viewer`**
（`src/components/image-viewer.ts` + `_image-viewer.css`，`exports` 里两条：JS 与 CSS）。

付费插件的「点图看大图」要复用内置组件 `VtImage` 那个查看器，而 pro 仓库的第一条铁律是
**只吃公开契约**（碰 `_xxx` 私有成员的话，核心每次重构都会在客户侧炸掉而 CI 抓不到）。
所以按那条约定的做法在核心沉淀成公开 API。两个决定：

- **不从 `components` barrel 导出**：那个入口带 19 个单元格组件与整份 `components.css`
  （55 kB JS + 40 kB CSS）。只想弹个查看器的使用方不该为此付钱。
- **CSS 拆成 `components/_image-viewer.css`**（`components.css` 与新入口各自 `@import`），
  与 `plugins/_panel.css` 同一手法。`components-contract.test.ts` 改成两个文件一起读 ——
  §13 那批断言查的就是它。

pro 仓库的 `verify/consumer/exports.test.mjs` 里有这条子路径的正向断言（含 CSS），
核心哪天改名或删掉它，那边的 smoke 测立刻红。

**2. `internal/` 里那两个基元被 pro 拷了一份**（`drag.ts` 的 `startDrag` / `swallowNextClick`、
`auto-scroll.ts` 的 `createAutoScroll`）。判据是**体量与稳定性**：300 行的查看器值得让核心
开公开面，七十行且语义已稳的手势基元则拷一份更省事（给核心加公开面 = 从此不能随便改签名）。
所以改这两个文件时不用管 pro —— 它不会自动跟上，也不会被改坏。

**3. 公开文档站仍然演示它，而且只吃 pro 的 `dist`。**

这套消费方式现在服务**两个案例、四个付费插件**：电子表格用 `floating-image` / `formula` /
`undo`（见 §7.25），项目管理 WBS 用 `gantt`。演示密钥收在
`docs/apps/vanilla/src/pro/demo-license.ts` —— **一把密钥覆盖全部产品**（`products: '*'`），因为许可是
模块级单例，各案例各设一把会在画廊里切换时互相覆盖（先看甘特再看电子表格，前者的角标
会凭空冒出来）。

**三档**（`docs/apps/vanilla/vite.config.ts`）：`dist`（pro 仓库的 `packages/<name>/dist`，
本地维护者）· `installed`（`node_modules/@virt-table-pro/*`，**不 alias**，CI / 部署）·
`off`（`docs/apps/vanilla/src/pro/` 下的桩 —— 表格照常跑，只是没有付费能力）。
自动判定 **dist > installed > off**，`VT_PRO` 显式指定却不满足时**直接报错**、不静默退回，
每次构建都会打印一行当前档位。类型侧**始终**指向桩，否则本仓库的 `pnpm typecheck`
会要求另一个私有仓库存在。

**「只吃 dist、绝不吃 src」是这条方案的安全边界**：公开产物里最多出现客户手上同样的字节
（已压缩、注释已剥、无 sourcemap，已核对 JS 与 CSS 都不剩一条中文注释），没有源码、没有 map。
它也顺手补上了 pro 仓库「轨道 B」的一环 —— 这是核心之外第一个真正消费 pro `exports` 的地方。
代价是改完 pro 源码要 `pnpm pro:build` 一次才能在这里看到（插件本身的开发在 pro 的 playground 里做）。

边界由脚本守着而不是注释：`pnpm verify:pro-leak`（`scripts/check-pro-leak.mjs`，已挂在
`build:docs` 末尾）扫要发布的产物，命中「付费源码专有注释 / `sourceMappingURL` / `.map` /
指向 pro 源码目录的路径」任一条就让构建红掉，并按目录报「这次有没有把付费插件打进去」。
反向验证过：塞一个含源码注释的假文件进 `docs/public/micro-apps/`，脚本退出码 1。

案例里那把演示密钥是**域名绑定**的（`keno-lee.github.io` / `kolarorz.github.io`），
`products: '*'`、2099-12-31 到期 —— 本站的一把长期授权，加新付费插件不用重签，也不会某天
因为过期自己长出角标。公开放着也没用：换域名只会出现未授权角标 + 一行 warn，功能不降级。
细节见 `contributing/pro-plugins.md`。

**`installed` 档是为「带付费能力部署」加的**（2026-08-19）。要点四条，完整说明在
`contributing/pro-plugins.md` 与 pro 仓库 AGENTS.md 第十六条：

1. **alias 只在构建期起作用** —— 付费字节被打进 bundle，线上产物自包含。所以问题从来不是
   「线上跑不起来」，而是**构建那台机器上有没有付费产物**：没有就静默发一个桩档的站，
   而那件事没有任何外部症状。`VT_PRO` 指定却不满足要报错、构建要打印档位，都是为这条。
2. **`installed` 不是「CI 版的 dist 档」** —— 它走裸包名 + 包自己的 `exports` 映射（含
   `./index.css` / `./time` 子路径），而 alias 会把 `exports` 整个绕过去。每次部署因此顺带
   验了一遍「客户装完那组离线 tgz 真能用」。
3. **铺包用 `tar` 解压**（`scripts/install-pro-tgz.mjs`）而不是 `npm install`：本仓库是
   pnpm workspace，混用包管理器动同一个 `node_modules` 极难查；写进 `package.json` 更糟 ——
   公开仓库一旦声明 `@virt-table-pro/*` 依赖，外部贡献者的 `pnpm install` 立刻 404。
   代价是那些目录不受 pnpm 管理，**跑过 `pnpm install` 要重新铺一次**。
4. **tgz 绝不入库**（`.gitignore` 里 `*.tgz` / `.pro-tgz/`）。bundle 里有 dist 字节与一个
   可直接 `npm i` 的完整包不是一回事 —— 后者等于免费发货。
5. **发布是手动的**（pro 仓库 `publish.md` 第三节是唯一真源）。⚠️ 而 `static.yml` 仍会在
   push master 时自动部署 —— runner 上没有付费产物 → `off` 档 → **覆盖掉刚手动部署的站**。
   手动流程下那个自动部署没有好处只有这个坏处；处理办法见 publish.md（推荐把 `on.push`
   去掉、只留 `workflow_dispatch`）。

顺带一处命名调整：查看器的 CSS 从 `_image-viewer.css` 改名为 **`image-viewer.css`**（去掉
内部件的下划线前缀）。它随公开子路径一起对外，文件名必须与 `exports` 里的
`./components/image-viewer.css` 对齐 —— 否则「吃源码的链路」（playground 的 alias）
与「吃产物的链路」（客户 / 付费包）引的不是同一个路径，就会出现「monorepo 内引得动、
装到用户项目里 404」。`components-contract.test.ts` 读的文件名跟着改了。

---

### 7.24 行拖拽改成树形 / 分组通用（2026-08-19）

`vtRowDrag` 原来只会「插到某行前/后」，而 `canReorderRows()` 把**树形**（`_hasTreeCol`）与
**分组**（`groupConfig`）一并拉黑 —— `moveRow()` 只在 `_originList` 的根层 `findIndex`，
嵌套结构写不回去。于是表格支持 `type:'tree'` 与 `groupConfig`，行拖拽在这两种最常见的结构下
反而完全不可用。照 virt-list 的树形拖拽（`tree/VirtTree.ts` 的 `_dragProcess` /
`_crossLevelDragProcess` / `onMouseup`）把落点模型换掉。

**1. 落点用「父级 + 前一个兄弟」，不用「目标行的前/后」。**

后者在树里说不出「是它的子节点还是它的兄弟」。核心的唯一入口是
`moveRowTo(sourceKey, { parentKey, prevKey })`，三种父级：数据行（成为子节点）、
分组行（落进该分组）、空（根层）。`moveRow()` 保留为它的薄包装，扁平表行为不变。

**2. `canDropRow()` 与 `moveRowTo()` 共用一份判定 `_resolveDrop()`。**

指示线每次 pointermove 都要问「这儿能不能放」，落数据时又要问一遍。两份判定必然会漂，
然后表现成「线画着却放不下」。`_resolveDrop` 返回的是完整执行计划（源数组+下标、目标数组+下标、
要改哪些字段），`canDropRow` 只看它是不是 null。同一个理由，**「拖回原处」也判成放不下** ——
指示线跟着消失，比松手才发现没反应好。

⚠️ 由此得到一条约束：`_resolveDrop` **不许有副作用**。第一版在里面给叶子行补
`children = []`（好让落点数组存在），结果 hover 一路扫过去每个叶子都被挂上空数组。
改成登记 `attachTo`，由 `moveRowTo` 落数据时才挂。

**3. 分组落点必须改数据，没有别的选项。**

分组行是 `_constructGroups` 按字段值现算出来的合成行，本身不承载数据。所以「拖到分组 B 下」
只能是**把这行的分组字段改成 B 的取值**。为此给分组行加了 `_groupPath`
（`{ field, value }[]`，含祖先层）—— 原有的 `_groupField` / `_groupName` 只描述当前层，
多级分组下还原不出祖先层的取值，改一半会把行送进「新的一级 + 旧的二级」这种不存在的格子。

根层落点（分组之间）同样按 `prevKey` 那行所属的分组同步字段，保证「指示线画在哪就落在哪」；
第一个分组之前没有对应分组，那里判成放不下。

**4. 层级标尺把分组层与树层合成一把。**

`level = (_groupLevel - 1) + _treeLevel`。视觉上 `.vt-group-indent` 与 `.vt-tree-indent` 同宽
（都是 `--vt-indent-size`），层级箭头也只能有一把 —— 两把标尺在「分组里套树」的表上会打架。
父链靠**在扁平列表上往前找第一个层级更小的行**算（`parentAt`），纯数据、不碰 DOM。

**5. 指示线**按层分段，**不是**一条从目标层级画到右边的整线。

`.vt-row-drop-line` 是个 flex 容器，内含 `maxLevel` 个 `.vt-row-drop-seg`：前几段各占一格缩进
（`--vt-indent-size` 减去段间距 `--vt-drop-line-gap`），最后一段 `flex: 1`；`[min, max]` 区间内
比目标层级浅的画 `--past`（40% 主色）、目标层级及之后画 `--on`（实色），**比 `min` 更浅的段不上色**
（那些层级根本选不到，画出来是骗人的）；`.vt-row-drop-arrow`（CSS 三角）挂在目标层级那一段的起点。
与 virt-list 的 `dragLine` / `levelArrow` 同构。

第一版偷懒画成「一条从目标层级起点开始的线 + 一个圆点」—— 层级信息只剩「线往右缩了多少」，
可选区间与当前层级都看不出来，实测下来根本读不懂。

**5b. 层级的基准是「第 1 层**内容**的左边缘」，不是行的左边缘。**

树形行的排布是 `缩进 × (层级-1) + 折叠箭头 + gap + 内容`，所以第 1 层的内容已经被
**一个折叠箭头 + 一段 gap** 顶开了（实测 20 + 6 = 26px）。第一版拿 `.vt-tree-row` 的左边缘
（= 第 1 层箭头的位置）当基准，整条层级线与箭头就比对应层级的文字左 26px，看着像少了一级。

基准不写死 26px，而是从**任意一个已渲染的数据行**反推：
`origin = 该行 .vt-tree-content 的 left − (该行层级 − 1) × --vt-indent-size`。
两种表都对 —— 树形表的基准含箭头与 gap，纯分组表的数据行没有箭头、基准就是缩进块起点；
箭头宽度或 gap 被改样式改了，基准也自动跟着变。CDP 实测：三级文字起点 97 / 117 / 137，
线的三段与箭头逐一对齐。

⚠️ 这条换算吃的是「**每加一层，内容起点固定右移一个 `--vt-indent-size`**」这个不变量。
它由三件事共同保证，而三件都是「改一处就静默错掉」：两种缩进块同宽且等于
`--vt-indent-size`、折叠箭头宽度也等于它、**叶子的占位箭头仍占位**（`visibility: hidden`
而不是 `display: none`，否则同层里叶子与非叶子的文字差 26px）。CSS 侧由
`css-contract.test.ts` 的「树形缩进：每一级步进一致」守，JS 侧（放了几格、箭头有没有放）
由 `group-indent.dom.test.ts` 的「树形行的缩进结构」守 —— 五种改坏都验过会红。

**6. 开拖先把源节点收起**（virt-list `_dragStartClone` 里那句 `expandNode(key, false)`）。

三个理由，第三个才是关键：① 拖的是整棵子树，收起来 ghost 才对得上「搬走一整块」；
② 子树留在列表里会跟着晃，落点在自己的行之间来回跳；③ **可放区域会被自己的子树切碎** ——
落在自己子树里一律放不下，于是源节点下面一大片全是没有指示线的死区，用起来像坏了。
拖完保持收起（同 virt-list，不还原）。

副作用：`toggleFold` 会派发一次 `onTreeToggle`（使用方看到的是「折叠了这个节点」，其实是拖拽引起的），
且**「拖进自己子树」在手势层从此不可达** —— 环检查只剩 `moveRowTo` / `canDropRow` 那层还在守
（`row-reorder.dom.test.ts` 里有直接调用的用例）。

**7. 指示物一律挂 `.vt-client`，不挂行元素。**

virt-list 把指示线 append 进 item 元素，那边没有行 DOM 复用；这里行会被虚拟滚动回收，
挂进去会跟着被摘走，或者更糟 —— 粘在复用后的另一行上。同理源行的 `.vt-tr--dragging`
要在 `onRendered` 钩子里每帧重贴。自动滚动的 `onTick` 里也要重算落点，否则行在走、线钉在原地。

**8. 「成为子节点」那一档要按表的结构给。**

没有树形列也没有分组时，中间 1/3 落点核心必拒（`!_hasTreeCol` → 放不下），
不做判断的话每行中段都成了没有任何反馈的死区。插件开拖时定一次 `structural`，
不满足就把档位退回上/下对半分。

**9. 顺手修掉的四个真缺陷（都是这次才暴露的）。**

- **ghost 显示错了列**：原来挑标签列用 `find(c => !c.type)`，而 **`type:'tree'` 是数据列**
  （它只加缩进与箭头，内容仍是字段值）—— 于是树形表上 ghost 跳过名称列、显示的是第二列
  （「部门」）。这条规则核心里本来就有 4 份字面拷贝（`col.type && col.type !== 'tree'`），
  抽成 `internal/column.ts` 的 `isFunctionalColumn` / `isDataColumn`，5 处共用一份。
  放 `internal/` 而不是核心导出：**生产插件代码一律只从 `../index` 做 type 导入**
  （值导入会把整个核心拽进插件 chunk），能共享值的地方只有 `internal/*`。

- **分组缩进的宿主列**：原来写死 `col === columns[0]`，而表头挂 `type:'drag'` / `type:'checkbox'`
  是常态 —— 功能列在 `_applyCellContentInner` 里各自早返回，压根走不到缩进那一支，于是
  分组下的数据行**一格缩进都没有**。改成 `_groupIndentCol()`（第一个非功能列），
  与树形列那支按 `type:'tree'` 定位是同一条规则。CDP 实测过：修前 `indents: 0`，修后 `1`。
  顺带这也是行拖拽的层级基准 —— 插件靠 `.vt-tree-row` 的左边缘换算层级，一个都没有就没基准。
- **触摸期间屏蔽滚动输入**：原来只有列拖拽做（`holdTouch`）。行拖拽现在**横移是用来改层级的**，
  不拦 `touchmove` 就会一边改层级一边横滚表格。抽成 `createTouchGuard()` 两边共用。
- **示例的行高不齐**（40 与 61 混着）：faker 造的人名在 160~260px 的列里换行，行高就翻成 61px
  （正是 §7.11 那个数）。列上补 `textOverflow: 'ellipsis'` 后齐了。这不是核心的问题，
  但它会把树形缩进衬得很乱，**做树形/层级类示例时列上一律配 `textOverflow`**。

⚠️ 层级基准**不能取悬停行的左边缘**：分组行是一个 `colSpan` 撑满的 `.vt-group-cell`，
里面没有 `.vt-tree-row`，行左边缘比数据行的缩进起点靠左一整个手柄列（44px）——
拿它当基准，指针一放到分组行边界上层级就恒等于最深那档。所以基准一律取**任意一个数据行**的
`.vt-tree-row`（那是列位置，各行一致）。

**10. 分组字段只改被拖那一行，不递归后代。**

后代不参与分组（分组只作用于根行，它们的字段值不影响位置），而静默改写整棵子树的数据太重 ——
那个字段也可能是逐行不同的业务字段。要级联由使用方在 `onRowMove` 里做，示例里演示了一次。

**示例（`docs/apps/*/src/components/plugins/RowDrag*`）是三个正交开关**：树形 / 分组 / 跨层级，
**任意组合都成立**（含树形套分组 —— 那时最大缩进 3 层：分组 1 层 + 树 2 层）。
分组维度刻意用 `region` 而不是树的层级字段：树是「项目 → 模块 → 任务」，分组是「归谁管」，
两者正交才有「同时开」的意义（拿层级字段分组会变成每个分组下只有一个根节点）。
树形关掉时喂**拍平后的同一批行**，否则只剩 6 个根行可看；两份列表都在启动时建好、之后各自独立
（拖拽是就地改数据的，现拍平会让来回切开关像「顺序自己变了」）。
开关外观是新加的 `.demo-switch`（三份 `docs/apps/*/src/style.css` 同步加了）——
**互斥的选项仍该用 radio**，这里三个彼此正交才用开关。

CDP 实测过六种组合：数据行高恒 40px（41px 只有分组头行，那是它自己的加强分隔线）、
分组行与树形箭头能同时出现、切开关时旧实例都被销毁（`.vt-root` 恒为 1 个）。

**测试**：`row-reorder.dom.test.ts` 测引擎（改父 / 分组字段改写 / 环检查 / 老签名回归），
`plugins/drag-sort.dom.test.ts` 测手势（placement 分档 / 层级夹取 / 同级模式 / 分组落点）。
后者**刻意 stub 了几何与 `elementFromPoint`**（§5.1 一般不建议）：happy-dom 里几何全是 0
且根本没有命中测试，不喂进去这套层级归约等于没人守。两份都按 §5.2 的要求验过「改坏会红」
（改坏 placement 分档 → 6 红；去掉层级夹取 → 2 红；去掉开拖收起 → 2 红；
分段一律实色 / 不按 min 收窄 / 箭头不跟层级走 → 各 1 红；ghost 退回 `!c.type` → 1 红）。

真实浏览器那一层是**手验 + 一次性 CDP 脚本**（照 `scripts/shoot-demos.mjs` 的 CDP 会话写法，
`Input.dispatchMouseEvent` 派发真实鼠标序列，脚本没进仓库）。它抓到了两件 happy-dom 测不到的事：
① 落点摆在容器边缘 40px 内会持续自动滚动、落点跟着变（这是**正确行为**，但写脚本时要避开）；
② 上面第 7 条那两个缺陷。

---

### 7.25 电子表格案例接上公式与撤销（2026-08-19）

电子表格案例又装了两个付费插件：`@virt-table-pro/formula`（**单元格公式**，第二档）与
`@virt-table-pro/undo`。消费方式沿用 §7.23 那一套（只吃 dist、桩兜底、类型指桩），
`src/pro/` 下多了 `formula.ts` / `undo.ts` 两个桩，演示密钥重签成覆盖四个产品。
这里只记**做法上的判断**，用法与数字在案例文档页里。

**1. 偏差列整列写成公式，不是造数时算一遍。** 65 列的 key 本来就是 `A`…`BM`，所以
`columns` 给**全部 65 列**：列字母 = 列标题 = 列 key，`I2` 就是表头上那个 I。只挑数字列进去
的话字母按数组下标重排（`H` 会变成 `A`），fx 栏里的坐标就没人看得懂。

**2. 写公式的入口是 fx 栏，不是格子里的编辑器。** 每一列都已经有自己的单元格组件，
插件不会覆盖别人的 `renderEditor`（案例写 `editor: false` 把这件事说明白）。
公式栏的「当前格」来自插件的 `onActiveCellChange` —— 装了框选之后核心的 `getActiveCell()`
恒为 null，那个回调正是为此存在的。

**3. 装载代价：建表 53ms → 450ms。** `compile()` 必须遍历 rows×cols（650 万格）才能找出公式
建依赖图，再求 9.75 万条值。之后每次改动走 `recalcFrom`（改一格报「写回 1 格」）。
这笔钱只付一次，但**它与「案例首屏 36ms」那句话冲突**，所以文档里把两个数字都写出来了，
没有藏起来。首屏更重要的场景应当把公式收窄到需要的行。

**4. 撤销的粒度是使用方的设计，不是插件的。** 核心没有任何编辑事件，所以数据层一律显式
`recordChange()`。案例里五处，各用**不同**粒度：

| 动作 | 粒度 | 判据 |
| --- | --- | --- |
| 单元格编辑 | 一格旧/新值，**一次编辑一条** | 组件逐键 `commitValue`，逐键记 = 按十下键要撤销十次 |
| fx 栏写公式 | 那一格的**原文** | 撤销要还原输入；还原结果值等于把公式变成常数 |
| 清空选区 | 逐格：值 + `_sheetCells` + `_formulas` | 三样都清才叫清空；漏了原文，引擎下一轮又把结果算回来 |
| 合并 / 取消合并 | 整份 `merges` | 状态只有一份且很小，整份换不会错（`getMerges()` 已经是副本） |
| 粘贴 | 受影响的**整行**浅拷贝 + 整份 `merges` | 一次粘贴动矩形 + 可能加列 + 带合并区；逐格记要把三样分别对齐 |

编辑的边界靠**包一层 `renderEditor`**（打开 = 变更前）+ `onChange`（更新变更后，只在第一次
写回时进历史）。`redo` 闭包读的是那个会被后续按键覆盖的字段，所以重做回到的是这次编辑
**最后**那个值。`VtCheckbox` 不开编辑器 → 没有 begin，布尔的变更前就是取反。
录制器是个**模块级挂钩**（列定义要在建表前造好，而录制要表格实例），卸载时必须置回 null。

**5. 桩模式要留回落路径。** 偏差列是公式原文，公式插件不在就没人算它 —— 那一列会露出
`=I2-H2`。案例建表后看 `table.recalculate` 在不在（付费包装上才有），不在就把那一列填回纯值、
并把统计条里「公式 N 条」清零（那时确实没有公式在跑）。

**6. 顺手修了 pro 侧一处语义**（`packages/formula/src/sheet-engine.ts`）：界内取不到值的格
之前返回 `undefined`，求值层当成「引用不存在」报 `#REF!`。而本案例的行对象是**稀疏**的
（一行只写有值的那些列），于是「清空 H2/I2 之后 `=I2-H2` 变成 #REF!」。改成返回 `null`
（空格 → 算术里当 0，Excel 同）；`#REF!` 只留给越界。区域引用那条路本来就是 `?? null`，
单格对齐它才自洽。pro 那边补了一条稀疏格的测试。

**验证**：CDP 实测过五条链路 —— 点公式格（fx 栏出原文 + 2 个引用高亮框）、fx 栏写
`=SUM(N2:BM2)`（J2 → 70）、撤销/重做、双击改 I3 为 99（J3 跟着变 87）、清空 H2:I3
（依赖格变 0 而不是 #REF!）、合并与粘贴的撤销都能精确还原。`VT_PRO=off` 那一档也过了：
三个桩各 warn 一行，偏差列回落成纯值，建表 53ms。

### 7.26 滚到边界之后，这次输入交给谁（2026-08-19）

原来的答案是「谁也不给」：表格滚到底继续滚，页面一动不动；手指按在表格上，整页滑不动。
两条轴、三种输入设备的出口各不相同，且**不对称是刻意的**，所以单独记一节。

**1. 纵向滚轮：一个 `auto` 就够，位移根本不用自己写。** `InputController._onWheel`
到边界时本来就不 `preventDefault`，事件原样落回浏览器 —— 缺的只是 `.vt-client` 上那句
`overscroll-behavior-y: contain` 别再掐断链。改成 `auto` 之后 latching、惯性接管全走原生路径。

两个反直觉的点实测证伪过，别再按直觉改回去：

| 直觉 | 实测（Chrome 151 headless，复刻 `_onWheel` 让行逻辑） |
| --- | --- |
| `.vt-client` 纵向 `overflow: hidden` 且 `scrollHeight === clientHeight`，浏览器视角完全不可滚，`overscroll-behavior` 应该形同虚设 | **生效**。`contain` 时 `window.scrollY` 始终 0，`auto` 才滚起来（连续 20 格推到 max 后继续滚 11 格 → `scrollY` 1320） |
| wheel latching 会把整段序列锁在表格上，到底后必须抬手重滚 | **不会**。被 `preventDefault` 的事件不参与 latch，放行的第一格重新 latch 到能滚的祖先。"一路滚到底不松手"与"停一下再滚"都能穿透 |

**2. 横向滚轮：只能 JS 代劳，因为 `none` 把链也掐了。** 横向必须留 `overscroll-behavior-x: none`
压橡皮筋（理由见 `index.css` 里那段），可那条声明**同时**掐断滚动链 —— 在这条轴上"放行给
浏览器"等于什么都不发生（真实 demo 实测：放行后祖先 `scrollLeft` 一动不动，页面 `scrollX` 0→0）。
放宽成 `auto` 链是通了，回弹也一起回来，两件事在这一个属性上二选一。

所以交叉轴改成自己接管：`_findChainTarget()` 算出浏览器本该交给谁，直接写它的 `scrollLeft`，
然后**无条件 `preventDefault`**。浏览器全程不介入，穿透与不回弹同时成立。
只在 `raw === 0`（纯横扫）时走这条路 —— 斜向手势一律放行，那时纵向穿透比横向防回弹重要得多。

**3. 触摸：浏览器压根不生成滚动手势，只有 JS 一条路。** `touch-action: pinch-zoom` 之后
到边界"不 `preventDefault`"不会让外层接手，只会什么都不发生 —— 这就是"整页滑不动"的成因，
比 iOS 原生（抬手后能滑）还严格。归属按 **iOS 语义**在手势起步那一刻定一次（`_chain`）：
被锁的那条轴上表格已经到头，这次手势整个交给外层；**中途绝不转手**，一开始由表格滚的手势
即使滚到底也不会把剩下的位移让出去，想滚外层得抬手重滑。松手后的惯性跟着 latch 目标走。

没照 Chrome / Android 的「到边界就转手」：数据网格里用户常在微调表格位置，滚到底顺势把页面
带飞很难受，而"抬手"是个明确的交接信号。

**4. 链的终止规则照抄浏览器，两处容易写错。**

| 规则 | 错写成什么样 |
| --- | --- |
| `overflow: hidden` 不算可滚（用户滚不动它），但**仍能掐断链** | 只看"有没有余量"→ 会滚到一个用户看不出能滚的容器上 |
| `overscroll-behavior: contain` 只挡「从我往上传」，**不挡我自己被滚** | 以为 `contain` 一律终止 → 外层有余量时白白不滚 |
| 页面兜底前必须查 `html` / `body` 的 `overflow` | 少这一步会**绕过 scroll lock**：弹窗锁着背景页，代劳却把页面滚了 |

页面自身的 `overscroll-behavior` 反倒不用看：它管的是页面到头之后往不往浏览器 UI 传
（下拉刷新、侧滑返回），不阻止页面被滚。

**验证**：virt-list 侧 16 条单测覆盖全部分支（`InputControllerScrollChain.test.ts`）；
真实 demo（7901）CDP 实测四条 —— 纵向滚到底后页面接上并滚到上限 3147；横向到头 + 页面能横滚
→ `prevented: true` 且页面 `scrollX` 逐次 0→120→240→360（确认是 JS 在滚，不是浏览器）；
横向到头 + `html` 横向 scroll lock → 页面 `scrollX` 保持 0 且 `prevented` 全 true（不会回弹）；
触摸 emulation 下表格有余量时上滑页面不动、表格到底后新手势上滑页面 226→763。

### 7.27 为 `@virt-table-pro/xlsx` 补的两处核心公开面（2026-08-31）

付费包 `vtXlsx`（真 zip + OOXML 导出）动工时核心只差两件事，都按「缺口先在核心补成公开 API」
补掉了（付费仓库 AGENTS.md 第一条），本身零运行时改动。

**1. `getMerges()` / `getEffectiveMerges()` 进 `VirtTableHost` 白名单。**

这两个方法在 `VirtTable` 实例上早就是公开的，但**没进 `plugin.ts` 的白名单** —— 于是插件
拿不到它们，唯一的替代是 `as any` 去摸 `_merges`，而那正是 open-core 最会翻车的写法
（核心一重构就在客户侧炸，CI 抓不到）。加进白名单是两行 `interface` 声明，`VirtTable`
结构上本来就满足。

导出必须用 `getEffectiveMerges()` 而不是 `getMerges()`：后者只有静态 `merges`，不含列
`mergeKey` 产出的自动合并；而前者给的是**段的真实起止**，不受渲染窗口影响 ——
xlsx 的 `<mergeCells>` 描述整张表，渲染裁剪出的那份只描述当前一屏。

付费仓库 `verify/consumer/contract.test.mjs` 里有正向断言，哪天从白名单里拿掉会当场红。

**2. `vtExport` 的工具栏面板改用面板基元（真 bug，顺手修的）。**

那三行（CSV / Excel / 打印）原来是 `.vt-filter-item`，注释写着「复用列头筛选下拉里的选项样式」。
这条在 **2026-08-21 把四个面板拆成独立插件之前**成立；拆完之后 `_panel.css` 只被
`column-filter` / `field-config` / `filter-config` 内联，**`toolbar.css` 里没有它**。
于是「只装 `vtToolbar` + `vtExport`」时那三行是**没有样式的裸按钮** —— 而 `vtExport`
自己没有 CSS 产物，用户没有第二个地方可以补。

改成 `p.ui.button(label, 'plain', …)`：它画的 `.vt-toolbar-panel-btn` 来自 `_panel-ui.css`，
那份是 `toolbar.css` 内联的，跟谁一起装都有样式。

> **给贡献方的判据**：往工具栏面板里画东西，只能依赖 `toolbar.css` 里有的类
> —— 也就是按钮条自己那几个 + `_panel-ui.css` 的面板基元（`p.ui.*`）。
> 引用 `.vt-filter-*` 等于隐式依赖「用户还装了某个筛选面板插件」。
> 付费包 `vtXlsx` 的面板因此一律走 `p.ui.button()`。

这个 bug 是付费仓库轨道 B（`verify/consumer/exports.test.mjs`）撞出来的：它有一条
「`toolbar.css` 自包含」的断言，核心 dist 重建后当场红 —— 那条断言本身也已按拆分后的
真实归属改写（面板基元查 `toolbar.css`、筛选管理器那 400 行查 `filter-config.css`）。

### 7.28 数据管线的源变换钩子 `transformSourceRows`（2026-08-31）

为 `@virt-table-pro/pivot` 补的，**钩子表里唯一一条有返回值的钩子**（其余全是通知）。
它是「把明细行换成另一种行」这类插件的地基，也是 `formula` 那次「回灌重跑管线」要的东西。

```
_originList → [transformSourceRows] → 筛选 → 排序 → 分页 → 聚合 → 结构展开 → 提交
```

**位置为什么在最前面（这是全部设计）。** 这类插件**同时会换掉列**（透视的列是
「行维度列 + 列维度分组表头 × 值字段」），而筛选与排序的谓词是照 `_allLeafColumns` 建的
—— 换列之后再筛明细行，就是拿透视列的谓词去问明细行。放在最前面之后，之后每一阶段面对的
都是同一套列与同一批行。

代价必须如实写进文档：**源数据级的筛选走不了列头筛选**（列头筛选此时筛的是变换结果）。
换来的是三件事白拿：值列可排序、分页切的是变换后的行、`showSummary` 统计的是变换后的值。

**三条约定**（写在 `plugin.ts` 那个钩子的注释里）：不许改传进来的数组；返回树只有在某列配了
`type: 'tree'` 时才会被展开；**每次 `_rebuildData` 都会调**，所以贵的计算必须自己按
「入参数组引用 + 自己的配置」记缓存（pivot 就是这么做的，于是折叠一下不重算聚合）。

**顺带修掉的两个真缺陷。**

1. **首次数据构建早于插件装载。** `options.list = this._computeDisplayList()` 在构造函数很早
   的位置（列前缀和刚算完），而插件是 DOM 就绪后才装的 —— 那一趟拿到的是未变换的
   `_originList`。少一句补跑，透视要等用户第一次排序才生效，首屏显示的是明细行：
   看起来像「配置没生效」。修法是构造函数末尾 `emitMounted()` 之前，
   `if (this._pluginRuntime?.hasSourceTransform) this._rebuildData()` —— 只在真有插件注册时跑。

2. **`setColumns()` 不重建数据。** 它原来只 `_core.forceUpdate()`（重画），而换列会让显示列表
   真的过期：筛选/排序谓词照 `_allLeafColumns` 建，`type: 'tree'` / `'expand'` 的有无直接决定
   `_flattenTree` 走不走。症状举例：`setColumns` 里新加一列树形列，`children` 压根不会被展开、
   折叠箭头点了没反应。修法是末尾按**全量叶子列的 key 序列 + 树/展开列的有无**判断是否重建。
   - 判据用**全量**叶子列而不是可见叶子列：管线吃的就是前者，于是「列面板勾掉一列」
     （只改 `hidden`）不会白跑一趟管线。
   - 幂等地调 `setColumns` 不会重复重建 → 「插件在 `onDataChanged` 里又调一次 setColumns」
     不会成环（`vtAIStream` 的 `autoColumns` 正是那个形状）。
   - ⚠️ 这条判据**照不到「列 key 没变但数据要变」**：pivot 把 `agg: 'sum'` 换成 `'avg'` 时
     值列还叫 `__total__amount`。所以 pivot 自己在换配置后调一次
     `setList(同一份源数组)` 重新提交 —— 那是公开面上「重跑管线」的入口。

**第三处补的公开面：`setMerges()` 进 `VirtTableHost` 白名单。**

静态 `merges` 的坐标是按**显示行号**定义的，而「换掉行集」的插件让那份坐标失去意义 ——
不清掉的话表上会浮着一批位置离谱的合并格。电子表格案例最能说明问题：2.7 万个合并区
按十万行明细算的，透视出 11 行汇总时全是错的。`getMerges()` 早已在白名单里（xlsx 加的），
只缺写的那一半，所以 pivot 能自己存一份、清空、还回去 —— 使用方一行都不用写。

正向断言在 `packages/vanilla/src/source-transform.dom.test.ts`（17 条，含「排序作用在变换
之后」「返回树 + 树形列 = 折叠展开白拿」「坏插件不连坐」），付费仓库
`verify/consumer/contract.test.mjs` 里另有一条跨仓库哨兵，
`packages/pivot/src/pivot.dom.test.ts` 里有一组「与别的插件装在同一张表上」的互操作断言。

**一条只有真浏览器能抓到的教训。** 把 `vtXlsx` 接进电子表格案例时，工具栏上并排出现了
**两颗「导出」**：核心 `vtExport` 那颗 + 新加的那颗。它们的 key 不同（`export` /
`exportXlsx`），所以核心不会拒绝、也没有任何告警，两端 typecheck 与全部单测都是绿的 ——
症状只在渲染出来的按钮条上。修法是给让位的那个传 `toolbar: false`（`vtXlsx` 的文档里
本来就写着这条建议，接的时候仍然漏了）。**给工具栏加按钮的插件，接完要看一眼真的按钮条。**

### 7.29 案例的 demo 只挂一处：案例页（2026-08-31）

Demos 区原来有**两处**在跑同一个 demo：总览页 `/demos/` 上一块可切换的「舞台」（首屏还
默认挂着电子表格），以及每个案例页自己的「在线体验」。合成一处，留的是**案例页**那一处。

| | 留案例页（选的这个） | 留总览页舞台 |
| --- | --- | --- |
| 一个 demo 一个 URL | ✔ 能分享、能被收录、能被企业版文档直接链过来 | ✘「第几张卡片被点开了」不是个地址 |
| 从外部链接落进 `/demos/spreadsheet` | ✔ 首屏就是真表格 | ✘ 只看到一篇说明文 |
| 挑案例的代价 | ✔ 挑的时候不挂载（十万行那个案例挂起来不便宜） | ✘ 首屏先付一次挂载 |
| 总览页首屏有东西在跑 | ✘ 没了 | ✔ |

最后那条是真代价。原来那块舞台的注释里写着「一个案例站最没说服力的样子就是首屏只有截图」
—— 那句话仍然对，只是它该由**案例页**的首屏满足，而不是由总览页替所有案例满足一遍。

于是总览页变成一堵纯卡片墙：可点的卡片是 `<a>` **而不是 `<button>`**（它就是一个跳转，
用按钮会丢掉中键新开、右键复制链接、以及爬虫看得见的 href）。原来紧贴舞台的那块「企业版
横幅」失去了依附对象（它说的是「正在运行的那个案例」），收成卡片上的一行短标签 ——
挑案例时就该看得见「这里有付费能力」，逐条说明仍在案例页的「本案例中涉及企业版功能」。

组件从 623 行降到 370 行：舞台、`loaded` 状态、`scrollIntoView` 的时机判断、
「运行中」高亮与空态文案一起没了。

**顺带把案例页排成「demo 在最上面」**：`# 标题` 之后紧接 `<PlaygroundHost>`，原来压在它上面的
引子（电子表格那篇有 27 行：要点清单 + 统计块 + 两段说明）降到 demo 下面，收进一节
`## 这个案例做了什么`。既然案例页现在是**唯一**跑 demo 的地方，它的首屏就该是那张表 ——
一屏说明文之后才见到表格，等于把「合成一处」换来的那点说服力又还回去了。
原来的 `## 在线体验` 标题删掉了（demo 是开篇，不需要标题；没有任何页面链过那个锚点，
企业版页链的是 `#单元格公式` / `#撤销-重做` / `#浮动图片`，都还在）。

判据别用「demo 顶边距 H1 多远」—— 那个距离里含着 demo 自己的工具条（电子表格那篇是
统计条 + fx 栏 + 浮动图坐标框，326px），量出来会误判。准确的判据是
**`h1.nextElementSibling === .playground-shell`**。

⚠️ **验证这一页只能用 `pnpm dev:docs`（7900），不能用 `pnpm preview`。** 微应用的产物
写的是绝对路径 `/assets/...`（`base` 只在设了 `DEPLOY_BASE` 时才指向 `micro-apps/<fw>/`），
`vitepress preview` 服在根路径下那些请求全 404，案例页的 demo 根本起不来 ——
这条与 `scripts/shoot-demos.mjs` 头注写的是同一件事。第一次跑冒烟时正是在这儿撞了一次。

### 7.30 免费版补齐列头菜单与基础导入（2026-09-01）

两条都是**故意不收钱**的。判据不是「难不难写」，而是「缺了会不会在被拿去比较时掉分」：

| | 竞品状况 | 结论 |
| --- | --- | --- |
| 列头菜单 | AG Grid 划进 Enterprise | 不跟。菜单里没有任何算法，它只是把核心**已有**的几个公开动作摆成一列按钮 |
| 基础导入 | **vxe 免费给了** | 必须免费。这是免费版唯一一处会被直接对比出缺失的能力 |

`vtColumnMenu` 的两处设计值得记：

- 「筛选」那一项**不自己画面板**，而是 `inject('columnFilter')` 让 `vtColumnFilter` 把它那份
  开在菜单按钮上。于是「没装筛选插件 → 菜单里没有这一项」而不是「有一项点了没反应」，
  两处的判据是**同一个函数**，不会出现「菜单里有筛选、表头却没有漏斗」这种自相矛盾
- 自适应列宽只量**渲染出来的**行。这是能力边界不是 bug：要精确就得把十万行全渲染一遍，
  而那正是虚拟化要避免的事（AG Grid 的 autosize 同样只看渲染行）。量不到内容时**保持原宽**
  而不是压成 0

`vtImport` 的：

- 认格式**先看字节头再看扩展名**（xlsx 就是 zip，头四字节固定 `PK\x03\x04`）。真实上传里
  用户会把 xlsx 改名成 `.txt`，也会把 CSV 存成 `.xls`
- CSV 分隔符要嗅。中文 Windows 上 Excel 存出来的「CSV」默认是**分号**分隔，不猜就整行挤成一列
- 默认 `autoColumns: false`（只换行不换列）—— 绝大多数场景是往一张已定义好的表里灌数据
- 没有 `DecompressionStream` 时**直接报错说清楚**，不读出一张空表：空表会被当成「文件坏了」
- 解析层单独开子路径 `@virt-table/vanilla/sheet-import`（零 DOM，能在 Node/Worker 跑）

**踩到的一个 bug**（已修，回归测试在 `import.dom.test.ts`）：

```ts
const file = src ?? (await pickFile());
if (!file) return null;              // ← 空字符串是假值
```

`importFile('')`（一个空 CSV）走到这里被当成「用户取消」，静默返回 `null` —— 界面上就是
「导了个空文件没反应」，而正确行为是报「这个文件里没读出任何行」。正确写法是
`src === undefined` 才弹选择器、`file === null` 才算取消。

### 7.31 状态栏与迷你图逼出来的两个核心公开 API（2026-09-01）

`@virt-table-pro/status-bar` 与 `@virt-table-pro/charts`（一期＝单元格迷你图）动工时
核心补了两条，都走「缺口先在核心补成公开 API」而不是 `as any` 摸私有成员：

**① `CellSelectionService.subscribe(fn)` —— 多消费者的选区订阅。**

原来只有 `vtCellSelection({ onChange })` 与表格 `options.onCellSelectionChange` 两个
**单槽位**回调，而且前者顶掉后者。那对使用方够用，对插件不够：装了状态栏就等于抢走使用方的
选区回调，以后再加一个「图随选区走」的插件就是两个插件互抢 —— 而抢掉的表现是「另一个功能
突然不更新了」，完全不像 bug。

别退回去用 `onRendered` 猜：**纯拖选不产生帧重绘**，那样拖到一半数字是不动的。

**② `getSourceRowCount()` —— 筛选前的行数。**

状态栏原来读 `getOptions().list.length` 当「总行数」。而核心会把 `options.list`
**改写成展示列表**交给虚拟滚动 —— 筛掉一半之后读它拿到的是筛后的长度，于是显示
「总行数 2 / 当前 2」。两个数字一样，一点都不显眼。管线的唯一数据源 `_originList` 是私有的，
所以这个数只能由核心给。只给**数量**不给数组：交出数组等于允许插件就地改使用方的引用。

#### 一条反复咬人的时序：**失效钩子在单元格重画之后才触发**

迷你图先按列 key 缓存画布尺寸、靠 `onColumnsChanged` 清；`range: 'shared'` 的整列极值
靠 `onDataChanged` 清。两处都错，而且错法一样：**那两个钩子都排在单元格重画之后**，
所以拖完列宽 / 换完数据的那一帧画的还是旧值，要等下一次渲染才对（表现是「换完数据第一眼
曲线是扁的，随便点一下才对」）。

两种正确做法，按代价选：

| 缓存的东西 | 做法 |
| --- | --- |
| 便宜（画布尺寸＝三次算术） | **不缓存**，每格现算。`col.width` 是属性读、`getRowHeight()` 是取字段，比一次 Map 查找还便宜 |
| 贵（整列极值＝O(行数×点数)） | 按**数据引用**定 key（`WeakMap<T[], …>`）。引用即版本：`setList`/排序/筛选都产出新数组，命中不了就自然重算，不需要任何失效钩子 |

#### 渲染热路径的红线：不读布局

迷你图的画布尺寸**绝不能**读 `td.offsetWidth` —— 那是同步回流，一屏 40 格就是 40 次，
滚动肉眼掉帧。测试里怎么钉住这件事：断言 `getBoundingClientRect` 的**接收者**里没有迷你图的
格子（不能断言「一次都没调」—— 核心自己会量容器，那是它的事）。

#### 算错但不报错的那一类：状态栏的数字口径

算术单独拆一层（`aggregate.ts`）穷举测，因为一个算错的求和**看着完全正常**，而用户拿它去核对账：

- `''` 不能当 0（`Number('')` 是 0，会把空格子算进均值的分母）
- `boolean` 不能当 1/0（会把一列勾选悄悄求和成「有几个真」，看着像功能）
- `'0x10'` 不能当 16（产品编号列里真会出现）
- 全是 `0` 的一列，`sum` 必须是 `0` 而不是 `null`（`||` 兜底就会错）
- 一千行两位小数朴素累加飘出 `1234.5600000000002` → Kahan 补偿求和
- **算不出来的项整项不显示**，不显示 0 也不显示「—」：一片文字上的「求和 0」会被读成
  「这一列加起来是零」

#### 「没数据」与「数据是 0」在报表里是两件事

迷你图一个数都没有时格子**留空**，不画横线（会被读成「全是 0」）；状态栏无选区时
`summary.selection.sum` 是 `null` 而不是 `0`。同一条原则的两处体现。

#### 表格之外的 DOM 要自己带 token 载体

状态栏那条在 `.vt-root` **外面**（塞进去会被虚拟滚动的几何算进内容高度），做法与 `vtToolbar`
同一套：包一层纵向 flex + `.vt-fb`。少了 `.vt-fb` 的实测表现是**透明底 16px 黑字**（§7.2）。
已经有 `vtToolbar` 的壳时**复用**它 —— 套两层的表现是表格底下空出一条。`destroy` 要把壳拆回去，
否则反复挂载会一层层套下去。

#### 又一次「只有真浏览器抓得到」

六个 demo（三端 × 两个包）的 CDP 冒烟抓的是 happy-dom 结构上照不出的东西：条的
`fontSize` 是不是 16px（＝CSS 没加载）、SVG 有没有被压成零高、条会不会折成两行、
`¥-87,355` 这种**负号位置错了**的金额（正确是 `-¥87,355`，别拼 `` `¥${v}` ``，用
`Intl.NumberFormat({ style: 'currency' })`）。前四条全绿，最后一条是冒烟抓出来的。
