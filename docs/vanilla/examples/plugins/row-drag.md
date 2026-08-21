# 行拖拽排序

配一列 `type: 'drag'` 手柄并装 `vtRowDrag()`，拖手柄调整行顺序。**扁平、树形、分组三种结构都支持**，
拖到视口边缘自动滚动。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-row-drag" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/row-drag.ts
:::

## 落点怎么判

落点模型与 [virt-list](https://github.com/kolarorz/virt-list) 的树形拖拽一致，指针的**两个方向各管一件事**：

| 指针在目标行内的**纵向**位置 | 落点 |
| --- | --- |
| 上 1/3 | 插到这一行**前面** |
| 下 1/3 | 插到这一行**后面** |
| 中间 1/3 | 成为这一行的**子节点**（目标是分组行时 = 落进这个分组）|

落在行与行之间时，指针的**横向**位置决定插到第几层，可选范围夹在相邻两行的层级之间
（所以拖不出「凭空多一层」的结果）。层级由**指示线自己表达**：它按层分成若干段，
每段的起点**正对该层级的文字起点**（也就是算上了折叠箭头与它右边的间距）—— 已经走过的
层级画淡色、目标层级的起点插一个箭头、之后画实色。一眼就能看出「现在插在第几层、
还能往左往右调几格」。

```
▸ 落在第 1 层（根层）        ▸ 落在第 2 层
  ▶━━━━━━━━━━━━━━━━━━━━      ┈┈ ▶━━━━━━━━━━━━━━━━
  ↑ 箭头在第一段              ↑ 第一段变淡＝这一层能选但没选
```

悬停在折叠节点的中段超过 500ms 会自动展开，方便继续往里放；懒加载节点会顺带把子节点取回来。

**拖带子节点的行时，它会先被收起。** 三个理由，最后一个才是关键：拖的是整棵子树，收起来
ghost 的语义才对；子树留在列表里会跟着一起晃；而**可放区域会被自己的子树切碎** —— 落在自己
子树里一律放不下，于是源节点下面一大片全是「没有指示线」的死区，用起来像坏了。拖完保持收起。

只想让人排序、不想让人改树的形状，就传 `crossLevel: false`（同级模式）：落点只剩上/下两档，
且必须落在**同一父级的兄弟**之间（这个模式同样会先收起源节点）。

```ts
import { vtRowDrag } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/drag-sort.css';

new VirtTable(el, {
  list, itemKey: 'id', estimatedSize: 40,
  columns: [
    { key: '__drag', title: '', width: 44, type: 'drag' },
    { key: 'name', title: '名称', width: 260, type: 'tree' },
  ],
  plugins: [vtRowDrag()],
  onRowMove: ({ row, parentRow, prevRow, list }) => save(list),
});
```

## 分组下拖拽会改数据

分组行是**合成出来的**（`groupConfig` 按字段值现算），它本身不承载数据 —— 所以「把行拖到分组 B 下」
不可能只是挪位置，只能把这行的分组字段改成 B 的取值。核心就是这么做的：落进分组时按分组路径
把行上**每一层**的分组字段一起改写，再插到落点位置，然后回调 `onRowMove`。多级分组
（`groupConfig` 传多项）下整条路径都会更新。

同理，落在根层（分组之间）时会按落点前一行所属的分组同步字段，保证「指示线画在哪就落在哪」；
第一个分组之前没有对应的分组，那里放不下。

::: tip 核心只改**被拖那一行**
树形套分组时把一整棵子树拖进另一个分组，核心改的只有子树根那一行的分组字段 —— 后代不参与分组
（分组只作用于根行，它们的字段值不影响位置），而静默改写一整棵子树的数据太重：那个字段也可能
是逐行不同的业务字段。要不要往下级联由你在 `onRowMove` 里决定，示例里就补了这么一次级联。
:::

## 什么时候拖不动

`canReorderRows()` 为 `false` 时整体停用 —— **排序**、**筛选**、**按值自动合并**（`mergeKey`）三种情况：
那时「视图顺序」与「原始数据顺序」不是一回事，拖出来的结果写不回 `list`。
另外这几种落点也放不下（连指示线都不画）：拖到自己身上或自己的子树里、拖回原处、
没有 `type:'tree'` 列却想「成为子节点」。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `vtRowDrag(options?)` | 行拖拽插件（`crossLevel` / `hoverExpandDelay` / `canDrag` / `allowDropInto`） | [插件机制](/vanilla/api/plugins#vtrowdrag-options) |
| `col.type: 'drag'` | 手柄列（接管层，独占单元格） | [列配置 · 功能列](/vanilla/api/column#功能列-type) |
| `onRowMove` | 行落位回调 `{ row, parentRow, prevRow, list }`，每次成功移动都触发 | [实例方法 · 行拖拽](/vanilla/api/instance#行拖拽) |
| `onRowOrderChange` | 行顺序变化回调 `(list, from, to)`，只在根层同父换位时触发 | [列配置 · 拖拽排序](/vanilla/api/column#拖拽排序-列-行) |
| `moveRowTo()` / `canDropRow()` | 落数据与落点校验（自己实现拖拽 UI 时用） | [实例方法 · 行拖拽](/vanilla/api/instance#行拖拽) |
| `canReorderRows()` | 当前能不能拖 | [实例方法](/vanilla/api/instance) |
