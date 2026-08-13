import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { VtProgress } from '@virt-table/vanilla/components';

export function bootstrapTableVtProgress(root: HTMLElement): () => void {
  const rowCount = 5000;

  const columns: VirtTableColumn[] = [
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

  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    name: `任务 ${i}`,
    progress: i % 101,
    health: (i * 7) % 101,
    score: (i % 5) + 1,
    unknown: i % 3 === 0 ? null : i % 3 === 1 ? '待评估' : (i % 101),
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
    'VtProgress：纯展示。最后一列演示「值不是数字」时的表现 —— 条画成 0 但文字显示原值/短横，不冒充「真的是 0」';

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
