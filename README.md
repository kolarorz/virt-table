# virt-table

行列双向虚拟化的高性能表格。十万级数据流畅滚动，同时把「一个后台管理系统的表格需求」补成完整闭环 —— 合并单元格、多级分组表头/表尾、固定行列、树形、分组、编辑器、插件化。

📖 **[文档与在线示例](https://kolarorz.github.io/virt-table/)** · [Vanilla](https://kolarorz.github.io/virt-table/vanilla/guide/started) · [React](https://kolarorz.github.io/virt-table/react/guide/started) · [Vue](https://kolarorz.github.io/virt-table/vue/guide/started)

## 特性

- **行 + 列双向虚拟化**，动态行高，十万级数据流畅滚动（核心产物 gzip 约 84 kB）
- **合并单元格**：表体 / 表头 / 表尾，支持按值自动合并
- 多级分组表头与表尾、固定行 / 固定列
- 排序、列头筛选、AND/OR 条件树高级筛选
- 树形（含懒加载）、分组、展开行、合计行、分页
- 单元格编辑器 + 校验、复选 / 单选、列宽拖拽
- 暗色主题、i18n、ARIA
- **插件化**：14 个插件按需引入，用不到的连 CSS 一起被 tree-shaking 摇掉（实测从 barrel 引 1 个插件只增加约 4.7 kB）
- **18 个内置单元格组件**：输入框、下拉、多级联动、日期 / 区间、开关、评分、标签、进度、人员…

## 安装

```bash
npm install @virt-table/vanilla   # 原生 JS / 任意框架
npm install @virt-table/react     # React 18+
npm install @virt-table/vue       # Vue 3
```

React / Vue 封装会把 `@virt-table/vanilla` 一起装上。

## 快速开始

```ts
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import '@virt-table/vanilla/core.css';

// 容器需要有明确的宽高
const container = document.getElementById('table')!;

const columns: VirtTableColumn[] = [
  { key: 'name', title: '姓名', width: 200 },
  { key: 'age', title: '年龄', width: 100 },
];

const table = new VirtTable(container, {
  list,
  columns,
  itemKey: 'id',       // 行唯一标识字段
  estimatedSize: 40,   // 行预估高度（px）
  buffer: 4,           // 上下缓冲行数
});
```

React / Vue 用法见各自的[快速开始](https://kolarorz.github.io/virt-table/)。

`@virt-table/vanilla` 是**多入口**包（`/plugins`、`/components`、`/ai-query`、`/infer-columns`
各自独立，CSS 也分开产出），子路径与样式的对应关系见
[包入口与按需引入](https://kolarorz.github.io/virt-table/vanilla/guide/notes#包入口与按需引入)。

CDN（UMD 全量）：

```html
<link rel="stylesheet" href="https://unpkg.com/@virt-table/vanilla/dist/style.css" />
<script src="https://unpkg.com/@virt-table/vanilla"></script>
<script>
  const table = new VirtTable.VirtTable(el, {
    /* ... */
  });
</script>
```

## 包

| 包 | 说明 |
| --- | --- |
| [`@virt-table/vanilla`](./packages/vanilla) | 表格本体，零框架依赖。能力全在这里 |
| [`@virt-table/react`](./packages/react) | React 封装（peerDep react ≥18） |
| [`@virt-table/vue`](./packages/vue) | Vue 3 封装（peerDep vue ≥3） |

插件与内置组件**与框架无关**，三端都直接从 vanilla 引。虚拟滚动内核复用
[virt-list](https://github.com/kolarorz/virt-list) 的 `@virt-list/core`。

## 参与开发

```bash
pnpm i
pnpm dev     # 文档站 + 三端 demo 全起
pnpm test
```

开发文档在 **[`contributing/`](./contributing)** —— [本地开发](./contributing/setup.md) ·
[发布流程](./contributing/publishing.md) · [付费插件接入](./contributing/pro-plugins.md) ·
[待办清单](./contributing/roadmap.md)。架构与实现细节见 [`AGENTS.md`](./AGENTS.md)。

## License

[MIT](./LICENSE) © kolarorz(kolarorz@gmail.com)
