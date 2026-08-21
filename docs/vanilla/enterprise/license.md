# 许可与角标

<ProPkgStatus pkg="@virt-table-pro/license" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/license" example-id="pro-license" />

<!--@include: @/.enterprise/license/s0.md-->

```ts
// main.ts —— 应用启动时设一次
import { setLicenseKey } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css'; // 角标样式，忘了引就只有 console.warn

setLicenseKey(import.meta.env.VITE_VT_LICENSE);
```

之后任何付费插件都自动吃这份密钥，**不需要**逐个传：

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtViews } from '@virt-table-pro/views';
import { vtUndo } from '@virt-table-pro/undo';

new VirtTable(el, { list: rows, columns, itemKey: 'id', estimatedSize: 40, plugins: [vtViews(), vtUndo()] });
```

<!--@include: @/.enterprise/license/s1.md-->
