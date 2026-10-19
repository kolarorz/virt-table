<!--
⚠️ 这一页目前是**孤儿页**：命名视图暂不作为付费能力出售，2026-08-31 起从侧边栏、定价页与
所有交叉引用里摘掉了，只有直接输 URL 才走得到。页面正文原样保留，恢复出售时把
`docs/enterprise/index.md` 同日注释里列的那几处一起取消注释即可。

页内的 `<ProDemo example-id="pro-views" />` 现在落不到实 demo（三端 pro-demos 注册也注释掉了），
会退化成说明卡 —— 这是预期行为，不是坏了。
-->

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
