# 单元格组件

内置单元格组件是**框架无关的工厂函数**，React 端直接从 `@virt-table/vanilla/components` 引入 ——
封装层不再包一层同名导出，否则同一个组件会有两条进口、类型也要维护两份。

调一次工厂得到一个配好 `render` + `renderEditor` 的列定义，塞进 `columns` 即可；
它与 `ReactTableColumn` 类型兼容（返回 DOM 的渲染函数是 JSX 签名的子集）。

```tsx
import { VirtTableReact, vtCellEditor, type ReactTableColumn } from '@virt-table/react';
import { VtTag, VtSwitch, VtActions } from '@virt-table/vanilla/components';
import '@virt-table/vanilla/components/index.css';

const columns: ReactTableColumn[] = [
  { key: 'id', title: 'ID', width: 80 },
  VtTag({ key: 'status', title: '状态', width: 120, options: STATUS }),
  VtSwitch({ key: 'enabled', title: '启用', width: 100 }),
  VtActions({ key: 'ops', title: '操作', width: 180, fixed: 'right', items: [
    { text: '编辑', onClick: (row) => openDialog(row) },
    { text: '删除', variant: 'danger', confirm: '确定删除？', onClick: (row) => remove(row) },
  ]}),
];

<VirtTableReact columns={columns} options={{ list, itemKey: 'id', estimatedSize: 40,
  plugins: [vtCellEditor()] }} />;   // 编辑态组件需要它
```

三类交互模型（编辑态 / 直接可点 / 纯展示）、公共选项、各组件专属选项、日期面板、
`asCell()` 只装一格的用法 —— 全部语义见 [Vanilla API · 单元格组件](/vanilla/api/components)。

## 与 React 组件的关系

这批组件自绘 DOM，**不是 React 组件**，所以：

- 它们不出现在 React 树里，`useState` / context 拿不到它们的内部状态；值的写回统一走
  `onChange(value, row, rowIndex)`，写回**之后**触发。
- 要用 Ant Design / MUI 之类的 React 组件当编辑器，走列上的 `renderEditor` 返回 JSX，
  并配 `editorChrome: false`，见[单元格渲染](./cell)。
- 一格一个组件用 `asCell()` + `ref.current.setCellRender(...)`；此时 `render` 与
  `renderEditor` 会被整对写入，不会出现「展示是进度条、点开却是列上的下拉」。

各组件的可运行示例在[示例 · 单元格组件](/react/examples/cell/vt-input)一侧。

## 条件构建器

高级筛选的可视化构建器有 React 版：`<VirtFilterBuilderReact />`（`tableRef` + 受控 `value`），
从 `@virt-table/react` 引入，样式为 `@virt-table/vanilla/components/vt-filter-builder.css`。
选项与方法见 [Vanilla API · VtFilterBuilder](/vanilla/api/data#vtfilterbuilder-条件构建器)。
