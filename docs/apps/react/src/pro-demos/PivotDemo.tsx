import { useMemo, useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtPivot, type PivotOptions } from '@virt-table-pro/pivot';
import '@virt-table-pro/pivot/index.css';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { ProDemoProps } from './shell';

/**
 * 透视表 demo（React 端）：只装 `vtPivot`。
 *
 * 五档预设按「这个包替你省了什么」递进：一层维度 → 两层（小计 + 折叠展开）→ 加列维度
 * （多级分组表头）→ 平表形式 → 关掉透视。中间那两档的能力全部是**核心的**，
 * 这个插件只是产出了一棵树与一套列。
 */

/** 金额是掺了负数的（见 shared/data.ts），千分位看得清一点 */
const formatValue = (v: unknown): string =>
  typeof v === 'number' ? v.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '';

const PRESETS: Array<{ label: string; note: string; config: PivotOptions<Row> | null }> = [
  {
    label: '① 按部门',
    note: '一层行维度：最朴素的分组聚合，值列可点表头排序',
    config: {
      rows: ['dept'],
      values: [
        { field: 'amount', agg: 'sum', title: '金额' },
        { field: 'id', agg: 'count', title: '笔数' },
        { field: 'amount', agg: 'avg', title: '均值' },
      ],
    },
  },
  {
    label: '② 部门 → 城市',
    note: '两层行维度：出小计行，点行首箭头可展开 —— 折叠展开是核心的树形列',
    config: {
      rows: ['dept', 'city'],
      values: [
        { field: 'amount', agg: 'sum', title: '金额' },
        { field: 'id', agg: 'count', title: '笔数' },
      ],
    },
  },
  {
    label: '③ 交叉：× 状态',
    note: '加了列维度 → 多级分组表头（也是核心的），最右边一组是总计列',
    config: {
      rows: ['dept'],
      columns: ['status'],
      values: [
        { field: 'amount', agg: 'sum', title: '金额' },
        { field: 'id', agg: 'count', title: '笔数' },
      ],
    },
  },
  {
    label: '④ 平表形式',
    note: '关掉小计 → 每个维度各占一列（Excel 的「表格形式」），没有树也就没有折叠',
    config: {
      rows: ['dept', 'city'],
      values: [{ field: 'amount', agg: 'sum', title: '金额' }],
      showSubtotals: false,
    },
  },
  {
    label: '⑤ 关掉透视',
    note: '行与列一起退回明细视图 —— 装了这个插件不等于失去原来那张表',
    config: null,
  },
];

export function PivotDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [onlyDone, setOnlyDone] = useState(false);

  const [rows] = useState<Row[]>(() => makeRows());
  // 列定义必须 memo：表格会就地改列对象（拖列宽直接写 col.width）
  const columns = useMemo(() => makeColumns(), []);

  const options = useMemo(
    () => ({
      list: rows,
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
      plugins: [vtPivot<Row>({ ...(PRESETS[0].config as PivotOptions<Row>), formatValue })],
    }),
    [rows],
  );

  const apply = (index: number, done = onlyDone): void => {
    setActiveIndex(index);
    const preset = PRESETS[index];
    if (!preset.config) {
      tableRef.current?.setPivotConfig?.(null);
      setStatus('已退回明细视图（2000 行）');
      return;
    }
    tableRef.current?.setPivotConfig?.({
      ...preset.config,
      formatValue,
      // 源数据级的条件只能放这里：列头筛选筛的是透视结果
      ...(done ? { filter: (r: Row) => r.status === '已完成' } : {}),
    });
    const result = tableRef.current?.getPivotResult?.();
    setStatus(`参与统计 ${result?.sourceCount ?? 0} 条明细 → ${result?.rows.length ?? 0} 行`);
  };

  return (
    <>
      <div className="pg-toolbar">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            className={`pg-btn${activeIndex === i ? ' is-active' : ''}`}
            onClick={() => apply(i)}
          >
            {preset.label}
          </button>
        ))}
        <label className="pg-switch">
          <input
            type="checkbox"
            checked={onlyDone}
            onChange={(e) => {
              setOnlyDone(e.target.checked);
              // 配置是整体替换的 —— 重放当前那一档时要把 filter 一起带上
              apply(activeIndex, e.target.checked);
            }}
          />
          只统计「已完成」
        </label>
        <button className="pg-btn" onClick={() => tableRef.current?.expandAll()}>
          展开全部
        </button>
        <button className="pg-btn" onClick={() => tableRef.current?.collapseAll()}>
          折叠全部
        </button>
      </div>

      <div className="pg-table">
        {/* columns 是明细列：不透视时用它，setPivotConfig(null) 也会还回来 */}
        <VirtTableReact ref={tableRef} columns={columns} options={options} />
      </div>

      <div className="pg-aside">
        <div className="pg-aside-box">{PRESETS[activeIndex].note}</div>
      </div>
    </>
  );
}
