# 真 xlsx 与 PDF 导出

<ProPkgStatus pkg="@virt-table-pro/xlsx" status="shipped" css="none" />

<ProDemo pkg="@virt-table-pro/xlsx" example-id="pro-xlsx" />

<!--@include: @/.enterprise/xlsx/s0.md-->

```tsx
import { useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtCellSelection, vtToolbar, vtExport } from '@virt-table/vanilla/plugins';
import { vtXlsx } from '@virt-table-pro/xlsx';

export function Orders() {
  const tableRef = useRef<VirtTableRef>(null);

  return (
    <>
      <button onClick={() => void tableRef.current?.exportXlsx()}>导出 xlsx</button>
      <button onClick={() => void tableRef.current?.exportXlsx({ selectionOnly: true })}>
        导出选区
      </button>
      <button onClick={() => void tableRef.current?.exportPdf({ title: '订单明细', landscape: true })}>
        打印 / PDF
      </button>

      <VirtTableReact
        ref={tableRef}
        columns={columns}
        options={{
          list: rows,
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
        }}
      />
    </>
  );
}
```

`VirtTableRef extends VirtTablePluginApi`，而 `vtXlsx` 用 `declare module` 把
`exportXlsx` / `exportPdf` 合并了进去 —— 所以 React 端 ref 上这两个方法**直接有类型**，
不需要额外断言。

<!--@include: @/.enterprise/xlsx/s1.md-->
