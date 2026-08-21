装上它只会 `console.warn` 一次，**不做任何事**。骨架（构建、类型、许可、测试、发布）都已就位。

---

## 现在装上会发生什么

```ts
import { vtXlsx } from '@virt-table-pro/xlsx';

new VirtTable(el, { list, columns, itemKey: 'id', estimatedSize: 40, plugins: [vtXlsx({ sheetName: '订单' })] });
// → [vtXlsx] 真 xlsx / PDF 导出 尚未实现，本插件当前不做任何事。
```

- 表格照常工作，插件不改任何行为
- `guardProduct('xlsx')` 照常跑 —— 没设密钥时右下角**会出现未授权角标**
- `table.exportXlsx()` / `exportPdf()` **类型上有、运行时没有**，调用会抛 `is not a function`

---

## 计划中的 API（草案，实现时可能变）

```ts no-check
interface XlsxOptions<T> {
  /** sheet 名，默认表格标题或 Sheet1 */
  sheetName?: string;
  /** 带上表头样式与列宽 */
  withStyles?: boolean;
  /** 冻结窗格：冻结前 N 行 / 前 N 列 */
  freeze?: { rows?: number; cols?: number };
  /** 只导出当前选区（需装核心的 vtCellSelection） */
  selectionOnly?: boolean;
}
```

```ts no-check
// 预期用法
const table = new VirtTable(el, {
  list: rows,
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [
    vtXlsx({ sheetName: '订单', withStyles: true, freeze: { rows: 1, cols: 2 } }),
    vtCellSelection(),
  ],
});

await table.exportXlsx();                        // 真 OOXML，不是伪装的 .xls
await table.exportXlsx({ selectionOnly: true }); // 只导当前选区
await table.exportPdf();
```

---

## 为什么这是第一梯队里最先能落地的一个

**基本不需要新核心 API** —— 列树（`getAllColumns` / `getLeafColumns`）、`getState()`、
插件侧的 `ctx.getList()` 都已公开，合并单元格经 options 传入、插件侧自己拿得到。所以它不被任何核心缺口阻塞，
适合作为下一个真实包。

分层也天然成立：核心的 `exportExcel()` 实为 **HTML 伪装的 `.xls`**（没有 zip / OOXML），
免费 = 够用不精致，付费 = 真 xlsx（样式、合并、多 sheet、冻结窗格、条件格式、图片）+ PDF。

---

## 在那之前怎么办

**要求不高**就用核心自带的导出插件（Excel 能打开，只是没有真 xlsx 的样式与多 sheet）：

```ts
import { vtExport, vtCellSelection } from '@virt-table/vanilla/plugins';

const table = new VirtTable(el, { list: rows, columns, itemKey: 'id', estimatedSize: 40, plugins: [vtExport(), vtCellSelection()] });

table.exportCsv({ filename: '订单.csv' });
table.exportExcel({ filename: '订单.xls' });          // HTML 伪装的 .xls
table.exportExcel({ scope: 'selection' });            // 只导当前框选
```

**要求真 xlsx**就自己接一个库。列从 `getLeafColumns()` 取；行要注意一点 —— 实例上**没有**公开的
「当前展示列表」读法（那份只在插件侧的 `ctx.getList()` 上），所以要么自己维护源数据，要么写个
三行的小插件把它透出来：

```ts no-check
import type { VirtTablePlugin } from '@virt-table/vanilla';
import * as XLSX from 'xlsx';   // 或 exceljs

/** 把「管线之后的行」透到实例上。等 vtXlsx 做出来，这段就可以删了 */
const vtRows = (): VirtTablePlugin<Row> => ({
  name: 'vtRows',
  setup: (ctx) => ({ api: { getDisplayRows: () => ctx.getList() } }),
});

const table = new VirtTable<Row>(el, { list: rows, columns, itemKey: 'id', estimatedSize: 40, plugins: [vtRows()] });

function exportNow(): void {
  // 功能列（序号/勾选/树/拖拽）没有业务值，隐藏列也不该出现在导出里
  const cols = table.getLeafColumns().filter((c) => !c.type && !c.hidden);
  const header = cols.map((c) => c.title ?? String(c.key));
  // 已排序/筛选/分页之后的行，与用户看到的一致
  const body = (table as any).getDisplayRows().map((row: Row) =>
    cols.map((c) => row[c.key as keyof Row]),
  );

  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet['!cols'] = cols.map((c) => ({ wpx: c.width }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '订单');
  XLSX.writeFile(book, '订单.xlsx');
}
```

本包做的事就是把上面这段连同样式、合并、冻结、选区、PDF 一起收成一行 `exportXlsx()`，
并且不让 SheetJS 这类依赖进使用方的主 bundle。

---

## 进展与排期

kolarorz@gmail.com

## 相关

- [企业版](/enterprise/) —— 授权模式、定价与常见问题
- 已实现的付费包：<ProLink to="views">命名视图</ProLink> · <ProLink to="undo">撤销 / 重做</ProLink> ·
  <ProLink to="formula/column">公式</ProLink> · <ProLink to="gantt/">甘特图</ProLink>
