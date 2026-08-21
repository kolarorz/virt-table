全部选项、条上的文字、收起面板、CSS 变量。

## 配置项

### 数据取值

| 项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `start` | 字段名 或 `(row) => 值` | **必填** | 开始时间 |
| `end` | 字段名 或 `(row) => 值` | **必填** | 结束时间，默认开区间 |
| `endInclusive` | `boolean` | `false` | 把 `end` 按闭区间理解 |
| `progress` | 字段名 或 函数 | — | 进度。`0..1`；大于 1 按百分数（`80` → 80%）。挑表格里那个进度条列的字段即可 |
| `summaryBars` | `boolean \| 'group' \| 'container'` | `'group'` | 汇总条画在哪种行上（`true` = `'container'`），见「层级怎么做」 |

### 时间轴

| 项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `zoom` | `'day' \| 'week' \| 'month' \| 'quarter'` | `'day'` | 时间粒度 |
| `bucketWidth` | `number` 或 `Partial<Record<GanttZoom, number>>` | 日 34 / 周 52 / 月 64 / 季 72 | 每桶列宽（px） |
| `range` | `{ start, end }` | 从数据推断 | 显式时间范围 |
| `autoRange` | `boolean` | `true` | 边距余量被吃掉时自动扩展范围（未给 `range` 时有效），见下 |
| `rangePadBuckets` | `number` 或 `Partial<Record<GanttZoom, number>>` | 日 14 / 周 8 / 月 6 / 季 6 | 推断范围时两端各多留几个**桶**，见下 |
| `centerToday` | `boolean` | `true` | 时间轴几何重建后把**今天**摆到正中，见下 |
| `onRangeChange` | `(range) => void` | — | 范围变了（异步送达，合并连续变化） |
| `maxBuckets` | `number` | `500` | 桶数上限，超出自动降级 zoom 并 warn，见下 |
| `panelWidth` | `number` | 业务列总宽，但不超过容器 45% | 左侧任务面板的宽度（px）。面板自己能横滚，所以列多不必靠加宽面板去看全。**给的值会被钳在「容器宽 − 120px」以内**，容器变窄时面板自动收（宽回来再还给你）—— 时间轴被挤成 0 宽之后分界与收起按钮都在容器之外，甘特就再也回不来了 |
| `panelResizable` | `boolean` | `true` | 两个 pane 之间可拖着调宽（把手平时看不见，hover 才现出一条蓝线） |
| `freezeFirstColumn` | `boolean` | `true` | 冻结「开头那串功能列 + 第一个数据列」，面板横滚时任务名与手柄留在原处。**`type: 'tree'` 算数据列**，所以 WBS 里冻结停在树形任务名上 |
| `headerHeight` | `number` | `68` | 表头目标高度（px）。时间轴表头要塞两行（年月 + 日期），核心默认的一行高度太挤；给 `0` = 不干预 |
| `toolbar` | `boolean \| GanttToolbarConfig` | `false` | 顶部工具栏（横跨表格与时间轴）。左边四颗改「表格看什么」（字段配置 / 筛选 / 分组 / 排序），右边一颗改「甘特怎么画」（甘特图配置），见下 |
| `weekStartsOn` | `number` | `1`（周一） | 一周的第一天，0 = 周日 |

### 外观

| 项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `barPadding` | `number` | `6` | 条与行上下边的间距（px） |
| `createSpan` | `number` | `1` | `editable.create` 点一下默认排几个桶 |
| `barLabel` | `string` 或 `(row, rowIndex) => string \| undefined` | — | 条上的文字。**给字段名**配置面板才能回显与切换（函数没有名字） |
| `barLabelPlacement` | `'auto' \| 'inside' \| 'outside'` | `'auto'` | 条内放不下时怎么办，见下 |
| `barColor` | `{ field, colors, fallback? }` | — | 按某一列的值给条上色，见下 |
| `barFixedColor` | `string` | — | 所有条一个颜色。与 `barColor` 互斥（后设的生效） |
| `workdaysOnly` | `boolean` | `false` | 工期只数工作日；那几列的底纹改画斜线，见下 |
| `skipHolidays` | `boolean` | `false` | 工期也跳过 `holidays` 里的日子 |
| `holidays` | `GanttHoliday[]` | — | 法定节假日表（`string \| number \| Date \| { date, label? }`） |
| `showDuration` | `boolean` | `true` | 条内右侧显示「n 天」 |
| `barClass` | `(row, rowIndex) => string \| undefined` | — | 追加到条元素上的 class（任意规则） |
| `rowLines` | `boolean` | `false` | 行横线。默认只关**时间轴那侧**，左侧任务列始终保留 |
| `gridLines` | `'group' \| 'bucket' \| 'none'` | `'group'` | 竖向分隔线画在哪 |
| `showNonWorking` | `boolean` | `true` | 非工作日底纹（仅日视图有意义） |
| `isNonWorking` | `(date: Date) => boolean` | 周六周日 | 非工作日判定。**补班日**（周六上班）从这里排除，见下 |
| `showToday` | `boolean` | `true` | 今天线（蓝色，内置里程碑） |
| `markers` | `GanttMarker[]` | `[]` | 里程碑竖线，也可运行时 `setGanttMarkers()`。**同一天只留一条** |
| `markerColors` | `string[]` | 六色 | 新建 / 编辑里程碑的预设色板，见下 |
| `onMarkersChange` | `(markers) => void` | — | 里程碑列表变了（新建 / 改名 / 改色 / 删除），给完整列表 |
| `zoomSwitcher` | `boolean \| GanttZoom[]` | `true` | 右上角悬浮的粒度切换器；传数组只留部分档位 |
| `onZoomChange` | `(zoom) => void` | — | 用户**点切换器**换了档位（`setGanttZoom()` 不触发） |
| `panelToggle` | `boolean` | `true` | 是否在表头渲染「收起任务列」按钮 |
| `barJumper` | `boolean` | `true` | 条被横滚出视口时，在时间轴边缘给那一行放一枚**跳转箭头**，见下 |
| `texts.ariaLabel` | `string` | `'甘特图条形区'` | 覆盖层的 `aria-label` |
| `texts.jumpToday` | `string` | `'今天'` | 切换器上「回到今天」那颗按钮 |
| `texts.jumpBar` | `string` | `'滚动到这一条'` | 越界跳转箭头的 `title` |
| `texts.zooms` | `Record<GanttZoom, string>` | `日/周/月/季` | 切换器上四档的文字 |
| `texts.dayUnit` | `string` | `'天'` | 条内工期的单位 |
| `texts.holiday` | `string` | `'法定节假日'` | 没给名字的假期在表头上的 `title` |
| `texts.deleteMarker` | `string` | `'删除'` | 编辑里程碑浮层的删除按钮 |
| `texts.editMarker` | `string` | `'点击编辑'` | 旗标的 `title` 后缀（提示可点） |
| `texts.today` | `string` | `'今天'` | 今天线 hover 时的名字 |
| `texts.addMarker` / `markerNamePlaceholder` / `confirm` | `string` | 中文 | 表头新增里程碑的文案 |

### 交互

| 项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `editable` | `boolean \| GanttEditable` | 全关 | `true` 等价于 `{ move: true, resize: true }` |
| `editable.move` | `boolean` | `false` | 拖条平移改期 |
| `editable.resize` | `boolean` | `false` | 拖两端改工期 |
| `editable.progress` | `boolean` | `false` | 拖进度手柄（多数场景进度来自系统而非手拖） |
| `editable.create` | `boolean` | `false` | 在没日期的行上点一下新建工期 |
| `editable.marker` | `boolean` | `false` | 从表头点出里程碑 |
| `editable.reorder` | `boolean` | `false` | **条上（或任务列上）上下拖**换序，落点画提示线；条上左右拖仍是改期，见下 |
| `onChange` | `(e: GanttChange<T>) => void` | — | 拖拽落定 |
| `onBarClick` | `(rowKey, row, ev) => void` | — | 点击条（位移不足半格时按点击处理） |
| `onCreate` | `(e: GanttCreate<T>) => void` | — | 在空白行上点出工期 |
| `onMarkerCreate` | `(m: GanttMarker) => void` | — | 从表头新增了里程碑 |

拖拽**吸附到整格**：位移换算成整数个桶，桶内的小数（时刻）保留。所以日视图下拖动就是
「推迟 N 天，保留原时刻」；月视图下是「推迟 N 个月」—— 与用户在该视图里看到的格子一致。
进度拖拽不吸附（它是比例，逐像素连续更顺手）。

拖到容器左右边缘会自动横滚，自动滚动的量会从位移里扣掉，不会双倍速。

---

## 条上的文字放哪

短条 + 长任务名是常态。「放不下就截断」看起来最省事，实际最难受 —— 68px 的条上只剩
「需求与…」，等于没标签。默认 `'auto'` 会按测量结果三选一：

| 情况 | 落点 | class |
| --- | --- | --- |
| 条内放得下 | 条内（读起来像条上的标签） | `--label-in` |
| 放不下 | 条**右侧**条外 | `--label-out` |
| 右侧也没地方（条贴着时间轴末端） | 条**左侧**条外 | `--label-out-left` |
| 两侧都没地方（条几乎占满整条时间轴） | 条内截断 | `--label-clip` |

飞书那类实现只做到第二步。多出的**第三步不是炫技，是必须的**：

1. 覆盖层是滚动容器的子节点，标签往右伸出时间轴范围会**把 `scrollWidth` 撑大**，
   凭空多出一截可横滚的空白；
2. 那种位置的标签本来也会被容器右边缘裁掉，等于没显示。

宽度判断走 canvas `measureText` 并按 `字体 + 文本` 记忆化，**不读元素的 `scrollWidth`** ——
后者每条一次强制布局，一屏几十条就是每帧几十次回流。

`'inside'` 是旧行为（一律条内截断），`'outside'` 一律放条外。

条外的文字会自动换成 `--vtp-gantt-bar-text-outside`（正文色）—— 条内那个是反色（白），
移到条外就落在表格底色上，白字白底等于没有。

---

## 收起左侧任务表

```ts
table.toggleGanttPanel();        // 或 collapseGanttPanel() / expandGanttPanel()
table.isGanttPanelCollapsed();
```

默认会在**冻结任务列与时间轴的交界处**（第一个分组表头格的左侧）渲染一个小箭头按钮，
点它收起 / 展开；`panelToggle: false` 关掉，改用上面的 API 自己放按钮。

按钮挂在 `.vt-root` 上而不是塞进表头 DOM —— 表头是核心拥有的，插件只可追加、不可重排。
横坐标取**业务列的总宽**（冻结区右边缘在视口里是常量），所以它与 `scrollLeft` 无关，
横滚零 JS 的性质因此保住了。

收起按钮与粒度切换器贴在时间轴的左上 / 右上角，但**挂在包住两个 pane 的 split 容器上**，
不在 pane 里面 —— pane 是横向滚动容器，`position: absolute` 在它里面的原点是**内容**原点，
挂进去横滚一下按钮就跟着内容漂走了。挂在不滚动的那一层之后，横滚多远它们都不动，
而收起 / 展开面板时收起按钮会跟着分隔处走（横坐标由 JS 给）。

把业务列整批隐藏，宽度全给时间轴。

- 实现是隐藏列而不是把宽度改成 0：后者会留下一条 0 宽的冻结列和它的阴影
- 一次性提交，不是逐列 `setColumnVisible`（那个每次都重建整棵列树 + 清行池）
- 收起前就已经隐藏的业务列，展开后仍然是隐藏的
- **收起期间树形开关跟着任务列一起没了**，所以要展开/折叠 WBS 得先把面板放出来

---

## 条滚出视口时的跳转箭头

时间轴自己是一个横向滚动容器（见<ProLink to="gantt/internals">内部机制</ProLink>），所以条会被滚出视口。
这时那一行在时间轴上就是**一片空白** —— 而空白与「这一行没排期」长得一模一样
（后者 hover 还会冒出一个 `+`）。默认会在时间轴的左 / 右边缘给那一行挂一枚圆形箭头：

- **方向就是答案**：向左 = 工期在更早的时间，向右 = 在更晚的时间
- **点一下滚过去**：装得下就把条摆到视口正中；比视口还长的条对齐**起点**（居中会两端都出界）
- 只在条**完全**不在视口里时出现。露出一丝也不给 —— 贴边的条上挂个按钮纯属噪音
- 滚到位之后箭头当场消失（它只是「条在视口外」的指示，不是常驻控件）

`barJumper: false` 关掉，`texts.jumpBar` 换 `title`，间距用 `--vtp-gantt-jump-gap`。

::: tip 为什么位置是 sticky 而不是每帧算
箭头要钉在视口边缘，而它挂在 pane 的**内容**里（内容坐标随横滚平移）。逐帧按 `scrollLeft`
写 `left` 也能对上，但横滚是**合成器**在平移内容、`scroll` 事件是异步的 —— JS 写出来的位置
永远慢半帧，箭头会跟着手指抖。所以这一层 `position: sticky; left: 0`，横向位置零 JS
（与表头里年月标题吸左同一手法）；JS 只按 `scrollLeft` 判可见性，那一步只改 `display`。
:::

---

## CSS 变量

全部定义在 `.vt-root` 上，默认值派生自核心的 `--vt-*`，所以换主题（含暗色）时甘特自动跟着变。

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `--vtp-gantt-bar-bg` | `--vt-color-primary` | 条底色 |
| `--vtp-gantt-bar-progress-bg` | `rgb(0 0 0 / 34%)` | 进度段（在条底色上叠加，所以换了条色它自动跟着走） |
| `--vtp-gantt-bar-radius` | `--vt-radius-sm` | 条圆角 |
| `--vtp-gantt-bar-text` | `--vt-text-inverse` | 条**内**文字（反色） |
| `--vtp-gantt-bar-text-outside` | `--vt-text-color` | 条**外**文字（正文色），含里程碑标签 |
| `--vtp-gantt-summary-bg` | `--vt-text-secondary` | 汇总条 |
| `--vtp-gantt-marker-color` | `#8b5cf6` | 里程碑竖线与它的标签底色 |
| `--vtp-gantt-marker-width` | `2px` | 竖线粗细 |
| `--vtp-gantt-nonworking-bg` | `--vt-fill-color-light` | 非工作日底纹 |
| `--vtp-gantt-grid-color` | `--vt-border-color-light` | 竖向分隔线 |
| `--vtp-gantt-grid-group-color` | `--vt-border-color` | 分组边界线 |
| `--vtp-gantt-today-color` | `--vt-color-primary` | 今天线（蓝） |
| `--vtp-gantt-drop-color` | `--vt-color-primary` | 拖拽换序的落点提示线 |
| `--vtp-gantt-reorder-row-bg` | 主色 12% | 拖拽换序时源行叠加的底色 |
| `--vtp-gantt-jump-gap` | `6px` | 越界跳转箭头与时间轴边缘的间距 |

## 顶部工具栏

`toolbar: true` 在表格与时间轴之上加一条工具栏，上面五颗按钮：

```
[▥ 字段配置▾] [▽ 筛选 ②▾] [☰ 分组 ①▾] [↓↑ 排序▾]              [≡ 甘特图配置▾]
└──────────── 改「表格看什么」 ────────────┘               └── 改「甘特怎么画」──┘
```

左右分成两组不是排版偏好：左边四颗是**每天都在动的操作**（这周按阶段看、只看进行中的、
按开始日期排），右边那颗是**接入时试几次就定下来的设置**（条读哪一列的日期、按什么上色）。
所以设置那颗贴右上角，与各家表格 / 看板的习惯一致；左边那条槽还留给使用方塞自己的按钮。

| 项 | 类型 | 默认 | 点开是什么 |
| --- | --- | --- | --- |
| `toolbar.columns` | `boolean` | `true` | **字段配置**：列的显隐（勾选）与列序（拖手柄） |
| `toolbar.filter` | `boolean` | `true` | **筛选**：核心的高级筛选管理器（AND/OR 条件树）。⚠️ 要多引一份 CSS，见下 |
| `toolbar.group` | `boolean` | `true` | **分组**：分组层级列表（第 1 级 / 第 2 级…） |
| `toolbar.sort` | `boolean` | `true` | **排序**：排序规则列表 |

筛选 / 分组 / 排序三颗在**有生效内容时点亮并带一个数字徽标**（几条条件、几级分组、几条排序）；
字段配置那颗的徽标是「隐藏了几列」—— 回到看板时第一个问题往往是「我上次筛了什么、少了哪一列」。

### 左边四颗改的是核心的查询状态，不是插件另存的一份

| 面板 | 读 | 写 |
| --- | --- | --- |
| 字段配置 | `getAllColumns()` | `setColumnVisible()` / `moveColumn()` |
| 筛选 | `getState().filterModel` | `setState({ filterModel })` |
| 分组 | `getGroupConfig()` | `setGroupConfig()` |
| 排序 | `getState().sort` | `setState({ sort })` |

所以它们与**列头点击排序、列头筛选下拉、`@virt-table-pro/views` 保存的视图**是同一份状态：
在面板里排的序，列头上的箭头也会亮；`vtViews` 还原一个视图，面板打开就是新值。

三条由此而来、如实说出来的边界：

- **排序 / 筛选一生效，甘特条上的纵向拖拽换序就停了** —— 核心的 `canReorderRows()` 在那两种
  状态下为 `false`（视图顺序 ≠ 原始数据顺序，拖出来的结果无法预期）。排序面板里写着这一条，
  真去拖时插件也会在控制台说一次原因。
- **表格没开 `sortMode: 'multiple'` 时排序只允许一条**：面板不给「添加」并说明原因 ——
  核心的 `setState` 在单列模式下会静默截断成第一条，让人加了第二条再看它消失更糟。
- **分组形态别配 `fixedSize: true`**：核心的分组行比数据行高 2~3px，等高滚动模型会比实际内容矮，
  分组行一多最后几行就滚不到（核心 AGENTS.md §7.11）。面板里挂着这句提示，控制台也会说一次。

### 字段配置：两行「勾不掉」，都是有原因的

| 勾不掉的行 | 为什么 |
| --- | --- |
| 甘特冻结的那一列（通常是任务名） | 冻结列是按**含隐藏列**的列顺序挑的，把它藏掉会让冻结落在一个隐藏列上、而可见的第一列反而不冻结（任务名会随面板横滚跑掉）。`freezeFirstColumn: false` 时这条不生效 |
| 最后一列 | 全勾掉会得到一张只有表头的空表 |

两条都是**置灰 + 鼠标停上去说明原因**，不是静默无效。功能列（勾选 / 序号 / 手柄）与
`hideable: false` 的列不出现在列表里（与核心 `vtFieldConfig` 同一条规则）。

拖手柄换序只在**同一层兄弟之间**（与核心 `moveColumn` 同约束）：分组表头下把叶子列跨组搬家
会改表头结构。落不下去时索性不画提示线 —— 比「画了线但松手没反应」诚实。

### 筛选：要多引一份 CSS

```ts
import '@virt-table-pro/gantt/index.css';
import '@virt-table/vanilla/components/vt-filter-builder.css'; // 只有开 toolbar.filter 时需要
```

面板里装的就是核心的筛选管理器 `VtFilterBuilder`（条件树、算子按列的值类型推断、嵌套条件组），
**本包不复制那五百行**。而库构建会把 CSS 从 JS 里剥出来单独产出，`import` 那个 JS 入口
**不会**自动带上它的样式 —— 与 `@virt-table-pro/floating-image` 引图片查看器那份 CSS 是同一件事，
也是同一个理由：在本包 CSS 里 `@import` 过来的话，CSS 与 JS 会分别来自两个仓库的两个版本，
客户升了核心没升本包就是「新 JS + 旧 CSS」。

漏了不会静默：第一次打开面板时插件会探一眼那份 CSS 独有的变量，缺了就在控制台把该引的路径写给你。

可筛选列取**当前可见列**（在字段配置里藏掉的列不会还能筛）。条件匹配的是**原始值**而不是
显示文案（`VtSelect` 列存的是 `value`，界面上是 `label`）—— 这是核心 `filterModel` 的既有语义。

## 顶部工具栏 →「甘特图配置」 {#gantt-config}

右边那颗按钮，点开是一个下拉面板，把「甘特读哪几列」这件事全摆出来：

```
甘特图配置
开始日期      [ 开始        ▾ ]
结束日期      [ 结束        ▾ ]
──────────────────────────────
标题展示      [ 任务        ▾ ]
颜色显示      [ 跟随字段颜色 ▾ ]
              [ 状态        ▾ ]   ← 跟随字段颜色时多这一行
进度显示      (●) [ 进度     ▾ ]
──────────────────────────────
仅计算工作日                (○)
```

```ts
vtGantt({ start: 'start', end: 'end', toolbar: true })
// 只留其中几项（左侧四颗与这五行是同一个 config，键都默认 true）
vtGantt({ start: 'start', end: 'end', toolbar: { fields: false, workdays: false } })
// 只要左侧四颗，不要右边那颗的日期两行
vtGantt({ start: 'start', end: 'end', toolbar: { fields: false } })
```

| 项 | 类型 | 默认 | 这一行是什么 |
| --- | --- | --- | --- |
| `toolbar.fields` | `boolean` | `true` | 开始日期 / 结束日期读哪一列 |
| `toolbar.label` | `boolean` | `true` | 条上显示哪一列的值（含「不显示」） |
| `toolbar.barColor` | `boolean` | `true` | 跟随字段颜色（选一个单选列）或指定一个预设颜色 |
| `toolbar.progress` | `boolean` | `true` | 进度开关 + 读哪一列 |
| `toolbar.workdays` | `boolean` | `true` | 仅计算工作日 + 跳过法定节假日两行（见下）|

为什么是**一颗按钮 + 一个面板**而不是把控件铺在工具栏上：配置到了六项，铺开会占满一整条，
而它们都是**低频设置**（高频的是拖条、换粒度）。收进一个入口，工具栏那条就只剩一个按钮。

### 候选列是从数据推断的

核心的列对象**不带** `options` —— `VtSelect` 把候选项留在自己的闭包里，所以插件只能看数据
（前 500 行；十万行的表不必全扫）：

| 这一行 | 什么样的列进候选 |
| --- | --- |
| 开始 / 结束日期 | 非空值**全部**像日期：`YYYY-MM-DD`、`Date`、或毫秒时间戳量级的数字（> 1e11）。**不拿 `new Date(x)` 试** —— 它对字符串宽容到没有判据（`'2'` 会变成 2001 年），那样任务编号列也会被当成日期列 |
| 标题展示 | 有字符串 / 数字取值就行（任务名天生每行不同，不限种类数） |
| 跟随字段颜色 | 取值 **2~12 种**的字符串 / 数字列（超过 12 种就不是分类而是自由文本，按它上色没有可读性）。颜色从九色调色板按顺序发 |
| 进度 | 非空值都能转成有限数的列（`0..1` 与 `0..100` 都认）。日期串会被排除 |

一项候选都没有时下拉里给的是「没有日期列」「没有取值在 2~12 种之间的列」这样的说明，
而不是一个空面板。

打开进度开关时**不弹下拉**：先用当前那列、没有就取第一个数值列 —— 打开开关的意图是
「我要看进度」，先给出一个能用的默认，想换再点旁边的下拉。

### 控件全部来自核心

| 面板里的东西 | 来自 |
| --- | --- |
| 浮层本体（定位、outside-click、Esc、嵌套） | `createPopup` |
| 每一行的下拉框 | `createSelectField` |
| 进度 / 仅计算工作日的开关 | `createSwitch` |
| 面板皮肤 | `.vt-filter-panel` / `.vt-filter-list` |

所以这个面板与列头筛选下拉、单元格里的选择器长得一模一样，也自动进了 `data-vt-popup`
的 outside-click 白名单（自己搭的浮层一点就会把别人的单元格编辑器关掉）。

**面板里再开下拉**这件事由核心兜住：`createPopup` 维护一个「打开中的浮层栈」，点在
更晚打开的那一层里不算「点到外面」—— 否则点一下行里的下拉，整个配置面板就关掉了。

### 每一行对应一个命令式 API

面板与 API 共用同一份运行时状态，改哪条都一样：

| 面板这一行 | 等价 API |
| --- | --- |
| 开始 / 结束日期 | `setGanttFields({ start, end })` |
| 标题展示 | `setGanttLabelField(key \| null)` |
| 颜色显示 → 跟随字段颜色 | `setGanttBarColor({ field, colors } \| null)` |
| 颜色显示 → 指定颜色 | `setGanttBarFixedColor(color \| null)` |
| 进度显示 | `setGanttProgressField(key \| null)` |
| 仅计算工作日 | `setGanttWorkdaysOnly(on)` / `isGanttWorkdaysOnly()` |

> 左侧任务面板的**列宽可拖**是默认开的（业务列 `resizable` 未显式给出时视为 `true`，
> 功能列不给把手）。面板自己能横滚，所以列多了不必靠加宽面板去看全。

---

## 工期：条内右侧的「n 天」

每条的右端画它的工期（`showDuration`，默认开）。数字是**逐天数**出来的，跳过哪几天由下面两个
开关决定：

| 开关 | 跳过 | 界面上怎么看出来 |
| --- | --- | --- |
| 默认 | 不跳，自然日 | 非工作日是一块浅底（`showNonWorking`） |
| `workdaysOnly` | 非工作日（默认周六周日，`isNonWorking` 可换） | 那几列的底纹变成**斜线** |
| `skipHolidays` | `holidays` 里的日子 | 同样是**斜线**；表头那一格的日期还会标色 + 带名字 |

```ts
vtGantt({
  start: 'start',
  end: 'end',
  workdaysOnly: true,
  skipHolidays: true,
  holidays: ['2026-10-01', { date: '2026-10-02', label: '国庆' }],
})
```

**斜线不是装饰**：条上那个数字跳过了几天，界面上就必须能看出跳的是哪几天 —— 否则「8/19 到
8/24 明明六天，怎么写着 3 天」会被当成 bug。所以「不计入工期」有自己的底纹，与「这天是周末」
那块浅底分开表达（颜色 `--vtp-gantt-excluded-color`）。

开区间照旧：`8/19 → 8/24` 是 5 天。逐天迭代而不是 `(end - start) / 86400000` —— 夏令时切换
那天只有 23 小时，除法会得到 4.96 然后被 round 成 5（碰巧对，跨两次切换就错）。结果按区间
记忆，所以每种区间每帧只算一次。

### 放不下时让位的是标题

条太短时先让**标题**移到条外或截断，工期徽标留着 —— 徽标宽度固定（三四个字符）、每条一样，
按它让位得到的是一条随条宽单调变化的规则。反过来让徽标让位试过一版：短条上有「2 天」、
稍长的条上因为标题占住了反而没有，同一屏里时有时无，看起来纯粹是 bug。

条宽连徽标都放不下（约 40px 以下）时徽标才隐藏。**汇总条不显示** —— 它只有普通条 55% 的
高度，塞字会溢出，而它的工期本来就是后代算出来的。

`texts.dayUnit` 换单位（默认「天」，给 `' d'` 就是 `5 d`）。

### 假期表为什么必须由使用方给

`holidays` 没有默认值，插件也不内置任何国家的假期表：调休安排**每年由政府单独发布**、每年
不同，内置一份就是内置一份会过期的错数据。使用方从自己的日历服务取，形状是
`string | number | Date | { date, label? }`，日期一律按天归一。

没配 `holidays` 时配置面板里「跳过法定节假日」那一行**置灰并说明原因**（而不是藏起来 ——
藏起来会让人以为插件不支持节假日，置灰才说清「差的是一份数据」）。运行期换表用
`setGanttHolidays(list)`。

### 别忘了**补班日**

国内的调休安排里每年都有几个「周六上班」。它们既不是假期、也不该按周末扣掉 —— 这是国内
排期最容易算错的一处，而它由**另一个**入口管：`isNonWorking`（或运行期的
`setGanttNonWorking(fn)`）。

以 2026 年为例（国办发明电〔2025〕7 号：全年 33 个放假日 + 6 个补班日）：

```ts
const HOLIDAYS = [
  { date: '2026-09-25', label: '中秋节' },
  { date: '2026-09-26', label: '中秋节' },
  { date: '2026-09-27', label: '中秋节' },
  { date: '2026-10-01', label: '国庆节' },
  // …国务院通知里的其余日期
];
/** 补班：这几个周末要上班 */
const WORKDAYS = new Set(['2026-09-20', '2026-10-10']);

vtGantt({
  start: 'start',
  end: 'end',
  workdaysOnly: true,
  skipHolidays: true,
  holidays: HOLIDAYS,
  isNonWorking: (d) => {
    const day = d.getDay();
    if (day !== 0 && day !== 6) return false;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return !WORKDAYS.has(key);
  },
});
```

结果就是：9/19（周六）画斜线、**9/20（周日，补班）不画**、9/25–27 与 10/1–7 整段斜线 ——
条上的「n 天」与这几段严格对应。playground 的甘特 demo 里有一颗**「导入 2026 年中国法定
节假日」**按钮，做的就是这三步（`setGanttHolidays` + `setGanttNonWorking` + 两个开关），
可以直接照抄。

`isNonWorking` 是构造选项，改不了；**运行期换判据用 `setGanttNonWorking(fn)`**
（传 `null` 回到默认的周六周日）。换它会重建桶 —— `GanttBucket.nonWorking` 是分桶时算好的。

> `workdaysOnly` 早先是把非工作日的桶**整个摘掉**（周末不占格）。改掉了：桶列表一有空洞，
> 「某个日期在时间轴的哪个位置」就不再单调（周六周日挤在同一条边界上），而里程碑、今天线、
> 拖拽落点全都建立在那个映射上。现在这个开关只改**算法与底纹**，日历始终是连续的。

---

### 按列取值给条上色

挑一个选项列（状态、优先级、负责人），把它的候选项配色直接搬过来 —— 表格里那一列的胶囊
和时间轴上的条就是同一套颜色：

```ts
const STATUS = [
  { value: 'doing', label: '进行中', color: '#2563eb' },
  { value: 'risk',  label: '有风险', color: '#ef4444' },
];

vtGantt({
  start: 'start',
  end: 'end',
  barColor: {
    field: 'status',                                              // 字段名或取值函数
    colors: Object.fromEntries(STATUS.map((o) => [o.value, o.color])),
    fallback: '#94a3b8',                                          // 可选
  },
})
```

它把一个主色摊成**胶囊的那两个面**：

| | 值 | 对应胶囊的 |
| --- | --- | --- |
| 条底色 | `rgba(主色, tint)` | 背景（`color-mix(<主色> var(--vt-cell-option-tint), transparent)`） |
| 进度段 | 主色（实色） | 文字色 |
| 条内文字 | 黑或白（取底色反色，见下） | — |

于是「表格里那一列的胶囊」与「时间轴上的条」是同一套配色的两个面：**浅底 = 计划，
实色 = 已完成**。早先是「实色条 + 压一层黑做进度」，深色条上 90% 与 100% 几乎分不出。

`tint` 的默认值**读核心的 `--vt-cell-option-tint`**（胶囊底色的浅调比例，核心默认 `14%`），
读不到才落回 `0.14`。不在插件里写死一个 0.14：条底色按设计就等于胶囊底色，写死就是同一个
公式的两份实现 —— 使用方（或核心）调了胶囊的浅调，同一张表里的条与胶囊会对不上，
而且是跨仓库、没人会发现。（`getComputedStyle` 只读一次并记住：它是一次强制布局，
而条形层每帧要给一屏的条上色。）

给 `tint: 1` 就是实色条，此时进度段退回默认的压黑观感。

浅色调在 **JS 里算成 `rgba`** 而不是写 `color-mix()`：内联样式没法带 `@supports`，
一旦浏览器不认 `color-mix`，`background: var(--vtp-gantt-bar-bg)` 会整条失效变透明。
解析不出十六进制时（CSS 变量、颜色名）退回实色两用 —— 观感降级，但绝不空白。

查不到颜色且没给 `fallback` 时会把三个内联变量**全清掉**而不是留着 ——
条元素是复用的，不清就会串上一行的色。

与 `barClass` 的分工：`barColor` 是**数据驱动的映射**（值 → 颜色，可序列化、可来自后端配置）；
`barClass` 是任意规则（跨字段、算出来的阈值）。两个都给时 `barColor` 先写变量，
`barClass` 的样式仍可覆盖它。

```ts
vtGantt<Task>({
  start: 'start',
  end: 'end',
  barClass: (row) => (row.overdue ? 'my-bar--overdue' : undefined),
});
```

```css
.my-bar--overdue { --vtp-gantt-bar-bg: var(--vt-color-danger); }
```

---

## 甘特图的其它几页

- <ProLink to="gantt/">概览与快速开始</ProLink>
- <ProLink to="gantt/data">数据契约</ProLink>
- <ProLink to="gantt/options">配置项与外观</ProLink>
- <ProLink to="gantt/interaction">交互与写回</ProLink>
- <ProLink to="gantt/internals">内部机制</ProLink>
