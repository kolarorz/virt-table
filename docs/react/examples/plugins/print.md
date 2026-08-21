# React 打印

> 由 `vtExport` 插件提供：`plugins: [vtExport()]`。

调用 `print({ title })` 在新窗口输出全表（内联样式），复用导出的 HTML 构造，适合快速打印或另存。

## 示例

<PlaygroundHost framework="react" example-id="react-print" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/Print.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtExport()` | 打印由导出插件提供 | [插件机制 · 导出](/vanilla/api/plugins#导出-打印) |
| `print(opts?: { title? })` | 新窗口输出全表（内联样式） | [插件机制 · 导出](/vanilla/api/plugins#导出-打印) |

> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
