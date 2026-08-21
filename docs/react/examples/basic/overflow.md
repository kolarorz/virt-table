# React 溢出隐藏

超长文本的两种处理方式，全局配 `textOverflow`，列上同名字段可覆盖：

## 示例

<PlaygroundHost framework="react" example-id="react-overflow" />

## 源码

::: details 点击查看源码
<<< @/apps/react/src/components/basic/Overflow.tsx
:::

## 说明

| 取值 | 行为 |
| --- | --- |
| `ellipsis` | 单行 + 省略号，不提供查看完整内容的手段 |
| `tooltip` | 省略号 + 内置浮层：只在文本**真被裁掉**时弹出，延迟可调（`tooltip: { delay }`，默认 150ms），长文本自动换行，贴边自动翻转/夹取，跟随明暗主题 |

## 相关 API

| 字段 | 作用 | 详见 |
| --- | --- | --- |
| `options.textOverflow` | 全局文本溢出处理 | [表格配置](/vanilla/api/table#virttableoptions) |
| `options.tooltip` | 浮层配置（`{ delay }`） | [表格配置](/vanilla/api/table#virttableoptions) |
| `col.textOverflow` | 列级覆盖 | [列配置](/vanilla/api/column#virttablecolumn) |

> 全量字段见 [表格配置](/vanilla/api/table) / [列配置](/vanilla/api/column)
>
> 上面的字段在 React 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 JSX、`ref` 转发了哪些方法 —— 见 [React API](/react/api/table)。
