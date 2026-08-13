import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { VtRate } from '@virt-table/vanilla/components';

export function bootstrapTableVtRate(root: HTMLElement): () => void {
  const rowCount = 5000;

  let lastChange = '（未操作）';

  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    { key: 'name', title: '名称', width: 160 },
    VtRate({
      key: 'score',
      title: '评分（可点）',
      width: 160,
      onChange: (v, row) => {
        lastChange = `${(row as any).name} → ${v}`;
        refresh();
      },
    }),
    // 半星：点星的左半给 .5
    VtRate({ key: 'half', title: '半星 + 分值', width: 200, allowHalf: true, showText: true }),
    VtRate({ key: 'stars', title: '10 星制', width: 260, count: 10 }),
    VtRate({ key: 'fixed', title: '只读', width: 160, disabled: true }),
  ];

  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    name: `条目 ${i}`,
    score: (i % 5) + 1,
    half: ((i % 10) + 1) / 2,
    stars: (i % 10) + 1,
    fixed: (i % 5) + 1,
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

  function refresh() {
    statusEl.textContent = `VtRate：点一下即写回（不需要 vtCellEditor）。半星靠「底层空心星 + 上层按百分比裁剪的实心星」实现 · 最近一次 onChange：${lastChange}`;
  }
  refresh();

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
