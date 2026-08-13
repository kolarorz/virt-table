import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

/**
 * 按值自动合并（列 `mergeKey`）。
 *
 * 10 万行，三种段长同时在场：
 *   - 部门：8 行一段（常规）
 *   - 状态：约 3.3 万行一段（长段，用来看「重锚」与虚拟滚动是否还成立）
 *   - 大区：跨两个字段拼键（`mergeKey` 返回自定义键）
 * 排序照常可用 —— 分段在管线末端重算，这是它与静态 `merges` 的关键差别。
 */
const ROW_COUNT = 100_000;
const REGIONS = ['华东', '华北', '华南'];
const STATUSES = ['待处理', '进行中', '已完成'];

interface Row {
  id: number;
  region: string;
  dept: string;
  status: string;
  owner: string;
  amount: number;
}

export function bootstrapTableAutoMerge(root: HTMLElement): () => void {
  const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i,
    region: REGIONS[(i / 25_000) | 0] ?? '华南',
    dept: 'D' + ((i / 8) | 0),
    status: STATUSES[(i / 33_333) | 0] ?? '已完成',
    owner: '员工 ' + i,
    amount: ((i * 37) % 900) + 100,
  }));

  const columns: VirtTableColumn<Row>[] = [
    // 拼键：只有「大区 + 状态」都相同才合并
    {
      key: 'region',
      title: '大区（拼键合并）',
      width: 150,
      mergeKey: (row) => `${row.region}/${row.status}`,
      align: 'center',
      vAlign: 'middle',
    },
    {
      key: 'status',
      title: '状态（长段 + 重锚）',
      width: 160,
      mergeKey: true,
      align: 'center',
      vAlign: 'middle',
      sortable: true,
    },
    {
      key: 'dept',
      title: '部门（8 行一段）',
      width: 150,
      mergeKey: true,
      align: 'center',
      vAlign: 'middle',
      sortable: true,
    },
    { key: 'owner', title: '负责人', width: 160 },
    { key: 'amount', title: '金额', width: 120, align: 'right', sortable: true },
  ];

  root.innerHTML = `
    <div class="status-text">
      ${ROW_COUNT.toLocaleString()} 行 · 滚到长段中间时合并格会重锚到可视区顶部（虚拟滚动下的必然）·
      <code>mergeKey</code> 不禁用排序，点表头试试
    </div>
    <div style="width:100%;height:600px;" class="demo-container" id="tableContainer"></div>
  `;
  const container = root.querySelector('#tableContainer') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    // 合并 + 动态行高是既有的敏感组合，自动合并建议配固定行高
    fixedSize: true,
    border: true,
    stripe: true,
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
