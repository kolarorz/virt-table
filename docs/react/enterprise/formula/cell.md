# 公式 · 单元格公式

<ProPkgStatus pkg="@virt-table-pro/formula" status="shipped" product="formula" css="index.css" />

<ProDemo pkg="@virt-table-pro/formula" example-id="pro-sheet" />

<!--@include: @/.enterprise/formula/cell/s0.md-->

```tsx
import { useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtCellEditor, vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtFormula } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';

const SHEET_COLS = ['A', 'B', 'C', 'D', 'E'];

export function Sheet() {
  const tableRef = useRef<VirtTableRef>(null);
  // 当前格用 ref 而不是 state：它只在事件里读，不参与渲染
  const activeRef = useRef<string | null>(null);

  return (
    <VirtTableReact
      ref={tableRef}
      columns={columns}
      options={{
        list: rows,
        itemKey: 'id',
        estimatedSize: 32,
        plugins: [
          vtFormula({
            columns: SHEET_COLS,
            onActiveCellChange: (ref) => (activeRef.current = ref),
          }),
          vtCellEditor({ trigger: 'dblclick' }),
          vtCellSelection(),
        ],
      }}
    />
  );
}
```

<!--@include: @/.enterprise/formula/cell/s1.md-->
