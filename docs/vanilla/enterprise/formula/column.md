# 公式 · 计算列

<ProPkgStatus pkg="@virt-table-pro/formula" status="shipped" product="formula" css="none" />

<ProDemo pkg="@virt-table-pro/formula" example-id="pro-formula" />

<!--@include: @/.enterprise/formula/column/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtFormulaColumn } from '@virt-table-pro/formula';

const table = new VirtTable(el, {
  list: rows,
  itemKey: 'id',
  estimatedSize: 40,
  columns: [
    { key: 'amount', title: '金额', width: 120, sortable: true },
    // 公式列**照常自己定义** —— 插件只负责算与写回，不会凭空造列
    { key: 'tax', title: '税额', width: 120, align: 'right', sortable: true },
    { key: 'total', title: '合计', width: 120, align: 'right', sortable: true },
    { key: 'grade', title: '评级', width: 100, align: 'center', sortable: true },
  ],
  plugins: [
    vtFormulaColumn({
      columns: {
        tax: 'ROUND(amount * 0.06, 2)',
        total: 'amount + tax', // 可以引用另一个公式列，按拓扑序求值
        grade: 'IF(amount > 60000, "A", IF(amount > 30000, "B", "C"))',
      },
      onError: ({ colKey, code, detail }) => console.warn(colKey, code, detail),
    }),
  ],
});
```

<!--@include: @/.enterprise/formula/column/s1.md-->
