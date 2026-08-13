/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FilterOperator } from './filter-model';

/**
 * 国际化（i18n）文案字典：把散落在表格各处的 UI 文本收进一个 locale 对象。
 *
 * - 内置 `zhCN`（默认）与 `enUS` 两个完整语言包。
 * - `VirtTableOptions.locale` 接受 `DeepPartial<VirtTableLocale>`，与 `zhCN`
 *   深合并（见 `mergeLocale`），因此只需覆盖想改的少量文案。
 * - 单项 option `emptyText`/`loadingText`/`summaryText` 优先级高于 locale（向后兼容）。
 * - `operators` / `filterBuilder` 同时作为高级筛选（filter-model / VtFilterBuilder）
 *   的默认文案来源，避免两套中文常量重复。
 */

/** 高级筛选构建器（VtFilterBuilder）UI 文案 */
export interface VtFilterBuilderTexts {
  and: string;
  or: string;
  /** 逻辑切换按钮的 tooltip，参数为切换后的逻辑文案 */
  switchLogic: (next: string) => string;
  addCondition: string;
  addGroup: string;
  removeNode: string;
  removeGroup: string;
  apply: string;
  clear: string;
  empty: string;
  invalidColumn: string;
  betweenSep: string;
  /** 无值算子（为空 / 不为空）时的占位说明 */
  noValueHint: string;
  summary: (count: number) => string;
}

/**
 * 日历面板（`VtDatePicker` / `VtDateRangePicker` 的自绘面板）UI 文案。
 *
 * 键**刻意全拍平**（快捷项标签没有再套一层 `shortcuts: {}`）：`mergeLocale` 对每个子块
 * 只做一层浅合并，嵌第二层就得在那边再写一层展开，而第一个漏写的人不会被
 * `locale.test.ts` 发现（那边的 `keyPaths` 把数组当叶子，不展开元素）。拍平从结构上
 * 消掉这个坑。
 *
 * ⚠️ 单元格组件是**纯工厂函数**，拿不到 `VirtTable` 实例，所以这里只是**默认值的单一
 * 事实源**：组件建列时读一次 `zhCN.calendar`，**不跟随运行时 `setLocale()`**。要别的语言
 * 就在列上传 `texts: enUS.calendar`（见 AGENTS.md §7.14「面板文案不接表格 i18n」）。
 */
export interface VtCalendarTexts {
  /** 12 个月名，index 0 = 一月 */
  months: readonly string[];
  /** 7 个星期名，index 0 = **周日**（渲染时按 `firstDayOfWeek` 旋转，所以索引语义与 `Date.getDay()` 一致） */
  weekdays: readonly string[];
  /** 月份标题，参数为年、月索引（0-11）、月名 */
  title: (year: number, monthIndex: number, monthName: string) => string;
  /** 上/下月按钮的 aria-label 与 tooltip */
  prevMonth: string;
  nextMonth: string;
  /** 底部回显：还没开始选 */
  pickStart: string;
  /** 底部回显：起点已定、等着点终点 */
  pickEnd: string;
  /* 内置快捷项标签。「今天/昨天」单日与区间都有，其余只在区间模式出现 */
  today: string;
  yesterday: string;
  thisWeek: string;
  thisMonth: string;
  thisQuarter: string;
  last7Days: string;
  last30Days: string;
}

/** 表格全部 UI 文案字典 */
export interface VirtTableLocale {
  /** 空数据提示（被 option.emptyText 覆盖） */
  empty: string;
  /** 加载态文案（被 option.loadingText 覆盖） */
  loading: string;
  /** 合计行首列标签（被 option.summaryText 覆盖） */
  summary: string;
  /** 表头排序图标 tooltip，参数为列标题 */
  sortTip: (title: string) => string;
  /** 行拖拽手柄 tooltip */
  dragRow: string;
  /** 打印窗口默认标题 */
  print: string;
  /** 列头快捷筛选下拉 */
  filter: {
    keyword: string;
    min: string;
    max: string;
    startDate: string;
    endDate: string;
    reset: string;
    confirm: string;
  };
  /** 全文搜索框 */
  search: {
    placeholder: string;
    prev: string;
    next: string;
    close: string;
  };
  /** 自然语言查询条文案（仅当启用 `vtAIQuery` 插件时使用） */
  aiQuery: {
    placeholder: string;
    submit: string;
    close: string;
    /** 请求进行中的提示 */
    thinking: string;
    /** 撤销上一次应用 */
    undo: string;
    /** 模型没能给出任何可应用的条件 */
    noResult: string;
    /** 解析/请求失败的前缀，后面拼具体错误 */
    failed: string;
    /** 校验诊断的折叠标题，参数为诊断条数 */
    issues: (count: number) => string;
  };
  /** 流式接收指示（仅当启用 `vtAIStream` 插件时使用） */
  aiStream: {
    /** 正在接收，参数为已落地行数 */
    receiving: (n: number) => string;
    /** 用户上滚脱离跟随后的提示 */
    paused: (n: number) => string;
    failed: string;
  };
  /** AI 列（仅当启用 `vtAIColumn` 插件时使用） */
  aiColumn: {
    /** 单元格计算中的占位 */
    computing: string;
    /** 计算失败的单元格文案（hover 看具体错误） */
    failed: string;
    /** 失败后重试按钮的 title */
    retry: string;
  };
  /** 高级筛选算子标签 */
  operators: Record<FilterOperator, string>;
  /** 高级筛选构建器文案 */
  filterBuilder: VtFilterBuilderTexts;
  /** 日历面板文案（`VtDatePicker` / `VtDateRangePicker` 建列时读一次，不跟随 setLocale） */
  calendar: VtCalendarTexts;
  /** 无限滚动状态条文案（仅当启用 infinite option 时使用） */
  infinite: {
    /** 手动模式下的「加载更多」按钮 */
    loadMore: string;
    /** 追加加载中 */
    loading: string;
    /** 已到底 */
    noMore: string;
    /** 取数失败提示 */
    error: string;
    /** 失败后的重试按钮 */
    retry: string;
  };
  /** 分页器文案（仅当启用 pagination option 时使用） */
  pagination: {
    /** 总数文案，参数为总条数 */
    total: (n: number) => string;
    prev: string;
    next: string;
    /** 跳页标签（如「跳至」） */
    jumpTo: string;
    /** 跳页输入框后缀单位（如「页」；英文可为空串） */
    jumpUnit: string;
    /** 每页条数选项标签，参数为每页条数 */
    pageSizeUnit: (n: number) => string;
  };
}

/** 简体中文（默认语言包） */
export const zhCN: VirtTableLocale = {
  empty: '暂无数据',
  loading: '加载中...',
  summary: '合计',
  sortTip: (title) => `排序：${title}`,
  dragRow: '拖拽排序',
  print: '打印',
  filter: {
    keyword: '输入关键字',
    min: '最小值',
    max: '最大值',
    startDate: '开始日期',
    endDate: '结束日期',
    reset: '重置',
    confirm: '确认',
  },
  search: {
    placeholder: '搜索...',
    prev: '上一个',
    next: '下一个',
    close: '关闭',
  },
  aiQuery: {
    placeholder: '用一句话说明你想看什么数据…',
    submit: '执行',
    close: '关闭',
    thinking: '正在理解…',
    undo: '撤销',
    noResult: '没有解析出可应用的查询条件',
    failed: '解析失败：',
    issues: (count: number) => `${count} 处已自动调整`,
  },
  aiStream: {
    receiving: (n: number) => `正在接收 ${n.toLocaleString()} 行`,
    paused: (n: number) => `已接收 ${n.toLocaleString()} 行（已暂停跟随）`,
    failed: '接收中断',
  },
  aiColumn: {
    computing: '生成中…',
    failed: '生成失败',
    retry: '点击重试',
  },
  operators: {
    eq: '等于',
    neq: '不等于',
    contains: '包含',
    notContains: '不包含',
    startsWith: '开头是',
    endsWith: '结尾是',
    gt: '大于',
    gte: '大于等于',
    lt: '小于',
    lte: '小于等于',
    between: '介于',
    in: '属于',
    notIn: '不属于',
    isEmpty: '为空',
    isNotEmpty: '不为空',
  },
  filterBuilder: {
    and: '且',
    or: '或',
    switchLogic: (next) => `点击切换为「${next}」`,
    addCondition: '添加条件',
    addGroup: '添加条件组',
    removeNode: '删除条件',
    removeGroup: '删除该组',
    apply: '应用筛选',
    clear: '清空',
    empty: '暂无条件，点下方「添加条件」开始',
    invalidColumn: '（列已不存在）',
    betweenSep: '至',
    noValueHint: '无需填值',
    summary: (n) => (n === 0 ? '未启用筛选' : `已启用 ${n} 个条件`),
  },
  calendar: {
    months: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'],
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    title: (year, _monthIndex, monthName) => `${year} 年 ${monthName}`,
    prevMonth: '上一月',
    nextMonth: '下一月',
    pickStart: '选择开始日期',
    pickEnd: '选择结束日期',
    today: '今天',
    yesterday: '昨天',
    thisWeek: '本周',
    thisMonth: '本月',
    thisQuarter: '本季度',
    last7Days: '最近 7 天',
    last30Days: '最近 30 天',
  },
  infinite: {
    loadMore: '加载更多',
    loading: '加载中...',
    noMore: '没有更多了',
    error: '加载失败',
    retry: '重试',
  },
  pagination: {
    total: (n) => `共 ${n} 条`,
    prev: '上一页',
    next: '下一页',
    jumpTo: '跳至',
    jumpUnit: '页',
    pageSizeUnit: (n) => `${n} 条/页`,
  },
};

/** English */
export const enUS: VirtTableLocale = {
  empty: 'No data',
  loading: 'Loading...',
  summary: 'Total',
  sortTip: (title) => `Sort: ${title}`,
  dragRow: 'Drag to sort',
  print: 'Print',
  filter: {
    keyword: 'Enter keyword',
    min: 'Min',
    max: 'Max',
    startDate: 'Start date',
    endDate: 'End date',
    reset: 'Reset',
    confirm: 'OK',
  },
  search: {
    placeholder: 'Search...',
    prev: 'Previous',
    next: 'Next',
    close: 'Close',
  },
  aiQuery: {
    placeholder: 'Describe the data you want to see…',
    submit: 'Run',
    close: 'Close',
    thinking: 'Thinking…',
    undo: 'Undo',
    noResult: 'No applicable query was produced',
    failed: 'Failed: ',
    issues: (count: number) => `${count} auto-corrected`,
  },
  aiStream: {
    receiving: (n: number) => `Receiving ${n.toLocaleString()} rows`,
    paused: (n: number) => `${n.toLocaleString()} rows (follow paused)`,
    failed: 'Stream interrupted',
  },
  aiColumn: {
    computing: 'Generating…',
    failed: 'Failed',
    retry: 'Click to retry',
  },
  operators: {
    eq: 'Equals',
    neq: 'Not equals',
    contains: 'Contains',
    notContains: 'Not contains',
    startsWith: 'Starts with',
    endsWith: 'Ends with',
    gt: 'Greater than',
    gte: 'Greater or equal',
    lt: 'Less than',
    lte: 'Less or equal',
    between: 'Between',
    in: 'In',
    notIn: 'Not in',
    isEmpty: 'Is empty',
    isNotEmpty: 'Is not empty',
  },
  filterBuilder: {
    and: 'AND',
    or: 'OR',
    switchLogic: (next) => `Click to switch to "${next}"`,
    addCondition: 'Add condition',
    addGroup: 'Add group',
    removeNode: 'Remove condition',
    removeGroup: 'Remove group',
    apply: 'Apply',
    clear: 'Clear',
    empty: 'No conditions yet. Click "Add condition" below to start.',
    invalidColumn: '(column no longer exists)',
    betweenSep: 'to',
    noValueHint: 'No value needed',
    summary: (n) => (n === 0 ? 'No filter applied' : `${n} condition(s) applied`),
  },
  calendar: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    title: (year, _monthIndex, monthName) => `${monthName} ${year}`,
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    pickStart: 'Pick a start date',
    pickEnd: 'Pick an end date',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This week',
    thisMonth: 'This month',
    thisQuarter: 'This quarter',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
  },
  infinite: {
    loadMore: 'Load more',
    loading: 'Loading...',
    noMore: 'No more data',
    error: 'Failed to load',
    retry: 'Retry',
  },
  pagination: {
    total: (n) => `Total ${n}`,
    prev: 'Previous',
    next: 'Next',
    jumpTo: 'Go to',
    jumpUnit: '',
    pageSizeUnit: (n) => `${n}/page`,
  },
};

/**
 * 深度可选：对象递归可选，函数与**数组**整体替换。
 *
 * 数组那条分支是为 `calendar.months` / `calendar.weekdays` 加的：数组也是 object，落进
 * 递归分支会被映射成 `{ 0?: string; length?: number; … }` 这种没法传的东西。而月份名本来
 * 就是「12 个一套」，不存在只覆盖三月的语义 —— 整体替换才是对的。
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: any[]) => any
    ? T[K]
    : T[K] extends readonly unknown[]
      ? T[K]
      : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K];
};

/**
 * 把 override 深合并进 base，返回完整 locale。
 * 顶层标量/函数（sortTip）整体替换；filter/search/operators/filterBuilder/calendar 逐层浅合并。
 *
 * ⚠️ **每加一个子块都必须在下面补一行**，否则 `{ calendar: { today: 'TD' } }` 这种局部覆盖会把
 * 整块（含 12 个月名）替换掉而不是合并。`locale.test.ts` 的「键集一致」抓不到这个 —— 那边比的是
 * 语言包结构，不是合并行为，所以每个子块另有一条合并用例钉着。
 */
export function mergeLocale(
  base: VirtTableLocale,
  override?: DeepPartial<VirtTableLocale>,
): VirtTableLocale {
  if (!override) return base;
  return {
    ...base,
    ...(override as Partial<VirtTableLocale>),
    filter: { ...base.filter, ...(override.filter ?? {}) },
    search: { ...base.search, ...(override.search ?? {}) },
    aiQuery: { ...base.aiQuery, ...(override.aiQuery ?? {}) },
    aiStream: { ...base.aiStream, ...(override.aiStream ?? {}) },
    aiColumn: { ...base.aiColumn, ...(override.aiColumn ?? {}) },
    operators: { ...base.operators, ...(override.operators ?? {}) },
    filterBuilder: { ...base.filterBuilder, ...(override.filterBuilder ?? {}) },
    calendar: { ...base.calendar, ...(override.calendar ?? {}) },
    infinite: { ...base.infinite, ...(override.infinite ?? {}) },
    pagination: { ...base.pagination, ...(override.pagination ?? {}) },
  };
}
