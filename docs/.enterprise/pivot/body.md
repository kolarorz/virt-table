装上它只会 `console.warn` 一次，**不做任何事**。骨架（构建、类型、许可、测试、发布）都已就位，
实现时只需要往 `setup` 里填内容。

---

## 现在装上会发生什么

```ts
import { vtPivot } from '@virt-table-pro/pivot';

new VirtTable(el, { list, columns, itemKey: 'id', estimatedSize: 40, plugins: [vtPivot()] });
// → [vtPivot] 透视表 / Pivot 尚未实现，本插件当前不做任何事。
```

- 表格照常工作，插件不改任何行为
- `guardProduct('pivot')` 照常跑 —— 没设密钥时右下角**会出现未授权角标**
- `table.setPivotConfig()` / `getPivotConfig()` **类型上有、运行时没有**（插件没返回 `api`），
  调用会抛 `is not a function`。类型先声明是为了实现后不改调用方代码

---

## 计划中的 API（草案，实现时可能变）

```ts no-check
interface PivotOptions<T> {
  /** 行维度字段 */
  rows?: string[];
  /** 列维度字段（交叉分析的横轴） */
  columns?: string[];
  /** 值字段与聚合方式 */
  values?: Array<{
    field: string;
    agg: 'sum' | 'avg' | 'count' | 'min' | 'max' | ((rows: T[]) => unknown);
  }>;
  /** 小计 / 总计 */
  showSubtotals?: boolean;
  showGrandTotal?: boolean;
}
```

```ts no-check
// 预期用法
vtPivot<Order>({
  rows: ['region', 'dept'],
  columns: ['quarter'],
  values: [
    { field: 'amount', agg: 'sum' },
    { field: 'id', agg: 'count' },
  ],
  showSubtotals: true,
  showGrandTotal: true,
});
```

实例 API 预留了两个：`setPivotConfig(config)`（重设并重算）、`getPivotConfig()`。

---

## 动工前核心需要先补什么

**数据管线钩子**：需要在 `_rebuildData` **之前**接管行集（把明细行换成透视结果），
目前 `_rebuildData` 是核心私有。这是本包动工的前置条件。另需分组聚合的扩展点
（复用核心已有的 group 合成行机制，而不是另造一套）。

这条缺口会先在核心补成**公开 API**，再由本插件消费 —— 付费插件不碰核心私有成员，
否则核心每次重构都可能在你的项目里炸掉，而任何测试都抓不到。

同一个钩子也是 `formula` 第一档想删掉那次「回灌重跑管线」所需要的东西，两边一起受益。

---

## 在那之前怎么办

透视是**纯数据变换**，不透视表格本身也能做：在数据层算好，再喂给一张普通表。

```ts
// 自己聚合成透视结果，列在运行时生成
const pivoted = pivotRows(orders, { rows: ['dept'], columns: ['quarter'], value: 'amount' });
const cols: VirtTableColumn<Row>[] = [
  { key: 'dept', title: '部门', width: 160, fixed: 'left' },
  ...quarters.map((q) => ({ key: q, title: q, width: 110, align: 'right' as const })),
];
new VirtTable(el, { list: pivoted, columns: cols, itemKey: 'dept', estimatedSize: 40 });
```

需要「行分组 + 小计」而不是真交叉分析时，核心的 `groupConfig` 已经够用 ——
它会合成分组行并做聚合，不需要本插件。

---

## 为什么它值得收费

AG Grid Enterprise 最贵的功能之一，BI 场景刚需。行分组聚合 + 交叉分析 + 值字段配置，社区极难复刻。

---

## 进展与排期

kolarorz@gmail.com

## 相关

- [企业版](/enterprise/) —— 授权模式、定价与常见问题
- 已实现的付费包：<ProLink to="views">命名视图</ProLink> · <ProLink to="undo">撤销 / 重做</ProLink> ·
  <ProLink to="formula/column">公式</ProLink> · <ProLink to="gantt/">甘特图</ProLink>
