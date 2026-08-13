# React 列排序

点击表头排序图标切换 **升序 → 降序 → 取消**：列上声明 `sortable: true` 即显示排序图标；`sortMode: 'multiple'` 时按住 **Shift** 点击可叠加多列排序（表头角标显示优先级）。

- `defaultSort` 声明初始排序
- `sortMethod` 自定义比较器（本地化字符串、业务优先级等），返回值由排序方向自动取反
- ref 上的 `sort()` / `clearSort()` / `getSortState()` 编程式控制，`onSortChange` 监听变化

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  sortable?: boolean;  // 显示排序图标，点击图标排序
  defaultSort?: 'asc' | 'desc';  // 初始排序
  sortMethod?: (a: Row, b: Row) => number;  // 自定义比较器（升序语义）
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  sortMode?: 'single' | 'multiple';  // 单列 / Shift 多列，默认 single
  onSortChange?: (state: SortSpec[]) => void;  // 排序变化回调
}

// 实例方法（ref 上调用）
tableRef.current?.sort(colKey, 'asc' | 'desc' | null);  // null 取消该列
tableRef.current?.clearSort();
tableRef.current?.getSortState();  // [{ colKey, order }]
```

::: tip 注意
`sortMode` 为初始化选项，运行时切换需重建实例——示例里用 `key={sortMode}` 让 React 重建 `VirtTableReact`。表格存在合并单元格（`spanMethod` 产生的合并）时排序会被忽略。
:::

完整语义（三态循环、多列优先级、与合并/筛选的关系）见 [Vanilla · 列排序](/vanilla/examples/advanced/sort)。

## 示例

<PlaygroundHost framework="react" example-id="react-sort" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/Sort.tsx
:::
