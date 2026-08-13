# @virt-table/react

[virt-table](https://github.com/keno-lee/virt-table) 的 React 封装 —— 行列双向虚拟化的高性能表格，十万级数据流畅滚动。

📖 **[完整文档](https://keno-lee.github.io/virt-table/react/guide/started)** · [在线示例](https://keno-lee.github.io/virt-table/react/examples/basic/basic) · [API](https://keno-lee.github.io/virt-table/react/api/)

表格能力（合并单元格、分组表头、树形、筛选、插件…）全部来自 [`@virt-table/vanilla`](https://www.npmjs.com/package/@virt-table/vanilla)，这个包只做 React 侧的桥接：受控 props、`ref` 命令式 API、用 React 组件渲染单元格。

## 安装

```bash
npm install @virt-table/react
```

`@virt-table/vanilla` 会作为依赖一起装上。Peer dependencies：`react >= 18`、`react-dom >= 18`。

## 快速开始

```tsx
import React, { useRef } from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
} from '@virt-table/react';
import '@virt-table/vanilla/core.css';

const columns: ReactTableColumn[] = [
  { key: 'name', title: '姓名', width: 200 },
  { key: 'age', title: '年龄', width: 100 },
  { key: 'email', title: '邮箱', width: 300 },
];

const list = Array.from({ length: 100000 }, (_, i) => ({
  id: i,
  name: `用户 ${i}`,
  age: 20 + (i % 30),
  email: `user${i}@example.com`,
}));

export default function App() {
  const tableRef = useRef<VirtTableRef>(null);

  // 容器需要有明确的宽高
  return (
    <div style={{ width: 800, height: 600 }}>
      <VirtTableReact
        ref={tableRef}
        columns={columns}
        options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4 }}
      />
    </div>
  );
}
```

插件与内置单元格组件直接从 vanilla 引，插件本身与框架无关：

```tsx
import { vtSearch, vtExport } from '@virt-table/vanilla/plugins';
import { VtSelect, VtSwitch } from '@virt-table/vanilla/components';
```

## License

[MIT](./LICENSE) © keno-lee
