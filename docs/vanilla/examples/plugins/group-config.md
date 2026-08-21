# vtGroupConfig 分组配置

一个面板，配**多级分组**：每一级选一列，再选组标题怎么排（原序 / 升 / 降）。

装了 [`vtToolbar`](./toolbar) 时它会挂成工具栏上的「分组」那颗按钮（工具栏**一颗都不自带**，
要哪颗装哪个）；下面的示例不装工具栏，按钮由使用方自己放。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-group-config" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/group-config.ts
:::

## 说明

```ts
new VirtTable(el, {
  list, columns, itemKey: 'id', estimatedSize: 40,
  plugins: [vtGroupConfig()],
});

table.toggleGroupConfig(btnEl);
```

| 选项 | 作用 |
| --- | --- |
| `toolbar` | 装了 `vtToolbar` 时要不要占那条按钮条的位置，默认 `true` |
| `texts` | 文案覆盖，不给则跟随 `setLocale()` |

### 候选列是**推断**出来的

面板不会把所有列都列进去。一列要进候选得同时满足：

- 取值种类不多（超过 50 种就不是一个分类维度）；
- 不是日期（按开始日期分组会得到一堆只有一行的组）；
- **至少有一个取值重复出现** —— 逐行唯一的列（姓名、编号）按它分组等于把表打散，那不是分组。

取样最多看 500 行，并且会钻进分组行与树形父节点的 `children`（否则「已经分好组」的表反而
判不出候选列）。一列都不满足时面板直说「没有适合分组的列」，而不是给一个点了没反应的下拉。

- 落地走 `setGroupConfig()`，与列头的分组入口是同一份状态。
- 「刚点添加还没选列」的那一级不落地（与筛选面板「点了应用才生效」同一个规矩）。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `toggleGroupConfig(anchor?)` | 开合面板 | [插件机制](/vanilla/api/plugins) |
| `getGroupConfig()` / `setGroupConfig(levels)` | 读写分组层级 | [实例方法](/vanilla/api/instance) |
| `groupConfig` | 初始分组 | [表格配置](/vanilla/api/table) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
