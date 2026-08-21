# 暗夜模式

通过 `theme` 选项或 `setTheme()` 方法显式切换亮色 / 暗色。表格样式基于 `.vt-root` 上的 `--vt-*` CSS 变量，暗色下自动套用暗色 token。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-theme" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/theme.ts
:::

## 说明

> 除显式切换外，表格处于 `.dark` 祖先元素下（如 VitePress / Tailwind 暗色）会自动应用暗色，无需手动设置。

```ts
new VirtTable(el, { list, columns, itemKey: 'id', estimatedSize: 40, theme: 'dark' });
table.setTheme('light');   // 运行时切换
```

## 主题定制（CSS 变量）

表格的**所有**颜色、圆角、间距、字号、阴影、动效时长都抽离成了 `--vt-*` 变量，换肤只需覆盖变量，**无需覆盖任何选择器**：

```css
/* 全局换肤：写在 .vt-root 或任意祖先（如 :root）上都生效 */
.vt-root {
  --vt-color-primary: #7c3aed; /* 主色一改，悬停底色/选区/focus 环/按钮全部联动 */
  --vt-radius-lg: 14px;
  --vt-cell-padding-y: 12px;
}
```

> 悬停底色、选中底色、框选底色、focus 环等**派生色**默认由 `--vt-color-primary` 通过 `color-mix()` 推导，所以只改主色即可整体换色；也可以单独覆盖某个派生色变量。旧浏览器（不支持 `color-mix()`）自动回落到内置静态值。

### 颜色

| 变量                                                              | 说明                                     |
| ----------------------------------------------------------------- | ---------------------------------------- |
| `--vt-color-primary` / `-hover` / `-active`                       | 主色三态                                 |
| `--vt-color-primary-soft` / `-softer`                             | 主色浅底（图标悬停、菜单悬停）           |
| `--vt-color-danger` / `-soft`、`--vt-color-warning` / `-success`   | 语义色（校验失败等）                     |
| `--vt-bg` / `--vt-bg-elevated`                                    | 表格底色 / 浮层底色                      |
| `--vt-header-bg` / `-hover`、`--vt-footer-bg`、`--vt-stripe-bg`    | 表头 / 表头悬停 / 表尾 / 斑马纹          |
| `--vt-row-hover-bg` / `--vt-row-selected-bg`                      | 行悬停 / 行选中                          |
| `--vt-cell-selection-bg`、`--vt-focus-ring-color`                 | 区域框选底色、focus 环颜色               |
| `--vt-border-color` / `-light` / `-strong`、`--vt-border-width`    | 分隔线三档（单元格 / 次级 / 表头表尾）   |
| `--vt-text-color` / `-secondary` / `-placeholder` / `-disabled`    | 文字四档                                 |
| `--vt-text-inverse`、`--vt-header-text-color`                      | 主色块上的反色文字、表头文字             |
| `--vt-fill-color` / `-light` / `-hover`                           | 次级填充（按钮、分组行、展开行）         |
| `--vt-scrollbar-thumb` / `-hover`                                  | 滚动条滑块配色（`--vt-scrollbar-size` 控粗细） |
| `--vt-scrollbar-track`                                             | 轨道底色，默认 `transparent`。表体的两条是 **overlay 浮层**（不占布局空间、随滚动淡入淡出），所以默认无底色；想要「槽」的观感可改成半透明色如 `rgb(248 250 252 / 85%)`，它会跟着滑块一起淡入淡出 |
| `--vt-mask-bg`                                                    | loading 遮罩                             |
| `--vt-highlight-bg` / `--vt-highlight-border`                      | 搜索命中高亮                             |
| `--vt-group-bg` / `-lv2` / `-lv3` / `-hover`、`--vt-group-border`、`--vt-group-accent` / `-width`、`--vt-group-text` | 分组行（分层底色、上下分隔线、左侧标记条） |

### 圆角

| 变量                                                     | 默认值             | 说明                             |
| -------------------------------------------------------- | ------------------ | -------------------------------- |
| `--vt-radius-sm` / `-md` / `-lg` / `-full`                | 4 / 6 / 10 / 999px | 圆角梯度                         |
| `--vt-radius-root`                                       | `--vt-radius-lg`   | 容器圆角（`border` 模式下生效）  |
| `--vt-radius-control`                                    | `--vt-radius-sm`   | 勾选框 / 输入框 / 按钮           |
| `--vt-radius-panel`                                      | `--vt-radius-lg`   | 筛选面板 / 右键菜单 / 搜索框     |

### 间距、字体、尺寸、动效

| 变量                                                                       | 说明                                          |
| -------------------------------------------------------------------------- | --------------------------------------------- |
| `--vt-cell-padding-y` / `-x`、`--vt-header-padding-y` / `-x`                | 单元格 / 表头内边距（密度）                   |
| `--vt-font-family`、`--vt-font-size` / `-sm` / `-xs`                        | 字体与字号                                    |
| `--vt-line-height`                                                         | 单元格行高，**必须是 px**，参与下方行高等式    |
| `--vt-font-weight-medium` / `-semibold`、`--vt-font-numeric`                | 字重；`--vt-font-numeric: normal` 可关等宽数字 |
| `--vt-control-size`、`--vt-icon-btn-size`、`--vt-indent-size`               | 勾选框 / 图标按钮 / 树形缩进                   |
| `--vt-shadow-rgb`、`--vt-shadow-sm` / `-md` / `-lg`                        | 阴影基色与三档阴影                            |
| `--vt-fixed-shadow-color` / `-size`                                        | 固定列阴影                                    |
| `--vt-transition-fast` / `--vt-transition` / `--vt-ease`                    | 动效时长与曲线                                |
| `--vt-empty-icon` / `--vt-empty-icon-size`                                 | 空态图标（尺寸设 0 可隐藏）                    |

### 密度变体

内置紧凑 / 宽松两档（本质就是覆盖内边距与行高变量）。类加在 `.vt-root` 上或**任意外层容器**上都生效：

```html
<!-- 紧凑：vt-compact，宽松：vt-loose -->
<div class="vt-compact">
  <div id="table-container" style="height: 400px"></div>
</div>
```

::: warning 换密度要同时改 estimatedSize
密度只改 CSS，表格的滚动几何却是按 `estimatedSize` 建的。两者不一致时滚动条长度会失真，十万行量级下还可能滚不到底（见下方「行高等式」）。

| 密度 | 类名 | 行高 | 要传的 `estimatedSize` |
| --- | --- | --- | --- |
| 默认 | — | 40px | `40`（默认值，可不传） |
| 紧凑 | `.vt-compact` | 30px | `30` |
| 宽松 | `.vt-loose` | 50px | `50` |
:::

#### 行高等式

自定义密度时，这三个变量必须凑成**整数**行高，并把这个数传给 `estimatedSize`：

```
--vt-line-height + --vt-cell-padding-y × 2 + --vt-border-width(1px) = 行高 = estimatedSize
```

所以 `--vt-line-height` 用 px 而不是无单位比例——`14px × 1.55 = 21.7px` 这种小数行高会让实际渲染高度比 `estimatedSize` 高出零点几像素，误差按行累积，十万行下足以让滚动位置超出内部模型总高、窗口卡在半路不再前进。

```css
/* 自定义密度：36px 行高，配 new VirtTable({ estimatedSize: 36 }) */
#table-container .vt-root {
  --vt-line-height: 21px; /* 21 + 7×2 + 1 = 36 */
  --vt-cell-padding-y: 7px;
  --vt-cell-padding-x: 12px;
}
```

::: details 密度变体为什么走 `--vt-density-*` 中间变量
内置的 `.vt-compact` / `.vt-loose` 设置的是 `--vt-density-cell-padding-y` 这类**中间变量**，
而不是直接改 `--vt-cell-padding-y`。因为 CSS 变量的规则是「元素自己声明的值胜过从祖先继承的」，
而 `.vt-root` 自己声明了全套 token —— 密度类若也直接声明同名 token，加在外层容器上就会被
root 自己的声明挡住、**完全失效**（实测：父元素上 `--vt-line-height` 是 19px，`.vt-root` 上
仍是 21px，行高照旧 40）。

`.vt-root` 改成 `--vt-cell-padding-y: var(--vt-density-cell-padding-y, 9px)` 之后，三种用法
都成立：加在外层容器、加在 root 自己、以及像上面那样直接覆盖最终 token（同元素声明优先级最高）。
:::

### 深色/浅色作用域

```css
/* 暗色 token 生效条件（任一即可） */
.vt-root--dark { }                 /* theme: 'dark' / setTheme('dark') */
.dark .vt-root { }                 /* 处于 .dark 祖先下（VitePress / Tailwind） */
[data-theme='dark'] .vt-root { }   /* 处于 data-theme=dark 祖先下 */

/* 在暗色页面里强制某个表格用亮色 */
.vt-root--light { }
```

### 单元格组件也受行高约束

[内置单元格组件](/vanilla/examples/cell/vt-input)的展示元素一律锁高在 `var(--vt-line-height)` 上
并配 `vertical-align: top`。这不是风格偏好：撑出 22px 就把 40px 的行高顶成 42，`estimatedSize`
与实际行高对不上，回到上面那条等式失效的后果。`components-contract.test.ts` 静态扫描
`components.css` 守着这条，**自定义组件样式时请一并遵守**。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `options.theme` | 初始主题 `'light' \| 'dark'` | [表格配置 · 主题](/vanilla/api/table#主题) |
| `setTheme(theme)` | 运行时切换 | [实例方法](/vanilla/api/instance) |
| `options.estimatedSize` | 行预估高度，**必须与密度档的实际行高一致** | [表格配置](/vanilla/api/table#virttableoptions) |
| `headerClass` / `rowClass` / `cellClass` / `*Style` | 逐行 / 逐格挂类名与内联样式 | [表格配置](/vanilla/api/table#virttableoptions) |
