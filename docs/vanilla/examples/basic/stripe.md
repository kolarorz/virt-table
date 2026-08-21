# 斑马纹表格

通过 `stripe: true` 开启斑马纹行样式。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-stripe" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/stripe.ts
:::

## 说明

::: tip 跨行合并的单元格不带斑马纹
斑马纹按行奇偶交替，而跨 N 行的合并格只属于起始行，整块染上起始行的颜色就会和它覆盖的
那几行对不上（右边的数据列还在照常交替）。所以**跨行合并格一律显示为基础底色**，
合并区呈现为一整块干净的背景。静态 `merges` 与列 `mergeKey` 自动合并都是这个表现。

hover 行高亮、选中行高亮不受影响 —— 合并格仍然跟随整行变色。
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `stripe` | 斑马纹 | [表格配置](/vanilla/api/table#virttableoptions) |
| `--vt-stripe-bg` | 斑马纹底色 | [主题定制](/vanilla/examples/basic/theme) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
