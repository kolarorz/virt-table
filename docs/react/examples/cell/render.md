# React 组件渲染

列的 `render` / `renderEditor` / `renderHeader` / `renderExpandRow` 可以**直接返回 JSX**，
挂载与回收由适配层负责（内部走 `createRoot`）—— 行被虚拟滚动回收时对应的 root 一起卸载，
不会泄漏。

## 示例

<PlaygroundHost framework="react" example-id="react-render" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/cell/RenderDemo.tsx
:::

## 说明

vanilla 没有这一层（`render` 返回的就是 DOM 字符串或元素），所以这一页只在框架端有。

```tsx
import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import MyTag from './MyTag';

const columns: ReactTableColumn[] = [
  // 返回 JSX：适配层负责 mount / unmount
  { key: 'status', title: '状态', width: 120, render: ({ value }) => <MyTag value={value} /> },
  // 也可以返回字符串 / DOM 元素，与 vanilla 同义
  { key: 'name', title: '姓名', width: 160, render: ({ value }) => `<b>${value}</b>` },
];
```

三条需要留意：

- **查看态别挂重组件。** 滚动时行 DOM 被反复复用，每个返回 JSX 的单元格都要建一个 root，
  持续挂载 / 销毁会拖帧。轻量内容直接返回字符串，真组件留给编辑态（只有当前激活的那一格
  才会构造），理由与[第三方组件库集成](./third-party)那页一样。
- **`columns` 要 memo 化**：每次渲染都造新的列数组会让适配层重建列。用 `useMemo`。
- **编辑态里的 JSX 要刷新时调 `forceUpdate()`**，见 [React API · 编辑态刷新](/react/api/cell#编辑态刷新)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.render` | 返回 JSX / 字符串 / DOM 元素 | [React API · 渲染函数返回 JSX](/react/api/cell#渲染函数返回-jsx) |
| `col.renderEditor` / `renderHeader` / `renderExpandRow` | 同样支持 JSX | [React API · 列级](/react/api/column#reacttablecolumn) |
| `setCellRender(rowKey, colKey, cfg)` | 单元格级也能返回 JSX（走 `ref`） | [React API · 单元格级渲染](/react/api/cell#单元格级渲染-setcellrender) |
| `forceUpdate()` | 刷新编辑态里的 JSX | [实例方法](/vanilla/api/instance) |

> 内容层的优先级（表级 / 列级 / 单元格级）与四层模型见 [渲染粒度](./render-levels)；
> 字段全量表在 [Vanilla API · 单元格渲染](/vanilla/api/cell)。
