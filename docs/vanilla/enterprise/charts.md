# 单元格迷你图

<ProPkgStatus pkg="@virt-table-pro/charts" status="partial" product="charts" css="index.css" />

<ProDemo pkg="@virt-table-pro/charts" example-id="pro-sparkline" />

<!--@include: @/.enterprise/charts/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtSparkline } from '@virt-table-pro/charts';
import '@virt-table-pro/charts/index.css';

const table = new VirtTable(el, {
  list: products,
  columns: [
    { key: 'name', title: '产品', width: 140 },
    { key: 'weekly', title: '12 周趋势', width: 180 },
    { key: 'pnl', title: '近 10 日盈亏', width: 140 },
  ],
  itemKey: 'id',
  estimatedSize: 40, // 核心的必填项：list / columns / itemKey / estimatedSize
  plugins: [
    vtSparkline({
      columns: {
        // field 默认就是列 key，行上有 row.weekly 就不用写
        weekly: { type: 'line', markers: ['min', 'max'], range: 'shared' },
        pnl: { type: 'winloss', tooltip: ({ index, value }) => `第 ${index + 1} 日：${value! > 0 ? '盈' : '亏'}` },
      },
    }),
  ],
});

// 导出与打印拿不到 DOM，用这条单独出一段 SVG
const svg = table.renderSparklineSvg([12, 18, 15, 22], 'weekly');
```

<!--@include: @/.enterprise/charts/s1.md-->
