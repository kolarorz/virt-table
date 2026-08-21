# vtFieldConfig 字段配置（列显隐 / 列序）

字段配置面板 = **勾选控制列显隐 + 拖手柄调整列序**。列上 `hidden: true` 是「默认隐藏」，
`hideable: false` 是「不许用户在面板里切换」。运行时用 `setColumnVisible(key, visible)` /
`moveColumn()` 编程控制，或者装 `vtFieldConfig()` 让用户自己配。

装了 [`vtToolbar`](./toolbar) 时它会把自己挂成工具栏上的「字段配置」那颗按钮 ——
工具栏**一颗都不自带**，所以这个插件（或 `...vtToolbarPanels()` 那个预设）必须写出来。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-column-visibility" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/column-visibility.ts
:::

## 说明

```ts
new VirtTable(el, {
  list,
  columns: [
    { key: 'id',   title: 'ID',   width: 80,  hideable: false },  // 面板里不给勾
    { key: 'memo', title: '备注', width: 200, hidden: true },     // 默认藏起来
  ],
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtFieldConfig()],
});

table.toggleFieldConfig(btnEl);     // 面板贴锚点元素下方
```

### 选项

| 选项 | 作用 |
| --- | --- |
| `reorder` | 给不给拖拽换序，默认 `true`。`false` = 只勾显隐（列序另有入口时用它，例如已装 `vtColumnDrag` 在表头上拖） |
| `canToggleColumn(col)` | 某一列能不能切显隐。返回字符串 = 不能，且这句话就是置灰后鼠标停上去的原因 |
| `texts` | 文案覆盖，不给则跟随 `setLocale()` |

```ts
plugins: [
  vtFieldConfig({
    reorder: false,
    canToggleColumn: (col) => (col.key === 'id' ? 'ID 列是行标识，不能隐藏' : true),
  }),
]
```

## 面板行为

- 传锚点元素则面板贴在它下方；不传就贴表格左上角（一般都该传自己那颗按钮）。
- 装了 `vtToolbar` 时这几个 API **转发给工具栏**：面板贴工具栏上那颗按钮，也不会出现「点按钮
  开一个、调 API 又开一个」两张面板同时在。
- **手柄只在同一父节点的兄弟列之间换位**（跨分组换位会改表头结构），分组节点自己不参与换序。
- **勾掉分组节点等于整组隐藏**；某分组的子列全被隐藏时整组消失（表头自动收窄）。
- 读列的三个方法语义不同：`getVisibleColumns()` 只给**可见叶子列**，`getLeafColumns()` 给全量
  叶子列（含隐藏），`getAllColumns()` 给整棵列树（含分组节点）。
- **隐藏一列不会让它上面的筛选 / 排序失效** —— 数据管线读的是全量叶子列，与 AG Grid / Excel
  同语义。所以「隐藏某列 + 该列有筛选」这种状态能被[完整还原](/vanilla/examples/advanced/state-persist)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.hidden` / `col.hideable` | 默认隐藏 / 允不允许用户切换 | [列配置 · 列显隐](/vanilla/api/column#列显隐) |
| `setColumnVisible(colKey, visible)` | 编程式显隐 | [列配置 · 列显隐](/vanilla/api/column#列显隐) |
| `getVisibleColumns` / `getLeafColumns` / `getAllColumns` | 三种读列口径 | [实例方法](/vanilla/api/instance) |
| `toggleFieldConfig(anchor?)` | 打开 / 关闭面板 | [插件机制](/vanilla/api/plugins) |
| `moveColumn(fromKey, toKey, after)` | 编程式换序（面板里拖手柄落的就是它） | [实例方法](/vanilla/api/instance) |
| `getState()` / `setState()` | 把列显隐存下来 | [状态持久化](/vanilla/examples/advanced/state-persist) |
