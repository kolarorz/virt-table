# 右键菜单

右键菜单由 `vtContextMenu` 插件提供。菜单项在右键时按所在单元格的上下文动态生成，返回 `null` 或空数组则不弹菜单。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-context-menu" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/context-menu.ts
:::

## 装载

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtContextMenu } from '@virt-table/vanilla/plugins';

new VirtTable(el, {
  columns,
  plugins: [vtContextMenu((ctx) => [
    { label: `删除 ${ctx.row.name}`, action: () => remove(ctx.row) },
  ])],
});
```

插件在构造时装载，运行时替换 `plugins` 不会重新装载。

菜单越出容器边界时会自动向内回收位置；点击菜单外、按 Esc、页面滚动都会关闭。

::: tip selection 字段
`ctx.selection` 只有在同时装载 `vtCellSelection` 插件时才有值，可用于实现「对选中区域批量操作」。不需要框选也能弹菜单——本示例就没有启用框选。
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtContextMenu({ items })` | 右键菜单插件；`items` 可以是数组或 `(ctx) => items` | [插件机制](/vanilla/api/plugins) |
| 菜单项 | `{ label, action, disabled?, divider? }` | [插件机制](/vanilla/api/plugins) |
| `hideContextMenu()` | 程序化关闭（插件注入，三端 ref 自动透出） | [实例方法](/vanilla/api/instance) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
