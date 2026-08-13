# 第三方组件库集成

::: info 这一页是占位
原生用法**不需要**第三方组件库适配层：`render` / `renderEditor` 返回的就是 DOM，想挂什么组件库直接挂。
这一节存在的意义是让三端侧边栏结构一致，具体示例请看框架端：

- [Vue · Element Plus 列渲染](/vue/examples/third-party/cell-edit)
- [React · Ant Design 列渲染](/react/examples/third-party/cell-edit)
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

内置的[单元格组件](../column/vt-input)就是照这个思路写的：常态是手写 DOM，编辑态由 `vtCellEditor` 打开浮层后才构造控件。不想引第三方库的话，它们通常已经够用。
