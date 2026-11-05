---
description: 在 React 18+ 中安装和使用 VirtTable 虚拟表格：定义列、数据与容器尺寸，接入行列双向虚拟化。
---

# 快速开始

## 安装

```bash
npm install @virt-table/react
```

Peer dependencies：`react >= 18`、`react-dom >= 18`

## 基本用法

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

const list = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `用户 ${i}`,
  age: 20 + (i % 30),
  email: `user${i}@example.com`,
}));

export default function App() {
  const tableRef = useRef<VirtTableRef>(null);

  return (
    <div style={{ width: 800, height: 600 }}>
      <VirtTableReact
        ref={tableRef}
        columns={columns}
        options={{
          list,
          itemKey: 'id',
          estimatedSize: 40,
          buffer: 4,
        }}
      />
    </div>
  );
}
```

## Props

| Prop | 类型 | 说明 |
|------|------|------|
| `columns` | `ReactTableColumn[]` | 列配置数组 |
| `options` | `VirtTableOptions` | 表格配置（list, itemKey, estimatedSize 等） |
| `ref` | `Ref<VirtTableRef>` | 暴露表格实例方法 |

## 必填配置

| 属性 | 类型 | 说明 |
|------|------|------|
| `list` | `T[]` | 数据源数组 |
| `itemKey` | `string` | 行数据中的唯一标识字段名 |
| `estimatedSize` | `number` | 行预估高度（px），用于初始布局 |

## 列配置

```ts
type ReactTableColumn = {
  key: string;         // 列标识（必填）
  title: string;       // 列标题（必填）
  width: number;       // 列宽 px（必填）
  fixed?: 'left' | 'right';
  resizable?: boolean;
  align?: 'left' | 'center' | 'right';
  type?: 'index' | 'checkbox' | 'expand' | 'tree';
  render?: (ctx) => string | ReactNode;
  renderEditor?: (ctx) => ReactNode;
}
```

## 实例方法（通过 ref 调用）

```ts
const tableRef = useRef<VirtTableRef>(null);

tableRef.current?.scrollToTop();
tableRef.current?.scrollToBottom();
tableRef.current?.scrollToIndex(index);
tableRef.current?.setList(newList);
tableRef.current?.forceUpdate();
```

## 数据更新

通过 `useEffect` 自动同步 `options` 变化。更新数据源时传入新的 list 即可：

```tsx
const [list, setList] = useState(initialList);

<VirtTableReact
  columns={columns}
  options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4 }}
/>
```

如果直接修改行对象属性（mutation），需要手动调用 `forceUpdate()`：

```ts
list[0].name = '新名称';
tableRef.current?.forceUpdate();
```
