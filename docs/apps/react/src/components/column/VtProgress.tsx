import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import { VtProgress } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const columns: ReactTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '任务', width: 160 },
  VtProgress({ key: 'progress', title: '进度', width: 200 }),
  // 色阶：30 以下红、70 以下黄、其余默认主色
  VtProgress({
    key: 'health',
    title: '健康度（色阶）',
    width: 200,
    thresholds: [
      { lte: 30, variant: 'danger' },
      { lte: 70, variant: 'warning' },
    ],
  }),
  // 非百分制 + 自定义文案
  VtProgress({ key: 'score', title: '得分（满分 5）', width: 200, max: 5, format: (v) => `${v} / 5` }),
  // 值缺失/非数字：条画 0，文字如实显示
  VtProgress({ key: 'unknown', title: '未评估', width: 180 }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `任务 ${i}`,
  progress: i % 101,
  health: (i * 7) % 101,
  score: (i % 5) + 1,
  unknown: i % 3 === 0 ? null : i % 3 === 1 ? '待评估' : i % 101,
}));

export default function VtProgressTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtProgress 进度条</h3>
      <div className="status-text">
        VtProgress：纯展示。最后一列演示「值不是数字」时的表现 —— 条画成 0
        但文字显示原值/短横，不冒充「真的是 0」
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
