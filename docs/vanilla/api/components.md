# 单元格组件

`@virt-table/vanilla/components` 里的一组工厂函数：调一次得到一个配好 `render` + `renderEditor`
的列定义，直接塞进 `columns`；也能用 [`asCell()`](#装在单个格子上-ascell) 只装在单个格子上。

```ts
import { VtTag, VtSwitch } from '@virt-table/vanilla/components';
import '@virt-table/vanilla/components/index.css';   // 别忘了这一行
```

每个组件的交互模型、值形状与设计取舍在各自的示例页（[19 页清单](/vanilla/examples/cell/vt-input)）；
它们**不是优先级链上的一档** —— 装在哪一级就以那一级的身份参与[内容层解析](./cell#内容层)。

## 三类交互模型

| 类别 | 组件 | 怎么改值 | 需要 `vtCellEditor` |
| --- | --- | --- | --- |
| **编辑态** | `VtInput` `VtNumberInput` `VtTextarea` `VtSelect` `VtCascader` `VtAutocomplete` `VtPerson`（配 `options`） `VtDatePicker` `VtDateRangePicker` `VtTimePicker` `VtLink`（配 `editable`） `VtProgress`（配 `editable`） | 进入编辑态后在浮层里改 | ✅ |
| **直接可点** | `VtCheckbox` `VtSwitch` `VtRate` `VtActions` | 常态本身可交互，点一下就写回 | ❌ |
| **纯展示** | `VtTag` `VtProgress`（默认） `VtLink`（默认） `VtImage` `VtPerson`（不配 `options`） | 不改值 | ❌ |

「纯展示」不等于「不可交互」：`VtLink` 点了跳链接、`VtImage` 点了弹图片查看器 —— 它们只是**不改行数据**。

「直接可点」那一类**刻意不提供 `renderEditor`**（理由见[渲染粒度 · 常态不等于只读](/vanilla/examples/cell/render-levels#四层)）。
它们内部用 `stopCellInterference` 拦掉指针事件冒泡，与 `vtCellSelection` / `vtCellEditor` 共存不会互相触发。

## 公共选项

所有组件的 options 都继承 `BaseColumnOptions`，即 **`VirtTableColumn` 的全部字段**
（`key` / `title` / `width` / `fixed` / `align` / `sortable` / `validator` / `textOverflow` …
除 `render` / `renderEditor` 外原样透传，见[列配置](./column#virttablecolumn)）外加：

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `placeholder` | `string` | — | 空值时的占位文案 |
| `disabled` | `boolean` | `false` | 关掉编辑 / 交互，只保留展示 |
| `clearable` | `boolean` | **分两档，见下** | 控件右侧给一个「×」清除按钮（只在有值时出现）。输入类与锚点类（`VtSelect` / `VtCascader` / `VtPerson`）同一位置、同一外观 |
| `onChange` | `(value, row, rowIndex) => void` | — | 值写回行数据**之后**触发（组件不做受控模式） |

### `clearable` 的默认值分两档

分界线是**这一格能不能用键盘删空**：

| 档 | 组件 | 默认 | 键盘 |
| --- | --- | --- | --- |
| **锚点类** | `VtSelect`（含 `multiple` / `display: 'tag'`）`VtCascader` `VtPerson` `VtDatePicker` `VtDateRangePicker` `VtTimePicker` | **`true`**（传 `clearable: false` 关掉） | 激活这一格后按 `Delete` / `Backspace` 清空 |
| **输入类** | `VtInput` `VtNumberInput` | `false`（要传 `true`） | 全选 + `Backspace`（就是普通文本框） |

锚点类的编辑态不是文本框，而是一个锚点（左边回显、右边箭头）：一旦有值，面板里只能**换选**
另一项，界面上再没有「变回空」的手段。所以这一档默认给 `×`，不给等于「这一列填过一次就填不
回空」。`Delete` / `Backspace` 与那个 `×` 是同一个动作、同一个开关 —— 不会出现「叉没有但键能清」。

带搜索框的面板（`VtPerson` 默认、`VtSelect({ searchable })`）打开时焦点在输入框里，那两个键
**只在搜索词为空时**清空单元格，有词时归输入框删字。

不支持公共选项的几处例外：`VtTextarea` / `VtRate` / `VtProgress` 没有 `clearable`；`VtActions`
不读写单元格值，因而没有 `onChange`，也没有 `placeholder` / `clearable`。

## 装在单个格子上（`asCell`）

```ts
import { VtSelect, asCell } from '@virt-table/vanilla/components';

table.setCellRender('42', 'status', asCell(VtSelect, { options: STATUS }));
asCell(VtSelect<Row>, { options: STATUS, onChange: (v, row) => save(row.id, v) }); // 带行类型
```

| 行为 | 说明 |
| --- | --- |
| 不接受 `key` / `title` / `width` | 列键来自 `setCellRender` 的 `colKey`（组件写回走 `ctx.column.key`） |
| 整对写入 `render` + `renderEditor` | 避免只给 `render` 导致的「展示是进度条、点开是下拉」 |
| 列专属选项类型上被拒 | `fixed` / `sortable` / `align` … 在单元格级本就会被丢弃。`validator` 例外，由组件自己消费 |

三条的详细理由见[渲染粒度 · 单元格组件不是链上的一档](/vanilla/examples/cell/render-levels#单元格组件不是链上的一档)。

## 各组件专属选项

下面只列**专属**选项；公共选项见上一节。每个组件的交互模型、值形状与设计取舍在它的示例页。

### 输入类

#### VtInput

> 示例页：[VtInput](/vanilla/examples/cell/vt-input)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `maxLength` | `number` | — | 最大输入长度 |

#### VtNumberInput

> 示例页：[VtNumberInput](/vanilla/examples/cell/vt-number-input)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `min` / `max` | `number` | — | 取值范围 |
| `step` | `number` | — | 步进 |
| `precision` | `number` | — | 小数位数 |

#### VtTextarea

> 示例页：[VtTextarea](/vanilla/examples/cell/vt-textarea)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `maxRows` | `number` | 不限 | 最多长到几行，超过内部滚动；不限时只受表格可视高度约束 |
| `maxLength` | `number` | — | 最大输入长度 |

编辑框走 `cover` 定位（盖住单元格并随内容长高），见[定位模式](#自绘浮层挂在哪)。

#### VtAutocomplete

> 示例页：[VtAutocomplete](/vanilla/examples/cell/vt-autocomplete)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `fetchSuggestions` | `(query, row) => VtOption[] \| Promise<VtOption[]>` | — | **必填**。建议源，过滤逻辑由使用方决定 |
| `debounce` | `number` | `200` | 请求防抖（ms）；同步源可给 `0` |
| `triggerOnFocus` | `boolean` | `true` | 聚焦时就请求一次（`query` 为当前值） |
| `emit` | `'value' \| 'label'` | `'value'` | 选中建议时写回哪个 |
| `emptyText` | `string` | 无匹配项 | 没有建议时的提示 |
| `maxLength` | `number` | — | 最大输入长度 |

### 选择类

`VtSelect` / `VtPerson` 共用一个内核（`createEnumEditor`），所以面板、搜索、`↑↓`/`Enter`、
清除 `×`、`+N` 折叠、值形状（`valueType` / `separator`）在两者上**行为一致**。

#### VtSelect

> 示例页：[VtSelect](/vanilla/examples/cell/vt-select) · [多选](/vanilla/examples/cell/vt-multi-select)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `options` | `VtSelectOption[]` | — | **必填**。候选集 |
| `multiple` | `boolean` | `false` | 多值 |
| `valueType` | `'array' \| 'string'` | `'array'` | `multiple` 时存 `['a','b']` 还是 `'a,b'` |
| `separator` | `string` | `','` | `valueType: 'string'` 时的分隔符 |
| `searchable` | `boolean` | `false` | 面板顶部给搜索框（3~8 项的枚举列多一行搜索框是噪音） |
| `searchPlaceholder` | `string` | — | 搜索框占位 |
| `emptyText` | `string` | 无匹配项 | 搜不到时的提示 |
| `showActions` | `boolean` | `true` | `multiple` 时面板底部给「清空 / 全选」 |
| `display` | `'text' \| 'tag'` | `'text'` | 常态形态。**判别联合** —— `'text'` 支路传 `variant` / `color` / `maxCount` 直接编译报错 |
| `variant` | `VtSemanticType \| ((row, rowIndex) => VtSemanticType)` | `default` | 仅 `display: 'tag'`：统一语义色 |
| `color` | `string \| ((row, rowIndex) => string)` | — | 仅 `display: 'tag'`：统一自定义色，优先于 `variant` |
| `maxCount` | `number` | `3` | 仅 `display: 'tag'` + `multiple`：最多画几个胶囊，超出折叠 `+N`；`0` 为不折叠 |

```ts
interface VtSelectOption {
  value: string | number;   // 必填，写回行数据的值
  label: string;            // 必填，显示文案
  variant?: VtSemanticType; // 逐项语义色：'default' | 'primary' | 'success' | 'warning' | 'danger'
  color?: string;           // 逐项自定义色，优先于 variant
  disabled?: boolean;       // 不可选（「全选」也会跳过它）
}
```

编辑态是自绘面板（非原生 `<select>`）：`↑↓` 选、`Enter` 确认、`Esc` 关。

#### VtPerson

> 示例页：[VtPerson](/vanilla/examples/cell/vt-person)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `options` | `VtPersonOption[]` | — | 可选人员；**不给就是纯展示列** |
| `multiple` | `boolean` | `false` | 选多人 |
| `valueType` | `'array' \| 'string'` | `'array'` | 同 `VtSelect` |
| `separator` | `string` | `','` | 同 `VtSelect` |
| `maxCount` | `number` | `3` | 常态最多画几个人，超出折叠 `+N`；`0` 为不折叠 |
| `avatarOnly` | `boolean` | `false` | 只画头像不画姓名（列窄时用），姓名进 `title` |
| `searchable` | `boolean` | `true` | 人员列表通常比枚举长，所以默认开 |
| `searchPlaceholder` | `string` | 搜索姓名 | — |
| `emptyText` | `string` | 无匹配人员 | — |
| `showActions` | `boolean` | `true` | `multiple` 时面板底部给「清空 / 全选」 |
| `hoverCard` | `boolean` | `true` | 悬停弹名片 |
| `renderCard` | `(person, row, rowIndex) => HTMLElement \| null` | — | 自定义名片；返回 `null` 表示这个人不弹 |

```ts
interface VtPersonOption {
  value: string | number;   // 必填，人员标识，写回行数据的就是它
  label: string;            // 必填，姓名
  avatar?: string;          // 头像 URL；不给或加载失败退到首字色块
  color?: string;           // 色块颜色，默认按 value 稳定哈希取语义色
  desc?: string;            // 副标题（部门 / 职位），面板与名片里显示
  email?: string;           // 只在名片里显示
  phone?: string;           // 只在名片里显示
  fields?: Array<{ label: string; value: string }>;  // 名片里的自定义字段
  disabled?: boolean;
}
```

常态也认对象值（`{ id, name, avatar }`），但**通过面板改值一律写回标量 `value`**。

#### VtCascader

> 示例页：[VtCascader](/vanilla/examples/cell/vt-cascader)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `options` | `VtCascaderOption[]` | — | **必填**。候选树（`{ value, label, children?, disabled? }`） |
| `separator` | `string` | `' / '` | 常态的层级分隔符 |
| `valueType` | `'path' \| 'leaf'` | `'path'` | 存整条路径 `['zj','hz','xh']` 还是只存最后一级 `'xh'` |
| `checkStrictly` | `boolean` | `false` | 允许选中非叶子节点 |

`valueType: 'leaf'` 会在**建列时**预建 `value → 路径` 索引，所以 `options` 必须那时定下来；
运行时换树请重新 `setColumns()`。它不属于枚举那一家（树形面板是分栏的，只共享锚点 / 清除 × / 浮层基元）。

### 布尔与评分

#### VtCheckbox / VtSwitch

> 示例页：[VtCheckbox](/vanilla/examples/cell/vt-checkbox) · [开关](/vanilla/examples/cell/vt-switch)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `trueValue` | `unknown` | `true` | 勾选 / 开启时写回的值 |
| `falseValue` | `unknown` | `false` | 取消 / 关闭时写回的值 |
| `activeText` | `string` | — | 仅 `VtSwitch`：开启时画在开关右侧的文案 |
| `inactiveText` | `string` | — | 仅 `VtSwitch`：关闭时的文案 |

::: warning 用字符串枚举时必须显式配 `trueValue`
不配就退回 JS 真值判断，`'N'` / `'0'` / `'off'` 这种非空字符串会被判成真。配了 `trueValue`
就**只认它**（严格相等）。
:::

#### VtRate

> 示例页：[VtRate](/vanilla/examples/cell/vt-rate)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `count` | `number` | `5` | 星数 |
| `allowHalf` | `boolean` | `false` | 允许半星（展示与点选都支持） |
| `showText` | `boolean` | `false` | 星星右侧显示分值 |
| `format` | `(value, row) => string` | 直接显示分值 | 文字格式化 |
| `color` | `string` | `--vt-color-warning` | 星色 |

### 日期与时间

`VtDatePicker` / `VtDateRangePicker` 共用一套自绘日历面板（跟随暗色主题与密度档），
`native: true` 切回浏览器原生控件。两支的 `min` / `max` 语义**不同** —— 自绘是确定的
（越界格不可点），原生交给浏览器。面板行为、快捷项、键盘、i18n 见示例页。

#### VtDatePicker

> 示例页：[VtDatePicker](/vanilla/examples/cell/vt-date-picker)

值是 `'YYYY-MM-DD'`，清空写回 `''`。

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `min` / `max` | `string` | — | 可选范围，`'YYYY-MM-DD'` |
| `native` | `boolean` | `false` | 切回 `input[type=date]`；与下面三项**互斥**（类型上就拒） |
| `firstDayOfWeek` | `number` | `1` | `0`=周日 … `6`=周六 |
| `shortcuts` | `VtDateShortcut[] \| ((builtin) => VtDateShortcut[])` | 内置 2 颗 | 底部快捷项 |
| `texts` | `Partial<VtCalendarTexts>` | `zhCN.calendar` | 文案覆盖，**建列时读一次** |

#### VtDateRangePicker

> 示例页：[VtDateRangePicker](/vanilla/examples/cell/vt-date-range-picker)

值是 `['YYYY-MM-DD', 'YYYY-MM-DD']`，清空写回 `['', '']`。

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `separator` | `string` | `' ~ '` | 常态与锚点回显的分隔符 |
| `min` / `max` | `string` | — | 可选范围 |
| `panels` | `1 \| 2` | `2` | 并排几个月；`.vt-root` 放不下时自动降级成 1 |
| `native` | `boolean` | `false` | 切回两个并排的 `input[type=date]`；与 `panels` / `firstDayOfWeek` / `shortcuts` / `texts` 互斥 |
| `firstDayOfWeek` | `number` | `1` | 同上 |
| `shortcuts` | 同上 | 内置 7 颗 | 同上 |
| `texts` | 同上 | `zhCN.calendar` | 同上 |

```ts
interface VtDateShortcut {
  label: string;                                  // 必填
  value: (today: DayStr) => [DayStr, DayStr];     // 必填，单日模式只取 [0]
  mode?: 'single' | 'range' | 'both';             // 默认 'both'
}
```

#### VtTimePicker

> 示例页：[VtTimePicker](/vanilla/examples/cell/vt-time-picker)

值是原生控件的字符串（`'09:30'`；`step` 带秒时 `'09:30:15'`）。编辑态是原生 `input[type=time]`。

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `min` / `max` | `string` | — | `'HH:mm'` 或 `'HH:mm:ss'` |
| `step` | `number` | — | 步进（秒）；给 `1` 出现秒位 |

### 展示与操作

#### VtTag

> 示例页：[VtTag](/vanilla/examples/cell/vt-tag)

**纯展示**，不提供 `renderEditor`。要「从候选集里选」用 `VtSelect({ display: 'tag' })`
（胶囊外观两者共用 `createTagChip`，必然一致）。

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `options` | `VtTagOption[]` | — | 「值 → 文案 + 配色」**字典**（不是候选集）；不给就把原始值当标签文本 |
| `variant` | `VtSemanticType \| ((row, rowIndex) => VtSemanticType)` | `default` | 列级统一语义色 |
| `color` | `string \| ((row, rowIndex) => string)` | — | 列级统一自定义色，优先级最高 |

配色优先级：`options[].color` > `options[].variant` > 列级 `color` > 列级 `variant` > 默认主色。

#### VtProgress

> 示例页：[VtProgress](/vanilla/examples/cell/vt-progress)

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `max` | `number` | `100` | 满值 |
| `editable` | `boolean` | `false` | 开启后有编辑态：**滑块 + 数字输入框**（需装 `vtCellEditor`）。滑块调大概、数字框调准确，两者共享同一个值；键入的是**原值**（`0 ~ max`，默认 `max: 100` 下就是百分比，框后跟一个 `%`） |
| `step` | `number` | `max / 100` | 滑块与数字框的步长 |
| `showText` | `boolean` | `true` | 右侧那格数字。只读态是 `format` 的文字，`editable` 的编辑态是数字输入框；关掉则编辑态只剩滑块 |
| `format` | `(value, percent, row) => string` | `` `${percent}%` `` | 文字格式化。**只作用于只读态** —— 编辑态那一格是输入框 |
| `color` | `string \| ((row, rowIndex) => string)` | — | 统一颜色，优先于 `thresholds` |
| `variant` | `VtSemanticType \| ((row, rowIndex) => VtSemanticType)` | — | 语义色 |
| `thresholds` | `Array<{ lte: number; variant?: VtSemanticType; color?: string }>` | — | 按百分比取色，按数组顺序命中第一条 `percent <= lte` |

#### VtImage

> 示例页：[VtImage](/vanilla/examples/cell/vt-image)

缩略图 + 点开图片查看器。值可以是 URL 字符串、`{ url, alt, thumb }`、或两者的数组
（`VtImageItem extends CellImageValue`，与核心 `cellType: 'image'` 认的形状同源）。

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `maxCount` | `number` | `3` | 最多画几张，超出折叠成 `+N`（点它从第 N+1 张开始看）；`0` 不折叠 |
| `fit` | `'cover' \| 'contain'` | `'cover'` | 缩略图裁切。`cover` 是正方形裁切（一列缩略图对得齐），`contain` 完整放进方框 |
| `separator` | `string` | — | 值是 `'a.png\|b.png'` 这类拼接串时的分隔符。**默认不拆** —— data URI 里就有逗号，默认拆会把一张内联图劈成两个坏链 |
| `items` | `(value, row, rowIndex) => Array<string \| VtImageItem>` | — | 自定义取图。给了它就不走内置形状解析（图片信息散在几个字段里时用） |
| `viewer` | `boolean` | `true` | 点缩略图是否弹查看器。`false`（或 `disabled: true`）就是纯展示，缩略图不可点 |
| `downloadable` | `boolean` | `false` | 查看器工具栏给下载按钮（`<a download>`，跨域时浏览器会降级成新标签页打开） |
| `onPreview` | `(info) => boolean \| void` | — | 打开查看器**之前**调用，`info` 是 `{ items, index, row, rowIndex }`。**返回 `false` 阻止内置查看器**（自己接管预览） |
| `texts` | `Partial<VtImageViewerTexts>` | `zhCN.imageViewer` | 查看器文案（建列时读一次，不跟随 `setLocale()`，与 `VtDatePicker` 的 `texts` 同一条） |

**异步加载**：行 DOM 是池化的，所以在 `render` 里同步 `new Image()` 等于每个滚动帧都在发请求 +
在主线程解码。这个组件的 `render` 只产出占位方框，取图由三条机制托管：**空闲期排期**
（`requestIdleCallback`，滚动帧里零请求）、**回收即弃**（占位盒离开文档就丢弃任务）、
**先进先出 + 并发上限 4**（进队顺序就是行序，所以图从上往下出；滚走的格子在出队时被 `alive()`
剔掉，不发请求）。解码走 `img.decode()`，插进单元格的那一帧不会卡；失败的 URL 记进坏链表，
滚回去不再重试。

与核心 [`cellType: 'image'`](./cell#内容类型-celltype) 的分工：后者是同步的一张 `<img>`，适合
「一列小图、数据量不大」；图多、行多、要看大图用 `VtImage`。

**没有尺寸选项**：缩略图恒等于行内容高（`var(--vt-line-height)`）的方框。写死像素会把行高顶破、
与 `estimatedSize` 对不上（见下方[行高约束](#行高约束)）。要大缩略图就把**行**配高 ——
容器上设 `--vt-density-line-height`，`estimatedSize` 跟着改成「内容高 + 上下内边距 + 1px 下边框」。

**查看器**：自绘浮层，挂 `.vt-root` 内（所以 `--vt-*` 与暗色主题自动跟随）、`position: fixed`
铺满视口、带 `data-vt-popup`（`vtCellEditor` 的 outside-click 白名单认它）。滚轮或 `+` `-` 缩放 ·
拖拽平移 · 双击放大 · 旋转 · `←` `→` 换图（首尾循环）· `Esc` / ✕ / 点图外的幕布关闭。键盘事件不冒泡出浮层，
所以方向键不会同时挪动底下的单元格选区。**多图另有一条底部列表条**（一排小图 + 当前主色描边，
点一下直达；小图排在大图之后进队）。滚轮缩放按 `deltaY` 连续换算 —— 触控板一次滑动会连发几十个
`wheel` 事件，按「一次一档」乘会瞬间顶到最大倍率。

#### VtLink

> 示例页：[VtLink](/vanilla/examples/cell/vt-link)

两条支路：只读（默认）与可编辑（`editable: true`）。**共通**：

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `target` | `'_blank' \| '_self'` | — | `_blank` 自动补 `rel="noopener noreferrer"` |
| `onClick` | `(row, rowIndex) => void` | — | 与地址可共存（先回调再跳转） |
| `underline` | `'always' \| 'hover' \| 'never'` | `'hover'` | 下划线时机 |

只读支路（`editable: false` 或不写）：

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `href` | `string \| ((row, rowIndex) => string)` | 链接地址；都没有时渲染成「看起来是链接的按钮」 |
| `protocol` | `'mailto' \| 'tel'` | 协议糖：直接用单元格值拼 |
| `text` | `string \| ((row, rowIndex) => string)` | 显示文案，默认用值（对象值取 `text`） |

可编辑支路（`editable: true`，**`href` / `protocol` / `text` 在类型上被拒**）：

| 选项 | 类型 | 默认 |
| --- | --- | --- |
| `textLabel` / `urlLabel` | `string` | 文案 / 链接 |
| `textPlaceholder` / `urlPlaceholder` | `string` | — |

值的形状（`VtLinkValue = { text?: string; url?: string }`）：

| 行数据 | 展示 | 说明 |
| --- | --- | --- |
| `{ text: '需求文档', url: 'https://…' }` | `<a>需求文档</a>` | 有地址就是对象 |
| `'待补链接'` | `<button>待补链接</button>` | 只有文案时是**纯字符串**，不是 `{ text, url: '' }` |
| `''` / `null` | `placeholder` | — |
| `{ url: 'https://…' }` | `<a>https://…</a>` | 没文案就拿地址当文案 |

#### VtActions

> 示例页：[VtActions](/vanilla/examples/cell/vt-actions)

不读也不写单元格值，因此没有 `placeholder` / `clearable` / `onChange`。

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `items` | `VtActionItem[]` | **必填**。按钮列表 |

```ts
interface VtActionItem {
  text: string | ((row, rowIndex) => string);        // 必填
  onClick: (row, rowIndex) => void;                  // 必填；配了 confirm 时点「确定」才走到这里
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';  // 默认 primary
  disabled?: boolean | ((row, rowIndex) => boolean); // 仍渲染，置灰不可点
  hidden?: boolean | ((row, rowIndex) => boolean);   // 整个按钮不渲染，连位置都不占
  confirm?: string | { text: string; okText?: string; cancelText?: string };
}
```

确认气泡**不接表格 i18n**（组件是纯工厂函数，读不到 `options.locale`）：默认中文，要别的语言
在 `confirm` 对象里传 `okText` / `cancelText`。

## 自绘浮层挂在哪

`VtSelect` / `VtCascader` / `VtAutocomplete` / `VtPerson` / `VtTextarea` 的浮层挂在 **`.vt-client`** 上 ——
与 `vtCellEditor` 的 `.vt-cell-cover` 同一层、排在它之后、用同一套定位公式。四条理由与滚动
行为见[VtSelect 示例 · 浮层挂在哪](/vanilla/examples/cell/vt-select#自绘浮层挂在哪)。

| 模式 | 用在哪 | 行为 |
| --- | --- | --- |
| `below` | `VtSelect` / `VtCascader` / `VtAutocomplete` 的下拉、`VtPerson` 的选人面板、`VtActions` 的确认气泡 | 挂在单元格下方（几何基准取单元格盒子，宽度对齐），空间不足翻到上方；套 `.vt-filter-panel` 面板皮肤 |
| `cover` | `VtTextarea` 的内联编辑框 | **盖住单元格**：左上角对齐、宽度取齐、初始等高，随内容长高，顶出容器下缘时整体上移；不套面板皮肤，边框与 `.vt-cell-cover` 一致 |

浮层会随锚点移动自动跟随（纵向滚动、列宽变化、排序筛选换行），锚点离开 DOM 时自毁。

## 行高约束

组件的展示元素一律锁高在 `var(--vt-line-height)` 上并配 `vertical-align: top`。撑出 22px
就把 40px 的行高顶成 42，`estimatedSize` 与实际行高对不上，十万行量级下会滚不到底
（等式见[主题定制 · 行高等式](/vanilla/examples/basic/theme#行高等式)）。
`components-contract.test.ts` 静态扫描 `components.css` 守着这条，自定义样式时请一并遵守。
