# React 状态持久化

把用户调过的列宽 / 列序 / 列显隐 / 排序 / 筛选存下来，下次进页面还原。一对方法就够：

```ts
// 存
localStorage.setItem('my-table', JSON.stringify(tableRef.current?.getState()));

// 还原
tableRef.current?.setState(JSON.parse(localStorage.getItem('my-table') ?? 'null'));
```

## 快照的形状

```ts
interface VirtTableState {
  /** 结构版本，当前为 1 */
  version: number;
  /** 叶子列状态；数组顺序即列序（含隐藏列，所以隐藏列的位置也能还原） */
  columns?: Array<{ key: string; width?: number; hidden?: boolean }>;
  /** 排序；多列排序时数组顺序有意义 */
  sort?: SortSpec[];
  /** 列头筛选：列 key → 勾选值 */
  columnFilters?: Record<string, unknown[]>;
  /** 高级筛选条件树；`getState()` 恒输出此字段，无筛选时为 `null` */
  filterModel?: FilterModel;
  /** 分页（仅配了 `pagination` option 时有意义）；不含 total —— 它是派生的 */
  pagination?: { page?: number; pageSize?: number };
}
```

## 只存一部分

**每个字段都是可选的，`setState()` 只应用出现的字段。** 所以可以只持久化列宽与列序，
让排序每次回到默认：

```ts
const { version, columns } = tableRef.current!.getState();
localStorage.setItem('my-table', JSON.stringify({ version, columns }));
```

注意「不给字段」与「给空值」是两回事：不给 `sort` = 保持当前排序，给 `sort: []` = 清空排序。

正因如此，**`getState()` 输出的是完整快照**：没有高级筛选时它给 `filterModel: null` 而不是
省略该字段。否则「先存快照 → 之后加了筛选 → 还原」清不掉那条筛选，`setState(getState())`
就不再是恒等操作了。

## 几个要点

- **列宽是逻辑宽度**（`column.width`），不含容器拉伸系数。换个窗口宽度打开时按新容器重新拉伸，这才是想要的效果。
- **分组表头下列序只在同一分组内还原**。跨组搬家没有意义（与 `moveColumn` 同约束）；分组节点按其后代里最小的目标位次参与排序，所以「整组前移」是可以的。
- **状态里多出的列被忽略，缺的列保持现状**，排序里指向不存在的列会被丢掉 —— 列配置改版后旧状态不会把表搞坏。
- **版本不匹配整体忽略并告警**（返回 `false`）。改了状态形状就把 `version` 加一，旧状态自动作废。
- 全过程只做一次列重建 + 一次数据管线重算，不会因为逐列 `setColumnVisible` / 逐列 `sort` 触发 N 次重排。
- 还原后会派发 `onSortChange` / `onFilterChange` / `onFilterModelChange`，方便把状态同步给外部 UI。
- **隐藏一列不会让它上面的筛选 / 排序失效。** 筛选与排序是数据层的事，数据管线读的是全量叶子列（含隐藏），与 AG Grid / Excel 同语义。所以「隐藏某列 + 该列有筛选」这种状态能被完整还原。
- 与 `getRemoteState()` 无关 —— 那是服务端取数状态机的运行时状态，不该持久化。两个名字容易混：前者可持久化，后者不行。

## 相关 API

| 方法 | 作用 | 详见 |
| --- | --- | --- |
| `getState()` | 导出完整视图状态快照 | [实例方法](/vanilla/api/instance) |
| `setState(state)` | 应用快照中出现的字段，版本不匹配返回 `false` | [实例方法](/vanilla/api/instance) |
| `VirtTableState` | 快照结构 | [类型定义](/vanilla/api/types) |

配套能力各有一页：[列宽拖拽](/react/examples/basic/resize)、[字段配置](/react/examples/plugins/column-visibility)、[列拖拽排序](/react/examples/plugins/column-drag)、[列排序](/react/examples/advanced/sort)、[列筛选](/react/examples/plugins/filter)。

> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
