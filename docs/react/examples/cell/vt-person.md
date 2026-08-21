# React VtPerson 人员

人员列：头像 + 姓名，可选单人 / 多人。头像图 URL 没给或加载失败时退到「姓名首字 + 派生色」的色块；悬停弹一张名片（副标题 / 邮箱 / 电话 / 自定义字段）。

## 示例

<PlaygroundHost framework="react" example-id="react-vt-person" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/cell/VtPerson.tsx
:::

## 说明

**不给 `options` 就是纯展示列**（不提供 `renderEditor`，也不需要插件）：此时行值可以是姓名字符串，也可以是 `{ value/id, label/name, avatar, color }` 对象。给了 `options` 就是选人列，编辑态走 `renderEditor`，**必须装 `vtCellEditor` 插件**。

人员胶囊是**手指光标**（悬停弹名片、点一下进选人面板）。清除「×」在锚点右侧、**默认就有**，
激活后按 `Delete` / `Backspace` 同效 —— 面板默认带搜索框，焦点在里面时那两个键**只在搜索词为空**
时清空单元格；不许清空的列传 `clearable: false`。

选人面板与 [`VtSelect`](./vt-select) 同一个内核：搜索（姓名 / 副标题 / 标识都能搜）、`↑↓` 移动、`Enter` 选中、`Esc` 关闭。单人选中即写回并关面板；多人勾选即时写回，没有「确定」按钮。

## 一个人是一枚胶囊

淡底 + 全圆角，头像贴在左端当端帽、姓名在右侧（与 `cellType: 'option'` 的标签同一门语言）。
这样多人列里一眼能看出「哪个名字属于哪个头像」—— 裸排时头像↔姓名与人↔人的间距几乎相等，
读起来会变成「一排头像 + 一排名字」。`avatarOnly` 不套胶囊（没有姓名要圈，留底色就是右边空
一截的怪胶囊）。

**头像有图用图、无图退首字色块**：色块颜色按 `value` **稳定哈希**从语义色令牌
（primary / success / warning / danger / 次要文字色）里取，同一个人在任何行任何表格里都是同一色 ——
按行号取色的话，虚拟滚动复用行 DOM 时颜色会随滚动跳变。图加载失败（离职销号、外链失效、
防盗链）会把 `<img>` 摘掉露出色块，而不是留一个断图占位符。

首字规则：中日韩取**最后一个字**（「张伟」→「伟」，一屏不会全是「张」），拉丁取前两段首字母
（`John Doe` → `JD`）。

## 悬停名片

名片**只在确实有东西可看时才弹**：候选项带了 `desc` / `email` / `phone` / `fields`，或者姓名在
单元格里被藏起来（`avatarOnly`）/ 被截断。一张只重复单元格里已有内容的名片是纯噪音。
`hoverCard: false` 关掉，`renderCard` 整块替换（返回 `null` 表示这个人不弹）。

内容是放大头像 + 姓名 + 副标题 + 邮箱 / 电话 / `fields`。200ms 延迟（避免横扫单元格时闪），
挂 `.vt-client`、随单元格移动、行被虚拟滚动回收时自毁。

**指针可以移进名片**（选中复制里面的邮箱 / 电话）：hover 判定按「胶囊 ∪ 名片」两块区域算，
离开后留 160ms 宽限期才收 —— 名片与胶囊之间隔着 4px，指针跨过去时必然先离开胶囊。在名片里
划选文字时 Cmd+C 归浏览器，不会被 `vtClipboard` 抢去复制框选区域（`[data-vt-popup]` 在放行名单里）。

## 值的形状

常态也认对象值：行数据里存 `{ id, name, avatar }`（接口原样落库的最常见形状）能直接画出来，
因此**不给 `options` 就是一列纯展示的人员**。

但**通过面板改值一律写回 `options` 里的标量 `value`** —— 需要保留对象形状请在 `onChange` 里
自己转回去。

编辑态的回显就是常态那串胶囊（走 `AnchorHandle.setNodes`，含 `+N` 折叠），不是把姓名拼成一行
文字 —— 否则点一下单元格头像整排消失，看起来像换了一列。锚点的左右内边距扣掉了
`.vt-cell-cover` 的 2px 边框，激活前后胶囊位置一致（实测 `left 103 → 103`）。

## 相关 API

| 字段 | 作用 |
| --- | --- |
| `options` | 可选人员；不给就是纯展示列 |
| `multiple` / `valueType` / `maxCount` | 选多人与折叠 |
| `avatarOnly` | 只画头像（列窄时用） |
| `hoverCard` / `renderCard` | 悬停名片 |

> 全量选项表见 [单元格组件](/vanilla/api/components#vtperson)；公共选项
> （`placeholder` / `disabled` / `clearable` / `onChange`）、`asCell()`、三类交互模型见
> [同页上方](/vanilla/api/components#公共选项)；列的通用字段见 [列配置](/vanilla/api/column#virttablecolumn)。
>
> 编辑态需装 `vtCellEditor`，见 [插件机制](/vanilla/api/plugins)。
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
