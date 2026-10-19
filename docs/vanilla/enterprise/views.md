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
