# 编辑校验

为列（或 `VtInput`/`VtNumberInput` 等编辑器）配置 `validator`，编辑时非法值实时标红并提示；`validateAll()` 可在保存前批量校验，返回所有未通过项。

## 示例

<PlaygroundHost framework="vanilla" example-id="table-validate" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/feature/validate.ts
:::
