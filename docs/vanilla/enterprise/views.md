# 命名视图

<ProPkgStatus pkg="@virt-table-pro/views" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/views" example-id="pro-views" />

<!--@include: @/.enterprise/views/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtViews } from '@virt-table-pro/views';
import '@virt-table-pro/views/index.css'; // 视图面板样式，必须引

const table = new VirtTable(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40, // 核心的必填项：list / columns / itemKey / estimatedSize
  plugins: [
    vtViews({
      // ⚠️ 同一页面多张表务必各给一个 key，默认 key 是固定的，会互相覆盖
      storageKey: 'orders-table',
      onViewChange: (name) => console.log('切到视图', name),
    }),
  ],
});

// 自带一个面板，给它个锚点按钮就行
document.querySelector('#views-btn')!.addEventListener('click', (e) => {
  table.toggleViewPanel(e.currentTarget as HTMLElement);
});
```

<!--@include: @/.enterprise/views/s1.md-->
