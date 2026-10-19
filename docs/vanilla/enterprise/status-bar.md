# 状态栏（选区聚合）

<ProPkgStatus pkg="@virt-table-pro/status-bar" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/status-bar" example-id="pro-status-bar" />

<!--@include: @/.enterprise/status-bar/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtStatusBar } from '@virt-table-pro/status-bar';
import '@virt-table-pro/status-bar/index.css';

const CNY = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });

const table = new VirtTable(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40, // 核心的必填项：list / columns / itemKey / estimatedSize
  plugins: [
    // 选区聚合要它 —— 不装也能用，那时只有左侧的行数统计
    vtCellSelection(),
    vtStatusBar({
      aggregates: ['count', 'sum', 'avg', 'max'],
      counts: ['total', 'filtered', 'checked'],
      // 选区只覆盖一列时才敢加单位（跨列时不同列的单位不一样）
      // ⚠️ 用 Intl 而不是拼 `¥${v}`：后者在负数上会给出 `¥-87,355`，见下文
      format: (v, kind, { columnKeys }) =>
        columnKeys.length === 1 && columnKeys[0] === 'amount' && kind !== 'count'
          ? CNY.format(v)
          : v.toLocaleString(),
    }),
  ],
});

// 不依赖 DOM，可以拿去自己渲染
const summary = table.getStatusBarSummary();
document.querySelector('#toggle')!.addEventListener('click', () => {
  table.showStatusBar();
});
```

<!--@include: @/.enterprise/status-bar/s1.md-->
