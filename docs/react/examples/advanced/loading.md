# React 加载态

通过 `loading` 选项或 `setLoading(bool)` 方法显示加载遮罩，常用于异步刷新数据期间。可配 `loadingText` 自定义文案。

## 示例

<PlaygroundHost framework="react" example-id="react-loading" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/advanced/Loading.tsx
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `loading` / `loadingText` | 加载遮罩与文案 | [表格配置 · 加载态](/vanilla/api/table#加载态) |
| `setLoading(bool)` | 运行时切换 | [实例方法](/vanilla/api/instance) |
| `--vt-mask-bg` | 遮罩底色 | [主题定制](/react/examples/basic/theme) |

服务端取数时首屏 / 换参 / 翻页走全屏遮罩，追加只亮状态条 —— 两种加载态的分工见[无限滚动](/react/examples/advanced/infinite)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
