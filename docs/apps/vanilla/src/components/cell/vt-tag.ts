import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { VtTag } from '@virt-table/vanilla/components';

/** 值 → 文案 + 配色的**字典**（不是候选集：VtTag 不参与选择） */
const STATUS = [
  { value: 'run', label: '运行中', color: '#10b981' },
  { value: 'queued', label: '排队', color: '#f59e0b' },
  { value: 'done', label: '已完成', color: '#2563eb' },
  { value: 'failed', label: '失败', color: '#ef4444' },
];

/** 语义色版本：不写死色值，跟着主题走（`--vt-color-success` 等） */
const RESULT = [
  { value: 'pass', label: '通过', variant: 'success' as const },
  { value: 'warn', label: '告警', variant: 'warning' as const },
  { value: 'fail', label: '不通过', variant: 'danger' as const },
];

const LEVELS = ['青铜', '白银', '黄金', '铂金', '钻石'];

export function bootstrapTableVtTag(root: HTMLElement): () => void {
  const rowCount = 5000;

  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 70, align: 'center' },
    { key: 'name', title: '任务', width: 110 },
    // ① 字典：行里存 code，显示文案 + 逐项自定义色
    VtTag({ key: 'status', title: '状态（字典）', width: 150, options: STATUS }),
    // ② 字典 + 语义色：颜色跟主题，不写死
    VtTag({ key: 'result', title: '结果（语义色）', width: 140, options: RESULT }),
    // ③ 不给 options：值本身就是标签文案
    VtTag({ key: 'level', title: '等级（值即文案）', width: 150 }),
    // ④ 按行动态上色：优先级最高，压过列级 variant
    VtTag({
      key: 'level',
      title: '等级（按行上色）',
      width: 150,
      color: (row) => ((row as { levelIndex: number }).levelIndex >= 3 ? '#a855f7' : undefined),
    }),
    // ⑤ 空值：不画空胶囊，走 placeholder
    VtTag({ key: 'owner', title: '负责人（可空）', width: 130, placeholder: '—' }),
  ];

  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    name: `任务 ${i}`,
    status: STATUS[i % STATUS.length]!.value,
    result: RESULT[i % RESULT.length]!.value,
    level: LEVELS[i % LEVELS.length],
    levelIndex: i % LEVELS.length,
    owner: i % 4 === 0 ? '' : `成员 ${i % 7}`,
  }));

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:900px;height:600px;" class="demo-container" id="vtContainer"></div>
`;

  const container = root.querySelector('#vtContainer') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
  });

  statusEl.textContent =
    'VtTag：纯展示，没有 renderEditor —— 它没有候选集，值本身就是内容，' +
    '配色能按行算。要「从候选集里选、选中的画成胶囊」用 VtSelect({ display: "tag" })：' +
    '胶囊外观两者共用同一个工厂，长相必然一致，差别只在能不能选。';

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
