# 第三方组件库（Element Plus）

同一张表、同一批数据、同一组 Element Plus 组件，提供两种渲染方式的**对照**，可直接切换并压测：

- **分离渲染**（默认，推荐）—— `render` 返回静态轻 DOM（复用 `el-*` 官方类名），只有点中的那一格由 `renderEditor` 挂真实组件。
- **直接渲染组件**（对照）—— `render` 返回真实组件，每个可见单元格都是一个活实例。

:::tip 为什么要分离
`col.render` 的调用频率 = 可见单元格数 × 行重填次数。行 DOM 虽然被虚拟滚动复用，**内容却是每次重填的**；Vue 侧每个返回 VNode 的单元格都要单独挂载，行一出视口再卸载。所以视口里有多少个第三方组件，滚动时就有多少轮 mount / unmount，而这笔开销属于组件库自己（popper、ResizeObserver、事件绑定），**虚拟化内核优化到多快都退不回来**。

分离之后，全表同时只有 1 个真实实例（`vtCellEditor` 的复用浮层），查看态是纯 DOM。
:::

:::warning 查看态不要手写「仿 el」样式
用 `.my-input-like { border: 1px solid #dcdfe6 }` 去描 el-input 的外观注定漂移：换主题、开暗色、升版本，模仿的那份都不会跟着变；`.el-input__wrapper` 的边框实际上是 inset box-shadow，压根不是 border。

正确做法是**直接复用 Element Plus 的类名**（`el-input__wrapper` / `el-radio-button__inner` / `el-select__wrapper` …），静态 DOM + 官方 CSS，零 JS 实例，主题变量自动跟随。一致性靠共用同一份样式源，而不是靠人眼对齐两份 CSS。

两个容易踩的坑：

- `.el-radio-button` 的选中态选择器是 `.is-active .el-radio-button__original-radio:not(:disabled) + .el-radio-button__inner` —— 缺了 `__original-radio` 兄弟节点，选中色出不来（用 `<span>` 顶替原生 `<input>` 即可，它永远不满足 `:disabled`，又不抢 Tab 焦点）。
- `.el-checkbox-button` 的选中态是 `.is-checked .el-checkbox-button__inner`，**不**依赖兄弟节点 —— 两个组件规则不同，别照抄。
:::

:::danger 激活态要把外观归属交回组件
`vtCellEditor` 默认「浮层画边框、编辑器当纯内容层」—— 内置 `vt-*` 就是照这个约定写的（`.vt-comp-input` 自己 `border: none; background: transparent`）。第三方组件自带一整套外观，两边都画就会**两层边框对不上**，而且浮层会把组件从它自己的 size（`el-input--small` 是 24px）拉满单元格，激活前后高度不一致。

整表都用第三方组件时给插件加 `chrome: false`；只有部分列时用列上的 `editorChrome: false`（列级优先）：

```ts
plugins: [vtCellEditor({ chrome: false })]
```

裸模式下浮层只保留定位和背景（背景要留着盖住底下的查看态），边框、focus 环、error 态全部由组件自己负责。详见 [编辑浮层的外观归属](/vanilla/api/#编辑浮层的外观归属)。
:::

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  render: (ctx) => string | VNode | HTMLElement;  // 自定义渲染(返回字符串最省)
  renderEditor: (ctx) => VNode | HTMLElement | null | void;  // 激活单元格时的编辑渲染
}

type Column = {
  editorChrome: boolean;  // 编辑浮层是否替这一列画外观,默认 true;第三方组件设 false
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  plugins: Plugin[];  // 编辑浮层需要 vtCellEditor({ chrome: false })
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
  textOverflow: 'ellipsis' | 'tooltip';  // 全局文本溢出处理
  highlightSelectCell: boolean;  // 高亮选中单元格
}
```

## 示例

切到任一模式后点「滚动压测」，两次结果会并排留在对比表里（平均 FPS、p95 帧时间、掉帧数、render 调用次数、组件挂载 / 卸载次数）。页面底部还有「真实组件 vs 查看态轻 DOM」的外观并排对照。

<PlaygroundHost framework="vue" example-id="vue-cell-edit" />

## 源码

::: details 点击查看示例源码
<<< @/apps/vue/src/components/third-party/ElementPlus.vue
:::

::: details 点击查看查看态轻 DOM 生成器（复用 el 类名）
<<< @/apps/vue/src/components/third-party/ep-view.ts
:::
