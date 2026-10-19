# 透视表

<ProPkgStatus pkg="@virt-table-pro/pivot" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/pivot" example-id="pro-pivot" />

<!--@include: @/.enterprise/pivot/s0.md-->

```tsx
import { useMemo, useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtPivot } from '@virt-table-pro/pivot';
import '@virt-table-pro/pivot/index.css'; // 只有一条规则（条数徽标），其余外观全是核心的

export function Report() {
  const tableRef = useRef<VirtTableRef>(null);

  // 必须 memo：options 里的插件实例每次渲染换一份会重建整张表
  const options = useMemo(
    () => ({
      list: orders,
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
    }),
    [],
  );

  return (
    <>
      <button
        onClick={() =>
          tableRef.current?.setPivotConfig({
            rows: ['dept'],
            values: [{ field: 'amount', agg: 'avg' }],
          })
        }
      >
        按部门看平均
      </button>
      <button onClick={() => tableRef.current?.setPivotConfig(null)}>退回明细</button>

      {/* columns 是明细列：不透视时用它，setPivotConfig(null) 也会还回来 */}
      <VirtTableReact ref={tableRef} columns={columns} options={options} />
    </>
  );
}
```

`VirtTableRef extends VirtTablePluginApi`，而 `vtPivot` 用 `declare module` 把
`setPivotConfig` / `getPivotConfig` / `getPivotResult` 合并了进去 —— 所以 React 端 ref 上
这三个方法**直接有类型**。

<!--@include: @/.enterprise/pivot/s1.md-->
