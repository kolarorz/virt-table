# 单元格级 API

一格该画什么、怎么改值。**四层模型（接管层 / 内容层 / 容器层 / 会话层）、优先级链、
`cellType` 的取值、编辑态的行为与 Vanilla 完全一致**，见
[Vanilla API · 单元格级](/vanilla/api/cell)；这里只写 React 端的差异。

## 渲染函数返回 JSX

`render` / `renderHeader` / `renderEditor` / `renderExpandRow` 都可以直接返回 JSX
（也仍然接受字符串与 `HTMLElement`）。挂载、更新、以及行 DOM 被虚拟滚动回收时的卸载由适配层处理，
不需要自己管生命周期。

```tsx
import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import { Input } from 'antd';

const columns: ReactTableColumn[] = [
  {
    key: 'name',
    title: '姓名',
    width: 160,
    render: ({ value }) => <b>{String(value)}</b>,
    // 第三方组件自带外观，把浮层的边框 / focus 环让出去
    editorChrome: false,
    renderEditor: ({ row, column }) => (
      <Input
        size="small"
        defaultValue={String(row[column.key] ?? '')}
        onChange={(e) => { row[column.key] = e.target.value; }}
      />
    ),
  },
];
```

`editorChrome: false` 的完整理由（两层边框、激活前后高度不一致、focus 环叠两层）见
[编辑浮层的外观归属](/vanilla/examples/cell/third-party#编辑浮层的外观归属)；整表统一用
`vtCellEditor({ chrome: false })`。

## 单元格级渲染（`setCellRender`）

同一列不同行要用不同渲染时，通过 `ref` 调用。配置存在表格实例里，**不要往行数据挂
`_cellRenders`** —— 那条兼容路径拿不到适配层的 JSX 包装，返回 JSX 会渲染失败。

```tsx
ref.current?.setCellRender('42', 'name', {
  render: ({ value }) => <b>{String(value)}</b>,
  renderEditor: ({ row, column }) => <Input defaultValue={String(row[column.key] ?? '')} />,
});

// 只指定内容类型，不手写 render
ref.current?.setCellRender('42', 'tag', { cellType: 'option' });

// 批量：整批写完只刷新一次
ref.current?.setCellRenders([
  { rowKey: '1', colKey: 'score', config: { render: ({ value }) => <span>{`${value} 分`}</span> } },
  { rowKey: '2', colKey: 'score', config: null },   // null = 清除该格配置
]);
```

配置对象的类型是 `ReactCellRenderConfig`：`render` / `cellType` / `renderEditor` 三个字段，
与列级同形（`render` 与 `cellType` 走同一条链，取更具体的那个）。

## 编辑态刷新

编辑浮层里的 JSX 在 `forceUpdate()` 时一并重渲染 —— 编辑器内容不在单元格的 DOM 里，
`vtCellEditor` 把浮层挂在滚动容器上，所以它不随行 DOM 的重绘更新。
