import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

export function bootstrapTableFooterMerge(root: HTMLElement): () => void {
  const colCount = 8;
  const columns: VirtTableColumn[] = Array.from({ length: colCount }, (_, i) => ({
    key: `col_${i}`,
    title: i === 0 ? '名称' : i < 4 ? `Q${i}` : `指标 ${i - 3}`,
    width: i === 0 ? 180 : 140,
  }));

  const list = Array.from({ length: 100 }, (_, i) => {
    const row: Record<string, any> = { id: i, col_0: faker.person.fullName() };
    for (let c = 1; c < colCount; c++) {
      row[`col_${c}`] = String(Math.floor(Math.random() * 1000));
    }
    return row;
  });

  const footerData = [
    ['合计', '', '', '', '100', '200', '300', '400'],
    ['平均', '', '', '', '25', '50', '75', '100'],
  ];
  const footerMerges = [
    { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 4 },
    { rowIndex: 1, colIndex: 0, rowspan: 1, colspan: 4 },
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
    footerData,
    footerMerges,
    border: true,
  });

  status.textContent = `表尾合并：${list.length} 行 × ${colCount} 列（两行表尾 + 合计/平均跨列合并）`;

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
