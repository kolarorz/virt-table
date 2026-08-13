# React 剪贴板

由 `vtClipboard` 插件提供：把当前框选区域复制成 TSV（可直接粘到 Excel），也支持从外部粘贴写回。插件与框架无关，`@virt-table/react` 直接透传 vanilla 的实现与类型。

## 装载

```tsx
import { VirtTableReact, vtCellSelection, vtClipboard } from '@virt-table/react';

// 插件实例只能建一次：不放进 useMemo，每次渲染都会新建插件对象
const plugins = React.useMemo(() => [vtCellSelection(), vtClipboard()], []);
```

`vtClipboard` 声明了 `requires: ['vtCellSelection']`——没装框选插件时它会被跳过并告警，不会静默失效。

## 自定义 payload

```tsx
vtClipboard<Row>({
  mimeType: 'application/x-vt-demo+json',
  onCopy: (ctx) => ({ text: ctx.rows.map((l) => l.join('\t')).join('\n'), payload }),
  onPaste: (ctx) => false,  // 返回 false 交回插件走默认 TSV 写回
});
```

::: tip 插件在构造时装载
`plugins` 在建表时生效，运行时替换该字段不会重新装载。所以回调里要读的开关量走 `useRef`（示例中的「携带结构化 payload」），否则拿到的是建表那一刻的闭包值。
:::

完整语义（默认 TSV 规则、自动补空行、焦点让位、与编辑浮层的关系）见 [Vanilla · 剪贴板](/vanilla/examples/plugins/clipboard)。

## 示例

<PlaygroundHost framework="react" example-id="react-clipboard" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/Clipboard.tsx
:::
