import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { VtDatePicker } from '@virt-table/vanilla/components';

/** 本地格式化。**不用 `toISOString()`** —— 那个按 UTC 切片，东八区会把日期整体退一天 */
const day = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function bootstrapTableVtDatePicker(root: HTMLElement): () => void {
  const rowCount = 5000;
  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    VtDatePicker({ key: 'birthday', title: '出生日期', width: 180, placeholder: '请选择日期' }),
    VtDatePicker({
      key: 'joinDate',
      title: '入职日期（限区间）',
      width: 200,
      min: '2020-01-01',
      max: '2030-12-31',
      clearable: true,
    }),
    // 周日起 + 自定义快捷项（函数式：内置全集里加一颗；同名会就地覆盖而不是排两颗）
    VtDatePicker({
      key: 'deadline',
      title: '截止日期（周日起）',
      width: 200,
      clearable: true,
      firstDayOfWeek: 0,
      shortcuts: (builtin) => [
        ...builtin,
        { label: '下周一', value: (t) => [nextMonday(t), nextMonday(t)] },
      ],
    }),
    // 逃生阀：切回浏览器原生 input[type=date]（不跟随暗色主题）
    VtDatePicker({ key: 'nativeDay', title: '原生控件', width: 160, native: true, clearable: true }),
    VtDatePicker({ key: 'readonly', title: '只读日期', width: 160, disabled: true }),
  ];

  const baseDate = new Date(2000, 0, 1);
  const list = Array.from({ length: rowCount }, (_, i) => {
    const d = new Date(baseDate.getTime() + i * 86400000 * 3);
    const fmt = day(d);
    return {
      id: i,
      birthday: fmt,
      joinDate: '2024-06-15',
      deadline: i % 4 === 0 ? '2025-12-31' : '',
      nativeDay: fmt,
      readonly: fmt,
    };
  });

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:1060px;height:600px;" class="demo-container" id="vtContainer"></div>
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
    `VtDatePicker 单元格组件：${rowCount} 行。` +
    `编辑态是自绘单月日历（跟随暗色主题，快捷项只留「今天/昨天」），` +
    `支持 min/max、firstDayOfWeek、shortcuts、disabled；清除「×」默认就有（不想要的列传 clearable: false），激活后按 Delete / Backspace 同效；native: true 切回原生控件。` +
    `键盘：←→ 跨天、↑↓ 跨周、PageUp/Down 跨月、Enter 确认、Esc 关闭。`;

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}

/**
 * demo 里那颗自定义快捷项：今天之后的第一个周一。
 *
 * 注意解析方式 —— `new Date('2026-08-11')` 按 **UTC** 解析（东八区拿到 8 月 10 日），
 * 所以这里按字段拆开用本地构造。库内部的日期算术也是这个规矩。
 */
function nextMonday(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  // getDay(): 0=周日。到下一个周一要走的天数（今天就是周一时走满 7 天）
  date.setDate(date.getDate() + ((8 - (date.getDay() || 7)) % 7 || 7));
  return day(date);
}
