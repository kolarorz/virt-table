# React 表身合并

通过 `merges` 配置表身单元格的 rowspan/colspan 合并。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  merges: MergeCell[];  // 表身合并单元格
  border: boolean;  // 是否显示边框
  showHeader: boolean;  // 是否显示表头
  highlightSelectRow: boolean;  // 高亮选中行
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-body-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/merge/BodyMerge.tsx
:::