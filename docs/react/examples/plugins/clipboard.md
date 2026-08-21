# React 剪贴板

由 `vtClipboard` 插件提供：把当前框选区域复制成 TSV（可直接粘到 Excel），也支持从外部粘贴写回。插件与框架无关，`@virt-table/react` 直接透传 vanilla 的实现与类型。

## 示例

<PlaygroundHost framework="react" example-id="react-clipboard" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/Clipboard.tsx
:::

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

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtClipboard(options?)` | 选区复制 / 粘贴（`requires: vtCellSelection`） | [插件机制](/vanilla/api/plugins) |
| `vtCellSelection()` | 前置依赖：复制的就是当前框选区域 | [插件机制](/vanilla/api/plugins) |
| `col.exportValue` | 覆盖取值（复制与导出共用） | [插件机制 · 导出](/vanilla/api/plugins#导出-打印) |

不读合并信息（逐行取值），要还原合并结构自己用 `getEffectiveMerges()`，见[按值自动合并](/react/examples/merge/auto-merge#与选区-导出的联动)。

> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
