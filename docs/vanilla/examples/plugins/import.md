# vtImport 导入

CSV / TSV / xlsx 文件 → 表格的行。一行 API，装了工具栏就顺带多一颗「导入」。

<PlaygroundHost framework="vanilla" example-id="table-import" />

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtImport, vtToolbar } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/toolbar.css';

const table = new VirtTable(el, {
  list: [],
  columns,
  itemKey: 'id',
  estimatedSize: 40,
  plugins: [vtToolbar(), vtImport()],
});

await table.importFile();                            // 弹文件选择器
await table.importFile(file);                        // 已经有 File / Blob 了
await table.importFile(csvText, { autoColumns: true }); // 连列一起推
```

不装 `vtToolbar` 也能用 —— 那时它就是纯 API，入口自己放（一个上传区、右键菜单里一项都行）。

## 默认**只换行，不换列**

绝大多数场景是「往一张已经定义好的表里灌数据」，文件的表头只用来对齐字段。所以
`autoColumns` 默认关：

```ts
await table.importFile(file);                        // 列保持原样，只 setList
await table.importFile(file, { autoColumns: true }); // 按表头 inferColumns() + setColumns()
```

开着它才是「事前不知道 schema」的场景（用户随手上传一个表）。这时列**先**换、行**后**落 ——
反过来首帧会拿旧列渲染一遍新数据。

## 认格式看的是字节，不是文件名

xlsx 本身就是 zip，头四个字节固定是 `PK\x03\x04`。所以判格式**先看字节头**，扩展名只作后备 ——
真实上传里用户会把 xlsx 改名成 `.txt`，也会把 CSV 存成 `.xls`。

CSV 那边的分隔符也是嗅出来的（逗号 / 分号 / 制表符 / 竖线，按首行里哪个多）。中文 Windows 上
Excel 存出来的「CSV」默认是**分号**分隔，这条不猜就会整行挤成一列。要固定就显式给：

```ts
await table.importFile(file, { delimiter: ';' });
```

## 一次只落一张 sheet

xlsx 可能有多张，默认取第一张。想让用户挑就先 `readSheets()`（只解析、不落表）：

```ts
const sheets = await table.readSheets();       // 用户取消时返回 null
if (!sheets) return;
const name = await askUser(sheets.map((s) => s.name));
await table.importFile(file, { sheet: name }); // 也接 0 基下标
```

「把多张 sheet 同时塞进一张表」没有合理语义 —— 列都不一样。

## `transform`：落表前唯一那道口

```ts
await table.importFile(file, {
  transform: (rows, { sheet, keys }) => {
    if (!keys.includes('工号')) {
      alert('这个文件里没有「工号」列');
      return false;              // 取消这次导入，表格一行都不动
    }
    return rows
      .filter((r) => r.工号)      // 丢掉空行
      .map((r) => ({ ...r, 月薪: Number(r.月薪) || 0 }));
  },
});
```

改写、过滤、补默认值、拦掉不合格的文件都在这里。**逐格定位错误、把红框标回某一个单元格**
是付费[导入向导](/enterprise/)的事 —— 那一套是 UI 流程，不是一个回调。

## 主键与重复列名

导入在 `transform` 之后校验表格的 `itemKey`：缺失、`null` 或空字符串自动补唯一主键，已有主键保持原值（包括 `0`）。主键按字符串比较，因此数字 `1` 与字符串 `'1'` 视为重复。

同一批数据主键重复，或追加时与已有源行冲突，会拒绝整次导入并调用 `onError`；此时列和数据都不改变。已有源行包括筛选、分页隐藏的行和树子节点。替换导入允许复用旧表的主键。

重复表头会生成唯一后缀，并避开已有字段名，例如 `a,a,a_2` 对应 `a,a_3,a_2`，确保每列数据都保留。

## 选项

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `sheet` | 第一张 | xlsx 取哪张：名字或 0 基下标 |
| `delimiter` | 自动嗅 | CSV 分隔符 |
| `autoColumns` | `false` | 按表头推断并替换列 |
| `append` | `false` | 追加（`appendRows`）而不是替换（`setList`） |
| `transform` | — | 落表前过一道，返回 `false` 取消 |
| `skipRows` | `0` | 表头**之前**还有几行要跳（报表标题、说明行） |
| `header` | `'first'` | 首行是表头。给 `string[]` 则自带一份表头、全部行当数据；给 `false` 则键是 `col1` / `col2`… |
| `dropEmptyRows` | `true` | 整行全空就丢掉 |

插件级 `defaults` 给一次，`importFile(src, opts)` 逐次覆盖：

```ts
vtImport({
  accept: '.csv,.xlsx',
  defaults: { autoColumns: true, skipRows: 1 },
  onImported: (r) => toast(`导入 ${r.rows.length} 行`),
  onError: (e) => toast.error(e.message),   // 不给的话只 console.warn，用户看不到
  toolbar: false,                           // 只留 API，按钮自己放
  toolbarText: '上传数据',
})
```

## 拖放要自己接三行

插件**不**接管拖放 —— 那会跟拖行排序、拖列宽抢事件。但 `importFile` 什么都能喂：

```ts
zone.addEventListener('dragover', (e) => e.preventDefault());
zone.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) void table.importFile(file);
});
```

## 只想要解析，不要表格

解析层是**独立子路径、零 DOM**，能在 Node / Worker 里跑：

```ts
import { parseCsv, readXlsx, rowsToObjects } from '@virt-table/vanilla/sheet-import';

const sheets = await readXlsx(bytes);        // [{ name, rows: SheetValue[][] }]
const { keys, rows } = rowsToObjects(sheets[0].rows);
```

| 导出 | 作用 |
| --- | --- |
| `parseCsv(text, options?)` | CSV / TSV → 二维数组。带引号、字段内换行、CRLF、BOM 都处理 |
| `sniffDelimiter(text)` | 嗅首行的分隔符 |
| `readXlsx(bytes)` | xlsx → sheet 列表。日期按 `numFmt` 还原成 `Date`，共享字符串与富文本拼好 |
| `rowsToObjects(rows, options?)` | 二维数组 + 表头 → 对象数组 |
| `unzip(bytes)` / `canInflate()` | zip 解包；后者判当前环境有没有 `DecompressionStream` |
| `serialToDate(serial)` | Excel 日期序列号 → `Date`（纪元是 1899-12-30） |

::: warning xlsx 需要 `DecompressionStream`
Excel 存出来的条目一律压缩过，读它要浏览器的 `DecompressionStream`（Chrome 103+ /
Firefox 113+ / Safari 16.4+）。环境里没有时插件**直接报错**说清楚，而不是读出一张空表
—— 空表会被当成「文件坏了」。CSV 不受影响。
:::

## 它为什么在免费版

vxe-table 免费给了导入，所以免费版缺它是唯一一处「被拿去比较时会掉分」的地方。
基础导入没有算法，只是把文件变成行 —— 收它的钱只会赶客。

付费边界留在**向导**：列映射（文件的「员工姓名」对上表里的 `name`）、类型推断与冲突提示、
校验报错定位到某一格并允许就地改、大文件分批提交。那是一整套 UI 流程，见 [企业版](/enterprise/)。

## 源码

::: details 点击查看源码
<<< @/apps/vanilla/src/components/plugins/import.ts
:::

## 相关

| 想要什么 | 去哪 |
| --- | --- |
| 反过来，导出成 CSV / Excel | [vtExport 导出](/vanilla/examples/plugins/export) |
| 带样式、合并单元格的真 xlsx 导出 | [企业版 · xlsx](/vanilla/enterprise/xlsx) |
| 从剪贴板粘一片进来 | [vtClipboard 剪贴板](/vanilla/examples/plugins/clipboard) |
| 列本身怎么配 | [API · 列配置](/vanilla/api/column) |
| 插件清单与注入的方法 | [API · 插件机制](/vanilla/api/plugins) |
