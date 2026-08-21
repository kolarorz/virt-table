# 第三方组件库集成

::: info 这一页是占位
原生用法**不需要**第三方组件库适配层：`render` / `renderEditor` 返回的就是 DOM，想挂什么组件库直接挂。
这一节存在的意义是让三端侧边栏结构一致，具体示例请看框架端：

- [Vue · Element Plus 列渲染](/vue/examples/cell/third-party)
- [React · Ant Design 列渲染](/react/examples/cell/third-party)
:::

## 原生怎么接

框架端的适配层解决的是「返回 VNode / React 元素怎么变成 DOM」，vanilla 没有这个问题。要在单元格里放第三方组件，两个钩子够了：

```ts
{
  key: 'status',
  title: '状态',
  width: 160,
  // 查看态：轻量 DOM，别在这里挂真组件
  render: ({ value }) => `<span class="badge">${formatStatus(value)}</span>`,
  // 编辑态：仅当前激活的单元格才会走到这里，挂真组件的代价可控
  renderEditor: ({ el, row, colKey, commit }) => {
    const inst = createThirdPartyWidget(el, {
      value: row[colKey],
      onChange: (v) => commit(v),
    });
    // 浮层关闭时会重建 el，组件实例跟着回收
    return el;
  },
}
```

:::tip 为什么查看态不直接渲染第三方组件
为保证虚拟滚动性能，查看态不该挂第三方 UI 组件。滚动过程中行 DOM 被反复复用，持续挂载/销毁组件会带来明显的帧率下降与交互抖动。

推荐把「查看态」与「交互态」分离：查看态用轻量 DOM + CSS 还原视觉，交互态只在激活单元格时挂真实组件。这样能同时兼顾性能、一致性与可维护性 —— 三端的建议完全相同。
:::

内置的[单元格组件](./vt-input)就是照这个思路写的：常态是手写 DOM，编辑态由 `vtCellEditor` 打开浮层后才构造控件。不想引第三方库的话，它们通常已经够用。

## 编辑浮层的外观归属

`vtCellEditor` 默认按一个契约工作：**浮层画外观（边框 + focus 环），编辑器组件退化成纯内容层**。
内置 `vt-*` 编辑器遵守它 —— `.vt-comp-input` 自己是 `border: none; background: transparent; height: 100%`，
只负责填满浮层。

第三方组件库不可能知道这个约定，它自带一整套外观。两边都画就会出三个问题：

| 症状 | 原因 |
| --- | --- |
| 两层边框，且对不上 | 浮层的边框 + 组件自己的边框（Element Plus 用的是 `.el-input__wrapper` 的 inset box-shadow） |
| 激活前后高度不一致 | `.vt-cell-cover > *` 会把组件拉满单元格，而组件自己有固定 size（`el-input--small` 是 24px） |
| focus 环叠两层 | 浮层有 `--vt-focus-ring-color`，组件也有自己的 focus 态 |

所以这类列要把外观归属交回组件：

```ts
// 单列声明
{ key: 'name', title: '姓名', width: 160, editorChrome: false, renderEditor: (ctx) => … }

// 整表都用第三方组件时，插件选项更省事（列上的值优先）
plugins: [vtCellEditor({ chrome: false })]
```

裸模式下浮层退成纯定位层：去掉全部边框与 focus 环、不再强拉组件高度，组件保持自己的 size 并
垂直居中。**背景保留** —— 浮层得盖住底下那一格的查看态，组件比单元格窄或矮时靠它兜底。

裸模式还会补上和 `.vt-td` 相同的水平内边距（`--vt-cell-padding-x`）：浮层的 rect 是**整个 td**
（含 td 的内边距），不补的话激活瞬间内容会往左跳一个 padding。**这条只在裸模式生效** ——
默认路径的浮层样式完全没变，内置 `vt-*` 编辑器的宽度、`VtTextarea` 的 cover 浮层、
`VtAutocomplete` 的建议列表都不受影响。

## 相关 API

| 字段 | 作用 | 详见 |
| --- | --- | --- |
| `col.render` / `col.renderEditor` | 常态与编辑态两个钩子 | [单元格渲染](/vanilla/api/cell#内容层) |
| `col.editorChrome` | 这一列的浮层要不要画外观（默认 `true`） | [列配置](/vanilla/api/column#virttablecolumn) |
| `vtCellEditor({ chrome })` | 整表的外观归属默认值 | [插件机制](/vanilla/api/plugins) |

> 编辑会话本身（浮层生命周期、激活态）见 [vtCellEditor 单元格编辑](/vanilla/examples/plugins/cells-render)。
