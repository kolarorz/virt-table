# 插件机制

插件本身与框架无关，`@virt-table/react` 把 vanilla 的实现与类型**原样透传**，所以只需要一条 import：

```tsx
import { useMemo, useRef } from 'react';
import {
  VirtTableReact, vtCellSelection, vtKeyboardNav, vtExport, type VirtTableRef,
} from '@virt-table/react';
import '@virt-table/vanilla/plugins/cell-selection.css';

const ref = useRef<VirtTableRef>(null);
// plugins 只在 mount 时读一次，别每次渲染新建数组
const plugins = useMemo(() => [vtCellSelection(), vtKeyboardNav(), vtExport()], []);

<>
  <VirtTableReact ref={ref} columns={columns}
    options={{ list, itemKey: 'id', estimatedSize: 40, plugins }} />
  <button onClick={() => ref.current?.exportCsv({ filename: 'rows.csv' })}>导出 CSV</button>
</>;
```

三件 React 端要知道的事：

- **插件注入的方法自动出现在 `ref` 上**。类型来自 vanilla 的 `VirtTablePluginApi`（被
  `VirtTableRef` 继承），封装里没有手写转发 —— ref 找不到自己的方法时会回落到插件 API。
  未装载对应插件时运行时不存在，所以调用前先确认插件在 `plugins` 里。
- **`plugins` 只在 mount 时读一次**。表格只创建一次，之后换 `plugins` 数组不会重新装载；
  运行时增删插件请重建表格。单个插件的开关一般用它自己的 option（如
  `vtCellEditor({ trigger: 'dblclick' })`）。
- **样式要自己引**。插件 CSS 不在 `@virt-table/react` 的产物里，从
  `@virt-table/vanilla/plugins/*.css` 引，或直接引全量 `@virt-table/vanilla/style.css`。

内置插件清单、各插件注入的方法、需要引哪份 CSS、以及怎么自己写一个插件 ——
见 [Vanilla API · 插件机制](/vanilla/api/plugins)。可运行示例在[示例 · 插件](/react/examples/plugins/context-menu)一侧。
