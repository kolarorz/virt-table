# 列排序

点击表头排序图标切换 **升序 → 降序 → 取消**：列上声明 `sortable: true` 即显示排序图标；`sortMode: 'multiple'` 时按住 **Shift** 点击可叠加多列排序（表头角标显示优先级）。

- `defaultSort` 声明初始排序
- `sortMethod` 自定义比较器（本地化字符串、业务优先级等），返回值由排序方向自动取反
- `sort()` / `clearSort()` / `getSortState()` 编程式控制，`onSortChange` 监听变化

> 相关能力已拆分为独立示例：[自动合计行](../feature/summary)、[加载态](../feature/loading)、[导出 CSV/Excel](../plugins/export)、[列显隐/列设置](../plugins/column-visibility)、[键盘导航](../plugins/keyboard)、[列筛选](../plugins/filter)。

## 使用的 API

```ts
type Column = {
  sortable?: boolean;                    // 显示排序图标，点击图标排序
  defaultSort?: 'asc' | 'desc';          // 初始排序
  sortMethod?: (a: Row, b: Row) => number; // 自定义比较器（升序语义）
};

type Options = {
  sortMode?: 'single' | 'multiple';      // 单列 / Shift 多列，默认 single
  onSortChange?: (state: SortSpec[]) => void;
};

// 实例方法
table.sort(colKey, 'asc' | 'desc' | null); // null 取消该列
table.clearSort();
table.getSortState(); // [{ colKey, order }]
```

::: tip 注意
`sortMode` 为初始化选项，运行时切换需重建实例；表格存在合并单元格（`spanMethod` 产生的合并）时排序会被忽略。
:::

## 示例

<PlaygroundHost framework="vanilla" example-id="table-sort" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/sort.ts
:::
