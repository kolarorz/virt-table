# 功能列（序号 / 勾选 / 单选）

`col.type` 声明的列不画 `row[key]`，而是**由表格接管这一格**：序号列画行号、勾选列画多选框、
单选列画单选钮。三种同表并存互不干扰 —— 勾选是「选了哪些行」，单选是「当前是哪一行」，
两套状态各自独立。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-feature-columns" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/feature-columns/feature-columns.ts
:::

## 说明

```ts
const columns: VirtTableColumn<Row>[] = [
  { key: '__index',    title: '#',    width: 60, type: 'index',    align: 'center' },
  { key: '__checkbox', title: '',     width: 50, type: 'checkbox', align: 'center' },
  { key: '__radio',    title: '当前', width: 60, type: 'radio',    align: 'center' },
  { key: 'name', title: '姓名', width: 160 },
];
```

功能列的 `key` 只要在列里唯一即可（不必对应任何数据字段）。

## 读写选择态

| 想做的事 | 勾选（多选） | 单选 |
| --- | --- | --- |
| 监听变化 | `onCheckChange(checked, row)` / `onCheckAll(checked)` | `onRadioChange(row)` |
| 读当前值 | `getCheckedRows()` | `getSelectedRadio()` |
| 写入 | `setCheckedRows(keys)` | `setSelectedRadio(rowKey \| null)` |
| 清空 | `clearCheckedRows()` | `setSelectedRadio(null)` |

## 六种功能列

| `type` | 画什么 | 另需 |
| --- | --- | --- |
| `index` | 行号，自动递增 | — |
| `checkbox` | 多选框（表头带全选） | — |
| `radio` | 单选钮 | — |
| `expand` | 展开箭头 | `renderExpandRow`，见 [展开行](/vanilla/examples/advanced/expand) |
| `drag` | 行拖拽手柄 | `vtRowDrag` 插件，见 [行拖拽排序](/vanilla/examples/plugins/row-drag) |
| `tree` | 缩进 + 折叠箭头 | 行数据含 `children`，见 [树形](/vanilla/examples/advanced/tree) |

## 独占单元格，以及 `tree` 那个例外

功能列属于**接管层**：配在 `index` / `checkbox` / `radio` / `expand` / `drag` 上的
`render` / `renderEditor` / `cellType` 会被忽略并在控制台告警（早期版本是静默吞掉）。
整列不要这个控件，就别配 `type` —— 那种「配了 `render` 又配 `type`」是配置写错了。

`tree` 是唯一例外，它其实属于**容器层**：只画缩进与折叠箭头，内容照常走
`render` → `cellType` → 默认取值那条链，因此也吃得到 `textOverflow`、`align`。

分层的全貌见 [渲染粒度](../cell/render-levels)。

## 单元格级可以穿透

「就这一行不给勾选」「这一行的序号换成图标」是真实需求，在此之前没有任何出口。
所以**单元格级配置可以穿透功能列**（列级不行，理由同上）：

```ts
table.setCellRender('42', '__checkbox', { render: () => '🔒' });
```

::: warning 穿透只改 UI，不改选择态
勾选框没画出来，但该行仍在选择作用域里 —— 表头「全选」照样会选中它。要真正禁止选中，
在 `onCheckChange` / `onCheckAll` 里自己挡。
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.type` | 功能列类型，六种取值 | [列配置 · 功能列](/vanilla/api/column#功能列-type) |
| `onCheckChange` / `onCheckAll` | 勾选变化回调 | [表格配置](/vanilla/api/table#virttableoptions) |
| `getCheckedRows` / `setCheckedRows` / `clearCheckedRows` | 勾选态读写 | [实例方法](/vanilla/api/instance) |
| `onRadioChange` / `getSelectedRadio` / `setSelectedRadio` | 单选态读写 | [数据与远程 · 单选行](/vanilla/api/data#单选行) |
| `setCellRender` | 单元格级配置，可穿透功能列 | [单元格渲染](/vanilla/api/cell#单元格级渲染-setcellrender) |
