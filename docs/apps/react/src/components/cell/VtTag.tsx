import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import { VtTag } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

/** 值 → 文案 + 配色的**字典**（不是候选集：VtTag 不参与选择） */
const STATUS = [
  { value: 'run', label: '运行中', color: '#10b981' },
  { value: 'queued', label: '排队', color: '#f59e0b' },
  { value: 'done', label: '已完成', color: '#2563eb' },
  { value: 'failed', label: '失败', color: '#ef4444' },
];

/** 语义色版本：不写死色值，跟着主题走 */
const RESULT = [
  { value: 'pass', label: '通过', variant: 'success' as const },
  { value: 'warn', label: '告警', variant: 'warning' as const },
  { value: 'fail', label: '不通过', variant: 'danger' as const },
];

const LEVELS = ['青铜', '白银', '黄金', '铂金', '钻石'];

const columns: ReactTableColumn[] = [
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

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `任务 ${i}`,
  status: STATUS[i % STATUS.length]!.value,
  result: RESULT[i % RESULT.length]!.value,
  level: LEVELS[i % LEVELS.length],
  levelIndex: i % LEVELS.length,
  owner: i % 4 === 0 ? '' : `成员 ${i % 7}`,
}));

export default function VtTagTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtTag 标签</h3>
      <div className="status-text">
        VtTag：纯展示，没有 renderEditor —— 它没有候选集，值本身就是内容，配色能按行算。
        要「从候选集里选、选中的画成胶囊」用 VtSelect({'{'} display: "tag" {'}'})：胶囊外观
        两者共用同一个工厂，长相必然一致，差别只在能不能选。
      </div>
      <div style={{ width: 900, height: 600 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true }}
        />
      </div>
    </div>
  );
}
