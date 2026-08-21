# 公式 · 单元格公式

<ProPkgStatus pkg="@virt-table-pro/formula" status="shipped" product="formula" css="index.css" />

<ProDemo pkg="@virt-table-pro/formula" example-id="pro-sheet" />

<!--@include: @/.enterprise/formula/cell/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { vtFormula } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';

const SHEET_COLS = ['A', 'B', 'C', 'D', 'E'];

const table = new VirtTable(el, {
  // 初始公式直接写在格里，装载时自动搬进 _formulas
  list: [{ id: 1, A: '服务器', B: 1200, C: 3, D: '=B1*C1', E: '=SUM(D1:D10)' }],
  itemKey: 'id',
  estimatedSize: 32,
  columns: [
    { key: 'id', title: '', width: 44, fixed: 'left' }, // 行号列，不参与公式
    ...SHEET_COLS.map((k) => ({ key: k, title: k, width: 110, resizable: true })),
  ],
  plugins: [
    vtFormula({
      columns: SHEET_COLS, // 显式给一份，列字母就钉死了
      onActiveCellChange: (ref) => (fxLabel.textContent = ref ?? '—'),
      onRecalculated: ({ changed, errors }) => console.log(changed, errors),
    }),
    vtCellEditor({ trigger: 'dblclick' }), // 编辑浮层由核心插件提供
  ],
});
```

<!--@include: @/.enterprise/formula/cell/s1.md-->
