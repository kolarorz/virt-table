# 溢出隐藏

超长文本的两种处理方式：`ellipsis` 只给省略号，`tooltip` 再加一层内置浮层。全局配 `textOverflow`，列上同名字段可覆盖。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-overflow" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/overflow.ts
:::

## 说明

| 取值 | 行为 |
| --- | --- |
| `ellipsis` | 单行 + 省略号，不提供查看完整内容的手段 |
| `tooltip` | 省略号 + 内置浮层 |

```ts
new VirtTable(el, {
  list,
  columns: [
    { key: 'name', title: '姓名', width: 120 },
    // 列级覆盖：只有这一列弹浮层
    { key: 'remark', title: '备注', width: 200, textOverflow: 'tooltip' },
  ],
  itemKey: 'id',
  estimatedSize: 40,
  textOverflow: 'ellipsis', // 其余列只要省略号
  tooltip: { delay: 150 },  // 悬停延迟（ms），默认 150，0 为立即弹
});
```

`tooltip` 不需要装插件、不需要额外引 CSS（样式在 `core.css` 里）。

## tooltip 的行为细节

- **只在文本真被裁掉时弹**（比较 `scrollWidth` / `clientWidth`），短文本悬停无反应；
- 悬停 `tooltip.delay` 毫秒后出现（默认 150），长文本在浮层里换行，最大宽度取表格宽度；
- 浮层挂在 `.vt-root` 内（不是 `document.body`），上方放不下自动翻到下方、贴边自动夹取并把箭头指回单元格中心；
- 跟随明暗主题（`--vt-tooltip-bg` / `--vt-tooltip-text` 两个变量可覆盖），`prefers-reduced-motion` 下不做淡入；
- 滚动、换数据、排序 / 筛选触发重绘时立即隐藏（行 DOM 会被复用）。

与 `'ellipsis'` 的区别只在于给不给查看完整内容的手段。只响应鼠标悬停，纯键盘操作下看不到
（单元格文本节点本身是完整的，读屏不受影响）。

::: details 为什么浮层挂在表格里而不是 body
挂在表格内是刻意的：`absolute` 定位相对 root，页面滚动时浮层跟着表格一起走，**零 JS**。
挂 body 只能用 `position: fixed`，那是锚在视口的，页面一滚就得靠 JS 逐帧重算位置，视觉上会卡。
代价是很窄的表格里长文本会被压成高窄块（靠换行消化）。
:::

::: details 早期还有过 `'title'`，已移除
`'title'`（省略号 + 原生 `title` 属性）实测在渲染与悬停上都没有性能优势，却延迟不可控、
不换行、不跟主题，而且**无论文本是否真被裁掉都会挂上属性** —— 短文本悬停会弹一个与眼前
内容重复的气泡。
:::

## 性能

Chrome 无头实测：两种取值在渲染路径上开销一致（10 万单元格 49.4 / 48.3 ms，差异在噪声内）。
`'tooltip'` 的额外成本只有 tbody 上一对事件委托，约 **0.5µs / 次 `mouseover`**，不随单元格
数量增长；截断判定被推迟到延迟计时器里，所以鼠标横扫单元格不产生任何强制重排 —— 只有真正
停下来那一格付一次 `scrollWidth` 读取。

::: warning 只作用于未自定义渲染的单元格
列上写了 `render` 时内容由你接管，`textOverflow` 不介入。表头暂不支持（`th` 直接写 `textContent`）。
:::

## 相关 API

| 字段 | 作用 | 详见 |
| --- | --- | --- |
| `options.textOverflow` | 全局文本溢出处理 | [表格配置](/vanilla/api/table#virttableoptions) |
| `options.tooltip` | 浮层配置（`{ delay }`） | [表格配置](/vanilla/api/table#virttableoptions) |
| `col.textOverflow` | 列级覆盖 | [列配置](/vanilla/api/column#virttablecolumn) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column)
