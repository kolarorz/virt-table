# 许可与角标

<ProPkgStatus pkg="@virt-table-pro/license" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/license" example-id="pro-license" />

<!--@include: @/.enterprise/license/s0.md-->

```ts
// main.ts —— 应用启动时设一次，与框架无关
import { setLicenseKey } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';

setLicenseKey(import.meta.env.VITE_VT_LICENSE);

// 实例 API 走 ref。Vue 端的 ref 类型要自己交叉一个 VirtTablePluginApi（运行时方法都在）
type TableInstance = VirtTablePluginApi & { forceUpdate(): void };
const tableRef = ref<TableInstance | null>(null);
tableRef.value?.refreshLicenseBadge();
```

<!--@include: @/.enterprise/license/s1.md-->
