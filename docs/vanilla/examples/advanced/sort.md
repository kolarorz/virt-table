# 列排序

点击表头排序图标切换 **升序 → 降序 → 取消**：列上声明 `sortable: true` 即显示排序图标；`sortMode: 'multiple'` 时按住 **Shift** 点击可叠加多列排序（表头角标显示优先级）。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-sort" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/sort.ts
:::

## 说明

- `defaultSort` 声明初始排序
- `sortMethod` 自定义比较器（本地化字符串、业务优先级等），返回值由排序方向自动取反
- `sort()` / `clearSort()` / `getSortState()` 编程式控制，`onSortChange` 监听变化

```ts
{ key: 'score', title: '分数', width: 120, sortable: true, defaultSort: 'desc' }
{ key: 'name',  title: '姓名', width: 160, sortable: true,
  sortMethod: (a, b) => a.name.localeCompare(b.name, 'zh') }   // 升序语义，方向自动取反

table.sort('score', 'asc');   // 'asc' | 'desc' | null（null 取消该列）
table.clearSort();
table.getSortState();         // [{ colKey, order }]
```

表头点击**三态循环** `无 → 升 → 降 → 无`，只有点排序图标才触发（点标题不排序，避免与列宽拖拽、
筛选下拉抢手势）。

::: warning 两个约束
- `sortMode` 是初始化选项，运行时切换要重建实例。
- **存在静态 `merges` 时排序自动禁用** —— 合并块按绝对行号定位，重排后几何会错位。`mergeKey`
  的[按值自动合并](../merge/auto-merge)不受影响（它跟着排序结果重新分段）。
:::

> 相关能力各有一页：[自动合计行](./summary)、[加载态](./loading)、[导出 CSV/Excel](../plugins/export)、[字段配置](../plugins/column-visibility)、[键盘导航](../plugins/keyboard)、[列筛选](../plugins/filter)。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.sortable` / `defaultSort` / `sortMethod` | 列上的三个入口 | [列配置 · 列排序](/vanilla/api/column#列排序) |
| `options.sortMode` / `onSortChange` | 单列 / 多列与回调 | [列配置 · 列排序](/vanilla/api/column#列排序) |
| `sort` / `clearSort` / `getSortState` | 编程式排序 | [实例方法](/vanilla/api/instance) |
| `manualSorting` | 排序交给服务端 | [数据与远程](/vanilla/api/data) |
