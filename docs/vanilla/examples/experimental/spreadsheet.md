# 电子表格

基于飞书数据结构实现的电子表格示例，支持选区、剪贴板、合并单元格与右键菜单等能力。

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
  plugins: [vtCellSelection()];  // 单元格选区（插件）
  merges: MergeCell[];  // 表身合并单元格
  // 编辑触发方式改为插件配置：vtCellEditor({ trigger: 'dblclick' })
  cellStyle: string | ((column, row) => string);  // 单元格额外 style
  plugins: [                     // 插件：右键菜单 + 剪贴板 + 搜索
    vtContextMenu(provider),
    vtClipboard({ mimeType, onCopy, onPaste }),
    vtSearch(),
  ];
}
```

## 示例

<PlaygroundHost framework="vanilla" example-id="table-spreadsheet" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/experimental/spreadsheet.ts
:::