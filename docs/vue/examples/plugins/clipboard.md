# Vue 剪贴板

由 `vtClipboard` 插件提供：把当前框选区域复制成 TSV（可直接粘到 Excel），也支持从外部粘贴写回。插件与框架无关，`@virt-table/vue` 直接透传 vanilla 的实现与类型。

## 装载

```ts
import { VirtTableVue, vtCellSelection, vtClipboard } from '@virt-table/vue';

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  // vtClipboard 声明了 requires: ['vtCellSelection']，缺了它会被跳过并告警
  plugins: [vtCellSelection(), vtClipboard()],
};
```

## 自定义 payload

```ts
vtClipboard<Row>({
  mimeType: 'application/x-vt-demo+json',
  onCopy: (ctx) => ({ text: ctx.rows.map((l) => l.join('\t')).join('\n'), payload }),
  onPaste: (ctx) => false,  // 返回 false 交回插件走默认 TSV 写回
});
```

::: tip 插件在构造时装载
`plugins` 在建表时生效，运行时替换该字段不会重新装载。所以回调里要读的开关量放在 `ref` 里（示例中的「携带结构化 payload」），而不是靠重建插件。
:::

完整语义（默认 TSV 规则、自动补空行、焦点让位、与编辑浮层的关系）见 [Vanilla · 剪贴板](/vanilla/examples/plugins/clipboard)。

## 示例

<PlaygroundHost framework="vue" example-id="vue-clipboard" />

## 源码

::: details 点击查看源码
<<< @/apps/vue/src/components/plugins/Clipboard.vue
:::
