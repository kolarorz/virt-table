# 列拖拽排序

装 `vtColumnDrag()` 后拖拽表头即可调整列顺序，通过 `onColumnOrderChange` 拿到新顺序。与列宽拖拽、点击排序互不冲突（按拖拽阈值区分手势）。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-column-drag" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/column-drag.ts
:::

## 说明

```ts
import { vtColumnDrag } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/drag-sort.css';

new VirtTable(el, { list, columns, itemKey: 'id', estimatedSize: 40,
  plugins: [vtColumnDrag()],
  onColumnOrderChange: (columns) => save(columns.map((c) => c.key)),
});
```

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtColumnDrag()` | 拖拽表头调整列顺序 | [插件机制](/vanilla/api/plugins) |
| `onColumnOrderChange` | 列顺序变化回调 | [列配置 · 拖拽排序](/vanilla/api/column#拖拽排序-列-行) |
| `moveColumn(colKey, toIndex)` | 编程式移动 | [实例方法](/vanilla/api/instance) |
| `getState()` / `setState()` | 把列序存下来 | [状态持久化](/vanilla/examples/advanced/state-persist) |

分组表头下**只允许同一父分组内换位**，跨分组拖拽被忽略；有 `merges` 时整体禁用。
