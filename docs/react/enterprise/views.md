# 命名视图

<ProPkgStatus pkg="@virt-table-pro/views" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/views" example-id="pro-views" />

<!--@include: @/.enterprise/views/s0.md-->

```tsx
import { useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css';

export function OrdersTable() {
  // VirtTableRef extends VirtTablePluginApi —— 付费插件的 API 自动有类型
  const tableRef = useRef<VirtTableRef>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => tableRef.current?.toggleViewPanel(btnRef.current ?? undefined)}
      >
        视图
      </button>
      <VirtTableReact
        ref={tableRef}
        columns={columns}
        options={{
          list: rows,
          itemKey: 'id',
          estimatedSize: 40,
          plugins: [vtViews({ storageKey: 'orders-table' })],
        }}
      />
    </>
  );
}
```

<!--@include: @/.enterprise/views/s1.md-->
