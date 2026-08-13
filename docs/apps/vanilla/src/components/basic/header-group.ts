import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtColumnPanel } from '@virt-table/vanilla/plugins';

/**
 * 多级分组表头 / 表尾 + 横向虚拟列表。
 *
 * 列配置写成「列树」：带 children 的节点是分组节点（只在表头占一格、横跨其全部叶子），
 * 叶子才是真正的数据列。列很多时表头与表体一样只渲染视口内的列——
 * 跨越视口边界的分组格会被裁剪，窗口外整段折叠成一个留白格。
 *
 * 开了 showSummary 后表尾也按同一棵列树渲染成多级分组表尾（与表头同序：
 * 最外层分组在上、叶子小计在下），分组格的聚合范围是它旗下全部叶子列。
 */

/** 12 个季度分组 × 4 个指标 = 48 个叶子列，足够触发横向虚拟化 */
const QUARTERS = Array.from({ length: 12 }, (_, i) => {
  const year = 2023 + Math.floor(i / 4);
  return { year, q: (i % 4) + 1 };
});

const METRICS = [
  { key: 'revenue', title: '营收' },
  { key: 'cost', title: '成本' },
  { key: 'profit', title: '利润' },
  { key: 'rate', title: '毛利率' },
];

const ROW_COUNT = 2000;

function buildColumns(): VirtTableColumn[] {
  const yearMap = new Map<number, VirtTableColumn>();
  for (const { year, q } of QUARTERS) {
    let yearCol = yearMap.get(year);
    if (!yearCol) {
      // 分组节点上的 summary 会聚合它旗下全部叶子列 × 全部行
      yearCol = { key: `y_${year}`, title: `${year} 年`, width: 0, summary: 'sum', children: [] };
      yearMap.set(year, yearCol);
    }
    yearCol.children!.push({
      key: `y${year}q${q}`,
      title: `Q${q}`,
      width: 0,
      // 季度小计只统计营收，用 summaryMethod 从摊平值里挑（每行 4 个指标，营收在第 0 个）
      summaryMethod: (values) => {
        let sum = 0;
        for (let i = 0; i < values.length; i += METRICS.length) sum += Number(values[i]) || 0;
        return `营收 ${sum}`;
      },
      children: METRICS.map((m) => ({
        key: `y${year}q${q}_${m.key}`,
        title: m.title,
        width: 110,
        align: 'right' as const,
        headerAlign: 'center' as const,
        // 毛利率是百分比字符串，不做求和
        ...(m.key === 'rate' ? { footerValue: '—' } : { summary: 'sum' as const }),
      })),
    });
  }

  return [
    // 冻结列同样支持分组：fixed 写在分组上，会自动下发给所有子列
    {
      key: 'g_base',
      title: '基础信息',
      width: 0,
      fixed: 'left',
      children: [
        // 首列叶子格默认自动放合计标签；这里显式给空值把标签让给下一列（序号列太窄会折行）
        { key: 'index', title: '#', width: 56, type: 'index', footerValue: '' },
        { key: 'name', title: '门店', width: 140, sortable: true, footerValue: '合计' },
      ],
    },
    ...yearMap.values(),
    {
      key: 'g_total',
      title: '汇总',
      width: 0,
      fixed: 'right',
      // 分组格用 renderFooter 自定义：可以拿到 rows / leafColumns / 自动聚合结果
      renderFooter: ({ rows }) => `<b>${rows.length} 家</b>`,
      children: [
        { key: 'total', title: '合计营收', width: 130, align: 'right', sortable: true, summary: 'sum' },
      ],
    },
  ];
}

export function bootstrapTableHeaderGroup(root: HTMLElement): () => void {
  const columns = buildColumns();

  const list = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, any> = { id: i, name: `门店 ${i + 1}` };
    let total = 0;
    for (const { year, q } of QUARTERS) {
      const revenue = 200 + ((i * 37 + year + q * 13) % 800);
      const cost = Math.round(revenue * (0.45 + ((i + q) % 30) / 100));
      row[`y${year}q${q}_revenue`] = revenue;
      row[`y${year}q${q}_cost`] = cost;
      row[`y${year}q${q}_profit`] = revenue - cost;
      row[`y${year}q${q}_rate`] = `${(((revenue - cost) / revenue) * 100).toFixed(1)}%`;
      total += revenue;
    }
    row.total = total;
    return row;
  });

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="btnCols">列设置</button>
      <button class="virt-table-btn" id="btnScrollMid">横向滚到中间</button>
      <button class="virt-table-btn" id="btnScrollEnd">横向滚到最右</button>
      <button class="virt-table-btn" id="btnHalf">只留一半数据（看表尾联动）</button>
    </div>
    <div id="status" class="status-text"></div>
    <div style="width:900px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    colBuffer: 2,
    border: true,
    stripe: true,
    // 开启后表尾按同一棵列树渲染成多级分组表尾
    showSummary: true,
    plugins: [vtColumnPanel()],
  });

  const leafCount = table.getVisibleColumns().length;
  const depth = table.getHeaderDepth();
  status.textContent =
    `多级分组表头 + 分组表尾：${list.length} 行 × ${leafCount} 个叶子列，表头/表尾各 ${depth} 层；` +
    '两者与表体一同做横向虚拟化（滚动时只渲染视口内的列）。';

  const btnCols = root.querySelector('#btnCols') as HTMLElement;
  const btnMid = root.querySelector('#btnScrollMid') as HTMLElement;
  const btnEnd = root.querySelector('#btnScrollEnd') as HTMLElement;
  const btnHalf = root.querySelector('#btnHalf') as HTMLElement;
  let halved = false;
  const onCols = () => table.toggleColumnPanel(btnCols);
  const onMid = () => table.scrollToCell(0, Math.floor(leafCount / 2));
  const onEnd = () => table.scrollToCell(0, leafCount - 1);
  const onHalf = () => {
    halved = !halved;
    table.setList(halved ? list.slice(0, Math.floor(list.length / 2)) : list);
    status.textContent = halved
      ? '数据减半 —— 表尾各级小计随当前视图重算'
      : '数据已恢复 —— 表尾各级小计随当前视图重算';
  };
  btnCols.addEventListener('click', onCols);
  btnMid.addEventListener('click', onMid);
  btnEnd.addEventListener('click', onEnd);
  btnHalf.addEventListener('click', onHalf);

  return () => {
    btnCols.removeEventListener('click', onCols);
    btnMid.removeEventListener('click', onMid);
    btnEnd.removeEventListener('click', onEnd);
    btnHalf.removeEventListener('click', onHalf);
    table.destroy();
    root.innerHTML = '';
  };
}
