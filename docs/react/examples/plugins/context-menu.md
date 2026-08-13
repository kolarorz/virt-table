# React 右键菜单

右键菜单由 `vtContextMenu` 插件提供（插件与框架无关，`@virt-table/react` 直接透传 vanilla 的实现与类型）。

## 关键写法

```tsx
import React from 'react';
import {
  VirtTableReact,
  vtContextMenu,
  type VirtTableRef,
  type ContextMenuContext,
  type ContextMenuItem,
} from '@virt-table/react';

const tableRef = React.useRef<VirtTableRef>(null);

const buildItems = (ctx: ContextMenuContext<Row>): ContextMenuItem[] => [
  { label: `复制「${ctx.column.title}」的值`, action: () => copy(ctx.row[ctx.column.key]) },
  { divider: true, label: `删除 ${ctx.row.name}`, action: () => remove(ctx.row) },
  { label: '仅高分行可用', disabled: ctx.row.score <= 90, action: () => {} },
];

const options = React.useMemo(() => ({
  list, itemKey: 'id', estimatedSize: 40,
  plugins: [vtContextMenu(buildItems)],
}), []);

<VirtTableReact ref={tableRef} columns={columns} options={options} />
```

组件 ref 方法：`hideContextMenu()`。

::: tip 插件 API 自动透传
`hideContextMenu()` 是插件通过 `PluginHandle.api` 注入的，React 封装里**没有为它手写转发**——`useImperativeHandle` 返回的 ref 会把未显式声明的方法自动回落到插件 API。

自定义插件的方法同样可以直接在 ref 上调用；想让它有类型提示，用 `declare module` 扩展 vanilla 的 `VirtTablePluginApi`（一处声明，三端生效）：

```ts
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    myPluginDoSomething: () => void;
  }
}
```
:::

::: tip 插件在构造时装载
`plugins` 在建表时生效，运行时替换该字段不会重新装载；需要换插件配置时用 `key` 重建组件。菜单项回调里改数据后直接 `ref.setList()`，不必靠 state 驱动重渲染。
:::

完整语义（上下文字段、菜单项结构、`selection` 依赖、边界回收）见 [Vanilla · 右键菜单](/vanilla/examples/plugins/context-menu)。

## 示例

<PlaygroundHost framework="react" example-id="react-context-menu" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/ContextMenu.tsx
:::
