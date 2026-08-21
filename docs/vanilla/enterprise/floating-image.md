# 浮动图片

<ProPkgStatus pkg="@virt-table-pro/floating-image" status="shipped" product="floating-image" css="index.css" />

<ProDemo pkg="@virt-table-pro/floating-image" example-id="pro-floating-image" />

<!--@include: @/.enterprise/floating-image/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { setLicenseKey } from '@virt-table-pro/license';
import { vtFloatingImage } from '@virt-table-pro/floating-image';
import '@virt-table/vanilla/core.css';
import '@virt-table-pro/license/index.css';
import '@virt-table-pro/floating-image/index.css';
import '@virt-table/vanilla/components/image-viewer.css'; // 只有开 viewer 时需要

setLicenseKey(import.meta.env.VITE_VT_LICENSE); // 整个应用设一次

const table = new VirtTable(el, {
  list,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [
    vtFloatingImage({
      images: [{ id: 'site-plan', src: '/plan.png', x: 560, y: 120, width: 300 }],
      resizable: true,   // 四角把手缩放（Shift 等比）
      rotatable: true,   // 顶部圆钮旋转（Shift 吸附 15°）
      viewer: true,      // 点一下打开查看器
      downloadable: true,
      onChange: (img, { action, done }) => done && save(img),
    }),
  ],
});
```

<!--@include: @/.enterprise/floating-image/s1.md-->
