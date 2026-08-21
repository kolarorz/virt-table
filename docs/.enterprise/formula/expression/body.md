<ProLink to="formula/column">两档</ProLink>共用同一套词法 / 语法 / 求值 / 函数库，差别只在**引用怎么解释**
与**结果算给谁**。这一页讲共用的那部分，以及怎么脱离表格单独用。

## 运算符

前导 `=` **可有可无**：`'=amount * 2'` 与 `'amount * 2'` 等价，从 Excel 抄公式过来不用改。

| 优先级（低 → 高） | 运算符 |
| --- | --- |
| 比较 | `=` `<>` `>` `<` `>=` `<=` |
| 连接 | `&`（字符串连接） |
| 加减 | `+` `-` |
| 乘除 | `*` `/` |
| 幂 | `^`（右结合，与 Excel 一致） |
| 一元 | `-` `+` |

::: warning 没有 `%`
Excel 的 `%` 是后缀百分比（`50%` = 0.5），而多数人看见 `a % b` 会以为是取模。与其做一个
「看着像 Excel 其实不是」的东西，不如不给：取模写 `MOD(a, b)`，百分比直接写 `0.06`。
:::

## 字面量与引用

```ts
'amount * 1.5'; // 数字：123 / 1.5 / .5 / 1e3
'CONCAT(dept, "-", city)'; // 字符串：双引号或单引号
'name & """"'; // 引号内两个同样的引号 = 一个字面引号（Excel 风格）
'[单价 含税] * qty'; // 方括号引用：列 key 带空格/符号时用
'TRUE'; // 布尔
```

标识符支持 Unicode 字母（`\p{L}`）、数字、`_`、`$`，所以列 key 用中文也行。

引用怎么解释由所在档决定：

| | 引用是什么 | 例子 |
| --- | --- | --- |
| <ProLink to="formula/column">计算列</ProLink> | **列 key**（同一行） | `amount`、`[含空格的 key]` |
| <ProLink to="formula/cell">单元格公式</ProLink> | **A1 记法**（含区域） | `B2`、`$B$2`、`D2:D11` |

## 内置函数（37 个）

函数名**大小写不敏感**。

| 类 | 函数 |
| --- | --- |
| 数学 | `ABS` `SQRT` `SIGN` `INT` `ROUND` `ROUNDUP` `ROUNDDOWN` `FLOOR` `CEILING` `POWER` `MOD` |
| 聚合 | `SUM` `AVERAGE` `MIN` `MAX` `COUNT` `COUNTA` |
| 逻辑 | `IF` `IFERROR` `AND` `OR` `NOT` `TRUE` `FALSE` |
| 文本 | `LEN` `UPPER` `LOWER` `TRIM` `CONCAT` `LEFT` `RIGHT` `MID` |
| 其它 | `COALESCE` `ISBLANK` `ISNUMBER` `ISERROR` `NUMBER` |

清单也能在运行时拿到（做补全 UI 用）：

```ts
import { BUILTIN_FUNCTION_NAMES, BUILTIN_FUNCTIONS } from '@virt-table-pro/formula';
```

::: info 第一档里 SUM 吃参数列表
第一档没有区域，所以 `SUM(amount, tax)` 而不是 `SUM(B2:B10)`；写了区域会落到 `#REF!` ——
语法上写得出来，语义上明确不支持。
:::

### 与 Excel 刻意对齐的几处语义

- `ROUND` 是 **half-away-from-zero**（`ROUND(-1.5)` = -2），不是 `Math.round`；并且修了二进制
  表示误差（`ROUND(2.675, 2)` = 2.68 而不是 2.67）
- `MOD` 的结果跟**除数**同号（`MOD(-3,2)` = 1），不是 JS 的 `%`
- `SUM` 忽略空与非数字文本、忽略布尔，但**区域里夹着错误值时整体返回那个错误**
  （静默忽略会让一个坏格子悄悄少算一笔钱）
- 真值判定：`0` 与空为假，其它数字为真，字符串只认 `TRUE`/`FALSE`，别的字符串是 `#VALUE!`
  （JS 的「非空字符串即真」会让 `IF(status, ...)` 在 status 是任意文字时都走 true 分支）
- `ISNUMBER('12')` 是 `false`（数字字符串不算数字）

### 自定义函数

```ts
import { toNumber, isFormulaError } from '@virt-table-pro/formula';

vtFormulaColumn({
  columns: { fee: 'BANKFEE(amount)' },
  functions: {
    BANKFEE: (args) => {
      const n = toNumber(args[0]); // 返回 number | FormulaError
      if (isFormulaError(n)) return n; // 错误原样向上传播
      return Math.max(2, n * 0.001);
    },
  },
});
```

同名会覆盖内置。名字大小写不敏感（内部统一成大写）。

## 错误值与错误码

错误是**值而不是异常** —— 一格算错只显示错误码，不影响别的格，也不打断整轮求值。

| 码 | 什么时候 |
| --- | --- |
| `#DIV/0!` | 除以零（含 `MOD` 的除数为 0） |
| `#REF!` | 引用不存在：拼错的列名、越界的 `A999`、第一档里写了区域 |
| `#NAME?` | 不认识的函数名 |
| `#VALUE!` | 参数类型/个数不对，区域用在了标量位置，区域超过 `maxRangeCells` |
| `#SYNTAX!` | 公式本身语法错 |
| `#CIRCULAR!` | 循环引用（第二档里每次重建图重新判定，解开环即自愈） |

**拿不准的地方宁可返回错误值，也不静悄悄给一个看起来对的数** —— 财务列里一个静默的错值比一个
显式的错误值贵得多。`amout * 0.06`（拼错列名）会整列 `#REF!`，不会安安静静算出一整列 0。

写回行数据时错误值转成字符串（`'#DIV/0!'`），这样核心的排序/筛选/导出能把它当普通值处理。
在 JS 侧判断用 `isFormulaError()`。

## 纯逻辑层：不挂表格也能用

解析、求值、引擎、A1 工具全部零 DOM，可以跑在服务端（比如把一张表的公式在后端算一遍再下发）。

```ts
import { parse, evaluate, collectRefs, SheetEngine } from '@virt-table-pro/formula';

// 解析 + 求值一条表达式
const ast = parse('ROUND(amount * rate, 2)');
collectRefs(ast); // ['amount', 'rate']
evaluate(ast, { getRef: (name) => ({ amount: 100, rate: 0.06 })[name] ?? undefined }); // 6

// 整张表：只要能读输入、写结果，引擎就能跑
const grid = [['1', '2', '=A1+B1']];
const engine = new SheetEngine({
  rowCount: () => grid.length,
  colCount: () => grid[0].length,
  getInput: (r, c) => grid[r][c],
  setOutput: (r, c, v) => {
    grid[r][c] = String(v);
  },
});
engine.compile();
engine.evaluateAll(); // 返回写回的格数
engine.getErrors(); // [{ id, code, detail }]
engine.recalcFrom([{ row: 0, col: 0 }]); // 改了 A1 → 只重算受影响的格
```

`getInput` 返回 `undefined` 表示越界；返回 `'=...'` 表示这格是公式。

`EvalContext.getRef` 的约定值得单独说：返回 `undefined` = **这个引用不存在** → `#REF!`；
存在但为空要返回 `null`。这个区分是「拼错名字」能被看见的唯一原因。

### A1 工具

`parseA1` / `toA1` / `cellId` / `colToLetter` / `letterToCol` / `normalizeRange` /
`expandRange` / `rangeSize` / `offsetRef` / `offsetFormula`。

```ts
import { colToLetter, parseA1, offsetFormula, tokenize } from '@virt-table-pro/formula';

colToLetter(27); // 'AB'
parseA1('$B$12'); // { row: 11, col: 1, absCol: true, absRow: true }
offsetFormula('=D2*$E$2', 1, 0, tokenize); // '=D3*$E$2'
```

## 还没做的

跨表引用、数组公式、易失函数（`NOW()` / `RAND()`）、迭代计算、名称管理器。

真要 Excel 级（400+ 函数）理性做法是接 HyperFormula 做适配层而不是自己写 —— 但它是
GPLv3 / 商业双许可，本产品闭源，得先买商业授权。那是采购决策，不是技术决策。

## 相关

- <ProLink to="formula/column">计算列</ProLink> · <ProLink to="formula/cell">单元格公式</ProLink>
