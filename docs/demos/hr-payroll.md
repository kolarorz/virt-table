# HR 人员与薪酬

<PlaygroundHost framework="vanilla" example-id="demo-hr-payroll" />

## 这个案例做了什么

一张表管完 9 个部门、4940 名员工的编制与薪酬：部门行是汇总、展开是明细，改一个人的薪资，所在部门的成本与全公司合计同时跟着走。

这是企业内部系统里最常见的那类表——**汇总与明细在同一张表上**，字段里混着可编辑的、派生的、和不该给所有人看的。

## 串起的能力

| 能力 | 在这个案例里干什么 | 单独看 |
| --- | --- | --- |
| 树形 `type: 'tree'` | 「部门 → 员工」两层，部门行自带汇总值 | [树形](/vanilla/examples/advanced/tree) |
| `showSummary` | 底部全公司合计：成本求和、薪资均值、绩效均分 | [自动合计行](/vanilla/examples/advanced/summary) |
| `validator` | 调薪不得越出职级带宽，超了标红并能一次性列出 | [编辑校验](/vanilla/examples/advanced/validate) |
| 内置单元格组件 | 姓名是 `VtPerson` 头像胶囊、职级/状态/工作地是 `VtSelect`、职位是 `VtInput`、入职日期是 `VtDatePicker`、薪资与系数是 `VtNumberInput`、绩效是 `VtProgress` | [单元格组件](/vanilla/examples/cell/vt-select) |
| `VtActions` | 行内「调薪 +5% / 转正 / 离职」，离职带二次确认 | [操作列](/vanilla/examples/cell/vt-actions) |
| `vtColumnFilter` | 部门、职级、状态、工作地枚举筛选；薪资按区间、入职按日期区间 | [列筛选](/vanilla/examples/plugins/filter) |
| `vtFieldConfig` | 社保基数与证件号默认隐藏，需要的人自己在字段配置里打开 | [字段配置](/vanilla/examples/plugins/column-visibility) |
| `vtExport` | 导出当前视图（含筛选与排序结果） | [导出 Excel](/vanilla/examples/plugins/export) |
| `vtSearch` + `vtCellSelection` + `vtClipboard` | Ctrl/Cmd + F 查人，框选后 Ctrl/Cmd + C 拷走一片 | [搜索](/vanilla/examples/plugins/search) · [选区](/vanilla/examples/plugins/cell-selection) |
| `fixed` | 姓名与工号钉在左边，操作列钉在右边 | [冻结列](/vanilla/examples/basic/fixed) |

## 四个设计决定

**用树形而不是 `groupConfig` 做部门。** 分组行是一整格 `colSpan = 全列`，只放得下标题和计数徽标——画不出「这个部门的月度成本是多少」。树形的父行是**普通数据行**，每一列照常渲染，部门行于是能自己带汇总值。

合计行也刚好对上：`showSummary` 聚合的是 `collectLeaves()` 的结果（有 `children` 的行被排除在外），所以部门行不会被重复计进全公司合计，不需要手动扣掉。

**改「因」不改「果」。** 月度人力成本与年度总包是派生值，不可编辑；可编辑的是基本工资、绩效系数、职级。链路只有一条：写回 → 重算该员工派生字段 → 重算所在部门汇总 → `setList()`。

用 `setList()` 而不是 `forceUpdate()` 是必须的——合计行在数据管线里算（`_rebuildData → _recomputeSummary`），`forceUpdate()` 只重画单元格，底部合计不会动。写回被去抖 200ms：数字输入框每次按键都会 `commitValue`，逐键重建管线既浪费也会让正在输入的那格闪。

**能用内置组件的列一律用组件。** 姓名列的员工那一半直接用 `VtPerson` 的纯展示形态——它自带头像胶囊（没有头像图时按姓名派生稳定色 + 取末字），所以原来那段手写 `<img>` + data URI 头像连同生成函数一起删了，4940 个 data URI 也不用再存。自写 `render` 只剩三类组件确实没有的东西：金额格式化（¥ + 千分位 + 部门行的「合计/均值」前缀 + 脱敏）、证件号掩码、部门汇总行的标题样式。

**脱敏放在渲染层。** `masked` 开关只被 `render` 与 `exportValue` 读，行数据始终是真值。好处是切回明文不用重新取数，更重要的是**导出天然跟随当前视图**——不会出现「屏幕上打了码、导出的 Excel 里全是明文」这种经典事故。

## 汇总行为什么不可编辑

`disabled` 是列级开关，给不了「这一行不行」。做法是在 `renderEditor` 外面包一层，部门行直接返回 `null`：

```ts
const staffOnly = (col: VirtTableColumn<HrRow>): VirtTableColumn<HrRow> => {
  const inner = col.renderEditor;
  if (!inner) return col;
  col.renderEditor = (ctx) => (ctx.row.rowType === 'dept' ? null : inner(ctx));
  return col;
};
```

`vtCellEditor` 拿到 `null` 就什么都不做（既不建浮层也不记激活态），所以点部门行的薪资格没有任何反应，正是想要的效果。

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/demos/hr-payroll.ts
:::
