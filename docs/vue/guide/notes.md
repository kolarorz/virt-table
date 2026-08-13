# 特殊说明

## 容器必须有明确尺寸

VirtTable 需要容器具有确定的 `width` 和 `height`，否则虚拟滚动无法计算可视区域。

```vue
<!-- ✅ 正确 -->
<div style="width: 800px; height: 600px">
  <VirtTableVue :columns="columns" :options="options" />
</div>

<!-- ✅ 使用 flex/grid 布局也可以 -->
<div style="flex: 1; height: 100%">
  <VirtTableVue :columns="columns" :options="options" />
</div>

<!-- ❌ 不设置高度将导致表格无法正确渲染 -->
<div>
  <VirtTableVue :columns="columns" :options="options" />
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

## itemKey 必须唯一

`itemKey` 指定的字段值在数据列表中必须唯一。它用于：

- DOM 复用池的 key（决定哪些行可以被复用）
- 树形展开/折叠状态的标识
- 复选框选中状态的标识
- ResizeObserver 测量高度的关联

如果 key 重复，会导致渲染错位、状态混乱。

## render 函数的返回值

- 返回 `string` — 直接设置为 `innerHTML`（注意 XSS 风险）
- 返回 `VNode` — 由适配层挂载到单元格 DOM 中

```ts
const columns: VueTableColumn[] = [
  {
    key: 'action',
    title: '操作',
    width: 150,
    render: ({ row }) => h('button', { onClick: () => edit(row) }, '编辑'),
  },
];
```

## 组件卸载

组件 `unmounted` 时自动调用 `table.destroy()` 清理资源。无需手动管理。

行离开 DOM 池时（`onRowRemoved`），适配层自动 unmount 该行内所有 Vue 组件树，防止内存泄漏。

## 响应式数据更新

### 自动同步

`options.list` 被 `watch`，数据变化自动调用 `setList()`：

```ts
const list = ref([...]);
list.value = newData;  // 自动同步到表格
```

### 手动刷新

直接修改行对象属性后需要手动刷新：

```ts
list.value[0].name = '新名称';
tableRef.value?.forceUpdate();
```

## 合并单元格的坐标系

`merges` 中的坐标以**扁平化列表**为准：

- `rowIndex`：扁平列表中的行索引（树形展开后的索引）
- `colIndex`：**中间列**（非固定列）的索引，从 0 开始

固定列不参与合并计算。

## 性能建议

1. **设置合理的 buffer** — 通常 2-6 即可，过大会增加 DOM 数量
2. **避免频繁替换 list** — 如果只修改个别单元格，使用 `forceUpdate()` 而非整体替换
3. **固定行高可开启 fixed 模式** — 跳过 ResizeObserver 测量，但 `estimatedSize` 必须与真实行高**精确相等**（默认密度 40px），详见 [行高等式](/vanilla/examples/basic/theme#行高等式)
4. **大数据量避免 defaultExpandAll** — 树形/分组全部展开会生成大量扁平行
5. **render 函数避免重复创建组件** — 利用 Vue 的 `h()` 缓存或 `defineComponent`
