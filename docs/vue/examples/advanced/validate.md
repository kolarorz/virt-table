# Vue 编辑校验

给列配 `validator`，编辑时非法值实时标红并提示；保存前用 `validateAll()` 批量校验。

## 示例

<PlaygroundHost framework="vue" example-id="vue-validate" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/advanced/Validate.vue
:::

## 说明

```ts
{
  key: 'age',
  title: '年龄',
  width: 120,
  validator: (value, row) => {
    if (typeof value !== 'number') return '必须是数字';
    if (value < 18) return '未满 18 岁';
    return true;   // 通过
  },
}
```

返回 `true` 通过，返回**字符串**即错误信息。内置编辑器（`VtInput` / `VtNumberInput` /
`VtTextarea`）会把这条信息实时显示成错误态；`validator` 也可以配在单元格组件的选项上
（`asCell()` 装到单个格子时它照常生效 —— 那是组件自己消费的，不是列专属选项）。

## 保存前批量校验

```ts
const bad = tableRef.value?.validateAll();   // [{ row, colKey, message }, ...]
if (bad.length) {
  console.warn(`${bad.length} 处不合法`, bad);
  return;                          // 拦住保存
}
```

`validateAll()` 遍历的是**当前数据**而不是渲染出来的行，所以窗口外的非法值也查得到。

## 相关 API

| 字段 / 方法 | 作用 | 详见 |
| --- | --- | --- |
| `col.validator` | `(value, row) => true \| string` | [列配置](/vanilla/api/column#virttablecolumn) |
| `validateAll()` | 返回未通过项 `{ row, colKey, message }[]` | [实例方法](/vanilla/api/instance) |
| `vtCellEditor` | 编辑会话（有编辑态才有实时标红） | [插件机制](/vanilla/api/plugins) |

> 编辑态本身怎么装、浮层归属谁画：[单元格渲染](/vanilla/api/cell#会话层-编辑态)

> 上面的字段在 Vue 端原样透传（实例方法通过组件 `ref` 调用）。封装层特有的部分 —— 组件 Props、渲染函数返回 VNode、`ref` 转发了哪些方法 —— 见 [Vue API](/vue/api/table)。
