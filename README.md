# virt-table

行列双向虚拟化的高性能表格。十万级数据流畅滚动，同时把「一个后台管理系统的表格需求」补成完整闭环 —— 合并单元格、多级分组表头/表尾、固定行列、树形、分组、编辑器、插件化。

📖 **[文档与在线示例](https://keno-lee.github.io/virt-table/)** · [Vanilla](https://keno-lee.github.io/virt-table/vanilla/guide/started) · [React](https://keno-lee.github.io/virt-table/react/guide/started) · [Vue](https://keno-lee.github.io/virt-table/vue/guide/started)

## 特性

- **行 + 列双向虚拟化**，动态行高，十万级数据流畅滚动（核心产物 gzip 约 84 kB）
- **合并单元格**：表体 / 表头 / 表尾，支持按值自动合并
- 多级分组表头与表尾、固定行 / 固定列
- 排序、列头筛选、AND/OR 条件树高级筛选
- 树形（含懒加载）、分组、展开行、合计行、分页
- 单元格编辑器 + 校验、复选 / 单选、列宽拖拽
- 暗色主题、i18n、ARIA
- **插件化**：14 个插件按需引入，用不到的连 CSS 一起被 tree-shaking 摇掉（实测从 barrel 引 1 个插件只增加约 4.7 kB）
- **18 个内置单元格组件**：输入框、下拉、多级联动、日期 / 区间、开关、评分、标签、进度、人员…

## 安装

```bash
npm install @virt-table/vanilla   # 原生 JS / 任意框架
npm install @virt-table/react     # React 18+
npm install @virt-table/vue       # Vue 3
```

React / Vue 封装会把 `@virt-table/vanilla` 一起装上。

## 快速开始

```ts
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import '@virt-table/vanilla/core.css';

// 容器需要有明确的宽高
const container = document.getElementById('table')!;

const columns: VirtTableColumn[] = [
  { key: 'name', title: '姓名', width: 200 },
  { key: 'age', title: '年龄', width: 100 },
];

const table = new VirtTable(container, {
  list,
  columns,
  itemKey: 'id',       // 行唯一标识字段
  estimatedSize: 40,   // 行预估高度（px）
  buffer: 4,           // 上下缓冲行数
});
```

React / Vue 用法见各自的[快速开始](https://keno-lee.github.io/virt-table/)。

## 本地开发

```bash
pnpm i
pnpm dev          # 文档站 + 三端 demo 全起
pnpm test         # 1040 个测试
pnpm typecheck    # 3 个包 + 文档站 + 3 个 demo
pnpm build        # 构建三个包（vanilla → react → vue）
```

发布流程见 **[PUBLISHING.md](./PUBLISHING.md)**。

## 项目目录

```text
.
├─ packages/            # npm 发布包
│  ├─ vanilla/          # @virt-table/vanilla — 表格本体，零框架依赖
│  ├─ react/            # @virt-table/react   — React 封装
│  └─ vue/              # @virt-table/vue     — Vue 3 封装
├─ docs/                # VitePress 文档站 + playground 宿主（不发布）
│  ├─ apps/             # 文档内微应用（vanilla/react/vue），以 qiankun 嵌入
│  ├─ vanilla/          # Vanilla 文档
│  ├─ react/            # React 文档
│  └─ vue/              # Vue 文档
├─ scripts/
│  ├─ release.mjs       # 一键发布
│  ├─ verify-pack.mjs   # 发布前产物校验（对着 tarball 验）
│  └─ emit-dcts.mjs     # 由 .d.ts 生成配对的 .d.cts
├─ AGENTS.md            # 架构与实现细节（给维护者/AI 的长文）
├─ PUBLISHING.md        # 多包管理与发布流程
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

## 包依赖关系

```text
@virt-table/vanilla    ← dependencies: @virt-list/core（类型需要）
    ↑
@virt-table/react      ← dependencies: vanilla,  peerDep: react ≥18 / react-dom ≥18
@virt-table/vue        ← dependencies: vanilla,  peerDep: vue ≥3
```

表格能力全在 `vanilla` 里，两个封装包只做框架侧桥接（受控 props、`ref` 命令式 API、
用框架组件渲染单元格）。插件与内置组件**与框架无关**，三端都直接从 vanilla 引。

虚拟滚动内核复用 [virt-list](https://github.com/keno-lee/virt-list) 的 `@virt-list/core`，
不在这里另造一份。

## 包入口一览

`@virt-table/vanilla` 是**多入口**包，可选层不进主入口：

| 子路径 | 内容 | 样式 |
| --- | --- | --- |
| `@virt-table/vanilla` | `VirtTable` 与核心类型、插件契约 | `core.css`（**必引**，约 30 kB） |
| `/plugins`（或 `/plugins/<名>`） | 14 个插件 | `/plugins/<名>.css`（10 个插件有样式） |
| `/components` | 18 个内置单元格组件 | `/components/index.css` |
| `/components/vt-filter-builder` | 高级筛选构建器（CSS 较大，单独成 chunk） | `/components/vt-filter-builder.css` |
| `/ai-query` | 自然语言查询的纯逻辑层（schema / 校验 / 映射） | 无（零 DOM，可在 Node 里跑） |
| `/infer-columns` | 从样本数据推断列（类型 / 标题 / 宽度 / 对齐） | 无（零 DOM，可在 Node 里跑） |
| `/style.css` | — | 全量合集（核心 + 插件 + 组件，约 67 kB） |

> 单元格组件**只有 barrel 一个 JS 入口**（`vt-filter-builder` 除外）：它们共用一份
> `components.css`，按组件拆入口拆不出对应的 CSS。按需只引一个组件靠 tree-shaking
> 完成，实测从 barrel 引 1 个组件只增加约 2.8 kB。

CDN（UMD 全量）：

```html
<link rel="stylesheet" href="https://unpkg.com/@virt-table/vanilla/dist/style.css" />
<script src="https://unpkg.com/@virt-table/vanilla"></script>
<script>
  const table = new VirtTable.VirtTable(el, {
    /* ... */
  });
</script>
```

## License

[MIT](./LICENSE) © keno-lee

## TODO（尚未实现 / 待补齐）

2025 年那轮「对标竞品 15 项」已全部补齐（详见 `AGENTS.md` §6.2）。下面分两部分：**曾经的缺口清单**（保留记录，绝大多数已 `[x]`）与**当前仍缺失的能力**。

### 当前缺口（按性价比 × 影响面排序）

以下每条都核过代码，附了证据位置。

- [x] **移动端 / 触摸**：拖拽类手势已全部走 Pointer Events（`internal/drag.ts`），鼠标 / 触屏 / 手写笔一套代码。**列宽拖拽、列拖拽排序、行拖拽排序触屏可用**（真实触摸事件实测：列宽 200→308.75、列序 `a,b,c`→`b,a,c`、行序 `0,1,2,3`→`1,2,0,3`）；配套 `touch-action` 粒度：专用手柄 `none`、可拖列头 `pan-y`（详见 `AGENTS.md` §7.3）。顺带修掉了 `_startResize` 没走共享基元、`index.ts` 里 `startDrag` 是死引用的问题。
  - **框选刻意不支持触屏**：表体上手指拖动的语义是「滚动表格」，要改成框选就得给 tbody 设 `touch-action: none`，那会直接废掉表格滚动。触屏框选需要另设入口（长按 / 选区手柄 / 选择模式），属于交互设计，见 `AGENTS.md` §7.8。
- [x] **`getCheckedKeys()`**：已支持。返回全部已勾选行的 key，**按勾选顺序**（`Set` 插入序；off-page 的 key 没有显示顺序可言，故不排序）。与 `getCheckedRows()` 分工：后者按当前 `list` 过滤返回行对象，服务端分页下拿不到不在当前页的项。三端已转发。
- ~~**列宽自适应**~~ —— **评估后不做**。`width` 保持必填 number，现有的 `_widthScale`（容器比列宽总和更宽时等比拉伸）+ `minWidth` 就是全部。
  - 「自适应列宽」实际是三件事：① flex 分配剩余空间 ② 按内容 autoFit ③ 双击手柄自适应（= ② 的触发方式）。
  - ① 与行高零交互，本可以做（`_widthScale` 换成逐列解析即可，`_buildColPrefixSums` 不关心宽度来源；`_startResize` 里「拖拽后固化宽度、scale 归 1」已经是 AG Grid「拖拽退出 flex」的同一套路）。**结论是收益不足，不值得动列宽这条主链路。**
  - ② 在虚拟滚动下有三重冲突：只能测已渲染的行列（AG Grid：_"considering the virtually rendered rows only"_、_"it is not possible to auto-size a column that is not visible on the screen"_；MUI：_"Autosizing measures the cells currently rendered in the DOM"_）；换行让「内容自然宽度」失去定义（MUI 为此有 `includeOutliers` / `outliersFactor` 离群值剔除）；宽度变→换行变→行高变，动态行高下滚动位置会在用户脚下挪动。竞品一致的化解办法是**做成一次性命令而非持续模式**，没有一家在虚拟表格里开持续内容自适应。
  - 想重开这个话题前，先去这两页点一遍实际效果：`ag-grid.com/javascript-data-grid/column-sizing/#auto-size-columns-to-fit-cell-contents`、`mui.com/x/react-data-grid/column-dimensions/`。
- [x] **客户端分页**：已支持，而且**成了默认模式**。传 `pagination` option 即由表格自己切片，`total` 由筛选后的行数派生，不用写 `onPageChange` 也不用管 `total`。`manualPagination`（或 `dataMode: 'server'`）切回服务端模式。
  - 切片位置：管线里放在**结构展开之前**，切的是**根行** —— 树形/分组在切完的那一页上再展开，父节点不会和子节点被切到两页去（`total` 数的也是根行）。
  - 筛选后回到第 1 页（行集合变了），排序不重置页码；合计行算当前页；与 `infinite` 互斥；翻页后滚回顶部。
  - 三个 manual 开关至此对称：`manualSorting` / `manualFiltering` / `manualPagination` 各自让表格跳过管线里对应的一段。
  - 页码与每页条数一并进 `getState()`/`setState()`（不含 `total`，它是派生的）。见 `docs/vanilla/examples/feature/pagination-client.md`。
- [x] **按值自动合并**：已支持。列上配 `mergeKey`（`true` 用 `row[key]`，或给函数自定义键 / 表达条件合并）即相邻同键自动纵向合并，`mergeMaxSpan` 限制段长。分段索引在数据管线末端建（`Int32Array`，100 万行 3.3ms / 781KB），每帧按渲染窗口裁剪 —— 因此**不禁用排序**（与静态 `merges` 的关键差别），10 万行滚动帧耗时零回归。**不做** el-table / vxe 式的逐格 `spanMethod`（虚拟滚动下要么 O(行×列) 全量求值，要么拿不到窗口外的段起点），理由见 `AGENTS.md` §3.1。框选会按合并块扩张成完整矩形（查真实段，选区可远超渲染窗口）；`getMerges()` 给静态配置、`getEffectiveMerges(begin?, end?)` 给真实生效的合并块（三端已转发）。见 `docs/vanilla/examples/merge/auto-merge.md`。
- [x] **状态持久化**：已支持。`getState()` / `setState(state)` 覆盖列宽 / 列序 / 列显隐 / 排序 / 列头筛选 / 高级筛选，三端已转发。字段全可选，只应用出现的字段（「不给字段」= 保持现状、「给空值」= 清空），带 `version` 做跨版本作废，整套改动批量提交（一次列重建 + 一次管线重算）。分组表头下列序只在同组内还原。见 API 的「状态持久化」。
- [x] **键盘覆盖**：已补齐。`PageUp` / `PageDown` 翻屏（步长 = 视口能放下的行数，实测 400px/40px → 10 行）、`Ctrl`（或 `Cmd`）`+Home` / `+End` 跳表首尾，Shift 组合同样扩选。**零核心改动**——步长按 `clientHeight / estimatedSize` 估，不读只在合并单元格下才维护的 `_inViewRowBegin`。
- [ ] **真 xlsx 导出**。`exportExcel()` 产出的是 HTML 表格伪装的 `.xls`（`export.ts` 的 `toExcelHtml`），Excel 打开会弹「格式与扩展名不一致」，也不支持样式 / 多 sheet / 数字格式。要做得先定是否愿意引 SheetJS 之类的依赖。

### 曾经的缺口清单

- [x] **分页（pagination）**：已支持（当时**仅服务端 UI 模式**，客户端分页见上方「当前缺口」里那条）。传 `pagination` option 渲染分页器（总数 + 每页条数 + 上/下页 + 页码 + 跳页），表格只派发 `onPageChange` 不做数据切片；`total` 外部提供，翻页时在回调里 `setList` + `setTotal`。方法 `setPage`/`setPageSize`/`setTotal`/`getPagination`(三端已转发)。见 `docs/vanilla/examples/feature/pagination.md`。
- [x] **多级（分组）表头 / 表尾**：已支持。列配置带 `children` 即成列树，`header-group.ts` 把列树摊成表头网格，表头 / 表尾 / 表体共用同一份网格并一起横向虚拟化；分组格聚合 = 覆盖的「全部叶子列 × 全部行」摊平后聚合，分组标签用 CSS sticky 跟随横滚。见 `docs/vanilla/examples/basic/header-group.md` 与 API 的「多级分组表头 / 表尾」两节。
- [x] **国际化 i18n**：已支持。所有内置 UI 文案收进 `locale` 字典，内置 `zhCN`（默认）/ `enUS`，`locale` option 深合并覆盖 + `setLocale()` 运行时切换（三端已转发）。见 `docs/vanilla/examples/feature/i18n.md`。
- [ ] **电子表格公式引擎**：`=SUM()` 等公式计算（独立大工程，范围外）。
- [x] **服务端数据 / 无限滚动**：已支持。`remote.ts` 是纯状态机（`RemoteController` + `remote.test.ts`），两个入口一套内核：受控层 `onLoadMore` / `onLoadPrev(ctx)` 与糖层 `loadData(req)`；`manualSorting` / `manualFiltering` / `manualPagination` 三个细粒度开关（`dataMode: 'server'` 是三者的快捷方式）会让管线跳过对应阶段，改为重新取数；`infinite` 开无限滚动（down/up/both + manual 按钮态）。见 `docs/vanilla/examples/feature/server-data.md` 与 `feature/infinite.md`。

### 按值自动合并（已完成）

分四步落地，机制说明见 `AGENTS.md` §3.1 与 §7.4（含实测数据），API 见 `docs/vanilla/api/index.md#按值自动合并-mergekey`。

- [x] **第 1 步** — 段索引（`buildMergeRuns`，`Int32Array` 存段起点）+ 每帧窗口裁剪（`clampMergeRunsToWindow`）+ 列 `mergeKey` / `mergeMaxSpan` + 排序解禁 + 固定列守卫。
- [x] **第 2 步** — 选区按**真实段**扩张（`findMergeRun`；选区可远超渲染窗口，用裁剪结果会被截断）+ `getMerges()` / `getEffectiveMerges(begin?, end?)`，三端已转发。顺带确认 `vtClipboard` / `vtExport` 从来不读合并信息，那边无需接线。
- [x] **第 3 步** — `buildMergesFromSpan()` 迁移 helper：把 el-table / vxe 风格的逐格回调求值成静态 `merges`（`[rowspan, colspan]` 与 `{rowspan, colspan}` 都吃，`[0,0]` / `[1,1]` 自动跳过），代价显式摊在调用点上。
- [x] **第 4 步** — DOM 层测试环境（`happy-dom`，写法见 `AGENTS.md` §5.1）+ `merge.dom.test.ts` 20 个用例；示例 `merge/auto-merge`（10 万行，三种段长同场）。

测试合计 477 个（`merge.test.ts` 213 个纯逻辑 + `merge.dom.test.ts` 20 个 DOM）。

### 插件化改造（进行中）

把「可选的 UI / 交互层」从 5900 行的 `VirtTable` 主类搬进插件，实现按需引入与 tree-shaking。机制说明见 `AGENTS.md` §3.1，API 见 `docs/vanilla/api/index.md#插件机制`。

**已完成**

- [x] **阶段 0：机制奠基** — `plugin.ts` 契约（`VirtTablePlugin` / `PluginContext` / `PluginHooks` / `PluginRuntime`）+ 8 个生命周期钩子 + `provide`/`inject` 插件间协作 + 依赖拓扑排序 + 逆序卸载；`plugin.test.ts` 25 个用例覆盖。
- [x] **三端 ref 自动透传** — 插件 `api` 经 Proxy 自动挂到 React/Vue ref，类型由 vanilla 的 `VirtTablePluginApi` 声明合并提供（一处 `declare module` 三端生效），不再逐个手写转发。
- [x] **`vtContextMenu`** — 首个插件（右键菜单，约 120 行 + 独立 CSS）。**能力入口只有 `plugins`，不配 option 糖**（理由见 `AGENTS.md` §3.1）。
- [x] **`vtExport`** — 导出 CSV/Excel + 打印（约 130 行，纯命令式无 UI）。
- [x] **`vtClipboard`** — 选区复制/粘贴（约 230 行，需 `enableCellSelection`）。
- [x] **`vtSearch`** — Ctrl/Cmd+F 搜索（约 300 行 + 独立 CSS）。搜索词作为**查询状态**留在核心（`setSearchTerm`/`getSearchTerm`，进 `RemoteQuery.search`），搜索框 UI 与命中高亮在插件。
- [x] **`vtColumnPanel`** — 列设置面板（140 行 + 独立 CSS）。用 `onColumnsChanged` 钩子同步勾选态。复用核心的 `.vt-filter-*` 通用面板样式（那批类同时被列头筛选与 `VtFilterBuilder` 使用，不属于任何单个插件）。
- [x] **`vtCellSelection`** — 单元格框选 + 边缘自动滚动（240 行 + 独立 CSS）。`provide('cellSelection')` 供 4 个插件 inject。**几何换算留核心**（`getSelectionRect` / `expandSelectionForMerges` / `cellFromPoint`）——它们依赖列宽前缀和、固定列偏移与行 DOM 映射，搬进插件就得把那批私有几何全暴露。为它新增了 `onRendered` 钩子（整帧渲染完成）。
- [x] **`vtKeyboardNav`** — 键盘导航（100 行，`requires: ['vtCellSelection']`，可选 inject `cellEditor` 响应 F2）。**它无法留在核心**：焦点位置就是选区、焦点框就是选区 overlay，框选迁出后它没有状态可依附。
- [x] **`vtCellEditor`** — 编辑浮层（185 行 + 独立 CSS）。`provide('cellEditor')`。顺带修掉了原先无条件创建 overlay + 绑 4 个监听的浪费。
- [x] **`vtColumnFilter`** — 列头筛选下拉（215 行，无独立 CSS）。表头漏斗图标走 `onHeaderCellRendered`；筛选状态与谓词留核心（查询状态，进 `RemoteQuery.filters`），所以不装插件时 `setColumnFilter()` 与列上的 `filters[].checked` 初值依然有效。
- [x] **`vtColumnDrag` / `vtRowDrag`** — 列/行拖拽排序（235 行 + 独立 CSS，同一模块）。重排逻辑留核心（`moveColumn` / `moveRow` / `canReorderRows`，依赖列树与 `_originList`），插件只管手势、ghost 与落点指示线。
- [x] **`vtAIQuery`** — 自然语言查询（插件 ~330 行 + 独立 CSS，纯逻辑 `ai-query.ts` ~430 行单独成入口）。一句话 → 筛选/排序/列显隐。**不发网络请求、不绑任何模型厂商**：插件负责「表格 → schema」与「模型 JSON → 校验纠错 → `setState()`」两端，中间调模型由使用方的 `resolve` 回调实现（同 `remote.ts` 做成受控层的理由）。校验层是重点——核心的筛选求值刻意宽容（未知列视为通过），模型幻觉出列名时会变成「筛了却没效果」，所以必须在应用前拦下来。纯逻辑层单独开 `@virt-table/vanilla/ai-query` 入口，零 CSS 零 DOM，可在服务端预校验。机制与取舍见 `AGENTS.md` §7.18。
- [x] **`vtAIStream`** — 流式表格（插件 ~300 行 + 独立 CSS，纯逻辑 `infer-columns.ts` ~230 行单独成入口）。补的是现有表格库两条隐含假设的反面：**列不是预先定义的**（首批数据到达时 `inferColumns()` 推断类型/标题/宽度/对齐）、**数据不是一次性给全的**（`consumeAIStream()` 吃任何 `AsyncIterable`，攒帧落地 + stick-to-bottom 跟随）。逐行 `appendRows` 会逐行走管线，所以缓冲到一帧只落一次；`maxRowsPerFlush` 防止一批两万行撑爆一帧。见 `AGENTS.md` §7.20。
- [x] **`vtAIColumn`** — AI 列（~330 行 + 独立 CSS）。一列的值由模型从同行其他列算出，`compute` 返回 `AsyncIterable<string>` 即逐段写进单元格。**虚拟化在这件事上是决定性优势**：一列 AI 值在 10 万行表上全量跑是 10 万次模型调用，而屏幕上只有二十来行——所以默认只为渲染窗口内的行付钱，滚走的行 abort 在途请求（CDP 实测：5 万行表滚过 6 屏 = 45 次调用）。见 `AGENTS.md` §7.20。
- [x] **抽出两个 internal 共享工具** — `internal/drag.ts`（`startDrag` / `swallowNextClick`，列宽 resize + 两个拖拽插件共用）、`internal/auto-scroll.ts`（边缘自动滚动，框选 + 行拖拽共用，原先是核心里一个靠 `_cellSelecting || _draggingRow` 双标志判断的 rAF 循环）。
- [x] **文档站「插件」分组** — 13 个插件示例（vanilla）/ 5 个（vue、react）集中在侧边栏「插件」组，条目按 `插件名 + 中文` 命名；目录结构与侧边栏一致（`docs/*/examples/plugins/` + `docs/apps/*/src/components/plugins/`）。归类标准是「示例主题就是某个插件」——`cell-type-render`（`_cellRenders`）、`validate`（`validator`）、`filter-builder`（独立 Web Component）、`spreadsheet`（实验模式）只是顺带装了插件，仍留原分组。

共 14 个插件；主类 5951 → **4632 行**（-22%），插件侧约 1840 行 + internal 共享工具（`drag` / `auto-scroll` / `tooltip`）。核心样式表 `index.css` 2364 → **1507 行**（其余拆进 `plugins/*.css` 与 `components/*.css`，共约 1050 行，详见「阶段 2」）。

**评估后不做的两项**（依据见下）

- ~~`vtPagination`~~ — **不做**。`_page/_pageSize/_total` 是查询状态且与 remote 双向交织（`setPage→_remote.goToPage`、`_onRemoteState` 回写 page/total），按「查询状态留核心」原则拆完插件里只剩一个 render 函数。行业里也没有先例：AG Grid 分页是核心内建，vxe-table 是独立的 `vxe-pager` 组件。
- `vtRemote` — **需要另一套抽象，不塞进当前 UI 插件机制**。它有 51 处接线，横跨构造函数事件、`_commitRemoteRows`、`_appendRows/_prependRows`、滚动补偿、12 个公共方法、`_rebuildData({keepPool})`。它不是 UI 层而是**数据源策略**——AG Grid 正是把它做成独立于 UI 模块的「行模型模块」（ClientSideRowModel / InfiniteRowModel / ServerSideRowModel）。要做应先设计行模型扩展点。

**阶段 2：真正打开 tree-shaking（已完成）**

- [x] **多入口构建** — `lib.entry` 改成对象：`index` + 每个插件模块一个入口 + `components/index` + `components/vt-filter-builder`，格式 `es` + `cjs`。UMD 只支持单入口，挪到独立的 `vite.config.umd.ts`（全量自包含单文件，`unpkg`/`jsdelivr` 指向它）。`package.json` 加 `exports` 子路径 `./plugins`、`./plugins/*`、`./components`、`./components/*`，以及 `./plugins/*.css`、`./components/*.css`、`./core.css`（`./plugins/*.css` 必须显式写，否则会被 `./plugins/*` 抢先匹配成 `*.css.js`）。
- [x] **可选层移出主入口** — 只加子路径不够：主入口继续 re-export 插件的话，插件代码与 CSS 仍会落进核心 chunk。所以插件只从 `/plugins` 导出、内置组件只从 `/components` 导出（`VirtTablePluginApi` 用到的两个类型改成 `import type`，不产生运行时引用）。`@virt-table/{vue,react}` 依旧透传插件，改为从 `/plugins` 转发，三端用法不变。
- [x] **`sideEffects` 标记** — 标成 `["**/*.css"]`；`@virt-table/{react,vue}` 是源码包，标 `sideEffects: false`。
- [x] **CSS 拆分** — `index.css` 2166 → 1468 行，产出 `core.css` 27 kB（原 44.5 kB，-39%）。迁出：`_panel.css`（通用面板，三方共享）、`plugins/column-filter.css`（漏斗图标）、`components/components.css`（`.vt-comp-*`）、`components/vt-filter-builder.css`（`.vt-fb*` 416 行）。顺带删掉两处与插件 CSS 重复的死规则（`.vt-cell-cover`、`.vt-cell-selection-overlay`）。`--vt-*` token（含 `.vt-fb` 那份）与 `vt-pop-in` keyframes 留核心。
  - `_panel.css` 走 CSS `@import` 而不是 JS import：被 3 个模块共享，走 JS import 会被提成 hash 命名的公共 chunk，用户没法引；`@import` 在构建时内联，每个插件的 CSS 产物自包含（重复的那 3.4 kB 规则完全相同，同时引入无副作用）。
- [x] **CSS 产物命名** — Vite 给拆分出来的 CSS 只取 chunk 的文件名部分，于是全部平铺在 dist 根下、且 `src/index.ts` 与 `src/components/index.ts` 会撞成 `index.css`/`index2.css`。`assetFileNames` 拿不到 chunk 信息，改用 `generateBundle` 里按 `chunk.viteMetadata.importedCss` 重命名（`vite.config.ts` 的 `cssPerEntry()`）。

实测（Vite/Rollup 打包一个只 `import { VirtTable }` 的应用）：

| 场景                     | JS       | 需引入的 CSS |
| ------------------------ | -------- | ------------ |
| 改造前（旧 dist）        | 179.8 kB | 44.5 kB      |
| 基础表格                 | 179.8 kB | 27.1 kB      |
| 基础表格 + `vtExport`    | 184.1 kB | 27.1 kB      |
| 全量（11 插件 + 6 组件） | 242.3 kB | 45.0 kB      |

`dist/index.js` 从 236 kB 降到 168 kB（插件与内置组件不再进核心入口）。

JS 侧对 Rollup 用户是持平的——旧版是单文件 bundle，Rollup 本来就能把没引用的插件顶层声明摇掉（`from '@virt-table/vanilla/plugins'` 与 `/plugins/export` 两种写法产物也完全一致，均 184.1 kB）。真正拿到的收益是：**CSS 少 17 kB**、`sideEffects` + 子路径入口让不做深度分析的打包器（webpack 的 `sideEffects` 优化、esbuild、免打包直跑 ESM）也能按需加载，以及 `dist/style.css` 这个 exports 里声明了但**从来没被产出过**的文件终于存在了。

**刻意没做**：external `@virt-list/core` / `lodash-es`。两者都是 ESM-only，`@virt-list/core` 的 exports 没有 require 条件、内部还有无扩展名的相对引用，external 出去等于 `dist/index.cjs` 直接不可用；而实测把它们打进来并不吃亏（同一份基础表格产物，external 与内联都是 179.8 kB）。

**阶段 3（可选，待前两阶段稳定后评估）**

- [ ] **管线阶段插件** — 仅对排序与聚合（`_computeDisplayList` 里最干净的两段）开 `transformData` 钩子；筛选 / 树形懒加载 / 分组与 `_flattenTree`、合成行耦合较深，保持在核心。

**明确不做插件**（避免后续误迁）：行/列双向虚拟化、固定列、合并单元格、thead/tfoot 渲染（含多级分组）、行 DOM 池、数据管线枢纽 `_rebuildData`、loading/empty/theme/locale/ARIA、列宽拖拽 `_startResize`。

### 工程 / 文档待办

- [ ] **三端示例同步**：多数增强功能与插件示例目前仅有 **Vanilla** playground（loading / 键盘导航 / 列拖拽 / 行拖拽 / 合计 / ARIA / radio / 校验 / 富筛选 / 固定行，以及插件里的 `vtExport` / `vtClipboard` / `vtColumnPanel`）；`docs/apps/{react,vue}` 的 `feature/` 与 `plugins/` 尚未补齐。
- [ ] **DOM 层自动化测试**：环境已就绪（`happy-dom` + 按文件 `// @vitest-environment` 开启，`renderControl` 钉渲染窗口代替 stub 几何，写法见 `AGENTS.md` §5.1），首个文件是 `merge.dom.test.ts`（20 个用例覆盖自动合并的 DOM 产出 / 长段不打穿虚拟化 / 排序与结构联动 / 对外接口）。已有 `internal/drag.dom.test.ts`（10 个用例覆盖 Pointer Events 手势基元）。**仍缺**：键盘导航、loading、主题切换、pinned 行、tooltip 悬停、触屏手势（这些靠 playground + CDP 手测，见 `AGENTS.md` §7.7）。

> 补齐任一功能的改动链路见 `AGENTS.md` §6 末尾说明。

---
