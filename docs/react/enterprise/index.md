# 开始使用付费插件

<!--@include: @/.enterprise/index/intro.md-->

```tsx
import { useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtCellEditor } from '@virt-table/vanilla/plugins'; // 核心插件
import { setLicenseKey } from '@virt-table-pro/license';
import { vtViews } from '@virt-table-pro/views'; // 付费插件
import { vtUndo } from '@virt-table-pro/undo';
import '@virt-table-pro/license/index.css';
import '@virt-table-pro/views/index.css';

setLicenseKey(import.meta.env.VITE_VT_LICENSE); // 整个应用设一次

const tableRef = useRef<VirtTableRef>(null);

<VirtTableReact
  ref={tableRef}
  columns={columns}
  options={{
    list: rows,
    itemKey: 'id',
    estimatedSize: 40,
    plugins: [vtViews(), vtUndo(), vtCellEditor()],
  }}
/>;

// VirtTableRef extends VirtTablePluginApi，所以这两行有类型提示
tableRef.current?.saveView('本月对账');
tableRef.current?.undo();
```

<!--@include: @/.enterprise/index/after.md-->
