# React 树形结构

通过 `type: tree` 列展示层级数据，支持展开/收起子节点。

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
  defaultExpandAll: boolean;  // 默认展开所有展开行
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-tree" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/Tree.tsx
:::