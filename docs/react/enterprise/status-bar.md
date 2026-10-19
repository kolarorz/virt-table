# 状态栏（选区聚合）

<ProPkgStatus pkg="@virt-table-pro/status-bar" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/status-bar" example-id="pro-status-bar" />

<!--@include: @/.enterprise/status-bar/s0.md-->

```tsx
import { useMemo, useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtStatusBar } from '@virt-table-pro/status-bar';
import '@virt-table-pro/status-bar/index.css';

export function Orders() {
  const tableRef = useRef<VirtTableRef>(null);

  /*
   * ⚠️ plugins 必须 useMemo —— 每次渲染新建一个数组会让插件反复卸载重装，
   * 状态栏那条会跟着闪，选区订阅也会掉。
   */
  const plugins = useMemo(
    () => [
      // 选区聚合要它 —— 不装也能用，那时只有左侧的行数统计
      vtCellSelection(),
      vtStatusBar({ aggregates: ['count', 'sum', 'avg', 'max'] }),
    ],
    [],
  );

  return (
    <>
      <button onClick={() => tableRef.current?.showStatusBar()}>显示 / 隐藏状态栏</button>
      <button onClick={() => console.log(tableRef.current?.getStatusBarSummary())}>读汇总</button>
      <VirtTableReact
        ref={tableRef}
        list={rows}
        columns={columns}
        itemKey="id"
        estimatedSize={40}
        plugins={plugins}
      />
    </>
  );
}
```

<!--@include: @/.enterprise/status-bar/s1.md-->
