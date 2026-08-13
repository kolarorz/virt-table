# React 键盘导航

装载 `vtCellSelection()` + `vtKeyboardNav()` 后，先单击单元格再用键盘操作：方向键移动、Tab / Shift+Tab 左右、Enter 下移、F2 进入编辑、Shift+方向键扩展选区。目标行不在视口时会自动滚动。

## 使用的 API

```tsx
import { VirtTableReact, vtCellSelection, vtKeyboardNav } from '@virt-table/react';

// 键盘导航依赖框选提供「当前单元格」，两个插件要一起装
const plugins = React.useMemo(() => [vtCellSelection(), vtKeyboardNav()], []);
```

## 示例

<PlaygroundHost framework="react" example-id="react-keyboard" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/plugins/Keyboard.tsx
:::
