# 列显隐 / 列设置

列支持 `hidden`（默认隐藏）与 `hideable: false`（禁止在面板切换）。装载 `vtColumnPanel()` 插件后用 `toggleColumnPanel()` 打开列设置面板，或用 `setColumnVisible(key, visible)` 编程控制。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-column-visibility" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/column-visibility.ts
:::
