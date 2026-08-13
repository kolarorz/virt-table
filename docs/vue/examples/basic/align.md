# Vue 对齐方式

通过 `align`、`vAlign` 设置列的水平和垂直对齐方式。使用 `headerAlign`、`headerVAlign`、`footerAlign`、`footerVAlign` 分别覆盖表头和表尾的对齐。通过 `cellStyle` 可以为单个单元格独立设置对齐。

## 使用的 API

```ts
type Column = {
  align: 'left' | 'center' | 'right';  // 列的水平对齐
  vAlign: 'top' | 'middle' | 'bottom';  // 列的垂直对齐
  headerAlign: 'left' | 'center' | 'right';  // 覆盖表头的水平对齐
  headerVAlign: 'top' | 'middle' | 'bottom';  // 覆盖表头的垂直对齐
  footerAlign: 'left' | 'center' | 'right';  // 覆盖表尾的水平对齐
  footerVAlign: 'top' | 'middle' | 'bottom';  // 覆盖表尾的垂直对齐
}

type Options = {
  align: 'left' | 'center' | 'right';  // 全局水平对齐
  vAlign: 'top' | 'middle' | 'bottom';  // 全局垂直对齐
  headerAlign: 'left' | 'center' | 'right';  // 全局表头水平对齐
  headerVAlign: 'top' | 'middle' | 'bottom';  // 全局表头垂直对齐
  footerAlign: 'left' | 'center' | 'right';  // 全局表尾水平对齐
  footerVAlign: 'top' | 'middle' | 'bottom';  // 全局表尾垂直对齐
  cellStyle: (column, row) => string;  // 单元格级别样式回调
}
```

## 优先级

`column.headerAlign > column.align > options.headerAlign > options.align`

## 示例

包含两个表格：列级对齐（headerAlign/footerAlign 覆盖 align）和单元格独立对齐（cellStyle 回调）。

<PlaygroundHost framework="vue" example-id="vue-align" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Align.vue
:::
