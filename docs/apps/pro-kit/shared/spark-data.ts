/**
 * 迷你图 demo 的数据。三端共用一份 —— 三端各造一份的话「改一处漏一处」，
 * 而 demo 之间数据不一样时没人能一眼看出是插件的差异还是数据的差异。
 *
 * 数列是**按 id 确定性生成**的（不用随机）：截图对比、以及「Vue 端那条线和 Vanilla 端
 * 长得不一样」这类怀疑都需要可复现。
 */
import type { VirtTableColumn } from '@virt-table/vanilla';

export interface SparkRow extends Record<string, unknown> {
  id: number;
  name: string;
  /** 12 周的量级，同一列里刻意跨两个数量级 —— 用来演示 `range: 'row'` 与 `'shared'` 的差别 */
  weekly: number[];
  /** 近 12 期的收入，全正数，用来看面积图 */
  revenue: number[];
  /** 近 14 日盈亏，只关心正负 */
  pnl: number[];
  /** 近 8 期的库存变动，正负掺半，用来看柱状图的分色 */
  delta: number[];
  /** 带空洞的一列：中间几期没采到数 */
  spotty: Array<number | null>;
}

/** 一个确定性的伪随机：同一个 (seed, i) 永远给同一个数 */
function noise(seed: number, i: number): number {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const NAMES = [
  '智能音箱',
  '扫地机器人',
  '空气净化器',
  '电动牙刷',
  '筋膜枪',
  '咖啡机',
  '投影仪',
  '路由器',
  '机械键盘',
  '显示器',
  '降噪耳机',
  '摄像头',
];

export function makeSparkRows(count = 40): SparkRow[] {
  return Array.from({ length: count }, (_, i) => {
    /*
     * 量级刻意跨两档：偶数行是「千」级，奇数行是「十」级。
     * 于是 `range: 'shared'` 会把奇数行压成贴底的直线 —— 那正是要演示的取舍，
     * 不是数据没造好。
     */
    const scale = i % 2 === 0 ? 1200 : 14;
    /** 带趋势的随机走 */
    const weekly = Array.from({ length: 12 }, (_, w) =>
      Math.round(scale * (0.6 + w * 0.05 + noise(i + 1, w) * 0.5)),
    );
    const revenue = Array.from({ length: 12 }, (_, w) =>
      Math.round(3000 + w * 260 + noise(i + 7, w) * 1800),
    );
    // 胜率随行号变：前面的行赢多输少，后面反过来 —— 一列全是同一种符号看不出分色
    const winRate = 0.75 - (i / Math.max(1, count - 1)) * 0.55;
    const pnl = Array.from({ length: 14 }, (_, d) => (noise(i + 13, d) < winRate ? 1 : -1));
    const delta = Array.from({ length: 8 }, (_, d) =>
      Math.round((noise(i + 29, d) - 0.45) * 400),
    );
    const spotty = Array.from({ length: 12 }, (_, w) =>
      // 每行固定两段空洞，位置随行号错开
      w === (i % 4) + 3 || w === (i % 4) + 4 ? null : Math.round(50 + noise(i + 31, w) * 50),
    );
    return {
      id: i + 1,
      name: `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`,
      weekly,
      revenue,
      pnl,
      delta,
      spotty,
    };
  });
}

/**
 * 列定义。迷你图列**不配 `render`** —— 图是插件在 `onCellRendered` 里画进格子的，
 * 配了 `render` 反而会先渲染一遍文本再被覆盖（白做一次，还会在极窄列上闪一下）。
 */
export function makeSparkColumns(): VirtTableColumn<SparkRow>[] {
  return [
    { key: 'name', title: '产品', width: 150, fixed: 'left' },
    { key: 'weekly', title: '12 周销量', width: 170 },
    { key: 'revenue', title: '12 期收入', width: 170 },
    { key: 'delta', title: '库存变动', width: 150 },
    { key: 'pnl', title: '近 14 日盈亏', width: 160 },
    { key: 'spotty', title: '采样（有缺失）', width: 170 },
    // 一列普通数字：证明没配进 `columns` 的列完全不受影响
    {
      key: 'latest',
      title: '最新值',
      width: 100,
      align: 'right',
      render: ({ row }) => String(row.weekly[row.weekly.length - 1] ?? ''),
    },
  ];
}
