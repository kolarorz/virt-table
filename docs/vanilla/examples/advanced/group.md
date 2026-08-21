# 分组

通过 `groupConfig` 按字段分组展示数据，支持多级分组与展开/收起。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-group" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/advanced/group.ts
:::

## 分组行外观

分组行会自动带上：左侧主色标记条、分组字段名（取同 `key` 列的 `title`）、分组值、条数徽标；**整行可点击**折叠/展开；横向滚动时分组标题会 sticky 停在左侧不被滚走。多级分组按层级（`.vt-tr--group-lv1/2/3`）自动递减底色与字号。

配色同样是变量，可单独覆盖：

```css
.vt-root {
  --vt-group-bg: #eaf0fb; /* 分组行底色（默认由主色派生） */
  --vt-group-bg-lv2: #f1f5fd; /* 二级 */
  --vt-group-bg-lv3: #f6f9fe; /* 三级及更深 */
  --vt-group-bg-hover: #dfe9fa;
  --vt-group-border: #c9d8f2; /* 分组行上下分隔线 */
  --vt-group-accent: var(--vt-color-primary); /* 左侧标记条 */
  --vt-group-accent-width: 3px;
  --vt-group-text: var(--vt-text-color);
}
```

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `groupConfig` | `{ field, sort? }[]`，按字段层级分组 | [表格配置](/vanilla/api/table#virttableoptions) |
| `onGroupToggle` / `toggleFold` | 折叠回调与编程控制 | [实例方法](/vanilla/api/instance) |
| `defaultExpandAll` | 默认全部展开 | [表格配置](/vanilla/api/table#virttableoptions) |

分组行是**整行接管**（接管层），不进单元格内容链 —— 见[渲染粒度](/vanilla/examples/cell/render-levels#四层)。

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
