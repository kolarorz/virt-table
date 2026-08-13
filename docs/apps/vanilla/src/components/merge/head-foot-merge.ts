import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

export function bootstrapTableHeadFootMerge(root: HTMLElement): () => void {
  const colCount = 10;
  const columns: VirtTableColumn[] = Array.from({ length: colCount }, (_, i) => ({
    key: `col_${i}`,
    title: `Col ${i}`,
    width: 150,
  }));

  const list = Array.from({ length: 200 }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < colCount; c++) {
      row[`col_${c}`] = `${i}-${c}`;
    }
    return row;
  });

  const headerData = [
    ['个人信息', '', '', '成绩', '', '', '备注', '', '', ''],
    ['姓名', '年龄', '性别', '语文', '数学', '英语', '评语1', '评语2', '评语3', '总评'],
  ];
  const headerMerges = [
    { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 6, rowspan: 1, colspan: 4 },
  ];

  const footerData = [['', '', '', '合计', '', '', '', '', '', '总计']];
  const footerMerges = [
    { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 6 },
  ];

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:800px;height:600px;" class="demo-container" id="virtTableContainer"></div>
`;

  const container = root.querySelector('#virtTableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    headerData,
    headerMerges,
    footerData,
    footerMerges,
    border: true,
  });

  status.textContent = `表头 + 表尾合并：${list.length} 行 × ${colCount} 列（分组表头 + 汇总表尾）`;

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
