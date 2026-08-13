# @virt-table/vanilla

行列双向虚拟化的高性能表格，零框架依赖。十万级数据流畅滚动，同时把「后台管理系统的表格需求」补成一个完整闭环。

📖 **[完整文档](https://keno-lee.github.io/virt-table/)** · [在线示例](https://keno-lee.github.io/virt-table/vanilla/examples/basic/basic) · [API](https://keno-lee.github.io/virt-table/vanilla/api/)

框架封装：[`@virt-table/react`](https://www.npmjs.com/package/@virt-table/react) · [`@virt-table/vue`](https://www.npmjs.com/package/@virt-table/vue)

## 特性

- **行 + 列双向虚拟化**，动态行高，十万级数据流畅滚动
- **合并单元格**：表体 / 表头 / 表尾，支持按值自动合并
- 多级分组表头与表尾、固定行 / 固定列
- 排序、列头筛选、AND/OR 条件树高级筛选
- 树形（含懒加载）、分组、展开行、合计行、分页
- 单元格编辑器 + 校验、复选 / 单选、列宽拖拽
- 暗色主题、i18n、ARIA
- **插件化**：框选、剪贴板、键盘导航、搜索、右键菜单、列面板、行列拖拽、导出等按需引入，用不到的连 CSS 一起被 tree-shaking 摇掉

## 安装

```bash
npm install @virt-table/vanilla
```

## 快速开始

```ts
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import '@virt-table/vanilla/core.css';

// 容器需要有明确的宽高
const container = document.getElementById('table')!;

const columns: VirtTableColumn[] = [
  { key: 'name', title: '姓名', width: 200 },
  { key: 'age', title: '年龄', width: 100 },
  { key: 'email', title: '邮箱', width: 300 },
];

const list = Array.from({ length: 100000 }, (_, i) => ({
  id: i,
  name: `用户 ${i}`,
  age: 20 + (i % 30),
  email: `user${i}@example.com`,
}));

const table = new VirtTable(container, {
  list,
  columns,
  itemKey: 'id', // 行唯一标识字段
  estimatedSize: 40, // 行预估高度（px）
  buffer: 4, // 上下缓冲行数
});
```

## 入口一览

| 入口 | 内容 |
| --- | --- |
| `@virt-table/vanilla` | 表格本体与全部类型 |
| `@virt-table/vanilla/core.css` | 核心样式（**必引**） |
| `@virt-table/vanilla/plugins` | 插件（也可按 `plugins/search` 这样单独引） |
| `@virt-table/vanilla/plugins/*.css` | 对应插件的样式，按需引 |
| `@virt-table/vanilla/components` | 内置单元格组件（输入框、下拉、开关、日期…） |
| `@virt-table/vanilla/components/index.css` | 内置组件样式 |
| `@virt-table/vanilla/infer-columns` | 从数据推断列（纯逻辑，可跑在服务端） |
| `@virt-table/vanilla/ai-query` | 自然语言查询的校验层（纯逻辑，建议跑在服务端） |
| `@virt-table/vanilla/style.css` | 全量样式（核心 + 全部插件 + 内置组件），懒得按需引时用 |

CDN 直接用：

```html
<link rel="stylesheet" href="https://unpkg.com/@virt-table/vanilla/dist/style.css" />
<script src="https://unpkg.com/@virt-table/vanilla"></script>
<script>
  const table = new VirtTable.VirtTable(document.getElementById('table'), {
    /* ... */
  });
</script>
```

## License

[MIT](./LICENSE) © keno-lee
