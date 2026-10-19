# 单元格迷你图

<ProPkgStatus pkg="@virt-table-pro/charts" status="partial" product="charts" css="index.css" />

<ProDemo pkg="@virt-table-pro/charts" example-id="pro-sparkline" />

<!--@include: @/.enterprise/charts/s0.md-->

```tsx
import { useMemo, useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtSparkline } from '@virt-table-pro/charts';
import '@virt-table-pro/charts/index.css';

export function Products() {
  const tableRef = useRef<VirtTableRef>(null);

  /*
   * ⚠️ plugins 必须 useMemo —— 每次渲染新建一个数组会让插件反复卸载重装，
   * 那会把 `range: 'shared'` 的整列极值缓存一并丢掉，每次都重扫全表。
   */
  const plugins = useMemo(
    () => [
      vtSparkline({
        columns: {
          // field 默认就是列 key，行上有 row.weekly 就不用写
          weekly: { type: 'line', markers: ['min', 'max'], range: 'shared' },
          pnl: { type: 'winloss' },
        },
      }),
    ],
    [],
  );

  return (
    <VirtTableReact
      ref={tableRef}
      list={products}
      columns={[
        { key: 'name', title: '产品', width: 140 },
        { key: 'weekly', title: '12 周趋势', width: 180 },
        { key: 'pnl', title: '近 10 日盈亏', width: 140 },
      ]}
      itemKey="id"
      estimatedSize={40}
      plugins={plugins}
    />
  );
}
```

<!--@include: @/.enterprise/charts/s1.md-->
