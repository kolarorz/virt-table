# Vue 组件渲染

列的 `render` / `renderEditor` / `renderHeader` / `renderExpandRow` 可以**直接返回 VNode**
（`h()` 或 JSX），挂载与回收由适配层负责 —— 行被虚拟滚动回收时对应的组件实例一起卸载，
不会泄漏。

## 示例

<PlaygroundHost framework="vue" example-id="vue-render" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/cell/RenderDemo.vue
:::

## 说明

vanilla 没有这一层（`render` 返回的就是 DOM 字符串或元素），所以这一页只在框架端有。

```ts
import { h } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';
import MyTag from './MyTag.vue';

const columns: VueTableColumn[] = [
  // 返回 VNode：适配层负责 mount / unmount
  { key: 'status', title: '状态', width: 120, render: ({ value }) => h(MyTag, { value }) },
  // 也可以返回字符串 / DOM 元素，与 vanilla 同义
  { key: 'name', title: '姓名', width: 160, render: ({ value }) => `<b>${value}</b>` },
];
```

两条需要留意：

- **查看态别挂重组件。** 滚动时行 DOM 被反复复用，持续挂载 / 销毁组件会拖帧。轻量内容用
  字符串或 `h('span', …)`，真组件留给编辑态（只有当前激活的那一格才会构造），理由与
  [第三方组件库集成](./third-party)那页一样。
- **编辑态里的 VNode 要刷新时调 `forceUpdate()`**，见 [Vue API · 编辑态刷新](/vue/api/cell#编辑态刷新)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.render` | 返回 VNode / 字符串 / DOM 元素 | [Vue API · 渲染函数返回 VNode](/vue/api/cell#渲染函数返回-vnode) |
| `col.renderEditor` / `renderHeader` / `renderExpandRow` | 同样支持 VNode | [Vue API · 列级](/vue/api/column#vuetablecolumn) |
| `setCellRender(rowKey, colKey, cfg)` | 单元格级也能返回 VNode（走 `ref`） | [Vue API · 单元格级渲染](/vue/api/cell#单元格级渲染-setcellrender) |
| `forceUpdate()` | 刷新编辑态里的 VNode | [实例方法](/vanilla/api/instance) |

> 内容层的优先级（表级 / 列级 / 单元格级）与四层模型见 [渲染粒度](./render-levels)；
> 字段全量表在 [Vanilla API · 单元格渲染](/vanilla/api/cell)。
