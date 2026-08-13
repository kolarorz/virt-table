# React 按值自动合并

列上配 `mergeKey`，**相邻同键的行自动纵向合并**。这是对静态 `merges` 的补充，不是替代：静态 `merges` 表达任意几何但禁用排序，`mergeKey` 只做纵向成段但由管线自动维护、排序后重新分段。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  /**
   * true                → 用 row[key] 作为比较键
   * (row, i) => unknown → 自定义键；返回 undefined 表示该行不参与合并
   */
  mergeKey?: boolean | ((row: T, rowIndex: number) => unknown);
  mergeMaxSpan?: number;  // 单段最大跨度，超出则断开（不传则不限）
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  fixedSize: boolean;  // 固定行高（合并场景推荐）
  border: boolean;  // 是否显示边框
  stripe: boolean;  // 斑马纹（合并格不带斑马纹）
}
```

```ts
const columns: ReactTableColumn<Row>[] = [
  // 按单字段合并
  { key: 'dept', title: '部门', width: 150, mergeKey: true, sortable: true },
  // 拼键：只有「大区 + 状态」都相同才合并
  { key: 'region', title: '大区', width: 150, mergeKey: (r) => `${r.region}/${r.status}` },
];
```

完整语义（长段重锚、结构边界断开、固定列限制、`buildMergesFromSpan` 迁移）见 [Vanilla · 按值自动合并](/vanilla/examples/merge/auto-merge)。

## 示例

<PlaygroundHost framework="react" example-id="react-auto-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/merge/AutoMerge.tsx
:::
