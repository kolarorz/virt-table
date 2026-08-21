/**
 * Demos（经典案例）的**唯一清单** —— 侧边栏（`config.ts`，Node 侧）与画廊组件
 * （`theme/components/demos/DemosGallery.vue`，浏览器侧）都从这里派生。
 *
 * 抽成单独文件是为了不重演「示例」踩过的坑：那份清单曾经在 vanilla 与框架端各存一套，
 * 结果框架端长期少了三整节。案例只会越来越多，新增一个案例应该只改一处。
 *
 * 约定：`slug` 一个字段决定三件事 —— 页面路由 `/demos/<slug>`、
 * 微应用的 demo id `demo-<slug>`（见 `docs/apps/vanilla/src/demos/index.ts`）、
 * 截图路径 `/demos/<slug>.png`（由 `scripts/shoot-demos.mjs` 生成）。
 */
export interface DemoCase {
  slug: string;
  /** 卡片与侧边栏用的名字 */
  title: string;
  /** 一句话说清它解决什么 */
  tagline: string;
  /** 数据规模，写具体数字（案例的说服力有一半在这儿） */
  scale: string;
  /** 卡片底部的能力标签，挑 4~5 个最有代表性的 */
  tags: string[];
  /**
   * 还没实现。规划中的案例**只出现在画廊里**（置灰卡片 + 规划中徽标），
   * 不进侧边栏、也没有页面 —— 免得点进去是 404。
   */
  planned?: boolean;
}

export const DEMO_CASES: DemoCase[] = [
  {
    slug: 'spreadsheet',
    title: '电子表格',
    tagline: '10 万行 × 65 列的可编辑电子表格：选区、粘贴、合并、条件格式',
    scale: '10 万行 × 65 列 = 650 万格，2.7 万个合并区',
    tags: ['双向虚拟化', '单元格选区', '剪贴板互操作', '合并/取消合并', '键盘导航', '条件格式'],
  },
  {
    slug: 'project-wbs',
    title: '项目管理 WBS',
    tagline: '左边任务表、右边甘特：行始终对齐，分界能拖能收，3000 个任务照样一屏 DOM',
    scale: '5 期 / 3000 个任务 + 35 个工作包，时间轴上百个桶',
    tags: ['树形 WBS', '时间轴虚拟化', '拖条改期', '日期/进度单元格', '工作日历', '甘特（付费插件）'],
  },
  {
    slug: 'hr-payroll',
    title: 'HR 人员与薪酬',
    tagline: '部门行是汇总、展开是明细；改一个人的薪资，部门成本与全公司合计同时跟着走',
    scale: '9 个部门 / 4940 名员工',
    tags: ['树形汇总', '自动合计行', '调薪校验', '敏感字段脱敏', '导出 Excel'],
  },
  {
    slug: 'market-board',
    title: '金融行情看板',
    tagline: '高频推流下的帧稳定性 —— 双向虚拟化最难被替代的场景',
    scale: '十万行，每秒数千次更新',
    tags: ['批量推送更新', '涨跌闪烁', '固定行 pinned', '色阶'],
    planned: true,
  },
];

/** 已经能点开的案例（有页面、有 demo、有截图） */
export const liveDemoCases = (): DemoCase[] => DEMO_CASES.filter((c) => !c.planned);
