import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

export function bootstrapTableHeaderMerge(root: HTMLElement): () => void {
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
    ['基本信息', '', '', '评分信息', '', '', '其他', '', '', ''],
    ['Col 0', 'Col 1', 'Col 2', 'Col 3', 'Col 4', 'Col 5', 'Col 6', 'Col 7', 'Col 8', 'Col 9'],
  ];
  const headerMerges = [
    { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 3 },
    { rowIndex: 0, colIndex: 6, rowspan: 1, colspan: 4 },
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
    border: true,
  });

  status.textContent = `表头合并：${list.length} 行 × ${colCount} 列（两行表头 + 三个分组合并）`;

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
