# vtCellEditor 单元格编辑

装上 `vtCellEditor`，列上的 `renderEditor` 才会被调用：点开一格时插件在它上方开一层
`.vt-cell-cover` 浮层，把 `renderEditor` 返回的 DOM 放进去。`render` 负责常态、
`renderEditor` 负责编辑态，两者分工独立。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-cells-render" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/cells-render.ts
:::

## 说明

```ts
new VirtTable(el, {
  list,
  columns: [
    {
      key: 'name',
      title: '姓名',
      width: 160,
      render: ({ value }) => `<b>${value}</b>`,
      renderEditor: ({ el, row, colKey, commit }) => {
        const input = document.createElement('input');
        input.value = String(row[colKey] ?? '');
        input.onchange = () => commit(input.value);
        el.appendChild(input);
        return el;
      },
    },
  ],
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtCellEditor()],
});
```

浮层挂在滚动容器上（不在这一格的 DOM 里），自己维护定位，Esc 撤销，同时只开一个。
也可以程序化进入：`openCellEditor(rowKey, colKey)`。

## 激活态

编辑态是**会话**，它会消失：单选下拉、日历都是「选完即关面板」，点到别处更是整个浮层收掉。
如果此时单元格上什么痕迹都不留，一表数据看下来就想不起「刚改的是哪一格」。

所以 `vtCellEditor` 点开一格时会同时把它标成**激活态** —— 核心那圈当前单元格描边
（`.vt-active-cell-overlay`），编辑浮层关掉后它还在：

```ts
plugins: [vtCellEditor()]                      // 默认就有激活态
plugins: [vtCellEditor({ activeCell: false })] // 关掉
```

四件事值得留意：

- **与 `highlightSelectCell` 是同一份状态、同一个浮层。** 那个选项只是「点击也算一次设置」的
  开关；两个都开不会叠出两层框。描边的跟随（滚动、排序、列窗口变化）由核心统一负责。
- **点到不能编辑的格子，描边也跟着走。** 只在有 `renderEditor` 的格子上标记的话，用户点一下
  旁边的只读格子，描边会赖在上一格不动 —— 看着像卡住了。
- **装了 `vtCellSelection` 时默认关。** 那张表已经有一圈会跟着点击与键盘移动的「当前单元格」
  （选区 overlay），再画一圈的结果是两个框都自称当前单元格，而且会分家 —— 选区移到 B2、
  编辑留下的描边还钉在 A1。要两者并存就显式传 `activeCell: true`。
- **裸模式（`chrome: false`）可以关掉。** 那种模式刻意把外观全交给第三方组件，再加一圈主色
  描边可能违背初衷（不过内置的 Element Plus / Ant Design 示例本来就开着 `highlightSelectCell`，
  说明这圈描边在裸模式下也常常是想要的）。

程序化入口是 `setActiveCell(rowKey, colKey)` / `getActiveCell()`，传 `null` 清除。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtCellEditor({ chrome?, activeCell? })` | 编辑会话插件 | [插件机制](/vanilla/api/plugins) |
| `col.renderEditor` | 列级编辑器（回落链：单元格级 > 列级） | [单元格渲染 · 会话层](/vanilla/api/cell#会话层-编辑态) |
| `col.editorChrome` | 这一列的浮层要不要画外观 | [列配置](/vanilla/api/column#virttablecolumn) |
| `openCellEditor` / `setActiveCell` / `getActiveCell` | 程序化进入与描边 | [实例方法](/vanilla/api/instance) |

> 相关示例：[渲染粒度](/vanilla/examples/cell/render-levels)（`renderEditor` 的回落）、
> [第三方组件库集成](/vanilla/examples/cell/third-party)（浮层外观归属）、
> [编辑校验](/vanilla/examples/advanced/validate)
