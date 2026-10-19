# 透视表

<ProPkgStatus pkg="@virt-table-pro/pivot" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/pivot" example-id="pro-pivot" />

<!--@include: @/.enterprise/pivot/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtPivot } from '@virt-table-pro/pivot';
import '@virt-table-pro/pivot/index.css'; // 只有一条规则（条数徽标），其余外观全是核心的

const table = new VirtTable(el, {
  list: orders,
  columns, // 明细列：不透视时用它，setPivotConfig(null) 也会还回来
  itemKey: 'id', // ⚠️ 不要与维度字段同名（行 key 会写到这个字段上）
  estimatedSize: 40,
  plugins: [
    vtPivot({
      rows: ['region', 'dept'], // 行维度，顺序即层级
      columns: ['quarter'], // 列维度 → 多级分组表头
      values: [
        { field: 'amount', agg: 'sum', title: '金额' },
        { field: 'id', agg: 'count', title: '笔数' },
      ],
      // 源数据级的条件放这里 —— 列头筛选筛的是透视结果，见下文
      filter: (o) => o.status !== 'cancelled',
    }),
  ],
});

// 换个维度看
document.querySelector('#by-dept')!.addEventListener('click', () => {
  table.setPivotConfig({ rows: ['dept'], values: [{ field: 'amount', agg: 'avg' }] });
});
// 退回明细
document.querySelector('#off')!.addEventListener('click', () => {
  table.setPivotConfig(null);
});
```

<!--@include: @/.enterprise/pivot/s1.md-->
