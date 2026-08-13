import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

/**
 * 客户端分页（默认模式）：把全量数据交给表格，翻页 / 切换每页条数 / 排序 / 筛选
 * 全部由表格自己处理，**不用写 onPageChange，也不用管 total**。
 *
 * 与服务端模式（`manualPagination: true`，见 feature/pagination）的差别就是那一个开关。
 */
const ROW_COUNT = 2000;

interface Row {
  id: number;
  name: string;
  dept: string;
  score: number;
}

const DEPTS = ['工程部', '设计部', '市场部'];

export function bootstrapTablePaginationClient(root: HTMLElement): () => void {
  const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: DEPTS[i % DEPTS.length]!,
    score: 40 + ((i * 17) % 60),
  }));

  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 90, align: 'center', sortable: true },
    { key: 'name', title: '姓名', width: 200 },
    {
      key: 'dept',
      title: '部门',
      width: 160,
      align: 'center',
      filters: DEPTS.map((d) => ({ label: d, value: d })),
    },
    { key: 'score', title: '分数', width: 120, align: 'right', sortable: true },
  ];

  root.innerHTML = `
    <div class="demo-hint">
      客户端分页（默认）：全量 ${ROW_COUNT} 条一次性交给表格，翻页只换切片。
      total 由筛选后的行数派生 —— 试试筛选部门，总数会跟着变，页码自动回到第 1 页。
      排序作用于全量数据而不是当前页。
    </div>
    <div class="virt-table-controls">
      <button id="btnPage7">跳到第 7 页</button>
      <button id="btnFilter">筛「工程部」</button>
      <button id="btnClear">清空筛选</button>
      <button id="btnSave">存状态</button>
      <button id="btnLoad">还原状态</button>
    </div>
    <div class="status-text" id="status"></div>
    <div style="width:100%;height:520px;" class="demo-container" id="tableContainer"></div>
  `;
  const container = root.querySelector('#tableContainer') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    stripe: true,
    // 传了 pagination 就有分页器；不开 manualPagination 即客户端分页
    pagination: { pageSize: 20, pageSizes: [20, 50, 100] },
  });

  const syncStatus = (): void => {
    const p = table.getPagination();
    statusEl.textContent = `第 ${p.page} 页 · 每页 ${p.pageSize} 条 · 共 ${p.total} 条（筛选后）`;
  };
  syncStatus();

  const q = (id: string) => root.querySelector(id) as HTMLButtonElement;
  let saved: string | null = null;
  q('#btnPage7').onclick = () => {
    table.setPage(7);
    syncStatus();
  };
  q('#btnFilter').onclick = () => {
    table.setColumnFilter('dept', ['工程部']);
    syncStatus();
  };
  q('#btnClear').onclick = () => {
    table.clearAllFilters();
    syncStatus();
  };
  q('#btnSave').onclick = () => {
    saved = JSON.stringify(table.getState());
    statusEl.textContent = '已存下当前列宽 / 列序 / 排序 / 筛选 / 分页';
  };
  q('#btnLoad').onclick = () => {
    if (!saved) return;
    table.setState(JSON.parse(saved));
    syncStatus();
  };

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
