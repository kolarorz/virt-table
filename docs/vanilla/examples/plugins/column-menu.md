# vtColumnMenu 列头菜单

每一列表头右侧一颗 **☰**，点开是这一列的动作清单：排序、筛选、冻结、隐藏、自适应列宽、按此列分组。

<PlaygroundHost framework="vanilla" example-id="table-column-menu" />

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtColumnMenu, vtColumnFilter } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/column-menu.css';
import '@virt-table/vanilla/plugins/column-filter.css'; // 菜单里的「筛选」要它

const table = new VirtTable(el, {
  list,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtColumnMenu(), vtColumnFilter()],
});
```

装上就有，不需要任何列级配置 —— 菜单里每一项**自己判断该不该出现**（见下面那张表）。

## 六组条目，各自的出现条件

| 条目 | 落到哪 | 什么时候**不**出现 |
| --- | --- | --- |
| 升序 / 降序 / 取消排序 | `setState({ sort })` | 列上 `sortable: false` |
| 筛选… | 让 `vtColumnFilter` 开它那份面板 | 没装 `vtColumnFilter`，或这一列没配 `filters` / `filterType` |
| 冻结到左侧 / 右侧 / 取消冻结 | 改 `col.fixed` + `setColumns()` | — |
| 隐藏本列 | `setColumnVisible(key, false)` | 列上 `hideable: false` |
| 自适应列宽 | 量渲染出来的格 + `setColumns()` | 列上 `resizable: false` |
| 按此列分组 / 取消分组 | `setGroupConfig()` | — |

**当前生效的那一项会高亮**（已按此列升序 / 已冻结在左 / 已按此列分组），不可用的置灰
（没排序时的「取消排序」、没冻结时的「取消冻结」）—— 不是隐藏：一个时隐时现的菜单
每次打开位置都不一样，比一项灰着更难用。

## 「筛选」是复用，不是重画

菜单里的「筛选」**不自己画面板**，而是 `inject('columnFilter')` 让 `vtColumnFilter` 把它
那份面板开在菜单按钮上。于是：

- 没装 `vtColumnFilter` → 菜单里**没有**这一项（而不是有一项点了没反应）
- 装了但这一列没配筛选 → 同样不出现
- 两处的判据是**同一个函数**，不会出现「菜单里有筛选、表头却没有漏斗图标」这种自相矛盾

::: tip 两个浮层不会同时在
点「筛选」会先关掉菜单再开筛选面板 —— 它们都挂在 `.vt-root` 内，同时开着会互相遮。
:::

## 自适应列宽只看**渲染出来的**行

按当前可见的那些格量最宽的一个（表头也算进去），夹在 `autoWidthRange` 里（默认 `[60, 480]`）。

虚拟化下量不到窗口外的行 —— 这是**能力边界，不是 bug**：要精确就得把十万行全渲染一遍量一次，
而那正是虚拟化要避免的事（AG Grid 的 autosize 同样只看渲染行）。量不到内容时**保持原宽度**
而不是压成 0。

```ts
vtColumnMenu({ autoWidthRange: [80, 320] })
```

## 裁剪与扩展

```ts
vtColumnMenu({
  // 只留这两组，顺序按数组给的来（默认六组全给）
  items: ['sort', 'filter'],

  // 哪些列不挂 ☰ —— 功能列与分组节点本来就不挂，这个开关给业务判断用
  disabled: (col) => col.key === 'op',

  // 追加自定义条目，挂在内置条目之后
  extraItems: (col) => [
    { label: `复制列名「${col.title}」`, onClick: () => copy(col.title) },
    { label: '查看字段说明', onClick: () => openDoc(col.key), disabled: !hasDoc(col.key) },
  ],

  // 文案覆盖（英文站整份换掉）
  texts: { sortAsc: 'Ascending', sortDesc: 'Descending' },
});
```

## 哪些列**天生**没有菜单

- **分组节点**（配了 `children` 的那些）：它不承载数据，排序 / 筛选 / 冻结对它没有意义
  （`fixed` 甚至会被核心强制下发给全部后代）
- **功能列**：序号 `index`、勾选 `checkbox`、单选 `radio`、拖拽把手 `drag`
- **例外：`type: 'tree'` 有菜单** —— 树形列只加缩进与折叠箭头，内容照常走 `render` 与默认取值，
  所以它是一根正常的数据列

## 不接管表头点击

表头点一下**仍然是排序**（核心的行为），菜单只是多一个入口。☰ 上的点击会
`stopPropagation()`，所以点它不会连带触发排序 —— 与漏斗图标同一个理由。

## 命令式入口

自己在别处放按钮时（工具栏、右键菜单里的一项）用这三个：

```ts
table.openColumnMenu('dept');            // 贴那一列表头上的 ☰
table.openColumnMenu('dept', myButton);  // 贴自己的按钮
table.closeColumnMenu();
table.isColumnMenuOpen();        // 有菜单开着吗
table.isColumnMenuOpen('dept');  // **这一列**的菜单开着吗
```

## 与三个图标挤在一起时的让位

表头右侧最多同时站三个：排序箭头（核心）、筛选漏斗（`vtColumnFilter`）、☰（本插件）。
☰ 永远在**最右**（它是「更多」），另两个往左让，`column-menu.css` 里按 2×2×2 的组合
穷举了那几条规则。所以三个都在时也不会叠在一起 —— 前提是**两份 CSS 都引了**。

## 为什么它在免费版

AG Grid 把 Column Menu 划进 Enterprise，这一条不跟：菜单本身没有任何算法，它只是把核心
**已经有的**几个公开动作摆成一列按钮。社区一周能写完的东西收费只会赶客 —— 与右键菜单、
列面板同一条线。付费边界留给「进阶场景专属、且复刻成本高」的能力，见 [企业版](/enterprise/)。

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/column-menu.ts
:::

## 相关

| 想要什么 | 去哪 |
| --- | --- |
| 列头筛选下拉本身 | [vtColumnFilter 列筛选](/vanilla/examples/plugins/filter) |
| 一个集中的字段显隐 / 换序面板 | [vtFieldConfig 字段配置](/vanilla/examples/plugins/column-visibility) |
| 一条工具栏 + 面板按钮 | [vtToolbar 工具栏](/vanilla/examples/plugins/toolbar) |
| 分组的多级配置面板 | [vtGroupConfig 分组配置](/vanilla/examples/plugins/group-config) |
| 插件清单与注入的方法 | [API · 插件机制](/vanilla/api/plugins) |
