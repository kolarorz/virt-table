# React 分组 + 树形

结合 `groupConfig` 与树形列，在同一表格中展示分组与层级结构。

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  type: 'tree';  // 特殊列类型：树形列
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
  groupConfig: { field: string; sort?: 'asc' | 'desc' }[];  // 分组配置
  defaultExpandAll: boolean;  // 默认展开所有展开行
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-group-tree" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/GroupTree.tsx
:::