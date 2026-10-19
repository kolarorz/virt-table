import { VirtTable } from '@virt-table/vanilla';
import { vtSparkline, type SparklineSpec } from '@virt-table-pro/charts';
import '@virt-table-pro/charts/index.css';
import { makeSparkColumns, makeSparkRows, type SparkRow } from '../../../pro-kit/shared/spark-data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 单元格迷你图 demo（Vanilla 端）：只装 `vtSparkline`，不装别的付费插件。
 *
 * 演示的重点是**三件容易被忽略的事**，而不是「能画一条线」：
 *
 *   1. `range: 'row'` 与 `'shared'` 的差别 —— 数据刻意跨两个数量级（偶数行千级、
 *      奇数行十级），切到 `'shared'` 会把奇数行压成贴底的直线。那不是 bug，
 *      那是「共享刻度」的代价，而这个取舍只有亲眼看到才会记住
 *   2. 空洞断开 vs 连起来 —— 「采样（有缺失）」那一列每行有两段空洞
 *   3. 悬停读数 —— 一格 28px 放不下刻度，提示是唯一的读数途径
 *
 * 顺带留了一列普通数字（「最新值」），用来证明没配进 `columns` 的列完全不受影响。
 */

/** 各列的基础配置。`field` 全部省略 —— 默认就是列 key */
function specs(shared: boolean, skipGaps: boolean): Record<string, SparklineSpec<SparkRow>> {
  const range = shared ? ('shared' as const) : ('row' as const);
  return {
    weekly: {
      type: 'line',
      range,
      markers: ['min', 'max', 'last'],
      tooltip: ({ row, index, value }) =>
        `${row.name} 第 ${index + 1} 周：${value === null ? '缺数据' : value.toLocaleString()}`,
    },
    revenue: { type: 'area', range },
    delta: { type: 'bar', range },
    // 盈亏图不看大小只看正负，给它 range 没有意义（等高柱）
    pnl: {
      type: 'winloss',
      tooltip: ({ index, value }) => `第 ${index + 1} 日：${(value ?? 0) > 0 ? '盈' : '亏'}`,
    },
    spotty: { type: 'line', range, gaps: skipGaps ? 'skip' : 'break', markers: ['first', 'last'] },
  };
}

export const sparklineDemo: ProDemo = {
  id: 'sparkline',
  mount(host: DemoHost): DemoInstance {
    const rows = makeSparkRows();

    const noteBox = document.createElement('div');
    noteBox.className = 'pg-aside-box';
    host.asideEl.appendChild(noteBox);

    let shared = false;
    let skipGaps = false;

    /**
     * 换配置得重建表格。
     *
     * 核心的插件是**构造期一次性安装**的，没有运行时换插件配置的入口 ——
     * 而这正是 demo 该照实演示的事：真实项目里迷你图的配置是写死在 options 里的，
     * 不存在「运行时切图型」这种需求（切了也就是重建一张表）。
     */
    let table: VirtTable<SparkRow> | null = null;
    const build = (): void => {
      table?.destroy();
      host.tableEl.textContent = '';
      table = new VirtTable<SparkRow>(host.tableEl, {
        list: rows,
        columns: makeSparkColumns(),
        itemKey: 'id',
        // 40 而不是更矮：迷你图铺满格子，行太矮时折线的起伏会被压得看不出来
        estimatedSize: 44,
        fixedSize: true,
        stripe: true,
        border: true,
        plugins: [vtSparkline<SparkRow>({ columns: specs(shared, skipGaps) })],
      });
      describe();
    };

    const describe = (): void => {
      noteBox.innerHTML =
        `<p><b>纵轴范围：${shared ? 'shared（整列共用）' : 'row（每行自己）'}</b></p>` +
        (shared
          ? '<p>奇数行被压成贴底的直线 —— 数据里偶数行是「千」级、奇数行是「十」级。' +
            '这就是共享刻度的代价：行与行高度可比，但混量级时小的那些什么都看不出来。</p>'
          : '<p>每行按自己的极值铺满，所以两个量级的行都看得清形状 —— 代价是行与行的' +
            '高度不可比。默认给这一档。</p>') +
        `<p><b>空洞：${skipGaps ? 'skip（连起来）' : 'break（断开）'}</b>` +
        '　看「采样（有缺失）」那一列。默认断开 —— 数据缺了就该看得出来缺了。</p>' +
        '<p>把鼠标移到任意一条线上：提示会<b>吸附到最近的点</b>，而不是跟着鼠标走。</p>';
      host.setStatus(
        `${rows.length} 行 × 5 列迷你图 · 全部是内联 SVG，没有图表库、没有实例`,
      );
    };

    host.switch('纵轴范围用 shared（整列共用）', shared, (checked) => {
      shared = checked;
      build();
    });
    host.switch('空洞连起来（gaps: skip）', skipGaps, (checked) => {
      skipGaps = checked;
      build();
    });
    host.button('导出用的 SVG 打到控制台', () => {
      // 导出与打印拿不到 DOM，用这条单独出一段 SVG
      const svg = table?.renderSparklineSvg?.(rows[0]!.weekly, 'weekly');
      console.log(svg);
      host.setStatus(`已把第一行那条折线的 SVG 打到控制台（${svg?.length ?? 0} 字符）`);
    });

    build();

    return {
      destroy: () => {
        table?.destroy();
        table = null;
      },
    };
  },
};
