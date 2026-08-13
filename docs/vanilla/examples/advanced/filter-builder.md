# 高级筛选（筛选管理器）

列筛选有两种入口，可同时使用：

1. **表头快捷筛选** —— 点击表头筛选图标，按列快速勾选/输入（见 [列筛选](../plugins/filter)）。
2. **筛选管理器** —— `VtFilterBuilder`，挂在**表格之外**由你指定的容器里，用 AND/OR 条件组表达
   「分数 ≥ 80 **且**（部门属于工程部/设计部 **或** 级别为 P8）」这类复合条件，支持任意层嵌套。

每个条件组左侧有一条括号线，线上的「且 / 或」胶囊**既是当前逻辑的回显，也是切换按钮**——
点一下就在「且」「或」之间切换，线的颜色随之变化（且=主色 / 或=警示色），嵌套层级一眼可辨。

两者是**独立状态**，最终以 **AND** 组合：表头筛掉的行，管理器再筛一遍。

## 使用的 API

```ts
import { VirtTable } from '@virt-table/vanilla';
import { VtFilterBuilder } from '@virt-table/vanilla/components';

// 条件树（可嵌套）
type FilterModel = {
  kind: 'group';
  logic: 'and' | 'or';
  children: Array<FilterModel | {
    kind: 'condition';
    colKey: string;         // 列 key
    operator: FilterOperator; // 算子，见下表
    value?: unknown;        // 单值 / in 用数组 / between 用 value + value2
    value2?: unknown;
  }>;
} | null;

type Column = {
  key: string;
  title: string;
  width: number;
  filterType?: 'enum' | 'text' | 'number-range' | 'date-range'; // 也决定高级筛选的值域
  filterValueKind?: 'text' | 'number' | 'date' | 'enum' | 'boolean'; // 显式指定值域
  filterOperators?: FilterOperator[];  // 收窄该列可用算子
  filters?: Array<{ label: string; value: unknown }>; // 枚举候选（in/notIn 的选项来源）
};

type Options = {
  filterModel?: FilterModel;                          // 初始条件树
  onFilterModelChange?: (model: FilterModel) => void; // 变化回调
};

// 表格实例方法
table.setFilterModel(model);   // 应用条件树
table.getFilterModel();        // 读取（深拷贝）
table.clearFilterModel();      // 仅清空高级筛选
table.hasActiveFilters();      // 表头筛选或高级筛选任一生效

// 构建器
const fb = new VtFilterBuilder({
  el: '#filter-bar',   // 挂载容器
  table,               // 传入则自动取可见列 + 自动应用
  autoApply: false,    // true 则每次改动即时生效
  onApply: (model) => {},
});
fb.setModel(model); fb.getModel(); fb.refresh(); fb.apply(); fb.clear(); fb.destroy();
```

### 算子

| 值域 | 可用算子 |
| ---- | -------- |
| `text` | 包含 / 不包含 / 等于 / 不等于 / 开头是 / 结尾是 / 为空 / 不为空 |
| `number`、`date` | 等于 / 不等于 / 大于 / 大于等于 / 小于 / 小于等于 / 介于 / 为空 / 不为空 |
| `enum` | 属于 / 不属于 / 等于 / 不等于 / 为空 / 不为空 |
| `boolean` | 等于 / 不等于 |

::: tip 几点约定
- 列的 `filterMethod` **只参与** `in` / `notIn`（它的签名 `(value, row)` 没有算子概念），其余算子按值域内建比较。
- 「为空」= `null` / `undefined` / `''`，不含 `0` 与 `false`。「介于」是闭区间，只填一端即当单边界。
- 编辑中的半成品条件（缺值、指向已删除的列、空条件组）一律视为**通过**，不会把表格瞬间筛空。
- 构建器挂在表格外部，样式在 `@virt-table/vanilla/components/vt-filter-builder.css`，暗色主题自动适配。
:::

## 示例

<PlaygroundHost framework="vanilla" example-id="table-filter-builder" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/filter-builder.ts
:::
