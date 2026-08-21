# 键盘导航

装载 `vtCellSelection()` + `vtKeyboardNav()` 后，先单击单元格再用键盘操作：方向键移动、Tab/Shift+Tab 左右、Enter 下移、F2 进入编辑、Shift+方向键扩展选区。目标行不在视口时会自动滚动。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-keyboard" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/keyboard.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtKeyboardNav()` | 键盘导航（`requires: vtCellSelection`） | [插件机制 · 键盘导航](/vanilla/api/plugins#键盘导航) |
| 完整按键表 | 方向键 / Tab / Enter / Home / End / Ctrl+Home / PageUp / Shift+ / F2 | [插件机制 · 键盘导航](/vanilla/api/plugins#键盘导航) |
| `vtCellEditor()` | 装了才响应 F2 | [插件机制](/vanilla/api/plugins) |

翻一屏 = 视口能放下多少行，按 `clientHeight / estimatedSize` 估。动态行高下是近似值 —— 差一两行无妨，`scrollToCell` 会把目标行滚进视口。Mac 上多数键盘没有独立 Home / End 键，所以 `Cmd` 组合与 `Ctrl` 等效。
