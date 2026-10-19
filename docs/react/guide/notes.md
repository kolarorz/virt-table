# 特殊说明

## 容器必须有明确尺寸

VirtTable 需要容器具有确定的 `width` 和 `height`，否则虚拟滚动无法计算可视区域。

```tsx
// ✅ 正确
<div style={{ width: 800, height: 600 }}>
  <VirtTableReact columns={columns} options={options} />
</div>

// ✅ 使用 flex/grid 布局也可以
<div style={{ flex: 1, height: '100%' }}>
  <VirtTableReact columns={columns} options={options} />
</div>

// ❌ 不设置高度将导致表格无法正确渲染
<div>
  <VirtTableReact columns={columns} options={options} />
</div>
```

## 样式引入

内置样式由 `@virt-table/vanilla` 提供，拆成「核心 + 可选层」两级，核心样式表必须引：

```ts
import '@virt-table/vanilla/core.css';
```

用到插件时再补上对应插件的样式（`@virt-table/vanilla/plugins/<插件>.css`），
或者直接引全量合集 `@virt-table/vanilla/style.css`。详见
[Vanilla 特殊说明 · 样式引入](/vanilla/guide/notes#样式引入)。

插件、内置组件、`ai-query` / `infer-columns` 各有独立子路径入口（用不到的会被
tree-shaking 摇掉），完整的子路径与样式对应表见
[Vanilla 特殊说明 · 包入口与按需引入](/vanilla/guide/notes#包入口与按需引入)。

## itemKey 必须唯一

`itemKey` 指定的字段值在数据列表中必须唯一。它用于：

- DOM 复用池的 key（决定哪些行可以被复用）
- 树形展开/折叠状态的标识
- 复选框选中状态的标识
- ResizeObserver 测量高度的关联

如果 key 重复，会导致渲染错位、状态混乱。

## render 函数的返回值

- 返回 `string` — 直接设置为 `innerHTML`（注意 XSS 风险）
- 返回 `ReactNode` — 由适配层通过 `createRoot().render()` 挂载

```tsx
const columns: ReactTableColumn[] = [
  {
    key: 'action',
    title: '操作',
    width: 150,
    render: ({ row }) => <button onClick={() => edit(row)}>编辑</button>,
  },
];
```

## 组件卸载

组件 unmount 时自动调用 `table.destroy()` 清理资源。无需手动管理。

行离开 DOM 池时（`onRowRemoved`），适配层自动 unmount 该行内所有 React 组件树（通过 `root.unmount()`），防止内存泄漏。

## 避免不必要的重渲染

VirtTableReact 内部使用 `useEffect` 监听 `options` 变化。如果在父组件的每次 render 中创建新的 `options` 对象，会触发不必要的更新：

```tsx
// ❌ 每次渲染都创建新对象
<VirtTableReact
  columns={columns}
  options={{ list, itemKey: 'id', estimatedSize: 40 }}
/>

// ✅ 使用 useMemo 稳定引用
const options = useMemo(() => ({
  list, itemKey: 'id', estimatedSize: 40, buffer: 4,
}), [list]);

<VirtTableReact columns={columns} options={options} />
```

## 合并单元格的坐标系

`merges` 中的坐标以**扁平化列表**为准：

- `rowIndex`：扁平列表中的行索引（树形展开后的索引）
- `colIndex`：**中间列**（非固定列）的索引，从 0 开始

固定列不参与合并计算。

## 性能建议

1. **设置合理的 buffer** — 通常 2-6 即可
2. **使用 useMemo/useCallback** — 稳定 columns 和 options 引用
3. **避免频繁 setList** — 修改个别单元格用 `forceUpdate()`
4. **固定行高可开启 fixed 模式** — 跳过 ResizeObserver 测量，但 `estimatedSize` 必须与真实行高**精确相等**（默认密度 40px），详见 [行高等式](/vanilla/examples/basic/theme#行高等式)
5. **大数据量避免 defaultExpandAll** — 树形/分组全部展开会生成大量扁平行
