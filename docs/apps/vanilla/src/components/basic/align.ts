import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

const ROW_COUNT = 1000;

export function bootstrapTableAlign(root: HTMLElement): () => void {
  root.innerHTML = `
    <h3 class="demo-title">对齐方式 — 列级对齐</h3>
    <div class="status-text">headerAlign/footerAlign 覆盖 align；headerVAlign/footerVAlign 覆盖 vAlign</div>
    <div style="width:800px;height:500px;" class="demo-container" id="alignTable1"></div>

    <h3 class="demo-title" style="margin-top:32px;">对齐方式 — 单元格独立对齐</h3>
    <div class="status-text">通过 cellStyle 回调为每个单元格独立设置 align 和 vAlign</div>
    <div style="width:800px;height:340px;" class="demo-container" id="alignTable2"></div>
  `;

  const cols1: VirtTableColumn[] = [
    { key: 'col_0', title: 'headerAlign: center', width: 160, align: 'left', headerAlign: 'center', vAlign: 'top', headerVAlign: 'middle' },
    { key: 'col_1', title: 'footerAlign: right', width: 160, align: 'center', footerAlign: 'right', footerVAlign: 'bottom' },
    { key: 'col_2', title: 'align: right / vAlign: bottom', width: 180, align: 'right', vAlign: 'bottom' },
    { key: 'col_3', title: 'headerAlign: left', width: 160, align: 'center', headerAlign: 'left', headerVAlign: 'top' },
    { key: 'col_4', title: 'all center', width: 140, align: 'center', vAlign: 'middle', headerAlign: 'center', headerVAlign: 'middle', footerAlign: 'center', footerVAlign: 'middle' },
  ];

  const list1: Record<string, any>[] = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row = { id: i };
    for (let c = 0; c < 5; c++) {
      row[`col_${c}`] = c === 0 ? faker.lorem.sentences(2) : `Row ${i} Col ${c}`;
    }
    return row;
  });

  const table1 = new VirtTable(root.querySelector('#alignTable1'), {
    list: list1,
    columns: cols1,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    showFooter: true,
    footerData: [['Total', '100', '200', '300', 'Sum']],
  });

  const alignMap: Record<string, { align: string; vAlign: string }> = {
    '0,0': { align: 'left', vAlign: 'top' },
    '0,1': { align: 'center', vAlign: 'top' },
    '0,2': { align: 'right', vAlign: 'top' },
    '1,0': { align: 'left', vAlign: 'middle' },
    '1,1': { align: 'center', vAlign: 'middle' },
    '1,2': { align: 'right', vAlign: 'middle' },
    '2,0': { align: 'left', vAlign: 'bottom' },
    '2,1': { align: 'center', vAlign: 'bottom' },
    '2,2': { align: 'right', vAlign: 'bottom' },
  };

  const cols2: VirtTableColumn[] = [
    { key: 'label', title: '行标签', width: 120 },
    { key: 'c0', title: 'left', width: 200 },
    { key: 'c1', title: 'center', width: 200 },
    { key: 'c2', title: 'right', width: 200 },
  ];

  const list2: Record<string, any>[] = [
    { id: 0, label: 'top', c0: 'left/top', c1: 'center/top', c2: 'right/top' },
    { id: 1, label: 'middle', c0: 'left/middle', c1: 'center/middle', c2: 'right/middle' },
    { id: 2, label: 'bottom', c0: 'left/bottom', c1: 'center/bottom', c2: 'right/bottom' },
  ];

  const table2 = new VirtTable(root.querySelector('#alignTable2'), {
    list: list2,
    columns: cols2,
    itemKey: 'id',
    estimatedSize: 80,
    buffer: 4,
    border: true,
    cellStyle: (col, row) => {
      if (col.key === 'label') return '';
      const rowIdx = row.id;
      const colIdx = parseInt(col.key.replace('c', ''));
      const a = alignMap[`${rowIdx},${colIdx}`];
      if (!a) return '';
      return `text-align:${a.align};vertical-align:${a.vAlign};height:80px`;
    },
  });

  return () => {
    table1.destroy();
    table2.destroy();
  };
}
