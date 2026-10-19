import { useMemo, useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtSparkline, type SparklineSpec } from '@virt-table-pro/charts';
import '@virt-table-pro/charts/index.css';
import {
  makeSparkColumns,
  makeSparkRows,
  type SparkRow,
} from '../../../pro-kit/shared/spark-data';
import type { ProDemoProps } from './shell';

/**
 * 单元格迷你图 demo（React 端）：只装 `vtSparkline`。
 *
 * 重点是三件容易被忽略的事，而不是「能画一条线」：
 * `range: 'row'` 与 `'shared'` 的取舍（数据刻意跨两个数量级）、空洞断开还是连起来、
 * 以及悬停读数（一格 28px 放不下刻度，提示是唯一的读数途径）。
 */

/** 各列的配置。`field` 全部省略 —— 默认就是列 key */
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

export function SparklineDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  const [shared, setShared] = useState(false);
  const [skipGaps, setSkipGaps] = useState(false);

  const rows = useMemo(() => makeSparkRows(), []);
  const columns = useMemo(() => makeSparkColumns(), []);

  /*
   * ⚠️ options 必须 useMemo，依赖只有那两个开关。
   *
   * 核心的插件是**构造期一次性安装**的，没有运行时换插件配置的入口 —— 所以换配置就是
   * 换 options（表格会重建）。而这正是该照实演示的事：真实项目里迷你图的配置写死在
   * options 里，不存在「运行时切图型」这种需求。
   */
  const options = useMemo(
    () => ({
      list: rows,
      itemKey: 'id',
      // 44 而不是更矮：迷你图铺满格子，行太矮时折线的起伏会被压得看不出来
      estimatedSize: 44,
      fixedSize: true,
      stripe: true,
      border: true,
      plugins: [vtSparkline<SparkRow>({ columns: specs(shared, skipGaps) })],
    }),
    [rows, shared, skipGaps],
  );

  return (
    <>
      <div className="pg-toolbar">
        <label className="pg-switch">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
          纵轴范围用 shared（整列共用）
        </label>
        <label className="pg-switch">
          <input type="checkbox" checked={skipGaps} onChange={(e) => setSkipGaps(e.target.checked)} />
          空洞连起来（gaps: skip）
        </label>
        <button
          className="pg-btn"
          onClick={() => {
            // 导出与打印拿不到 DOM，用这条单独出一段 SVG
            const svg = tableRef.current?.renderSparklineSvg?.(rows[0]!.weekly, 'weekly');
            console.log(svg);
            setStatus(`已把第一行那条折线的 SVG 打到控制台（${svg?.length ?? 0} 字符）`);
          }}
        >
          导出用的 SVG 打到控制台
        </button>
      </div>

      <div className="pg-table">
        <VirtTableReact ref={tableRef} columns={columns} options={options} />
      </div>

      <div className="pg-aside">
        <div className="pg-aside-box">
          <p>
            <b>纵轴范围：{shared ? 'shared（整列共用）' : 'row（每行自己）'}</b>
          </p>
          {shared ? (
            <p>
              奇数行被压成贴底的直线 —— 数据里偶数行是「千」级、奇数行是「十」级。这就是共享刻度的
              代价：行与行高度可比，但混量级时小的那些什么都看不出来。
            </p>
          ) : (
            <p>
              每行按自己的极值铺满，所以两个量级的行都看得清形状 —— 代价是行与行的高度不可比。
              默认给这一档。
            </p>
          )}
          <p>
            <b>空洞：{skipGaps ? 'skip（连起来）' : 'break（断开）'}</b>
            　看「采样（有缺失）」那一列。默认断开 —— 数据缺了就该看得出来缺了。
          </p>
          <p>把鼠标移到任意一条线上：提示会<b>吸附到最近的点</b>，而不是跟着鼠标走。</p>
        </div>
      </div>
    </>
  );
}
