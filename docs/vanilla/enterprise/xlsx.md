# 真 xlsx 与 PDF 导出

<ProPkgStatus pkg="@virt-table-pro/xlsx" status="shipped" css="none" />

<ProDemo pkg="@virt-table-pro/xlsx" example-id="pro-xlsx" />

<!--@include: @/.enterprise/xlsx/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtCellSelection, vtToolbar, vtExport } from '@virt-table/vanilla/plugins';
import { vtXlsx } from '@virt-table-pro/xlsx';

const table = new VirtTable(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40, // 核心的必填项：list / columns / itemKey / estimatedSize
  showSummary: true,
  plugins: [
    vtXlsx({
      sheetName: '订单',
      freeze: { rows: 1, cols: 2 }, // rows 数的是表头，分组表头会自动冻满
      numberFormats: { amount: '#,##0.00' },
      liveSummary: true, // 合计行写成活 SUBTOTAL 公式
    }),
    // 选区导出要它；不装的话 selectionOnly 会告警并退回全表
    vtCellSelection(),
    // 把「导出」那颗按钮留给 vtXlsx（核心那颗也叫导出，并排两颗很怪）
    vtToolbar(),
    vtExport({ toolbar: false }),
  ],
});

document.querySelector('#export-xlsx')!.addEventListener('click', () => {
  void table.exportXlsx();
});
document.querySelector('#export-pdf')!.addEventListener('click', () => {
  void table.exportPdf({ title: '订单明细', landscape: true });
});
```

<!--@include: @/.enterprise/xlsx/s1.md-->
