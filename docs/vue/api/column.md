# 列级 API

下表是 `VueTableColumn` 的字段。列排序、列显隐、列 / 行拖拽这些列能力的完整说明见 [Vanilla API · 列级](/vanilla/api/column)。

## VueTableColumn

列配置项，继承 `VirtTableColumn` 除渲染函数外的所有属性。渲染函数支持返回 Vue `VNode`。

| 属性             | 类型                                            | 默认值 | 说明                 |
| ---------------- | ----------------------------------------------- | ------ | -------------------- |
| `key`            | `string`                                        | —      | **必填**。列标识     |
| `title`          | `string`                                        | —      | **必填**。列标题     |
| `width`          | `number`                                        | —      | **必填**。列宽（px） |
| `children`       | `VueTableColumn[]`               | —      | 子列 —— 配置即成为多级分组表头的分组节点 |
| `footerValue`    | `string \| number`      | —      | 多级分组表尾：该节点表尾格的静态内容 |
| `renderFooter`   | `(ctx: FooterRenderContext<T>) => …` | —      | 多级分组表尾：该节点表尾格的自定义渲染 |
| `fixed`          | `'left' \| 'right'`                             | —      | 固定列               |
| `type`           | `'index' \| 'checkbox' \| 'expand' \| 'tree'`   | —      | 特殊列类型           |
| `align`          | `'left' \| 'center' \| 'right'`                 | —      | 水平对齐             |
| `vAlign`         | `'top' \| 'middle' \| 'bottom'`                 | —      | 垂直对齐             |
| `headerAlign`    | `'left' \| 'center' \| 'right'`                 | —      | 表头水平对齐         |
| `headerVAlign`   | `'top' \| 'middle' \| 'bottom'`                 | —      | 表头垂直对齐         |
| `footerAlign`    | `'left' \| 'center' \| 'right'`                 | —      | 表尾水平对齐         |
| `footerVAlign`   | `'top' \| 'middle' \| 'bottom'`                 | —      | 表尾垂直对齐         |
| `cellType`       | `'text' \| 'number' \| 'rich-text' \| 'image' \| 'option' \| 'checkbox'` | —      | 内容类型，见[单元格渲染](/vue/api/cell)、[渲染粒度示例](/vue/examples/cell/render-levels) |
| `textOverflow`   | `'ellipsis' \| 'tooltip'`            | —      | 文本溢出             |
| `resizable`      | `boolean`                                       | —      | 可调整列宽           |
| `minWidth`       | `number`                                        | —      | 最小列宽             |
| `maxWidth`       | `number`                                        | —      | 最大列宽             |
| `render`         | `(ctx) => VNode \| string \| HTMLElement`       | —      | 自定义单元格渲染     |
| `renderHeader`   | `(ctx) => VNode \| string \| HTMLElement`       | —      | 自定义表头渲染       |
| `renderEditor`     | `(ctx) => VNode \| HTMLElement \| null \| void` | —      | 自定义编辑渲染       |
| `editorChrome`   | `boolean`                                      | `true` | 编辑浮层是否替这一列画外观（边框 / focus 环）。用 Element Plus 等第三方组件时设 `false`，否则会叠两层边框、激活前后高度也对不上；整表统一可用 `vtCellEditor({ chrome: false })` |
| `renderExpandRow`   | `(ctx) => VNode \| string \| HTMLElement`       | —      | 自定义展开内容       |
| `filters`        | `Array<{ label, value, checked? }>`             | —      | 列筛选选项           |
| `filterMultiple` | `boolean`                                       | —      | 多选筛选             |
| `filterMethod`   | `(value, row) => boolean`                       | —      | 自定义筛选           |

### 自定义渲染示例

```vue
<script setup lang="ts">
import { h } from 'vue';
import { VirtTableVue, type VueTableColumn } from '@virt-table/vue';

const columns: VueTableColumn[] = [
  {
    key: 'status',
    title: '状态',
    width: 120,
    render: ({ value }) =>
      h(
        'span',
        { style: { color: value === 'active' ? 'green' : 'red' } },
        String(value),
      ),
  },
];
</script>
```
