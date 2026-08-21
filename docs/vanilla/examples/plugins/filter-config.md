# vtFilterConfig 高级筛选

一个面板，跨列写 **AND / OR 条件树**（`VtFilterBuilder`），落到核心的 `filterModel`。

装了 [`vtToolbar`](./toolbar) 时它会挂成工具栏上的「筛选」那颗按钮（工具栏**一颗都不自带**，
要哪颗装哪个）；下面的示例刻意不装工具栏 —— 那时插件自己开浮层，按钮放哪儿由你决定。

## 与 `vtColumnFilter` 的区别（两个都叫「筛选」，不是一件事）

| | 入口 | 状态 |
| --- | --- | --- |
| [`vtColumnFilter`](./filter) | 表头上的漏斗，**一列一个** | `columnFilters`（每列一组勾选值） |
| 本插件 | 一个面板，**跨列写条件树** | `filterModel`（AND / OR + 算子） |

两套状态独立，最终 **AND** 在一起。装哪个、装几个都成立。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-filter-config" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/filter-config.ts
:::

## 说明

```ts
new VirtTable(el, {
  list, columns, itemKey: 'id', estimatedSize: 40,
  plugins: [vtFilterConfig()],
});

table.toggleFilterConfig(btnEl);   // 面板贴在锚点下方
```

| 选项 | 作用 |
| --- | --- |
| `toolbar` | 装了 `vtToolbar` 时要不要占那条按钮条的位置，默认 `true`。`false` = 只提供下面那组 API |
| `texts` | 文案覆盖，不给则跟随 `setLocale()` |

- 落地走 `setState({ filterModel })`，所以与状态持久化、撤销/重做、`vtViews` 的视图还原是**同一份状态**。
- 面板里**点了「应用筛选」才落地**：逐字改一个数值就重算全表不合适。
- 候选列取当前**可见列**：在字段配置里藏掉的列不该还能筛。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `toggleFilterConfig(anchor?)` | 开合面板 | [插件机制](/vanilla/api/plugins) |
| `openFilterConfig` / `closeFilterConfig` / `isFilterConfigOpen` | 其余开合入口 | [插件机制](/vanilla/api/plugins) |
| `getState().filterModel` / `setState({ filterModel })` | 读写这份状态 | [状态持久化](/vanilla/examples/advanced/state-persist) |
| `onFilterModelChange` | 条件落地后的回调 | [表格配置](/vanilla/api/table) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
