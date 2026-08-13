# Vue 溢出隐藏

超长文本的两种处理方式，全局配 `textOverflow`，列上同名字段可覆盖：

| 取值 | 行为 |
| --- | --- |
| `ellipsis` | 单行 + 省略号，不提供查看完整内容的手段 |
| `tooltip` | 省略号 + 内置浮层：只在文本**真被裁掉**时弹出，延迟可调（`tooltip: { delay }`，默认 150ms），长文本自动换行，贴边自动翻转/夹取，跟随明暗主题 |

## 使用的 API

```ts
type Column = {
  key: string;  // 列标识(必填)
  title: string;  // 列标题(必填)
  width: number;  // 列宽(必填)
  textOverflow: 'ellipsis' | 'tooltip';  // 列级覆盖全局设置
}

type Options = {
  list: T[];  // 数据列表
  itemKey: string;  // 行唯一标识字段名
  estimatedSize: number;  // 行预估高度(px)
  buffer: number;  // 缓冲区行数
  border: boolean;  // 是否显示边框
  textOverflow: 'ellipsis' | 'tooltip';  // 全局文本溢出处理
}
```

## 示例

<PlaygroundHost framework="vue" example-id="vue-overflow" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/basic/Overflow.vue
:::