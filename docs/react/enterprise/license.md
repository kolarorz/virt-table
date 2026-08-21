# 许可与角标

<ProPkgStatus pkg="@virt-table-pro/license" status="shipped" css="index.css" />

<ProDemo pkg="@virt-table-pro/license" example-id="pro-license" />

<!--@include: @/.enterprise/license/s0.md-->

```tsx
// main.tsx —— 应用启动时设一次，与框架无关
import { setLicenseKey } from '@virt-table-pro/license';
import '@virt-table-pro/license/index.css';

setLicenseKey(import.meta.env.VITE_VT_LICENSE);

// 需要读许可状态或刷新角标时才用到实例 API
const tableRef = useRef<VirtTableRef>(null);
tableRef.current?.getLicenseStatus();
tableRef.current?.refreshLicenseBadge();
```

<!--@include: @/.enterprise/license/s1.md-->
