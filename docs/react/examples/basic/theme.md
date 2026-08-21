# React 暗夜模式

通过 `theme` 选项或 ref 上的 `setTheme()` 显式切换亮色 / 暗色。表格样式基于 `.vt-root` 上的 `--vt-*` CSS 变量，暗色下自动套用暗色 token。

## 示例

<PlaygroundHost framework="react" example-id="react-theme" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/basic/Theme.tsx
:::

## 说明

> 除显式切换外，表格处于 `.dark` 祖先元素下（如 VitePress / Tailwind 暗色）会自动应用暗色，无需手动设置。

完整的主题定制（`--vt-*` 变量清单、密度变体、行高等式、深浅色作用域）见 [Vanilla · 暗夜模式](/vanilla/examples/basic/theme)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `options.theme` | 初始主题 `'light' \| 'dark'` | [表格配置 · 主题](/vanilla/api/table#主题) |
| `setTheme(theme)` | 运行时切换 | [实例方法](/vanilla/api/instance) |
| `options.estimatedSize` | 行预估高度，**必须与密度档的实际行高一致** | [表格配置](/vanilla/api/table#virttableoptions) |
| `headerClass` / `rowClass` / `cellClass` / `*Style` | 逐行 / 逐格挂类名与内联样式 | [表格配置](/vanilla/api/table#virttableoptions) |

> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
