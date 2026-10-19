import { VirtTable } from '@virt-table/vanilla';
import { vtPivot, type PivotOptions } from '@virt-table-pro/pivot';
import '@virt-table-pro/pivot/index.css';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 透视表 demo（Vanilla 端）：只装 `vtPivot`，不装别的付费插件。
 *
 * 演示的顺序是刻意的 —— 它对应「这个包到底替你省了什么」：
 *
 *   1. 一层行维度  → 最朴素的分组聚合
 *   2. 两层行维度  → **小计行 + 折叠展开**（这一整套是白拿核心的树形列）
 *   3. 加列维度    → **多级分组表头**（同样白拿）
 *   4. 关掉小计    → 平表形式，每个维度各占一列
 *   5. 关掉透视    → 行与列一起退回明细，证明它是可逆的
 *
 * 用 `pro-kit` 的共享数据（2000 行 × 部门/城市/状态/日期），所以维度取值是真有重复的 ——
 * 拿逐行唯一的字段做维度等于把表打散，看不出聚合。
 */

/** 几档预设，按「省了什么」递进 */
const PRESETS: Array<{ label: string; config: PivotOptions<Row> | null; note: string }> = [
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

export const pivotDemo: ProDemo = {
  id: 'pivot',
  mount(host: DemoHost): DemoInstance {
    const rows = makeRows();

    const noteBox = document.createElement('div');
    noteBox.className = 'pg-aside-box';
    host.asideEl.appendChild(noteBox);

    let onlyDone = false;

    const table = new VirtTable<Row>(host.tableEl, {
      list: rows,
      // 明细列：不透视时用它，`setPivotConfig(null)` 也会还回来
      columns: makeColumns(),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
      plugins: [
        vtPivot<Row>({
          ...(PRESETS[0].config as PivotOptions<Row>),
          // 金额是负数掺过的（见 shared/data.ts），千分位 + 负号看得清一点
          formatValue: (v) =>
            typeof v === 'number' ? v.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '',
        }),
      ],
    });

    /** 应用一档预设（带上「只统计已完成」那个开关） */
    const apply = (preset: (typeof PRESETS)[number]): void => {
      if (!preset.config) {
        table.setPivotConfig?.(null);
        noteBox.textContent = preset.note;
        host.setStatus('已退回明细视图（2000 行）');
        return;
      }
      table.setPivotConfig?.({
        ...preset.config,
        formatValue: (v) =>
          typeof v === 'number' ? v.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '',
        // 源数据级的条件只能放这里：列头筛选筛的是透视结果
        ...(onlyDone ? { filter: (r: Row) => r.status === '已完成' } : {}),
      });
      const result = table.getPivotResult?.();
      noteBox.textContent = preset.note;
      host.setStatus(
        `${preset.label.replace(/^[①②③④⑤]\s*/, '')} · ` +
          `参与统计 ${result?.sourceCount ?? 0} 条明细 → ${result?.rows.length ?? 0} 行`,
      );
    };

    for (const preset of PRESETS) {
      host.button(preset.label, () => apply(preset));
    }

    host.switch('只统计「已完成」', onlyDone, (checked) => {
      onlyDone = checked;
      // 重放当前那一档 —— 配置是整体替换的，所以要把 filter 一起带上重设
      const current = table.getPivotConfig?.();
      const preset = PRESETS.find(
        (p) => p.config && JSON.stringify(p.config.rows) === JSON.stringify(current?.rows),
      );
      apply(preset ?? PRESETS[0]);
    });

    host.button('展开全部', () => table.expandAll());
    host.button('折叠全部', () => table.collapseAll());

    apply(PRESETS[0]);
    Object.assign(window, { table });

    return { destroy: () => table.destroy() };
  },
};
