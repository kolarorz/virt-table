# 开始使用付费插件

<!--@include: @/.enterprise/index/intro.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins'; // 核心插件
import { setLicenseKey } from '@virt-table-pro/license';
import { vtViews } from '@virt-table-pro/views'; // 付费插件
import { vtUndo } from '@virt-table-pro/undo';
import '@virt-table-pro/license/index.css';
import '@virt-table-pro/views/index.css';

setLicenseKey(import.meta.env.VITE_VT_LICENSE); // 整个应用设一次

const table = new VirtTable(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtViews(), vtUndo(), vtCellEditor()],
});

// 插件的命令式 API 直接挂在实例上，且有类型
table.saveView('本月对账');
table.undo();
```

<!--@include: @/.enterprise/index/after.md-->
