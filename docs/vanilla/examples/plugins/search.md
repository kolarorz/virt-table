# 表格搜索

启用内置搜索功能，使用 Cmd/Ctrl+F 打开搜索框查找单元格内容。

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
}
```

## 示例

<PlaygroundHost framework="vanilla" example-id="table-search" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/search.ts
:::