import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { VtDateRangePicker } from '@virt-table/vanilla/components';

/** 本地格式化。**不用 `toISOString()`** —— 那个按 UTC 切片，东八区会把日期整体退一天 */
const day = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function bootstrapTableVtDateRangePicker(root: HTMLElement): () => void {
  const rowCount = 5000;
  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    // 默认：双月并排 + 7 颗内置快捷项
    VtDateRangePicker({ key: 'period', title: '项目周期', width: 260, separator: ' 至 ', clearable: true }),
    // 限定可选区间：越界格不可点，整段越界的快捷项自动消失、部分越界的取交集
    VtDateRangePicker({
      key: 'vacation',
      title: '休假时间（限区间）',
      width: 260,
      min: '2024-01-01',
      max: '2026-12-31',
      placeholder: '未安排',
      clearable: true,
    }),
    // 单月 + 周日起 + 只留三颗快捷项
    VtDateRangePicker({
      key: 'sprint',
      title: '迭代（单月/周日起）',
      width: 240,
      panels: 1,
      firstDayOfWeek: 0,
      shortcuts: (builtin) => builtin.filter((s) => ['本周', '本月', '最近 7 天'].includes(s.label)),
    }),
    // 逃生阀：切回改造前那套「两个原生 date input 并排」
    VtDateRangePicker({ key: 'nativeRange', title: '原生控件', width: 240, native: true }),
    VtDateRangePicker({ key: 'readonly', title: '只读范围', width: 220, disabled: true }),
  ];

  const baseDate = new Date(2024, 0, 1);
  const list = Array.from({ length: rowCount }, (_, i) => {
    const s = new Date(baseDate.getTime() + i * 86400000 * 2);
    const e = new Date(s.getTime() + 86400000 * 30);
    const sf = day(s);
    const ef = day(e);
    return {
      id: i,
      period: [sf, ef],
      vacation: i % 3 === 0 ? ['2025-07-01', '2025-07-15'] : ['', ''],
      sprint: [sf, day(new Date(s.getTime() + 86400000 * 13))],
      nativeRange: [sf, ef],
      readonly: [sf, ef],
    };
  });

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:1300px;height:600px;" class="demo-container" id="vtContainer"></div>
`;

  const container = root.querySelector('#vtContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    textOverflow: 'ellipsis',
    // 编辑态走 renderEditor，必须装 vtCellEditor 才会被触发
    plugins: [vtCellEditor()],
  });

  status.textContent =
    `VtDateRangePicker 单元格组件：${rowCount} 行，值仍是 [start, end] 数组。` +
    `编辑态是自绘双月日历 —— 点起点、移动鼠标预览区间、点终点即写回（反向选择自动归一）；` +
    `底部 7 颗快捷项，支持 panels / firstDayOfWeek / shortcuts / min-max / clearable / disabled，` +
    `native: true 切回两个原生 date input。容器变窄时双月自动降级成单月。`;

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
