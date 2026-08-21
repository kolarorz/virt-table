# vtSortConfig 排序配置

一个面板，配**多列排序**：一条条规则（按哪一列 + 升还是降），顺序就是优先级。

装了 [`vtToolbar`](./toolbar) 时它会挂成工具栏上的「排序」那颗按钮（工具栏**一颗都不自带**，
要哪颗装哪个）；下面的示例不装工具栏。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-sort-config" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/sort-config.ts
:::

## 说明

```ts
new VirtTable(el, {
  list, columns, itemKey: 'id', estimatedSize: 40,
  // 不开这个的话面板只给一条规则，并说明原因
  sortMode: 'multiple',
  plugins: [vtSortConfig()],
});

table.toggleSortConfig(btnEl);
```

| 选项 | 作用 |
| --- | --- |
| `toolbar` | 装了 `vtToolbar` 时要不要占那条按钮条的位置，默认 `true` |
| `texts` | 文案覆盖，不给则跟随 `setLocale()` |

两条如实说出来的边界：

- **`sortable: false` 的列不进候选** —— 那是使用方明确说过「这列不排序」，面板不该给绕过去的入口。
  反过来没写 `sortable` 的列一律可选（`sort()` 对任何列都有效，而这个面板的意义正是「按任何一列排」）。
- **没开 `sortMode: 'multiple'` 时只允许一条规则**，面板不给「添加」并说明原因 ——
  `setState` 在单列模式下会静默截断成第一条，界面上先说清比让人加了又看它消失好。

落地走 `setState({ sort })`，所以与**点列头排序是同一份状态**：在面板里排的序，列头上的箭头也会亮。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `toggleSortConfig(anchor?)` | 开合面板 | [插件机制](/vanilla/api/plugins) |
| `getSortState()` / `setState({ sort })` | 读写排序状态 | [列排序](/vanilla/examples/advanced/sort) |
| `sortMode` / `col.sortable` | 多列排序开关 / 某列参不参与 | [表格配置](/vanilla/api/table) |
| `onSortChange` | 排序变化回调 | [表格配置](/vanilla/api/table) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
