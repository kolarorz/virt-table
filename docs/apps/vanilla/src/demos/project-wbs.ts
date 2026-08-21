import { VirtTable } from '@virt-table/vanilla';
import { vtGantt } from '@virt-table-pro/gantt';
import '@virt-table-pro/gantt/index.css';
import '@virt-table-pro/license/index.css';
import { setLicenseKey } from '@virt-table-pro/license';
import { applyProDemoLicense } from '../../../pro-kit/demo-license';
import { STATUS_OPTIONS, makeGanttMarkers, type Task } from '../../../pro-kit/shared/gantt-data';
import { CN_2026_HOLIDAYS } from '../../../pro-kit/shared/cn-holidays-2026';
import {
  countBuckets,
  ganttTableConfig,
  importCnHolidays,
  restoreDemoHolidays,
} from '../../../pro-kit/shared/gantt-demo';

/**
 * 经典案例 · 项目管理 WBS。
 *
 * ## 它与「企业版 · 甘特图」是**同一个 demo**
 *
 * 表格配置（列、插件、甘特选项、数据、假期、里程碑）全在
 * `pro-kit/shared/gantt-demo.ts` 一份里，企业版那 5 个甘特文档页嵌的也是这个示例
 * （`example-id="demo-project-wbs"`）。
 *
 * 原来是两套：这里 829 行自带一份数据生成器 + 列定义 + 假期表，那边 529 行又是一份。
 * 两份都在演示同一个插件，改一处漏一处 —— 尤其是列定义，配置面板的候选项是从
 * **列 + 数据**推断的，两边的列不一样就意味着两边的配置面板也不一样。
 *
 * 本文件因此只剩「这个案例特有的那层壳」：
 *   - 顶部那排按钮（层级、今天、工作日口径、收起面板、导出）
 *   - 统计条（这个案例的主角之一：3035 行时 DOM 里常驻多少行）
 *   - 条色跟随明暗主题
 *
 * ## 规模
 *
 * `scale` 传 `600 / 100` —— 5 阶段 × 6 模块 × 100 任务 = 3000 叶子 + 30 模块 + 5 阶段
 * = **3035 行**。这个数字写在案例文档页上，它要展示的正是「三千行只渲染一屏」。
 * 企业版文档页用默认档（约 285 行，看得清结构）。
 */

/** 面板宽度档位：让「开始」那一列刚好落在面板内，后面的列靠面板自己横滚 */
const PANEL_STOPS = [604, 468, 376, 264];

function pickPanelWidth(containerW: number): number {
  // 容器越窄取越小的档，最窄那档保证任务名列还看得见
  if (containerW >= 1180) return PANEL_STOPS[0]!;
  if (containerW >= 980) return PANEL_STOPS[1]!;
  if (containerW >= 760) return PANEL_STOPS[2]!;
  return PANEL_STOPS[3]!;
}

/**
 * 把 `var(--x)` 解析成当前主题下的实际颜色。
 *
 * 状态列的候选项配色用的是核心的设计令牌，而 `barColor` 要的是**颜色值** ——
 * 令牌在明暗两套下是两个值，所以主题一变就得重新解析一遍（见下面那个 MutationObserver）。
 */
function resolveColor(scope: Element, value: string): string {
  const name = /^var\(\s*(--[^,)\s]+)/.exec(value)?.[1];
  if (!name) return value;
  return getComputedStyle(scope).getPropertyValue(name).trim() || value;
}

const statusColorMap = (scope: Element | null): Record<string, string> =>
  Object.fromEntries(
    STATUS_OPTIONS.map((o) => [
      String(o.value),
      scope ? resolveColor(scope, String(o.color)) : String(o.color),
    ]),
  );

/** 按树深度数一遍：0 阶段 / 1 模块 / 2 任务 */
function countTree(rows: Task[]): { phases: number; modules: number; leaves: number; unscheduled: number } {
  let phases = 0;
  let modules = 0;
  let leaves = 0;
  let unscheduled = 0;
  const walk = (list: Task[], depth: number): void => {
    for (const r of list) {
      if (depth === 0) phases += 1;
      else if (depth === 1) modules += 1;
      else {
        leaves += 1;
        if (r.start == null) unscheduled += 1;
      }
      if (r.children) walk(r.children, depth + 1);
    }
  };
  walk(rows, 0);
  return { phases, modules, leaves, unscheduled };
}

export function bootstrapDemoProjectWbs(root: HTMLElement): () => void {
  // 授权：整个应用设一次（域名绑定的演示密钥，见 docs/apps/pro-kit/demo-license.ts）
  applyProDemoLicense(setLicenseKey);

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn" id="collapse">只看阶段</button>
      <button class="virt-table-btn" id="expand">展开到任务</button>
      <button class="virt-table-btn" id="today">回到今天</button>
      <button class="virt-table-btn" id="workdays">按工作日算工期</button>
      <button class="virt-table-btn" id="panel">收起任务表</button>
      <button class="virt-table-btn" id="excel">导出 Excel</button>
      <span class="demo-note">顶部「甘特图配置」换日期列/颜色/进度列 · 拖条改期 · 拖两端改工期 · 拖进度手柄 · 空行上点一下排期 · 表头日期上点一下加里程碑 · 双击单元格编辑 · 手柄拖行调序</span>
    </div>
    <div id="stats" class="status-text"></div>
    <div id="status" class="status-text"></div>
    <!-- 高度走 --demo-stage-h：桌面 700px，窄屏由 .demo-stage 收到一屏内（见 style.css） -->
    <div style="--demo-stage-h:700px;" class="demo-container demo-stage" id="c"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const statsEl = root.querySelector('#stats') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;
  const setStatus = (t: string) => {
    statusEl.textContent = t;
  };

  /*
   * 建表前 `table` 还不存在，而列的 `onChange` 与插件回调都要用它 —— 用一个惰性闭包接住。
   * `ready` 不是洁癖：`onRangeChange` 是**微任务**送达的（插件刻意异步），首帧那一次
   * 可能赶在 `const table = …` 赋值之前。
   */
  let ready = false;
  const markers = makeGanttMarkers();

  const tBuild = performance.now();
  const config = ganttTableConfig({
    // pro-kit 里不能引付费包的运行时值，由这一端注入（见那个文件的头注）
    vtGantt,
    // 这个案例固定三层树：它是「一份可以对着需求抄的完整应用」，不是形态切换的功能矩阵
    shape: { group: false, tree: true },
    // 3035 行 —— 案例文档页上那个数字
    scale: { leavesPerPhase: 600, tasksPerModule: 100 },
    /*
     * 默认**日**粒度。
     *
     * 这也是插件自己的默认值（`zoom` 的 default 是 `'day'`），显式写出来是因为它对这个
     * 案例是有意的选择：非工作日底纹与条内右端那个「n 天」的斜线**只在日视图有意义**
     * （周 / 月 / 季桶里「半个周末」不是一个可表达的东西），而工作日口径正是这个案例
     * 要展示的重点之一。右上角的切换器随时能换到周 / 月 / 季。
     */
    zoom: 'day',
    markers,
    panelWidth: pickPanelWidth(container.clientWidth),
    refresh: () => {
      if (ready) table.refreshGantt?.();
    },
    setStatus,
    onZoom: () => renderStats(),
    onInfo: () => renderStats(),
  });
  const buildMs = Math.round(performance.now() - tBuild);
  let mountMs = 0;

  const counts = countTree(config.list);
  const total = counts.phases + counts.modules + counts.leaves;
  const n = (v: number) => v.toLocaleString('en-US');

  const renderStats = () => {
    if (!ready) return;
    const trs = container.querySelectorAll('.vt-tbody > tr.vt-tr').length;
    const tds = container.querySelectorAll('.vt-tbody > tr.vt-tr > td').length;
    // 桶数要**数 pane 表头里的格子**：时间轴在插件自己的 pane 里，`getVisibleColumns()` 里没有它
    const buckets = countBuckets(container);
    const range = table.getGanttRange?.();
    const day = (ts: number) => new Date(ts).toLocaleDateString('sv-SE');
    const text =
      `${counts.phases} 期 · ${n(counts.leaves)} 个任务 + ${counts.modules} 个工作包` +
      `（其中 ${counts.unscheduled} 条待排期）· 里程碑 ${table.getGanttMarkers?.().length ?? 0} · ` +
      `造数 ${buildMs}ms + 建表 ${mountMs}ms · DOM 里常驻 ${trs} 行 / ${n(tds)} 格 · ` +
      `粒度 ${table.getGanttZoom?.() ?? '-'} · 时间桶 ${buckets}` +
      (range ? ` · ${day(range.start)} ~ ${day(range.end)}` : '');
    // 每帧都会被调（下面那个 onRendered 插件）—— 数字没变就不碰 DOM
    if (text !== statsEl.textContent) statsEl.textContent = text;
  };

  const tMount = performance.now();
  const table = new VirtTable<Task>(container, {
    list: config.list,
    columns: config.columns,
    itemKey: 'id',
    estimatedSize: 40,
    fixedSize: config.fixedSize,
    buffer: 4,
    colBuffer: 2,
    border: true,
    // 首屏展开到**模块**（下面逐个展开阶段做到）：全展开 3035 行一屏全是叶子看不出结构，
    // 全收起只有 5 行阶段又太空
    defaultExpandAll: false,
    plugins: [
      ...config.plugins,
      /*
       * 统计条里「DOM 里常驻多少行 / 多少格」**每次渲染后**重数一遍。
       *
       * 只在建表后数一次是不行的：那会儿虚拟列表还没铺完一屏（只有几行），数出来是 6 行 ——
       * 而那个数字正是这个案例要给人看的东西，不能是假的。`onRendered` 每帧都来，所以
       * `renderStats()` 里加了「文本没变就不碰 DOM」那一句。
       *
       * 顺带说明「插件」在核心里就是这么一个对象：一个名字 + 一个 `setup`。
       */
      { name: 'wbsStats', setup: (ctx) => ctx.on('onRendered', () => renderStats()) },
    ],
  });
  mountMs = Math.round(performance.now() - tMount);
  ready = true;

  /*
   * 条色跟随明暗主题。
   *
   * 状态列的候选项配色是核心的设计令牌（`var(--vt-...)`），而 `barColor` 要的是颜色值。
   * 文档站切暗色时那些令牌换了一套值，条的颜色得跟着换 —— 否则暗色下条还是亮色那五个色。
   */
  const applyBarColors = (): void => {
    table.setGanttBarColor?.({
      field: 'status',
      colors: statusColorMap(container.querySelector('.vt-root')),
    });
  };
  applyBarColors();
  const themeObserver = new MutationObserver(applyBarColors);
  themeObserver.observe(document.documentElement, { attributeFilter: ['class', 'data-theme'] });

  /*
   * 首屏展开到模块：5 期各展一层 = 35 行（阶段 + 模块），一眼看得出 WBS 的形状。
   *
   * ⚠️ 树形的折叠开关是 **`toggleFold`**，不是 `toggleExpand` —— 后者管的是「展开行」
   * （`type: 'expand'` 那种额外行）。名字很像，调错了没有任何报错，只是一行都不展开。
   */
  for (const phase of config.list) table.toggleFold(phase.id);

  const listeners: (() => void)[] = [];
  const on = (id: string, handler: () => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('collapse', () => {
    table.collapseAll();
    renderStats();
    setStatus(`只看阶段：${counts.phases} 行父级工作包，条画的是各阶段自己的计划窗口`);
  });
  on('expand', () => {
    table.expandAll();
    renderStats();
    setStatus(`展开到任务：${n(total)} 行 —— DOM 里仍然只有一屏（看上面那条统计）`);
  });
  on('today', () => {
    table.scrollGanttTo?.(new Date());
    setStatus('回到今天：蓝色竖线 + 表头日期上的蓝色圆底就是今天');
  });

  /*
   * 「按工作日算工期」：装法定节假日 + 补班判定。
   *
   * 两件都由共享层的 `importCnHolidays()` 做（它还会把时间轴范围拉宽到覆盖那个假期 ——
   * 不拉宽的话导入完屏幕上一格斜线都没有，看起来像按钮没生效）。
   *
   * **这里不碰粒度**：默认已经是日视图（斜线只在日粒度画）。进来时兜一次 `setGanttZoom('day')`
   * 是为了「用户先切到月视图再点这颗按钮」也对；退出时**刻意不切回去** —— 粒度是用户
   * 用右上角切换器表达的意图，一个「换工期口径」的按钮没有理由替他改视图。
   *
   * 配置面板里那两行开关走的是同一份状态，所以点完这颗按钮，面板里的勾也是勾上的。
   */
  const workdaysBtn = root.querySelector('#workdays') as HTMLButtonElement;
  let workdaysOnly = false;
  on('workdays', () => {
    workdaysOnly = !workdaysOnly;
    if (workdaysOnly) {
      // 已经在日视图时这是空操作；用户切走过才起作用
      table.setGanttZoom?.('day');
      setStatus(importCnHolidays(table));
    } else {
      table.setGanttWorkdaysOnly?.(false);
      table.setGanttSkipHolidays?.(false);
      setStatus(restoreDemoHolidays(table));
    }
    workdaysBtn.textContent = workdaysOnly ? '按自然日算工期' : '按工作日算工期';
    renderStats();
  });

  const panelBtn = root.querySelector('#panel') as HTMLButtonElement;
  on('panel', () => {
    table.toggleGanttPanel?.();
    const collapsed = table.isGanttPanelCollapsed?.() ?? false;
    panelBtn.textContent = collapsed ? '展开任务表' : '收起任务表';
    setStatus(collapsed ? '任务表已收起，时间轴铺满' : '任务表已展开');
  });
  on('excel', () => {
    table.exportExcel({ filename: '项目WBS.xls' });
    setStatus('导出的是表格那一侧（十一列全导）—— 导出走核心的 vtExport，与甘特无关');
  });

  renderStats();
  setStatus(
    '左边任务表、右边时间轴，行始终对齐；中间那条分界可以拖着调宽度，也能整块收起。' +
      '点顶部「甘特图配置」可以把开始/结束换成「实际」那一对、条按优先级上色、进度换成工时；' +
      `时间轴按时间桶虚拟化 —— 拉到 ${n(total)} 行、上百个桶，DOM 里常驻的还是一屏` +
      `（假期表用的是 ${CN_2026_HOLIDAYS.length} 个 2026 年放假日，点「按工作日算工期」装上）`,
  );

  return () => {
    themeObserver.disconnect();
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
