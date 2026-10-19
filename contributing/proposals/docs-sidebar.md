# 侧边栏「功能」分组重排方案

> **临时决策文档**。定稿后把结论并进 `AGENTS.md` §7.22 与 `docs/.vitepress/config.ts` 的注释，
> 然后删掉这个文件。
>
> 现状：2026-08-17 的文档重整之后是 7 组（基础功能 / 功能列 / 单元格渲染 / 高级功能 / 插件 /
> AI 插件 / 合并单元格），共 77 页（vanilla；vue / react 各多一页「组件渲染」）。
>
> **已定**：分组采用**方案 B（按用户任务）**。**待定**：目录跟不跟着动（见 §5），以及 §6 那几个小问题。

---

## 1. 现状这套分组的四个问题

### 1.1 「插件」是按实现机制分的，读者按意图找不到

| 想做的事 | 现在散在几个组 |
| --- | --- |
| 筛选 | `plugins/filter`（列筛选）、`plugins/rich-filter`（富类型）、**`advanced/filter-builder`**（跨列 AND/OR） |
| 编辑 | `plugins/cells-render`（编辑会话）、**`advanced/validate`**（校验）、**`cell/vt-*`**（18 个编辑器）、**`cell/third-party`** |
| 列操作 | **`basic/resize`**（列宽）、`plugins/column-drag`（列序）、`plugins/column-visibility`（显隐）、**`advanced/sort`**（排序） |

「这是插件还是核心 option」是维护者的分类，不是使用者的问题 —— 而且这份信息在
`api/plugins.md` 的清单表里已经有一份了。

### 1.2 「基础功能」15 页是杂物袋

外观（边框 / 斑马纹 / 主题 / 高亮 / 对齐 / 换行 / 溢出 / 空态 / 无表头）+ 列几何（列宽 / 冻结 /
分组表头）+ 数据更新（force-update / reactive）挤在一起 —— 「暗夜模式」与「响应式更新」没有
任何共同点。

### 1.3 「高级功能」19 页也是杂物袋

「高级」不是类别，是程度词。里面混着行列结构、数据源、机制说明（滚动模型 / 状态持久化）、
杂项（i18n / aria / loading）。

### 1.4 「单元格渲染」21 页里 18 页是组件清单

3 页机制页被组件淹没。把功能列拆出去这件事，正是这个问题的同一个信号。

### 1.5 一个决定取舍方向的事实

所有分组默认 `collapsed: true`，VitePress 只自动展开含当前页的那一组 ——
**组多不贵（每组一行），组大才贵（展开后要滚）**。所以「少而大的组」没有收益，
「多而小的组」才是这套侧边栏的优势区。

---

## 2. 方案 B（已选）：按用户任务，14 组

每组名字对着一个使用者意图；「插件」入口消失（机制说明留在 `api/plugins.md`）。
括号里是页数，vanilla 合计 77。

| # | 分组 | 页 | 现在在哪个目录 |
| --- | --- | --- | --- |
| 1 | **开始** (1) | 基础表格 | `basic/` |
| 2 | **外观与主题** (9) | 边框 · 斑马纹 · 空态 · 无表头 · 高亮 · 对齐方式 · 自动换行 · 溢出隐藏 · 暗夜模式 | `basic/` |
| 3 | **列** (5) | 列宽拖拽 · 冻结列 · 多级分组表头/表尾 · 字段配置 · 列拖拽排序 | `basic/` ×3 + `plugins/` ×2 |
| 4 | **行与层级** (7) | 展开行 · 树形 · 分组 · 树形+分组 · 固定行 pinned · 自动合计行 · 行拖拽排序 | `advanced/` ×6 + `plugins/` ×1 |
| 5 | **选择与功能列** (4) | 功能列（序号/勾选/单选） · 单元格选区 · 键盘导航 · 剪贴板 | `feature-columns/` + `plugins/` ×3 |
| 6 | **单元格渲染** (3 / 4) | 渲染粒度 · 单元格独立渲染 · 第三方组件库集成 〔+ 组件渲染，仅 vue/react〕 | `cell/` |
| 7 | **内置单元格组件** (18) | VtInput … VtLink | `cell/` |
| 8 | **编辑** (2) | vtCellEditor 单元格编辑 · 编辑校验 | `plugins/` + `advanced/` |
| 9 | **排序与筛选** (5) | 列排序 · 列筛选 · 富筛选类型 · 高级筛选（筛选管理器） · 表格搜索 | `advanced/` ×2 + `plugins/` ×3 |
| 10 | **数据源** (8) | 分页（客户端） · 分页（服务端） · 无限滚动 · 服务端数据 · 树形懒加载 · 数据更新 · 响应式更新 · 加载态 | `advanced/` ×6 + `basic/` ×2 |
| 11 | **合并单元格** (5) | 表身 · 按值自动 · 表头 · 表尾 · 表头+表尾 | `merge/` |
| 12 | **导出与菜单** (3) | 导出 CSV/Excel · 打印 · 右键菜单 | `plugins/` |
| 13 | **进阶** (4) | 状态持久化 · 滚动模型 · 国际化 i18n · 无障碍 ARIA | `advanced/` |
| 14 | **AI 插件** (3) | vtAIStream 流式表格 · vtAIColumn AI 列 · vtAIQuery 自然语言查询 | `ai/` |

### 2.1 逐页明细（可直接抄进 `config.ts`）

```
开始
  基础表格                        basic/basic

外观与主题
  边框                            basic/border
  斑马纹                          basic/stripe
  空态                            basic/empty
  无表头                          basic/no-header
  高亮                            basic/highlight
  对齐方式                        basic/align
  自动换行                        basic/wrap
  溢出隐藏                        basic/overflow
  暗夜模式                        basic/theme

列
  列宽拖拽                        basic/resize
  冻结列                          basic/fixed
  多级分组表头/表尾               basic/header-group
  vtFieldConfig 字段配置     plugins/column-visibility
  vtColumnDrag 列拖拽排序         plugins/column-drag

行与层级
  展开行                          advanced/expand
  树形                            advanced/tree
  分组                            advanced/group
  树形 + 分组                     advanced/group-tree
  固定行 pinned                   advanced/pinned
  自动合计行                      advanced/summary
  vtRowDrag 行拖拽排序            plugins/row-drag

选择与功能列
  功能列（序号/勾选/单选）        feature-columns/
  vtCellSelection 单元格选区      plugins/cell-selection
  vtKeyboardNav 键盘导航          plugins/keyboard
  vtClipboard 剪贴板              plugins/clipboard

单元格渲染
  渲染粒度（表级/列级/单元格级）  cell/render-levels
  单元格独立渲染                  cell/cell-type-render
  组件渲染                        cell/render            ← 仅 vue / react
  第三方组件库集成                cell/third-party

内置单元格组件
  VtInput 文本输入                cell/vt-input
  VtNumberInput 数字输入          cell/vt-number-input
  VtTextarea 多行文本             cell/vt-textarea
  VtSelect 下拉选择               cell/vt-select
  VtSelect 多选                   cell/vt-multi-select
  VtPerson 人员                   cell/vt-person
  VtCascader 级联选择             cell/vt-cascader
  VtAutocomplete 输入建议         cell/vt-autocomplete
  VtDatePicker 日期选择           cell/vt-date-picker
  VtDateRangePicker 日期范围      cell/vt-date-range-picker
  VtTimePicker 时间选择           cell/vt-time-picker
  VtCheckbox 布尔勾选             cell/vt-checkbox
  VtSwitch 开关                   cell/vt-switch
  VtRate 星级评分                 cell/vt-rate
  VtActions 操作列                cell/vt-actions
  VtTag 标签                      cell/vt-tag
  VtProgress 进度条               cell/vt-progress
  VtLink 链接                     cell/vt-link

编辑
  vtCellEditor 单元格编辑         plugins/cells-render
  编辑校验                        advanced/validate

排序与筛选
  列排序                          advanced/sort
  vtColumnFilter 列筛选           plugins/filter
  vtColumnFilter 富筛选类型       plugins/rich-filter
  高级筛选（筛选管理器）          advanced/filter-builder
  vtSearch 表格搜索               plugins/search

数据源
  分页（客户端）                  advanced/pagination-client
  分页（服务端）                  advanced/pagination
  无限滚动                        advanced/infinite
  服务端数据                      advanced/server-data
  树形懒加载                      advanced/lazy-tree
  数据更新                        basic/force-update
  响应式更新                      basic/reactive
  加载态                          advanced/loading

合并单元格
  表身合并                        merge/body-merge
  按值自动合并                    merge/auto-merge
  表头合并                        merge/header-merge
  表尾合并                        merge/footer-merge
  表头 + 表尾合并                 merge/head-foot-merge

导出与菜单
  vtExport 导出 CSV/Excel         plugins/export
  vtExport 打印                   plugins/print
  vtContextMenu 右键菜单          plugins/context-menu

进阶
  状态持久化                      advanced/state-persist
  滚动模型                        advanced/scroll-model
  国际化 i18n                     advanced/i18n
  无障碍 ARIA                     advanced/aria

AI 插件
  vtAIStream 流式表格             ai/ai-stream
  vtAIColumn AI 列                ai/ai-column
  vtAIQuery 自然语言查询          ai/ai-query
```

### 2.2 几个归属判断的理由（有争议的都在这）

| 页 | 归到 | 为什么 | 备选 |
| --- | --- | --- | --- |
| 剪贴板 | 选择与功能列 | `vtClipboard` 声明 `requires: ['vtCellSelection']`，复制的就是**当前框选区域** —— 属于「选中之后能干什么」这条线 | 导出与菜单（都是把数据搬出去） |
| 键盘导航 | 选择与功能列 | `vtKeyboardNav` 同样 requires 选区，**焦点位置就是选区** | 进阶 |
| 列排序 | 排序与筛选 | 读者找「排序」时通常和「筛选」一起想（都是整理数据）；也让「筛选散三处」一次收拢 | 列（`sortable` 配在列上，与 `api/column` 的分节一致） |
| 数据更新 / 响应式更新 | 数据源 | 主题是「数据变了怎么同步给表格」（`setList` / `forceUpdate`），与「数据从哪来」同一件事 | 开始（它们现在在 `basic/`，是入门内容） |
| 加载态 | 数据源 | 取数期间的 UI 反馈；服务端模式下「全屏遮罩 vs 状态条」的分工就写在无限滚动那页 | 外观与主题 |
| 多级分组表头 | 列 | 它是列树（`children`） | —（但要与「合并单元格」里的**表头合并**互相链接：`headerData` + `headerMerges` 是同一件事的另一种写法，两者互斥） |
| 功能列 | 选择与功能列 | 勾选 / 单选是选择；序号列不是，所以组名带上「功能列」而不是只叫「选择」 | 单独一组（= 现状）、或并进「列」 |
| 第三方组件库集成 | 单元格渲染 | 讲的是 `render` / `renderEditor` 怎么挂第三方组件、浮层外观归属 | 内置单元格组件 |
| 右键菜单 | 导出与菜单 | 真实用法几乎总是「右键 → 导出 / 删除」 | 单独的「工具」组 |
| 滚动模型 | 进阶 | 它是机制说明（`VirtScrollEvent`、`scrollTop` 恒为 0），不是一个能配的功能 | 数据源 |

---

## 3. 备选方案 A：按操作对象，7 组

与 `api/` 的「表格级 / 列级 / 单元格级」严格同构，一套心智模型走两边。

```
基础与外观 (10)  基础表格 边框 斑马纹 空态 无表头 高亮 对齐 换行 溢出 暗夜模式
列         (6)  列宽拖拽 冻结列 分组表头 列排序 列显隐 列拖拽
行         (7)  展开行 树形 分组 树形+分组 固定行 合计行 行拖拽
单元格     (30) 渲染粒度 独立渲染 第三方库 〔组件渲染〕· 18 个内置组件
                · 功能列 编辑会话 编辑校验 单元格选区 · 合并 ×5
数据       (11) 分页×2 无限滚动 服务端 懒加载 · 列筛选 富筛选 高级筛选 搜索 · 数据更新 响应式更新
工具与进阶 (10) 导出 打印 剪贴板 右键菜单 键盘导航 · 状态持久化 滚动模型 加载态 i18n 无障碍
AI 插件    (3)
```

**否决理由**：「单元格」30 页、「工具与进阶」10 页又成了新的杂物袋 —— 把 §1.5 那条事实
（组大才贵）反着用了。

---

## 4. 备选方案 C：只把大组切小，零文件移动，13 组

把「目录 = 分组」放宽成「**组不跨目录**」，于是每个目录能切成几组：

```
基础与外观 (10) ┐
列几何      (3) ├ 都在 basic/
数据更新    (2) ┘
功能列      (1)   feature-columns/
单元格渲染  (3) ┐ 都在 cell/
内置组件   (18) ┘
行与层级    (6) ┐
数据源      (5) ├ 都在 advanced/
排序与筛选  (2) │  ← 只有 列排序 + 高级筛选；列筛选 / 富筛选 / 搜索还在「插件」组
进阶与杂项  (6) ┘
插件       (13)   不动 —— 筛选 / 编辑 / 导出仍按机制归类
AI 插件     (3)
合并单元格  (5)
```

**否决理由**：零成本，但**只解决了「组太大」，没解决「同一件事散在多处」**（§1.1）——
因为跨目录合组被禁止。

---

## 5. 待定：目录跟不跟着动

方案 B 的 14 个组里有 6 个是**跨目录**的（列 / 行与层级 / 选择与功能列 / 编辑 / 排序与筛选 /
数据源）。三条路：

### 5.1 解耦：目录不动（改动最小）

侧边栏按**意图**分组（给读者），目录按**主题**保持现状 `basic` / `cell` / `advanced` /
`plugins` / `merge` / `ai` / `feature-columns`（给维护者）。

- 改动：只有 `docs/.vitepress/config.ts` 的 links 数组重排 + `AGENTS.md` 那条约定改写。
- 零文件移动、零链接改动、零外链失效。
- 代价：**「打开文件夹就知道它在侧边栏哪一组」不再成立**，新增示例时要在 `config.ts` 里挑组。
- 需要新的防错约定（原来那条是「目录名 = 分组名」，防的是「目录叫 `feature`、分组叫『增强功能』」
  这种名字错配）。建议改成：**目录名只许是主题名，不许暗示分组**；`config.ts` 每个组的注释里
  写明它跨了哪些目录。

### 5.2 目录跟着动（结构最干净）

14 组 → 14 个目录，需要新建 / 改名：

| 新目录 | 从哪来 |
| --- | --- |
| `start/` | `basic/basic` |
| `appearance/` | `basic/` 的 9 页外观 |
| `columns/` | `basic/{resize,fixed,header-group}` + `plugins/{column-visibility,column-drag}` |
| `rows/` | `advanced/` 的 6 页 + `plugins/row-drag` |
| `selection/` | `feature-columns/` + `plugins/{cell-selection,keyboard,clipboard}` |
| `cell/` | 保留（渲染机制 3–4 页） |
| `components/` | `cell/vt-*` 18 页 |
| `editing/` | `plugins/cells-render` + `advanced/validate` |
| `filtering/` | `advanced/{sort,filter-builder}` + `plugins/{filter,rich-filter,search}` |
| `data/` | `advanced/` 的 6 页 + `basic/{force-update,reactive}` |
| `merge/` | 不动 |
| `export/` | `plugins/{export,print,context-menu}` |
| `advanced/` | 只剩 4 页（状态持久化 / 滚动模型 / i18n / ARIA） |
| `ai/` | 不动 |

- 移动量：约 **60 页 × 3 端 = 180 个 md**，外加同数量级的 demo 源码文件。
- 每移一页要同步：demo 目录、`components/index.ts` 或 `App.tsx` 的 import、md 里的 `<<<` 源码
  路径、全站内部链接、`AGENTS.md`。这些上一轮都脚本化过，可复用。
- 代价：**旧 URL 全部失效**（`/vanilla/examples/basic/theme` → `/vanilla/examples/appearance/theme`）。
- 坑：目录页（`index.md`）的侧边栏 link 末尾**必须带斜杠**，否则换框架时 `getFrameworkLink`
  会拼出不存在的路径 → 404（已在 `feature-columns/` 上踩过一次并修了）。

### 5.3 折中：只把「插件」那 13 页拆散归位

收益最大的一块（§1.1 的三条散落全部由它引起），其余目录不动。

- 移动量：13 页 × 3 端 = 39 个 md + 对应 demo。
- 但目标目录得现建（`plugins/filter` 归到哪？现有目录里没有「筛选」）—— 所以这条其实等于
  「5.2 的一半」，会留下 `basic/` 里还有列几何、`advanced/` 里还有数据源的中间状态。

---

## 6. 另外几个待定的小问题

1. **「开始」要不要独立成组？** 只有「基础表格」一页。并进「外观与主题」→ 组名改「基础」
   （10 页），组数从 14 降到 13。
2. **「内置单元格组件」18 页要不要再切？** 按交互模型切三段（编辑态 11 / 直接可点 4 / 纯展示 3），
   或按类型切（输入 4 / 选择 3 / 日期时间 3 / 布尔评分 3 / 展示操作 5）。切了之后侧边栏是 16–18 组。
3. **「AI 插件」要不要改叫「AI 场景」**，与顶栏那个入口同名？（顶栏已有独立的「AI 场景」tab，
   两处指向同一批页面。）
4. **`plugins/` 前缀文案**。归位之后组名已经表明用途，条目还带不带 `vtColumnFilter` 这种插件名？
   带着的好处是一眼知道要装哪个插件；不带更短。建议：**带**（这是「要不要装插件」的唯一提示）。
5. **「合并单元格」与「列」的互链**：`merge/header-merge`（`headerData` + `headerMerges`）与
   `columns` 组的「多级分组表头」（`children`）互斥，两页都要写明「要另一种写法看那边」。

---

## 7. 决定之后要改的东西（清单）

不论选哪条目录策略，这些都要动：

- `docs/.vitepress/config.ts`：links 数组重排 + `buildExamplesSidebar()` 的组顺序与组名；
  删掉 `pluginLinks`（拆散后不再是一组）。
- `AGENTS.md`：§「侧边栏分组」那一行、§7.22 的记录、以及「新增一个单元格组件要碰的地方」
  第 6 步的数组名。
- 若走 5.2 / 5.3：还要改 demo 目录、三端注册点、md 的 `<<<` 路径、全站链接。
- 验证：`pnpm test` → `pnpm typecheck` → `pnpm build:docs` → 拿 `dist/**/*.html` 里的真实
  `id="..."` 与 md 里的 `](/vanilla/api/xxx#yyy)` 对一遍锚点 + 内部链接全量校验（上一轮的
  一次性脚本在 git 历史里，可复用）。
