/**
 * 甘特 demo 的数据。刻意用**确定性**生成器并以「今天」为基准：
 *
 * - 确定性 —— 拖一条改期之后要能一眼看出「只有这条动了」，随机数据反而干扰判断；
 * - 以今天为基准 —— 「今天」标记线必须落在可视范围内，否则那条线永远看不到。
 *
 * 日期一律写成 `YYYY-MM-DD` 字符串，而不是时间戳：这是真实业务系统里最常见的形态，
 * 也顺带验证插件对纯日期串按**本地**午夜解析（按 UTC 解析会让整条左移一天）。
 */

export interface Task extends Record<string, unknown> {
  id: string;
  name: string;
  owner: string;
  /** 分组字段（`groupConfig` 用）。树形形态下不填 */
  phase?: string;
  module?: string;
  /** 计划开始 / 计划结束 —— 甘特默认读这一对 */
  start: string | null;
  end: string | null;
  /**
   * **实际**开始 / 实际结束。已开工的行才有，未开工的是 null。
   *
   * 存在的理由不是「多两列数据好看」：甘特的「开始日期 / 结束日期」是可配置的
   * （配置面板里那两个下拉），而只有一对日期列的话那两个下拉里只有一个选项，
   * 等于这个功能没法试。计划 vs 实际也正是项目管理里最常见的那对。
   */
  actualStart: string | null;
  actualEnd: string | null;
  progress: number;
  /** 状态。值是 `STATUS_OPTIONS` 里的 value，由左侧的选择列写回 */
  status: string;
  /** 优先级。第二个「单选列」—— 配置面板里「跟随字段颜色」可以挑它，看出换列上色的效果 */
  priority: string;
  /** 工时（人日）。第二个数值列，让「进度读哪一列」也有的可选 */
  workload: number;
  children?: Task[];
}

const OWNERS = ['可乐', '王雪', '张伟', '陈静', '刘洋', '赵敏', '孙宇', '周琳'];

/** `VtPerson` 列的候选项（头像走名字首字生成，不需要图片） */
export const OWNER_OPTIONS = OWNERS.map((name) => ({ value: name, label: name }));

/** 状态选择列的候选项。`color` 决定胶囊配色 */
export const STATUS_OPTIONS = [
  { value: 'doing', label: '进行中', color: '#2563eb' },
  { value: 'todo', label: '未开始', color: '#94a3b8' },
  { value: 'done', label: '已完成', color: '#10b981' },
  { value: 'risk', label: '有风险', color: '#ef4444' },
];

/**
 * 优先级选择列的候选项。
 *
 * 与状态是两个**独立**的分类维度（状态是「做到哪了」、优先级是「多重要」），
 * 所以配置面板里按这两列上色会得到完全不同的两张图 —— 那正是「颜色显示」这个配置项
 * 值得存在的理由。
 */
export const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'P0', color: '#ef4444' },
  { value: 'P1', label: 'P1', color: '#f59e0b' },
  { value: 'P2', label: 'P2', color: '#2563eb' },
  { value: 'P3', label: 'P3', color: '#94a3b8' },
];

const PRIORITIES = PRIORITY_OPTIONS.map((o) => o.value);

/**
 * 按下标循环取一个。理由与 `data.ts` 里那份相同：Vue 那个 app 继承了 `@vue/tsconfig` 的
 * `noUncheckedIndexedAccess`，下标访问会带上 `| undefined`。模运算已保证不越界。
 */
const pick = <T,>(arr: readonly T[], i: number): T => arr[i % arr.length] as T;

/**
 * 进度 → 状态。一处派生，三层共用同一套判据 —— 父级随便给一个「进行中」的话，
 * 「条的颜色取自状态列」这条图例在父级上就是假的。
 *
 * 「有风险」**不由进度决定**（进度高低与有没有风险是两件事），它按少数比例单独撒进
 * 叶子任务里，父级则在后代风险超过四分之一时才判风险 —— 一个任务卡住不等于整个
 * 工作包卡住，这也符合项目管理的常识（照抄核心 WBS 案例那条判据）。
 */
function statusOf(progress: number): string {
  if (progress >= 100) return 'done';
  if (progress <= 0) return 'todo';
  return 'doing';
}

function rollupStatus(children: Task[]): string {
  const risky = children.filter((c) => c.status === 'risk').length / children.length;
  if (risky > 0.25) return 'risk';
  const avg = children.reduce((n, c) => n + c.progress, 0) / children.length;
  return statusOf(Math.round(avg));
}

function iso(dayOffset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 模块名。取自「一个中台项目会有的那几块」而不是「模块 1 / 2 / 3」——
 * 后者在分组形态下每个阶段都出现一遍「模块 1」，看起来像数据重复了。
 * 与核心仓库那个 WBS 案例同一套命名，两边对着看时更容易认。
 */
const MODULES = ['账号中台', '交易链路', '风控引擎', '结算中心', '数据平台', '基础架构'];

/** 任务名：动词 × 名词 × 版本号，确定性地取模拼出来（不引 faker，playground 不该多一个依赖） */
const VERBS = ['重构', '接入', '联调', '压测', '梳理', '迁移', '灰度', '埋点', '对账', '扩容'];
const NOUNS = ['网关', '缓存', '索引', '消息队列', '鉴权', '配额', '账本', '拨测', '配置中心', 'SDK'];

function taskName(seed: number): string {
  const v = pick(VERBS, seed);
  const n = pick(NOUNS, seed * 3 + 1);
  return `${v}${n} v${1 + (seed % 4)}.${seed % 6}`;
}

/**
 * **三层** WBS：阶段 → 模块 → 任务。
 *
 * 前两层**都有自己的日期**，于是它们画的是**自己的条**，和叶子一模一样（可拖可拉伸），
 * 而不是一条只读的囊括线 —— WBS 里的父节点是个**工作包**，它本身就是任务，有计划工期、
 * 有负责人、有进度。这也正是插件 `summaryBars` 默认 `'group'` 的原因：囊括线留给
 * 分组行（纯分类，不可能有日期），树父节点当普通行处理。
 *
 * 父级的窗口刻意**比后代宽一天**（前后各留一天缓冲）而不是精确等于后代范围：
 * 「计划工期」与「子任务实际占用」是两件事，画成一样就看不出这个区别了。
 *
 * `leavesPerPhase` 是每个阶段的**叶子任务**数，`tasksPerModule` 是一个模块装多少个任务
 * （两者一起决定模块数：`ceil(leavesPerPhase / tasksPerModule)`）。
 *
 * 默认 4/6/4 共 20 行。经典案例「项目管理 WBS」传 `600 / 100` —— 5 阶段 × 6 模块 ×
 * 100 任务 = 3000 叶子 + 30 模块 + 5 阶段 = **3035 行**，那个数字写在案例文档页上，
 * 它要展示的正是「三千行只渲染一屏」。
 */
export function makeGanttTree(leavesPerPhase?: number, tasksPerModule = 6): Task[] {
  const big = leavesPerPhase != null && leavesPerPhase > 10;
  const TASKS_PER_MODULE = tasksPerModule;

  /*
   * `base` 是阶段的起始偏移。
   *
   * 小数据量（默认）用**串行**阶段：-12 / 2 / 22，那是真实项目的样子。
   *
   * 行数多时改成**交叠**且全部压在一屏可见的时间窗内（约 24 个日桶 ≈ today-15 ~ today+8）。
   * 这不是为了好看：串行 + 每阶段 70 项的话整棵树横跨四十多天，而一屏只看得到二十几天，
   * 于是纵向滚到列表底部时那批日期已经在可视窗右边好几天外 —— 时间轴看起来是空的，
   * 而这个 demo 存在的理由恰恰是「纵向滚动时看条」。设计/开发/测试本来也是交叠推进的。
   */
  /*
   * 五期，与核心仓库的 WBS 案例同一套阶段划分。进度基线按阶段递减（前期收尾、中期在跑、
   * 后期未启动）—— 那才是项目计划的常态，也让「按状态上色」真的出现四种颜色。
   */
  const phases = [
    { name: '1. 需求与方案', base: -14, leaves: leavesPerPhase ?? 4, progress: 100 },
    { name: '2. 平台改造', base: big ? -11 : -4, leaves: leavesPerPhase ?? 6, progress: 82 },
    { name: '3. 业务迁移', base: big ? -7 : 6, leaves: leavesPerPhase ?? 5, progress: 48 },
    { name: '4. 联调与压测', base: big ? -3 : 16, leaves: leavesPerPhase ?? 4, progress: 16 },
    { name: '5. 上线与灰度', base: big ? 1 : 26, leaves: leavesPerPhase ?? 3, progress: 0 },
  ];

  return phases.map((phase, pi) => {
    const moduleCount = Math.max(1, Math.ceil(phase.leaves / TASKS_PER_MODULE));
    const modules: Task[] = [];

    /** 阶段自己的窗口：由所有模块的窗口取并集，再各留一天缓冲（见函数注释） */
    let phaseMin = Infinity;
    let phaseMax = -Infinity;

    for (let mi = 0; mi < moduleCount; mi++) {
      const from = mi * TASKS_PER_MODULE;
      const count = Math.min(TASKS_PER_MODULE, phase.leaves - from);
      const tasks: Task[] = [];
      /** 模块自己的窗口：由已排期的子任务取并集 */
      let modMin = Infinity;
      let modMax = -Infinity;

      for (let k = 0; k < count; k++) {
        const i = from + k;
        /*
         * 每 5 条留一条**没填时间**的行 —— 真实项目里「已立项、还没排期」是常态，
         * 也正是 `editable.create` 的用武之地：在甘特里点一下就把日期点出来。
         */
        const unscheduled = i % 5 === 4;
        /*
         * 子任务多时**在阶段的时间窗内循环分布**（`i % 7`）而不是逐条往后推：
         * 一个阶段里有 70 项的时候它们本来就是**并行**推进的若干条工作，不是七十步的
         * 串行链；逐条推会让整棵树横跨太多天，滚到底部时时间轴就空了。
         */
        const offset = phase.base + (big ? i % 7 : i * 3);
        const span = 2 + (i % 3);
        /*
         * 进度按**阶段基线**给，再按阶段内序号抖一点。不按日期插值：那样算出来首屏几条
         * 都在 90% 上下，进度填充几乎铺满整条，等于看不出这个功能；也不全表一个均值 ——
         * 那样每个父级都是「进行中」，首屏十几条一个颜色，按状态上色就白配了。
         */
        const jitter = phase.progress >= 100 ? 0 : ((i * 13) % 25) - 12;
        const progress = unscheduled
          ? 0
          : Math.max(0, Math.min(100, phase.progress + jitter));
        /*
         * **实际起止**：已开工（进度 > 0）的才有。实际开始比计划晚一天、实际结束只在
         * 做完（100%）时才填 —— 项目里「已开工未完工」的行本来就只有开始日期。
         * 这一对存在的意义是让配置面板里的「开始日期 / 结束日期」真的有的可选。
         */
        const started = !unscheduled && progress > 0;
        tasks.push({
          id: `P${pi + 1}-${i + 1}`,
          name: unscheduled ? `${taskName(pi * 17 + i)}（待排期）` : taskName(pi * 17 + i),
          owner: pick(OWNERS, pi * 3 + i),
          start: unscheduled ? null : iso(offset),
          end: unscheduled ? null : iso(offset + span),
          actualStart: started ? iso(offset + 1) : null,
          actualEnd: started && progress >= 100 ? iso(offset + span + 1) : null,
          // 存 0..100 —— 业务系统里最常见的形态，也顺带验证插件对「> 1 视为百分数」的识别
          progress,
          /*
           * 状态由进度派生，**再撒少量「有风险」**（约每 17 条一条）。
           * 早先是 `STATUS[(pi + i) % 4]` 轮着来 —— 那样四种状态各占四分之一，
           * 「有风险」多到不像异常，而进度 100% 的行也可能显示「未开始」。
           */
          status: unscheduled
            ? 'todo'
            : (pi * 17 + i) % 17 === 3
              ? 'risk'
              : statusOf(progress),
          priority: pick(PRIORITIES, pi + i * 3),
          // 工时（人日）：与工期相关但不等于工期（并行投入），第二个数值列
          workload: 1 + ((i * 5) % 12),
        });
        if (!unscheduled) {
          if (offset < modMin) modMin = offset;
          if (offset + span > modMax) modMax = offset + span;
        }
      }

      // 一天缓冲；整个模块都没排期（极端小数据量下可能发生）时父级也留白
      const scheduled = Number.isFinite(modMin);
      const modStart = scheduled ? modMin - 1 : null;
      const modEnd = scheduled ? modMax + 1 : null;
      if (scheduled) {
        if (modStart! < phaseMin) phaseMin = modStart!;
        if (modEnd! > phaseMax) phaseMax = modEnd!;
      }
      const modProgress = tasks.length
        ? Math.round(tasks.reduce((n, t) => n + t.progress, 0) / tasks.length)
        : 0;

      const modStarted = tasks.filter((t) => t.actualStart != null);
      const modDone = tasks.every((t) => t.progress >= 100);
      modules.push({
        id: `P${pi + 1}-M${mi + 1}`,
        name: pick(MODULES, mi),
        owner: pick(OWNERS, pi + mi),
        // 第二层有自己的计划工期 → 画自己的条（和叶子一样，可拖可拉伸）
        start: modStart == null ? null : iso(modStart),
        end: modEnd == null ? null : iso(modEnd),
        // 工作包的「实际」也由后代汇总：有人开工了就算开工，全做完才算完工
        actualStart: modStarted[0]?.actualStart ?? null,
        actualEnd: modDone && modEnd != null ? iso(modEnd) : null,
        progress: modProgress,
        status: rollupStatus(tasks),
        priority: 'P1',
        workload: tasks.reduce((n, t) => n + (t.workload as number), 0),
        children: tasks,
      });
    }

    const phaseScheduled = Number.isFinite(phaseMin);
    const phaseProgress = modules.length
      ? Math.round(modules.reduce((n, m) => n + m.progress, 0) / modules.length)
      : 0;
    return {
      id: `P${pi + 1}`,
      name: phase.name,
      owner: pick(OWNERS, pi),
      // 顶层同样是工作包：有自己的窗口（模块窗口的并集）
      start: phaseScheduled ? iso(phaseMin) : null,
      end: phaseScheduled ? iso(phaseMax) : null,
      actualStart: modules.find((m) => m.actualStart != null)?.actualStart ?? null,
      actualEnd:
        phaseProgress >= 100 && phaseScheduled ? iso(phaseMax) : null,
      progress: phaseProgress,
      status: rollupStatus(modules),
      priority: 'P0',
      workload: modules.reduce((n, m) => n + (m.workload as number), 0),
      children: modules,
    };
  });
}

/**
 * **扁平**任务列表，带 `phase` / `module` 两个分组字段。
 *
 * 这是甘特更常见的数据形态：任务本身是平的，层级是**视图**上的分组
 * （`groupConfig: [{ field: 'phase' }, { field: 'module' }]`），而不是数据里的嵌套。
 * 与树形的区别在语义：分组行是纯分类、不可能有自己的日期；树形的父节点是个
 * 有语义的工作包，可以有自己的计划工期。
 */
export function makeGanttRows(leavesPerPhase = 48, tasksPerModule = 6): Task[] {
  return makeGanttTree(leavesPerPhase, tasksPerModule).flatMap((phase) =>
    (phase.children ?? []).flatMap((mod) =>
      (mod.children ?? []).map(({ children: _drop, ...task }) => ({
        ...task,
        phase: phase.name,
        module: mod.name,
      })),
    ),
  );
}

/**
 * **示例**假期表。
 *
 * ⚠️ 这不是官方发布的调休安排 —— 中国的法定节假日与调休每年由国务院单独发布，
 * 插件与 demo 都不该内置一份会过期的错数据（`vtGantt` 因此把 `holidays` 做成入参）。
 * 这里按「今天」相对生成三段假期，只为让 demo 里的开关有东西可跳。
 *
 * 真实项目从自己的日历服务取，形状就是这个：`string | { date, label }`。
 */
export function makeGanttHolidays(): Array<{ date: string; label: string }> {
  return [
    { date: iso(-9), label: '示例假期 · 中秋' },
    { date: iso(-8), label: '示例假期 · 中秋' },
    { date: iso(2), label: '示例假期 · 国庆' },
    { date: iso(3), label: '示例假期 · 国庆' },
    { date: iso(4), label: '示例假期 · 国庆' },
  ];
}

/**
 * 里程碑标记：贯穿所有行的竖线，与行数据无关。
 *
 * 与「行内里程碑」（零工期任务画成的菱形）是两个对象 —— 这些是项目级的注记
 * （发布日、评审会），不占行、也不该有负责人。
 */
export function makeGanttMarkers(): Array<{ date: string; label: string; color?: string }> {
  /*
   * 偏移刻意都取负数（除最后一条）：任务列占掉 576px 后可视时间窗只剩约 16 天，
   * 大致是 today-16 ~ today。正偏移的标记初始就在屏幕外，demo 里看不到。
   */
  /*
   * 颜色取自插件的预设色板（`markerColors` 的默认六色）。里程碑的颜色是**分类**用的：
   * 评审蓝、冻结橙、转测紫、发布绿 —— 不是审美选择，所以就该从一小组预设里挑。
   */
  return [
    { date: iso(-11), label: '方案评审会', color: '#2563eb' },
    { date: iso(-6), label: '需求冻结', color: '#f59e0b' },
    { date: iso(-1), label: '转测', color: '#8b5cf6' },
    { date: iso(3), label: 'v2.0 发布', color: '#10b981' },
  ];
}

/** 数一棵树有多少行（含所有层级） */
export function countRows(nodes: Task[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1;
    if (node.children) n += countRows(node.children);
  }
  return n;
}

/** 在树里按 id 找一行（拖拽落定后写回用） */
export function findTask(tree: Task[], id: string): Task | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    const hit = node.children ? findTask(node.children, id) : undefined;
    if (hit) return hit;
  }
  return undefined;
}

/** 时间戳 → `YYYY-MM-DD`，把 onChange 的值写回成数据原本的格式 */
export function toISODate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
