# 右键菜单

右键菜单由 `vtContextMenu` 插件提供。菜单项在右键时按所在单元格的上下文动态生成，返回 `null` 或空数组则不弹菜单。

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

## 使用的 API

```ts
interface ContextMenuContext<T> {
  rowIndex: number;              // 真实数据行索引
  colIndex: number;              // 可见叶子列索引
  row: T;                        // 行数据
  column: VirtTableColumn<T>;    // 列配置
  selection: { startRow: number; startCol: number; endRow: number; endCol: number } | null;  // 当前框选区域
}

interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;   // 禁用：不可点击，也不会关闭菜单
  divider?: boolean;    // 在本项之前插入一条分隔线
}
```

实例方法：`hideContextMenu()` —— 由插件通过 `PluginHandle.api` 注入（类型上由 `VirtTablePluginApi` 声明），三端 ref 自动透传。

菜单越出容器边界时会自动向内回收位置；点击菜单外、按 Esc、页面滚动都会关闭。

::: tip selection 字段
`ctx.selection` 只有在同时装载 `vtCellSelection` 插件时才有值，可用于实现「对选中区域批量操作」。不需要框选也能弹菜单——本示例就没有启用框选。
:::

## 示例

<PlaygroundHost framework="vanilla" example-id="table-context-menu" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/context-menu.ts
:::
