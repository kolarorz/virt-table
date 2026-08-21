# 浮动图片

<ProPkgStatus pkg="@virt-table-pro/floating-image" status="shipped" product="floating-image" css="index.css" />

<ProDemo pkg="@virt-table-pro/floating-image" to="/demos/spreadsheet#浮动图片" label="经典案例 · 电子表格" />

::: tip 这一端还没有独立 demo
三个手势（拖动 / 缩放 / 旋转）与自动滚动全部是 DOM 级交互，由插件自己实现、**与框架无关**，
所以 Vanilla 那一页的 demo 展示的行为在这一端完全相同。上面的经典案例链接可以直接点。
:::

<!--@include: @/.enterprise/floating-image/s0.md-->

```tsx
import { useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtFloatingImage } from '@virt-table-pro/floating-image';
import '@virt-table-pro/floating-image/index.css';
import '@virt-table/vanilla/components/image-viewer.css'; // 只有开 viewer 时需要

export function Sheet() {
  const tableRef = useRef<VirtTableRef>(null);

  return (
    <VirtTableReact
      ref={tableRef}
      columns={columns}
      options={{
        list,
        itemKey: 'id',
        estimatedSize: 40,
        plugins: [
          vtFloatingImage({
            images: [{ id: 'site-plan', src: '/plan.png', x: 560, y: 120, width: 300 }],
            resizable: true,
            rotatable: true,
            viewer: true,
            // 手势中每次移动都报，松手补一次 done: true —— 存盘只在 done 那次做
            onChange: (img, { done }) => done && save(img),
          }),
        ],
      }}
    />
  );
}

// 程序化改一切走实例 API（类型由包末尾的 declare module 注入）
tableRef.current?.updateFloatingImage('site-plan', { x: 200, y: 80 });
```

<!--@include: @/.enterprise/floating-image/s1.md-->
