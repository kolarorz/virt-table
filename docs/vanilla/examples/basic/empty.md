# 空数据表格

当 `list` 为空时显示空态，可通过 `emptyText` 自定义提示文案。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-empty" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/basic/empty.ts
:::

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `emptyText` | 空态文案（也可走 `locale.empty`） | [表格配置](/vanilla/api/table#virttableoptions) |
| `--vt-empty-icon` | 空态图标，尺寸设 `0` 可隐藏 | [主题定制](/vanilla/examples/basic/theme) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column) / [实例方法](/vanilla/api/instance)。
