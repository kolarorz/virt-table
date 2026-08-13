# 剪贴板

由 `vtClipboard` 插件提供：把当前框选区域复制成 TSV（可直接粘到 Excel），也支持从外部粘贴写回。

## 装载

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtClipboard } from '@virt-table/vanilla/plugins';

new VirtTable(el, {
  columns,
  plugins: [vtCellSelection(), vtClipboard()],   // vtClipboard requires vtCellSelection
});
```

::: warning 依赖框选
`vtClipboard` 声明了 `requires: ['vtCellSelection']`——**没装框选插件时它会被跳过并告警**，不会静默失效。
:::

## 默认行为

- **复制**：选区拍平成 TSV（`\t` 分列、`\n` 分行）写入 `text/plain`
- **粘贴**：以选区左上角为起点写回；粘贴行数超出现有数据时**自动补空行**（补的行 key 形如 `__vt_clip_<时间戳>_<序号>`）
- 焦点在输入框、搜索框或编辑浮层里时不接管，剪贴板事件归它们
- 粘贴完成后选区会按粘贴尺寸铺开，并派发 `onCellSelectionChange`

## 自定义

```ts
interface ClipboardOptions<T> {
  mimeType?: string;   // 自定义 MIME，用于携带结构化 payload
  onCopy?: (ctx: ClipboardCopyContext<T>) => ClipboardCopyResult | null | void;
  onPaste?: (ctx: ClipboardPasteContext<T>) => boolean | void;
}
```

- `onCopy` 返回 `{ text, payload }` 覆盖默认 TSV；返回 `undefined` / `null` 则沿用默认
- `onPaste` 返回 `true` 表示已自行处理（阻止默认写回）；返回 `false` / `undefined` 交回插件走默认
- `payload` 通过 `mimeType` 指定的自定义类型往返，可在表内复制粘贴时保留原始类型（数字、勾选框、富文本等）。电子表格模式就是这么做的，见 `createSpreadsheetClipboardHandlers`

```ts
plugins: [
  vtClipboard({
    mimeType: 'application/x-my-app+json',
    onCopy: (ctx) => ({
      text: ctx.rows.map((l) => l.join('\t')).join('\n'),
      payload: { cells: ctx.rows },
    }),
    onPaste: (ctx) => {
      if (!ctx.payload) return false;      // 外部来源 → 交回默认 TSV 解析
      applyMyFormat(ctx.payload, ctx.selection);
      ctx.setList(nextList);
      return true;                          // 已自行处理
    },
  }),
]
```

## 示例

<PlaygroundHost framework="vanilla" example-id="table-clipboard" />

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/clipboard.ts
:::
