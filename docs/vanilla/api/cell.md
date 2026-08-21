# 单元格级 API

一格的内容从哪来、怎么改值、文字放不下怎么办。

分层模型（四层 × 粒度、为什么这么分）与可运行写法在示例页：

- [渲染粒度：表级 / 列级 / 单元格级](/vanilla/examples/cell/render-levels)
- [单元格独立渲染](/vanilla/examples/cell/cell-type-render)
- [功能列（序号 / 勾选 / 单选）](/vanilla/examples/feature-columns/)
- [内置单元格组件](/vanilla/examples/cell/vt-input) —— 18 个组件 / 19 页（`VtSelect` 单值与多值各一页），选项表见[单元格组件](./components)

## 内容层

决定这一格的**常态**。规则：粒度越细越优先，同粒度内 `render` 比 `cellType` 具体。

| 优先级 | 来源 | 配置方式 |
| --- | --- | --- |
| 1 | 单元格级 `render` | `table.setCellRender(rowKey, colKey, { render })`（或行数据 `_cellRenders`，兼容路径） |
| 2 | 单元格级 `cellType` | `table.setCellRender(rowKey, colKey, { cellType })` |
| 3 | 列级 `render` | `col.render` |
| 4 | 列级 `cellType` | `col.cellType` |
| 5 | 表级 `cellType` | `options.cellType` |
| 6 | 默认取值 | `String(row[col.key])` |

没有表级 `render`，也没有行级 —— 两条的理由见[渲染粒度示例](/vanilla/examples/cell/render-levels#内容层-一条规则)。

### 内容类型（`cellType`）

三个粒度语义完全相同。**值的形状必须与类型配对** —— 给 `option` 一个数字会画出空格子，不是报错。

| `cellType` | 期望的值 | 渲染成 |
| --- | --- | --- |
| `text` | 任意 | 纯文本（**不解析 HTML**） |
| `number` | 数字 | 纯文本；不做千分位 / 精度（那是格式化职责） |
| `rich-text` | HTML 字符串 | 按 HTML 插入，**自负安全** |
| `image` | URL 字符串 或 `{ url, alt }` | `<img class="vt-cell-image">`，高度锁在行高内 |
| `option` | 标签字符串 或 `{ label, color }` | 圆角标签，底色由 `color` 经 `color-mix` 派生 |
| `checkbox` | 布尔 | 只读勾选框 |

外观变量：`--vt-cell-image-max-h`、`--vt-cell-option-color`、`--vt-cell-option-tint`
（标签底色的浅调比例，默认 `14%`；底色 = 主色兑这么多、其余透明。用同一支色画东西的地方
引用它就能跟着走，见[主题定制](/vanilla/examples/basic/theme)）。

## 单元格级渲染（`setCellRender`）

配置存在**表格实例**里，不写进数据对象。

| 方法 | 参数 | 说明 |
| --- | --- | --- |
| `setCellRender` | `rowKey, colKey, config \| null` | 写一格；传 `null` 清除 |
| `setCellRenders` | `Array<{ rowKey, colKey, config }>` | 批量，整批只刷新一次 |
| `clearCellRenders` | `rowKey?` | 清一行；不传清全部 |
| `resolveCellRender` | `rowKey, colKey` | 该格最终生效的 `{ render, cellType, renderEditor }`；`render` 与 `cellType` 最多一个有值。**报的是内容层** —— 功能列独占发生在接管层 |

```ts
interface CellRenderConfig<T> {
  render?: (ctx: CellRenderContext<T>) => string | HTMLElement;
  cellType?: CellContentType;
  renderEditor?: (ctx: CellEditContext<T>) => HTMLElement | null | void;
}
```

**单元格级可以穿透功能列**（列级不行）：见[功能列 · 单元格级可以穿透](/vanilla/examples/feature-columns/#单元格级可以穿透)。

## 会话层（编辑态）

`renderEditor` **不在**内容层那条链上，它自己一条回落：

| 优先级 | 来源 | 配置方式 |
| --- | --- | --- |
| 1 | 单元格级 | `setCellRender(rowKey, colKey, { renderEditor })` |
| 2 | 列级 | `col.renderEditor` |

需装 `vtCellEditor` 插件。`renderEditor: undefined` 只算「这一级没配」，会继续回落；要真封掉
得显式给一个返回 `null` 的函数。

| 相关字段 / 方法 | 类型 | 说明 |
| --- | --- | --- |
| `col.editorChrome` | `boolean`（默认 `true`） | 编辑浮层是否替这一列画外观（边框 / focus 环） |
| `vtCellEditor({ chrome })` | `boolean` | 整表默认值，列上的值优先 |
| `vtCellEditor({ activeCell })` | `boolean` | 编辑过的格子留不留描边；装了 `vtCellSelection` 时默认关 |
| `openCellEditor(rowKey, colKey)` | — | 程序化进入编辑 |
| [`setActiveCell`](./instance) / `getActiveCell` | — | 读写激活态描边，传 `null` 清除 |

外观归属与裸模式的三个症状见[第三方组件库集成](/vanilla/examples/cell/third-party#编辑浮层的外观归属)；
激活态的四条注意见 [vtCellEditor 单元格编辑](/vanilla/examples/plugins/cells-render#激活态)。

## 编辑校验

| 位置 | 字段 / 方法 | 说明 |
| --- | --- | --- |
| column | `validator?: (value, row) => true \| string` | 返回 `true` 通过，返回字符串为错误信息 |
| 方法 | `validateAll()` | 返回未通过项 `{ row, colKey, message }[]` |

内置编辑器（`VtInput` / `VtNumberInput` / `VtTextarea`）会实时标记错误态。用法见[编辑校验](/vanilla/examples/advanced/validate)。

## 容器层

对四种内容来源**一律叠加**，与内容从哪来无关。

| 字段 | 作用 |
| --- | --- |
| `textOverflow` | `'ellipsis' \| 'tooltip'`，见[溢出隐藏](/vanilla/examples/basic/overflow) |
| `tooltip` | `{ delay?: number }`，`textOverflow: 'tooltip'` 的浮层配置 |
| `align` / `vAlign` | 水平 / 垂直对齐 |
| `cellClass` / `cellStyle` | 类名 / 内联样式，支持函数形式 |
| `mergeKey` 的 sticky 内层 | 见[合并单元格](./merge#按值自动合并-mergekey) |
| `tree` 的缩进与折叠箭头 | `col.type: 'tree'` 只做容器，内容照常走内容层 |

## 接管层

`col.type` 为 `index` / `checkbox` / `radio` / `expand` / `drag` 的列**独占单元格**：配在上面的
`render` / `renderEditor` / `cellType` 被忽略并告警。`tree` 例外（它属于容器层）。
字段清单见[列配置 · 功能列](./column#功能列-type)，用法见[功能列](/vanilla/examples/feature-columns/)。

合成行（分组行 / 展开行）是**整行接管**，不进单元格链。
