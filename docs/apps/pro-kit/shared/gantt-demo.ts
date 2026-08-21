/**
 * 甘特 demo 的**表格配置**（列 + 表级选项 + 插件），三端共用。
 *
 * 为什么值得单独一份：甘特这个 demo 是几条**只能手验**的性质的验收场（横滚零 JS、
 * 左右各自横滚、收起任务面板、拖条与单元格双向写回、三种层级形态的语义差别）。
 * 三端各写一遍的话，React 端很快就会缺掉「分组/树形/扁平」这类需要一点脚手架的档位 ——
 * 那时「付费插件三端都支持」这句话就只在 vanilla 端是真的。
 *
 * 这里能共用是因为**列定义就是普通对象**（核心的 `VtInput` / `VtSelect` 这些是列工厂，
 * 返回 `VirtTableColumn`），与框架无关。各端只负责：把配置摊进自己的挂载方式、
 * 提供 `refresh()`（拿到实例后调 `refreshGantt()`）、以及显示状态文字。
 */
import type { VirtTableColumn, VirtTablePlugin } from '@virt-table/vanilla';
import {
  vtCellEditor,
  vtFieldConfig,
  vtFilterConfig,
  vtGroupConfig,
  vtRowDrag,
  vtRowHeightConfig,
  vtSortConfig,
  vtToolbar,
} from '@virt-table/vanilla/plugins';
import {
  VtDatePicker,
  VtInput,
  VtNumberInput,
  VtPerson,
  VtProgress,
  VtSelect,
} from '@virt-table/vanilla/components';
/*
 * ⚠️ **只 import 类型，不 import 运行时值。**
 *
 * 本文件在 `docs/apps/pro-kit/`（三端共用），而付费包是**逐 app** 装进
 * `docs/apps/<fw>/node_modules/` 的。node 的解析从 importer 所在目录往上走，所以从这里
 * `import { vtGantt } from '@virt-table-pro/gantt'` 在 `installed` 档（没有 alias、
 * 走裸包名）下会直接 `Rollup failed to resolve import`。
 *
 * `vtGantt` 因此由各端**注入**（见 `GanttDemoDeps.vtGantt`），与 `demo-license.ts` 收
 * `setLicenseKey` 是同一条规则：pro-kit 里一个付费包的运行时值都不引。
 * 类型 import 会被编译期擦掉，不参与解析，所以留着没问题。
 */
import type { GanttOptions, GanttZoom } from '@virt-table-pro/gantt';
import {
  CN_2026_HOLIDAYS,
  CN_2026_WORKDAYS,
  cnIsNonWorking,
  nextCnHoliday,
} from './cn-holidays-2026';
import {
  OWNER_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  countRows,
  makeGanttHolidays,
  findTask,
  makeGanttRows,
  makeGanttTree,
  toISODate,
  type Task,
} from './gantt-data';

/**
 * 层级形态由**两个互不相关的布尔**决定：要不要分组、要不要树形。
 *
 * - **分组**：任务列表是**扁平**的，层级由 `groupConfig` 在视图上聚合出来。分组行是纯分类、
 *   不可能有自己的日期 → 只能画汇总条。这是甘特更常见的数据形态。
 * - **树形**：层级在**数据**里（`children` 嵌套）。父节点是个有语义的工作包，
 *   **可以有自己的计划工期** —— 那时它画的就是自己的条，而不是囊括后代的汇总条。
 * - 两个都关 = **扁平**。它是甘特自己那套换序（条上下拖）唯一可用的一档 ——
 *   核心的 `canReorderRows()` 在分组 / 树形 / 排序 / 筛选下一律为 false。
 *   默认就落在这里：「打开就能试」比「先点两下按钮才能试」重要得多。
 * - 两个都开 = 分组套树形（数据是嵌套的，再按阶段聚合）。
 *
 * **为什么是两个开关而不是一个三态按钮**：这两件事本来就互不相关，用「分组 / 树形 / 扁平」
 * 轮换的话，用户看不出当前在哪一档，也没法表达「两个都要」。
 */
export interface GanttShape {
  group: boolean;
  tree: boolean;
}

/**
 * 三端共用的初始形态。**放在这里而不是各端自己写一个字面量** —— 不然改一次默认得改三处，
 * 而漏掉的那一端会安静地停在旧默认上。
 */
export const GANTT_DEFAULT_SHAPE: GanttShape = { group: false, tree: false };

/**
 * 当前时间轴有多少个桶。
 *
 * **数 pane 表头里的格子**，不是数列 —— 二期时间轴搬进了插件自己的 pane，
 * `getVisibleColumns()` 里压根没有它（早先那句 `filter(key.startsWith('__gantt_'))`
 * 因此一直显示 0，是从单表时代漏下来的）。
 */
export function countBuckets(scope: ParentNode = document): number {
  return scope.querySelectorAll('.vtp-gantt-head__cell').length;
}

/** 当前形态一句话说明（状态栏用） */
export function shapeHint(shape: GanttShape): string {
  const parts: string[] = [];
  if (shape.group)
    parts.push('分组：层级由 groupConfig 在视图上聚合，分组行是纯分类、不可能有自己的日期 → 汇总条');
  if (shape.tree)
    parts.push('树形：层级在数据里，父节点是工作包 → 画它自己的条（和叶子一样可拖可拉伸）');
  if (parts.length === 0)
    return '扁平：没有分组也没有树 → 这一档才能用甘特自己的换序（条上下拖 / 任务列上下拖），条左右拖照旧改期';
  return `${parts.join('；')}。此形态下条上纵向拖不换序（核心 canReorderRows() 为 false），但左侧的拖拽手柄照样能拖`;
}

export interface GanttMarker {
  date: string;
  label: string;
  color?: string;
}

export interface GanttDemoDeps {
  /**
   * 甘特插件工厂，由各端注入 —— 本文件不能 import 它的运行时值（见文件头那段注释）。
   *
   * 类型上收成「吃 GanttOptions、返回插件」：桩档下各端传进来的是桩的 `vtGantt`，
   * 形状一致，这里不必知道是真包还是桩。
   */
  vtGantt: (options: GanttOptions<Task>) => VirtTablePlugin<Task>;
  shape: GanttShape;
  /** 数据规模。经典案例传大档（3035 行），文档页用默认档 */
  scale?: GanttScale;
  /**
   * 任务面板初始宽度。不给就用插件默认。
   *
   * 经典案例按容器宽度挑一档（窄屏更窄），让「开始」那一列刚好落在面板内 ——
   * 后面的列靠面板自己横滚，两个 pane 各有独立的横向滚动视口。
   */
  panelWidth?: number;
  /**
   * 「哪天不算工作日」。不给就只按周末算。
   *
   * 传进来的是**使用方的**日历判定（法定节假日 + 补班日），核心与插件都不该内置某个国家的
   * 假期表 —— 这也是「工作日历由使用方传入」那条设计的落点。
   */
  isNonWorking?: (d: Date) => boolean;
  zoom: GanttZoom;
  markers: GanttMarker[];
  /** 拿到实例后调 `refreshGantt()`。列里的 onChange 与拖条写回都要它 */
  refresh: () => void;
  setStatus: (text: string) => void;
  /** 用户点了插件自带的粒度切换器 */
  onZoom: (zoom: GanttZoom) => void;
  /** 时间轴范围 / 里程碑变了，信息行该刷新 */
  onInfo: () => void;
}

export interface GanttTableConfig {
  list: Task[];
  columns: VirtTableColumn<Task>[];
  /**
   * 树形 / 扁平：行都是 40px，走等高快路径。
   * 分组：核心的**分组行**天生高一点（42~43px：主色标记条 + 加粗标题），与
   * `estimatedSize: 40` 的模型对不上 —— 这个 demo 有 39 个分组行，累计约 100px，
   * 模型比实际矮就会让最后一两行滚不到（核心 AGENTS.md §7.11）。行不等高时正确的选择是
   * 不定高：核心会逐行实测，而条的几何取自真实 DOM 矩形，不定高一样精确。
   */
  fixedSize: boolean;
  groupConfig?: Array<{ field: string }>;
  plugins: VirtTablePlugin<Task>[];
}

/** 数据规模。不传就是这个 demo 的默认档（约 285 行） */
export interface GanttScale {
  /** 每个阶段的叶子任务数 */
  leavesPerPhase?: number;
  /** 一个模块装多少个任务（与上一条一起决定模块数） */
  tasksPerModule?: number;
}

/**
 * 分组：240 条扁平任务 + 两级分组；树形：同一批任务嵌成三层（5 阶段 × 8 模块 × 240 任务
 * = 285 行）；扁平：不分组不嵌套。
 *
 * `scale` 让同一份生成器覆盖两种用途：企业版文档页要的是「看得清结构」的小数据量，
 * 经典案例要的是「三千行只渲染一屏」（传 `{ leavesPerPhase: 600, tasksPerModule: 100 }`
 * 得到 3035 行）。两边共用一份数据模型，不再各写一套。
 */
export function ganttData(shape: GanttShape, scale: GanttScale = {}): Task[] {
  const { leavesPerPhase = 48, tasksPerModule = 6 } = scale;
  return shape.tree
    ? makeGanttTree(leavesPerPhase, tasksPerModule)
    : makeGanttRows(leavesPerPhase, tasksPerModule);
}

/** 两种形态共用的那几列（状态 / 开始 / 结束 / 进度都绑在甘特读的字段上） */
function dataColumns(deps: GanttDemoDeps): VirtTableColumn<Task>[] {
  return [
    /*
     * 负责人：核心的 `VtPerson`（头像 + 名字），与核心那个 WBS 案例同一套列。
     * 甘特不读它 —— 它在这里是为了让任务面板**真的有几列要横滚**（面板自己能横滚，
     * 这是双 pane 的性质，列少了就看不出来）。
     */
    VtPerson<Task>({
      key: 'owner',
      title: '负责人',
      width: 116,
      options: OWNER_OPTIONS,
      onChange: () => deps.refresh(),
    }),
    VtSelect<Task>({
      key: 'status',
      title: '状态',
      width: 104,
      options: STATUS_OPTIONS,
      display: 'tag',
      // 改状态 → 条的颜色跟着变（barColor 按同一个字段取色）
      onChange: () => deps.refresh(),
    }),
    /*
     * 优先级：**第二个**单选列。配置面板里「颜色显示 → 跟随字段颜色」可以从状态换到它，
     * 一眼看出「按不同维度上色」得到的是两张完全不同的图。
     */
    VtSelect<Task>({
      key: 'priority',
      title: '优先级',
      width: 86,
      options: PRIORITY_OPTIONS,
      display: 'tag',
      onChange: () => deps.refresh(),
    }),
    /*
     * 开始 / 结束绑在**甘特读的同一对字段**上。`VtDatePicker` 存的就是 `'YYYY-MM-DD'`，
     * 与数据格式一致，所以两边天然是同一份数据：
     *
     *   改单元格 → 组件写回 row.start → onChange → refreshGantt() → 条移动
     *   拖条     → vtGantt 的 onChange → 我们写回 row.start → 单元格文字变
     *
     * `refreshGantt()` 里带了 `forceUpdate()`，所以两个方向都会立刻刷新对面。
     * 之所以还要显式调它：核心目前没有 `onCellEdit`（见 AGENTS.md 的已知缺口），
     * 插件收不到「某格被改了」的通知，而汇总条有一张按行 key 的记忆表要作废。
     */
    VtDatePicker<Task>({
      key: 'start',
      title: '开始',
      width: 118,
      // 给「× 清空」：清掉日期 → 这一行回到未排期，条消失，可以重新点出来
      clearable: true,
      onChange: () => deps.refresh(),
    }),
    VtDatePicker<Task>({
      key: 'end',
      title: '结束',
      width: 118,
      clearable: true,
      onChange: () => deps.refresh(),
    }),
    /*
     * **实际**起止。甘特默认读的是「计划」那一对，但配置面板里的「开始日期 / 结束日期」
     * 两个下拉能换到这一对 —— 换完条会整体右移一天（实际比计划晚一天开工），
     * 未开工的行则整条消失（它们的实际日期是空的）。这正是那个配置项要给人看的东西。
     */
    VtDatePicker<Task>({
      key: 'actualStart',
      title: '实际开始',
      width: 118,
      clearable: true,
      onChange: () => deps.refresh(),
    }),
    VtDatePicker<Task>({
      key: 'actualEnd',
      title: '实际结束',
      width: 118,
      clearable: true,
      onChange: () => deps.refresh(),
    }),
    /*
     * 进度列：甘特的 `progress` 读的就是这一列的字段。数据存 0..100，`VtProgress` 默认
     * `max: 100` 直接对上，而插件对「> 1」自动按百分数理解。`editable: true` 之后
     * 编辑态是个滑块，两个方向都通。
     */
    VtProgress<Task>({
      key: 'progress',
      title: '进度',
      width: 132,
      editable: true,
      onChange: () => deps.refresh(),
    }),
    /*
     * 工时（人日）：**第二个数值列**。配置面板里「进度显示」的列选择因此有两个选项 ——
     * 换到工时上会看到进度段按「1..12」被当成百分数（插件对 > 1 的值按百分数理解），
     * 那不是 bug 而是这个配置项的真实后果：选错列就是这个样子。
     */
    VtNumberInput<Task>({
      key: 'workload',
      title: '工时(人日)',
      width: 104,
      min: 0,
      align: 'right',
      onChange: () => deps.refresh(),
    }),
  ];
}

/**
 * 一次给出这个 demo 的整套表格配置。
 *
 * `list` 由这里创建并被闭包持有 —— 拖条写回时要按 rowKey 找回那一行（`findTask`），
 * 各端不必再自己维护一份引用。
 */
export function ganttTableConfig(deps: GanttDemoDeps): GanttTableConfig {
  const { shape, vtGantt } = deps;
  const list = ganttData(shape, deps.scale);

  return {
    list,
    fixedSize: !shape.group,
    // 分组形态：层级由视图聚合出来，数据是平的
    groupConfig: shape.group ? [{ field: 'phase' }, { field: 'module' }] : undefined,
    columns: [
      /*
       * 拖拽手柄列（`type: 'drag'`，核心渲染手柄本体）+ 核心的 `vtRowDrag` 插件 =
       * 左侧表格的行拖拽排序。它与甘特条上的纵向拖是**两个入口、一件事**：
       *
       * - 手柄这条走核心的 `moveRowTo()`，**树形与分组下也能拖**（落点能落到某个父节点下、
       *   或某个分组里，核心会顺带改分组字段）；
       * - 条上纵向拖走甘特自己的 `editable.reorder`，只在扁平形态下可用
       *   （核心 `canReorderRows()` 的限制）。
       *
       * 两者不打架：它们在**两个不重叠的区域**上听手势 —— 甘特那条只在时间轴 pane 的条上
       * （还额外排除了 `.vt-drag-handle`，见 reorder.ts 的 IGNORE_SELECTOR），
       * `vtRowDrag` 那条在左表的表体里（本 demo 开了 `wholeRow`，整行都能起拖）。
       */
      { key: '_drag', title: '', width: 34, type: 'drag' as const },
      /*
       * 任务列：**不写 `fixed`** —— 冻结哪几列由甘特插件归一（开头的功能列 + 第一个数据列，
       * 见 `freezeFirstColumn`）：手柄与任务名留在原处，后面的列随面板横滚。
       *
       * 用核心的 `VtInput` 而不是裸列：任务名要能改。它只给 `renderEditor`（不接管展示），
       * 所以展示路径与裸列完全一样 —— 树形箭头、缩进、tooltip 都不受影响。
       */
      VtInput<Task>({
        key: 'name',
        title: '任务',
        width: 240,
          /*
         * `textOverflow` 不是装饰，是**行高不变量**的一部分：任务名一换行，行就从 40px
         * 变成 61px（21×2 + 9×2 + 1），而 `fixedSize: true` 按 estimatedSize=40 建滚动模型
         * —— 模型比实际矮 21px/行，十万行量级下会滚不到底（核心 AGENTS.md §7.11）。
         * 实测踩过：分组形态下名字没有树形那层 `.vt-tree-row` 包裹，直接换行了。
         */
        textOverflow: 'tooltip',
        // 只有树形形态需要展开箭头；分组行的折叠由核心的分组行自己管
        ...(shape.tree ? { type: 'tree' as const } : {}),
        // 改名 → 条上的标签跟着变（barLabel 读的就是这个字段）
        onChange: () => deps.refresh(),
      }),
      ...dataColumns(deps),
    ],
    plugins: [
      // 核心免费插件：状态列的下拉浮层与日期选择器要它
      vtCellEditor(),
      /*
       * 工具栏（核心免费插件）。它**一颗按钮都不自带** —— 只提供摆放，谁有按钮谁来注册：
       * 下面那四个面板插件、行高、以及甘特自己的「甘特图配置」（它注册到**右侧**）。
       * 两边是 `provide`/`inject` 握手，所以写在 `vtGantt` 前面还是后面都成立。
       *
       * 按钮条会挂进甘特外壳顶部那条槽（甘特 `provide('toolbarSlot')` 把它交出去），
       * 于是横跨任务面板与时间轴，而不是只盖住左表。
       */
      vtToolbar<Task>(),
      /*
       * 四个「改表格看什么」的面板。这里展开写而不用 `vtToolbarPanels()` 那个一行预设 ——
       * 因为字段配置要带一条只有甘特知道的约束：**任务列是甘特的冻结列**，而冻结列是按
       * 含隐藏列的列序挑的，把它藏掉会让冻结落在一个隐藏列上、可见的第一列反而随面板横滚
       * 跑掉。核心不认识这条规则，所以由知道原因的一方传进去。
       */
      vtFieldConfig<Task>({
        canToggleColumn: (col) =>
          col.key === 'name' ? '任务列是甘特的冻结列，不能隐藏' : true,
      }),
      vtFilterConfig<Task>(),
      vtGroupConfig<Task>(),
      vtSortConfig<Task>(),
      /*
       * 行高设置（核心免费插件）：工具栏上多一颗「行高」，低 / 中 / 高三档。
       *
       * **它只在 `fixedSize: true` 下开放** —— 而这个 demo 的分组形态刻意是不定高的
       * （分组行比数据行高，见上面 `fixedSize: !shape.group`），那时面板会直说
       * 「表格未开 fixedSize，行高由内容决定」而不是给三档点了没反应的按钮。
       *
       * 甘特这边不用做别的：切档会派发核心的 `onRowHeightChanged`，插件在那里重解一次表头
       * 内边距（三档的字号不同，不重解左表表头会比时间轴表头矮 2px），条的摆位则跟着
       * `onRendered` 走 —— 它们本来就是照行的实测矩形画的。
       */
      vtRowHeightConfig(),
      /*
       * 行拖拽排序（核心免费插件）。手柄由 `type: 'drag'` 列渲染，这里只装手势。
       * 二期核心把它升级成了 `moveRowTo()`：**树形 / 分组下也能拖**，落点会顺带改分组字段。
       *
       * `wholeRow: true` = **表体任意位置都能起拖**，不必非得抓住那个手柄图标。手柄仍然留着：
       * 它是「这一行可以拖」的可见提示，而且触屏上只有它能拖（表体的单指手势归滚动）。
       *
       * 整行起拖会避开输入框、按钮、链接这类交互内容；状态 / 负责人那种标签格子照旧能拖 ——
       * 它们靠 `click` 打开浮层，与「按住拖」不冲突。
       */
      vtRowDrag<Task>({ wholeRow: true }),
      vtGantt({
        /*
         * 把「甘特图配置」注册进工具栏（右侧那颗）：条按哪一列上色、进度读哪一列、
         * 工期算不算周末，都能在界面上换。候选列是从**数据**推断的（单选列 = 取值 2~12 种；
         * 进度列 = 数值列）—— 核心的列对象不带候选项定义。
         *
         * 面板本身由核心的工具栏托管（`ctx.ui` 那套基元），所以它与左边四颗是同一副脸。
         */
        toolbar: true,
        start: 'start',
        end: 'end',
        progress: 'progress',
        /*
         * 假期表（示例数据，不是官方调休安排）。给了它，配置面板里「跳过法定节假日」
         * 那一行才可用 —— 没给的话它会置灰并说明「差的是 holidays 这份数据」。
         */
        holidays: makeGanttHolidays(),
        // 使用方的日历判定（法定节假日 + 补班日）。不给就只按周末算
        ...(deps.isNonWorking ? { isNonWorking: deps.isNonWorking } : {}),
        // 面板初始宽度：不给就用插件默认（由它按内容挑）
        ...(deps.panelWidth != null ? { panelWidth: deps.panelWidth } : {}),
        zoom: deps.zoom,
        markers: deps.markers,
        /*
         * `reorder` 只在扁平档真的能用（核心 canReorderRows() 的限制），但这里**一直开着**：
         * 切到分组 / 树形时它拖不动并 warn 一次，那正是要看的现象。
         */
        editable: {
          move: true,
          resize: true,
          progress: true,
          create: true,
          marker: true,
          reorder: true,
        },
        // 时间轴范围变了（首帧 / 换粒度 / 按数据自动扩展）→ 信息行跟着刷
        onRangeChange: () => deps.onInfo(),
        onZoomChange: (next) => {
          deps.onZoom(next);
          deps.onInfo();
          deps.setStatus(`粒度已切到「${next}」`);
        },
        /*
         * 条上的标题给**字段名**而不是 `(row) => row.name`。
         *
         * 两种写法画出来一样，但字段名那种配置面板能回显、也能当场换成别的列
         * （「标题展示」那一行）；函数没有名字，面板只能显示「不显示」，而条上明明有字。
         *
         * 也**不按有没有子节点分叉**：树形父节点画的是它自己的条，和叶子一模一样，
         * 凭什么没有名字。分组行不必排除 —— 它是核心合成的（`_groupName` / `_groupCount`），
         * 身上根本没有 `name` 字段。
         */
        barLabel: 'name',
        /*
         * 条的配色直接搬状态列的候选项：条底 = 胶囊底色（主色 14% 浅调），
         * 进度段 = 胶囊文字色（实色）。于是左边那一列与时间轴是同一套颜色的两个面。
         */
        barColor: {
          field: 'status',
          colors: Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.color])),
        },
        onChange: (e) => {
          /*
           * 插件**不写回**行数据（行数据是使用方的）。这几行就是使用方该做的事。
           * 少了它，条会弹回原位 —— 那是对的，界面必须与数据一致。
           */
          const task = findTask(list, e.rowKey);
          if (!task) return;
          task.start = toISODate(e.start);
          task.end = toISODate(e.end);
          /*
           * **换单位**：插件对外一律用 `0..1`（它把 `> 1` 的值识别成百分数后归一），
           * 而这份数据存的是 `0..100`。直接写回等于把进度除以 100 —— 拖一下条，
           * 90% 的任务就变成 1%（实测撞到过）。单位换算是使用方的边界责任。
           */
          task.progress = Math.round(e.progress * 100);
          deps.refresh();
          deps.setStatus(
            `${task.name}：${task.start} → ${task.end}` +
              `（${e.kind}，进度 ${Math.round(e.progress * 100)}%）`,
          );
        },
        onCreate: (e) => {
          const task = findTask(list, e.rowKey);
          if (!task) return;
          task.start = toISODate(e.start);
          task.end = toISODate(e.end);
          deps.refresh();
          deps.setStatus(`已为「${task.name}」排期：${task.start} → ${task.end}`);
        },
        onMarkerCreate: (m) => {
          deps.setStatus(`已新增里程碑：${m.label || '（未命名）'} @ ${toISODate(Number(m.date))}`);
          deps.onInfo();
        },
        /*
         * 新建 / 改名 / 改色 / 删除都走这一个回调，给的是变更后的完整列表 ——
         * 标记是插件自己的状态，这里只负责持久化（demo 里就更新一下信息行）。
         */
        onMarkersChange: (list2) => {
          deps.setStatus(`里程碑共 ${list2.length} 条`);
          deps.onInfo();
        },
        onBarClick: (_key, row) => {
          const label = STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status;
          deps.setStatus(`${row.name} · ${row.owner} · ${label}`);
        },
      }),
    ],
  };
}

/** 信息行（形态 / 里程碑数 / 粒度 / 桶列数 / 时间范围 / 能不能换序）需要的表格侧读数 */
export interface GanttInfoInput {
  shape: GanttShape;
  zoom: GanttZoom;
  data: Task[];
  range: { start: number; end: number } | null;
  markerCount: number;
  bucketCount: number;
  canReorder: boolean;
}

/**
 * 信息行文本。
 *
 * 形态后面跟一句「能不能拖拽换序」：核心 `canReorderRows()` 在分组 / 树形下是 false，
 * 这件事只在控制台 warn 一次太容易被忽略（实测就被当成「功能没做」了），
 * 所以摆到一直可见的信息行上。
 *
 * 刻意**不显示**条形池大小：它每帧都在变，而这里只在点按钮时重算，显示出来就是个一直在
 * 骗人的数字。要看池的回收行为请开 devtools 数 `.vtp-gantt-bar`。
 */
export function ganttInfoText(input: GanttInfoInput): string {
  if (!input.range) return '时间轴未就绪';
  const { group, tree } = input.shape;
  const rows = tree ? countRows(input.data) : input.data.length;
  const shape =
    group && tree
      ? `分组（阶段 → 模块）+ 树形（3 层）· ${rows} 行`
      : group
        ? `分组（阶段 → 模块）· ${rows} 条扁平任务`
        : tree
          ? `树形（3 层）· ${rows} 行`
          : `扁平 · ${rows} 条任务`;
  const reorderHint = input.canReorder
    ? '✅ 可换序：按住甘特条上下拖（左右拖仍是改期），或在任务列上按住整行上下拖'
    : '🚫 此形态下条上纵向拖不换序（分组 / 树形下核心 canReorderRows() 为 false）—— 左侧的拖拽手柄照样能拖';
  return (
    `${shape} · ${input.markerCount} 个里程碑 · 粒度 ${input.zoom} · ` +
    `${input.bucketCount} 个时间桶 · ${toISODate(input.range.start)} ~ ${toISODate(input.range.end)}\n` +
    reorderHint
  );
}

/** 首屏那句提示，三端一致 */
export const GANTT_INTRO =
  '五期 WBS（需求→改造→迁移→联调→灰度），十列：任务/负责人/状态/优先级/计划起止/实际起止/进度/工时。' +
  '默认「扁平」形态：按住甘特条上下拖 = 换序（落点有一条跨全宽的提示线），左右拖 = 改期；' +
  '左侧任务列上按住整行上下拖也能换序。左右两侧各自横滚（任务列多了直接滚左侧，不必加宽），' +
  '两侧交界处 hover 出蓝线可拖着调宽，列头右缘可拖列宽。' +
  '点顶部「甘特图配置」：开始/结束日期可从「计划」换到「实际」、标题换成别的列、' +
  '颜色按状态或优先级上色（也能指定单色）、进度换成工时、以及「仅计算工作日 / 跳过法定节假日」' +
  '（条内右端那个「n 天」跟着变，不计入的日子画斜线）。' +
  '点左侧「2026年8月」格左边的箭头可收起任务列。' +
  '开「分组 / 树形」后核心不允许重排（视图顺序 ≠ 原始数据顺序），拖不动是设计';

/**
 * 「导入 2026 年中国法定节假日」这颗按钮背后的那三步，三端共用一份。
 *
 * 三件事一起做，缺一件都会给出错的工期：
 *
 * 1. `setGanttHolidays()` —— 放假的 33 天（含调休连休）；
 * 2. `setGanttNonWorking()` —— **补班日**（2/14、2/28、5/9、9/20、10/10 这几个周末要上班），
 *    少了它这几天会被当成周末扣掉；
 * 3. `setGanttSkipHolidays(true)` + `setGanttWorkdaysOnly(true)` —— 两个开关都打开，
 *    否则导进去的表不参与计算，界面上什么都不变（那看起来就像按钮没生效）。
 *
 * 最后跳到**最近的那个假期**：demo 的数据贴着「今天」，而 2026 年的假期散在全年 ——
 * 不跳的话导入完屏幕上一格斜线都看不见。
 */
/**
 * 导入节假日要用到的那几个甘特实例方法。
 *
 * **成员一律可选**：桩档（没装付费包）下它们在运行时确实不存在，桩的类型声明也是可选的 ——
 * 写成必选的话表格实例根本赋不进这个类型。调用处相应地用 `?.`。
 */
export interface GanttHolidayApi {
  setGanttHolidays?(list: unknown): void;
  setGanttNonWorking?(fn: ((d: Date) => boolean) | null): void;
  setGanttSkipHolidays?(on: boolean): void;
  setGanttWorkdaysOnly?(on: boolean): void;
  setGanttRange?(start: unknown, end: unknown): void;
  scrollGanttTo?(date: unknown): void;
}

/** 导入真实的 2026 年安排，返回状态栏文案 */
export function importCnHolidays(api: GanttHolidayApi): string {
  api.setGanttHolidays?.(CN_2026_HOLIDAYS);
  api.setGanttNonWorking?.(cnIsNonWorking);
  api.setGanttWorkdaysOnly?.(true);
  api.setGanttSkipHolidays?.(true);
  /*
   * **把时间轴拉宽到覆盖那个假期**，否则看不见：demo 的任务都贴着「今天」，推断出来的范围
   * 只有今天前后三周，而 2026 年的假期散在全年 —— 第一版就是这样，导入完屏幕上一格斜线
   * 都没有，看起来像按钮没生效（`scrollGanttTo` 也只能滚到范围的右边缘）。
   */
  const jump = nextCnHoliday();
  const from = new Date();
  from.setDate(from.getDate() - 21);
  const to = new Date(`${jump}T00:00:00`);
  to.setDate(to.getDate() + 14);
  api.setGanttRange?.(iso(from), iso(to));
  api.scrollGanttTo?.(jump);
  return (
    `已导入 2026 年放假安排：${CN_2026_HOLIDAYS.length} 个放假日 + ` +
    `${CN_2026_WORKDAYS.length} 个补班日（国办发明电〔2025〕7 号）。` +
    `时间轴已拉到 ${jump} 那个假期（否则它在推断范围之外看不见）——` +
    `斜线那几天不计入条上的「n 天」，补班的周六照常计入；hover 表头的日期看假期名字`
  );
}

/** 换回贴着「今天」的示例假期（默认那份），返回状态栏文案 */
export function restoreDemoHolidays(api: GanttHolidayApi): string {
  api.setGanttHolidays?.(makeGanttHolidays());
  // 补班表也要撤掉：那是 2026 年专有的，换回示例数据后按默认「周六周日」处理
  api.setGanttNonWorking?.(null);
  // 范围也交回给「按数据推断」（导入时把它拉宽了）
  api.setGanttRange?.(null, null);
  return '已换回示例假期（贴着今天，方便直接看斜线效果）。补班表已撤销、时间轴范围交回自动推断';
}

/** `YYYY-MM-DD`（`importCnHolidays` 拉范围时用） */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}
