# React 表头 + 表尾合并

同时配置表头与表尾的自定义数据及合并规则。

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
  border: boolean;  // 是否显示边框
  headerData: string[][];  // 表头自定义数据
  headerMerges: MergeCell[];  // 表头合并单元格
  footerData: string[][];  // 表尾数据
  footerMerges: MergeCell[];  // 表尾合并单元格
}
```

## 示例

<PlaygroundHost framework="react" example-id="react-head-foot-merge" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/merge/HeadFootMerge.tsx
:::