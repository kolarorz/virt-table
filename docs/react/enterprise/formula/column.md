# 公式 · 计算列

<ProPkgStatus pkg="@virt-table-pro/formula" status="shipped" product="formula" css="none" />

<ProDemo pkg="@virt-table-pro/formula" example-id="pro-formula" />

<!--@include: @/.enterprise/formula/column/s0.md-->

```tsx
import { useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtFormulaColumn } from '@virt-table-pro/formula';

const FORMULAS = {
  tax: 'ROUND(amount * 0.06, 2)',
  total: 'amount + tax',
} as const;

export function Table() {
  const tableRef = useRef<VirtTableRef>(null);
  const [rows, setRows] = useState(() => makeRows(1000));

  return (
    <VirtTableReact
      ref={tableRef}
      columns={columns}
      options={{
        list: rows,
        itemKey: 'id',
        estimatedSize: 40,
        plugins: [vtFormulaColumn({ columns: { ...FORMULAS } })],
      }}
    />
  );
}

// 换数据：先算再进表（见下方「求值时机」）
const next = await fetchRows();
tableRef.current?.evaluateFormulas(next);
setRows(next);
```

<!--@include: @/.enterprise/formula/column/s1.md-->
