import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

interface Row { id: number; name: string; dept: string; qty: number; price: number }

/**
 * 分页示例（**服务端模式**，靠 manualPagination 开启）：表格只渲染分页器 + 派发 onPageChange，
 * 不做任何数据切片。这里用本地 200 条数据模拟「服务端」，在 onPageChange
 * 回调里按页切片再 setList，并 setTotal 回填总数——真实项目里换成接口请求即可。
 */
export function bootstrapTablePagination(root: HTMLElement): () => void {
  const depts = ['工程部', '设计部', '市场部', '财务部'];
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80, sortable: true },
    { key: 'name', title: '姓名', width: 220 },
    { key: 'dept', title: '部门', width: 160 },
    { key: 'qty', title: '数量', width: 140, align: 'right' },
    { key: 'price', title: '单价', width: 140, align: 'right' },
  ];

  // 模拟服务端数据源（真实场景中在后端）
  const TOTAL = 200;
  const db: Row[] = Array.from({ length: TOTAL }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length],
    qty: faker.number.int({ min: 1, max: 20 }),
    price: faker.number.int({ min: 5, max: 500 }),
  }));

  // 模拟「服务端」按页取数
  const fetchPage = (page: number, pageSize: number): Row[] => {
    const start = (page - 1) * pageSize;
    return db.slice(start, start + pageSize);
  };

  const initialPageSize = 20;

  root.innerHTML = `
    <div class="demo-hint">服务端模式(manualPagination: true):表格只渲染分页器并派发 onPageChange,不做数据切片。翻页/跳页/切换每页条数时,在回调里按页取数后 setList + setTotal。想让表格自己切片见「客户端分页」示例。</div>
    <div style="width:820px;height:520px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list: fetchPage(1, initialPageSize),
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    // 不开这个就是默认的客户端分页（表格自己切片），见 feature/pagination-client
    manualPagination: true,
    pagination: {
      total: TOTAL,
      page: 1,
      pageSize: initialPageSize,
      pageSizes: [10, 20, 50, 100],
    },
    onPageChange: (page, pageSize) => {
      // 真实项目:此处发起接口请求,拿到当前页数据与总数后回填
      table.setList(fetchPage(page, pageSize));
      table.setTotal(TOTAL);
    },
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
