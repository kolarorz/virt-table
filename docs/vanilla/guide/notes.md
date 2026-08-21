# 特殊说明

## 容器必须有明确尺寸

VirtTable 需要容器具有确定的 `width` 和 `height`，否则虚拟滚动无法计算可视区域。

```html
<!-- ✅ 正确 -->
<div style="width: 800px; height: 600px" id="table"></div>

<!-- ✅ 使用 flex/grid 布局也可以 -->
<div style="flex: 1; height: 100%" id="table"></div>

<!-- ❌ 不设置高度将导致表格无法正确渲染 -->
<div id="table"></div>
```

## 样式引入

必须引入内置样式，否则布局和固定列等功能将失效。样式按「核心 + 可选层」拆开，
**核心样式表任何情况下都要引**：

```ts
import '@virt-table/vanilla/core.css';
```

用到插件或内置组件时，各自的样式再单独引一份（只依赖 `core.css` 提供的 `--vt-*`
变量，与引入顺序无关）：

```ts
import '@virt-table/vanilla/core.css';
import '@virt-table/vanilla/plugins/search.css';           // vtSearch
import '@virt-table/vanilla/components/vt-filter-builder.css'; // VtFilterBuilder
```

懒得一个个数的话，`style.css` 是全量合集（核心 + 全部插件 + 内置组件，约 45 kB，
比只引 `core.css` 的 27 kB 多 18 kB）：

```ts
import '@virt-table/vanilla/style.css';
```

哪些插件带独立 CSS，见 [插件机制](../api/plugins)。

## 触屏支持范围

拖拽类手势走 Pointer Events，鼠标 / 触屏 / 手写笔同一套实现：

| 交互 | 触屏 | 说明 |
| --- | --- | --- |
| 滚动、点击、勾选、排序、展开/折叠 | ✅ | 原生行为 |
| 列宽拖拽 | ✅ | 手柄 8px 宽，`touch-action: none` 只让出这一小条 |
| 行拖拽排序（`vtRowDrag`） | ✅ | 走 `type: 'drag'` 列的专用手柄 |
| 列拖拽排序（`vtColumnDrag`） | ✅ | 可拖列头是 `touch-action: pan-y`——横向手势归拖拽、纵向留给滚动。**代价：在表头上横滑滚动表格会失效**（表体横滑照旧） |
| 单元格框选（`vtCellSelection`） | ❌ 刻意不支持 | 表体上手指拖动的语义是「滚动表格」，要改成框选就得给表体设 `touch-action: none`，会直接废掉表格滚动。鼠标 / 手写笔不受影响 |
| 溢出 tooltip（`textOverflow: 'tooltip'`） | ❌ | 触屏没有 hover 概念 |

自定义的拖拽交互请复用同一套约定：绑 `pointerdown`、按 `pointerId` 过滤后续事件、处理 `pointercancel`，并给发起元素设 `touch-action`——少了最后一条触屏上完全不工作，因为浏览器一旦决定滚动就不再派发 move，而 `preventDefault()` 对 `pointermove` 拦不住滚动。

## itemKey 必须唯一

`itemKey` 指定的字段值在数据列表中必须唯一。它用于：

- DOM 复用池的 key（决定哪些行可以被复用）
- 树形展开/折叠状态的标识
- 复选框选中状态的标识
- ResizeObserver 测量高度的关联

如果 key 重复，会导致渲染错位、状态混乱。

## 行高测量机制

VirtTable 支持动态行高（非固定模式下）：

1. 首次渲染使用 `estimatedSize` 作为预估高度
2. 行进入 DOM 后，ResizeObserver 测量实际高度并记录
3. 滚动时使用实测高度计算偏移，保证定位精确

**注意：** 如果行内容会动态变化高度（如展开详情），需要调用 `forceUpdate()` 通知表格重新测量。

### fixed 模式下 estimatedSize 必须等于真实行高

`fixedSize: true` 关掉测量，整条滚动几何直接按 `estimatedSize × 行数` 算。此时它**不是**"预估值"，而是必须与 CSS 算出的真实行高**精确相等**：

```
--vt-line-height + --vt-cell-padding-y × 2 + 1px 下边框 = 真实行高 = estimatedSize
```

内置三档密度已经凑成整数（默认 40 / 紧凑 30 / 宽松 50），用内置密度时只要让 `estimatedSize` 跟着密度改就行。**自己改上面任一变量时必须重算**——哪怕只差 0.69px/行，十万行量级下 `scrollTop` 就能超出内部模型总高，虚拟窗口会卡在半路不再前进，下方留出大片空白。自定义密度的写法见 [行高等式](/vanilla/examples/basic/theme#行高等式)。

## 合并单元格的坐标系

`merges` 中的坐标以**扁平化列表**为准：

- `rowIndex`：扁平列表中的行索引（树形展开后的索引，非原始数组索引）
- `colIndex`：**中间列**（非固定列）的索引，从 0 开始

固定列不参与合并计算。如果有 2 列左固定，数据列从第 3 列开始，则 `colIndex: 0` 对应第 3 列。

## 固定列与合并的关系

固定列始终渲染在视口内，不参与横向虚拟化。因此：

- 合并单元格的 `colIndex` 不包含固定列
- 固定列之间不支持跨越合并
- 如果某列从非固定变为固定（通过 `setColumns`），现有合并坐标需要相应调整

## Vue / React 适配注意事项

### render 函数的返回值

- 返回 `string` — 直接设置为 `innerHTML`（注意 XSS 风险）
- 返回 `HTMLElement` — 追加为子元素
- Vue 中返回 `VNode`，React 中返回 `ReactNode` — 由适配层挂载

### 销毁时机

适配层在行离开 DOM 池时（`onRowRemoved`）会自动清理框架组件树。如果手动操作 DOM，确保不会造成框架组件泄漏。

### 响应式数据

- Vue：`options.list` 被 `watch`，数据变化自动调用 `setList()`
- React：通过 `useEffect` 监听 `options` 变化并同步

直接修改行对象的属性后需要调用 `forceUpdate()` 才能看到变化（非响应式字段）。

## 性能建议

1. **设置合理的 buffer** — 通常 2-6 即可，过大会增加 DOM 数量
2. **避免频繁 setList** — 如果只修改个别单元格，使用 `forceUpdate()` 而非整列替换
3. **固定行高可开启 fixed 模式** — 跳过 ResizeObserver 测量，性能更优
4. **大数据量避免 defaultExpandAll** — 树形/分组全部展开会生成大量扁平行
