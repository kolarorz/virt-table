import {
  createSpreadsheetClipboardHandlers,
  renderSpreadsheetCellHtml,
  setSpreadsheetCellData,
  VirtTable,
  type CellSelectionRange,
  type MergeCell,
  type PluginContext,
  type SpreadsheetCellData,
  type VirtTableColumn,
  type VirtTablePlugin,
} from '@virt-table/vanilla';
import {
  vtCellEditor,
  vtCellSelection,
  vtClipboard,
  vtContextMenu,
  vtExport,
  vtKeyboardNav,
  vtSearch,
  vtToolbar,
  type ContextMenuContext,
  type ContextMenuItem,
} from '@virt-table/vanilla/plugins';
/*
 * 浮动图片是**付费插件**，住在另一个私有仓库 `virt-table-pro`。
 * 同级目录没有那个仓库时，`@virt-table-pro/*` 会被 vite alias 指到 `docs/apps/pro-kit/stubs/` 下的桩
 * （表格照常跑，只是没有这张图）—— 完整取舍见 `contributing/pro-plugins.md`。
 */
import { vtFloatingImage } from '@virt-table-pro/floating-image';
/** 单元格公式（A1 记法、依赖图、增量重算）——「偏差」那一列就是一条公式 */
import { vtFormula } from '@virt-table-pro/formula';
/** 撤销/重做：查询状态自动入栈，数据变更由本文件在写回时 `recordChange()` 显式录制 */
import { vtUndo } from '@virt-table-pro/undo';
/**
 * 真 xlsx 导出（zip + OOXML）。这个案例里它的入口**只给选区与透视结果** ——
 * 理由见下面 `exportXlsxSelection()` 的注释：65 列 × 10 万行 = 650 万格，
 * 全表导 xlsx 会产出几百 MB 的 XML，那不是「慢」，那是把浏览器挂死。
 */
import { vtXlsx } from '@virt-table-pro/xlsx';
/**
 * 透视表。默认**不开**（`vtPivot()` 不配维度也不配值时完全让路），由工具栏那颗
 * 「透视」按钮里的面板打开 —— 顺带演示「面板 UI 由使用方做」到底有多简单。
 */
import { vtPivot, type PivotOptions } from '@virt-table-pro/pivot';
/*
 * 付费包的样式要自己引 —— 它的 dist 里 JS 与 CSS 是分开产出的（与核心的插件一样）。
 * 这几行就是客户集成时该抄的：各插件样式 + 未授权角标样式 + 查看器样式
 * （查看器住在**核心**里，与内置组件 `VtImage` 共用一份，付费包只是复用它）。
 */
import '@virt-table-pro/floating-image/index.css';
import '@virt-table-pro/formula/index.css';
import '@virt-table-pro/pivot/index.css';
import '@virt-table-pro/license/index.css';
import '@virt-table/vanilla/components/image-viewer.css';
// 演示密钥两个案例共用一份（各设一把会在切换案例时互相覆盖，见那个文件的头注）
import { setLicenseKey } from '@virt-table-pro/license';
import { applyProDemoLicense } from '../../../pro-kit/demo-license';
// 撤销/重做那两颗按钮的内联 SVG（1em、stroke=currentColor，跟着按钮文字变色）
import { iconHtml, REDO_PATHS, UNDO_PATHS } from '../../../pro-kit/shared/icons';
import {
  VtCheckbox,
  VtDatePicker,
  VtInput,
  VtNumberInput,
  VtPerson,
  VtProgress,
  VtSelect,
  type VtPersonOption,
  type VtSelectOption,
} from '@virt-table/vanilla/components';

/**
 * Demo · 电子表格
 *
 * 一份 **10 万行 × 65 列（650 万单元格）** 的工程排期台账：13 个语义列 + 52 个周计划列，
 * 外加 2.7 万个合并区（模块列每 4 行纵向合并、每 40 行一条横向小结带）。
 *
 * ## 两个撑住这个规模的决定
 *
 * **1. 数据只存值，外观按规则派生。** 逐格数据（`_sheetCells`）只用在表头行与小结带那两处
 * ——那里的外观是**内容本身**，推不出来；10 万行明细只存**纯值**，胶囊、勾选框、数据条、
 * 热力图、逾期红字全部在渲染时按列的语义算出来（`deriveCell` / `deriveStyle`）。
 * 若给每格都存一个 `SpreadsheetCellData`，650 万个对象的内存与构造耗时会直接毁掉首屏 ——
 * 而真实系统里「条件格式」本来也是规则，不是数据。
 *
 * **2. 行对象是稀疏的。** 生成的行不预填 65 个空字符串键，只写真正有值的那 27 个
 * （13 个语义列 + 14 个有工时的周；渲染取不到就是空）。10 万行因此是 270 万次属性写入
 * 而不是 650 万次。
 *
 * ## 每一列都是内置单元格组件，不手写控件也不手写 HTML
 *
 * - 语义列各用自己的组件：`VtPerson`（负责人）/ `VtSelect`（状态、优先级，胶囊态）/
 *   `VtProgress` + `VtNumberInput`（进度：前者渲染、后者编辑）/ `VtCheckbox`（验收，点一下
 *   就切）/ `VtDatePicker`（截止日期）/ `VtNumberInput`（工时、偏差、周计划），其余用
 *   `VtInput`。外观、编辑器、锁高契约全部来自组件。
 * - 逐格数据（表头行 / 小结带）优先级更高，走 `renderSpreadsheetCellHtml()`：不这么分流的话
 *   `VtSelect` 会把表头那格的「状态」两个字也画成一枚胶囊。
 * - 选区按合并扩张：`table.expandSelectionForMerges()`（核心公开方法，顺带处理固定列偏移
 *   与自动合并段），原来 demo 里那 35 行不动点循环已删。
 * - 合并区状态只有一份，存在表格里：`table.getMerges()` / `setMerges()`，demo 不再自己
 *   拿一个 `merges` 变量跟着同步。
 *
 * 仍然只能手写的部分（都是「库不该管」的那类）：A/B/…/BM 列名、条件格式规则本身，
 * 以及「把当前选区合并起来」这个命令 —— 核心给了几何（`expandSelectionForMerges`）与写入
 * （`setMerges`），但没有现成的「合并选区」动作。
 *
 * ## 五个付费插件，两个是后来加的
 *
 * 公式 / 撤销 / 浮动图片是这个案例一开始就有的。2026-08-31 又加了两个，它们放在一起才
 * 构成一条完整的路 —— **十万行明细太大不适合直接导 xlsx，先透视成汇总再导**：
 *
 * - **`vtPivot`**（工具栏「透视」）：9.75 万条明细 → 11 行交叉表，实测 39ms。
 *   那个面板是**本文件自己画的**（插件 v1 只给 API），用的是核心的面板基元。
 *   三件这个案例撞出来的事写在 `registerToolbarItem('pivot')` 上面那段注释里。
 * - **`vtXlsx`**（工具栏「导出」）：选区 / 透视结果 → 真 xlsx，以及分页打印 / PDF。
 *   **刻意不给「导出全表 xlsx」**，理由见 `exportXlsxSelection()` 上面那段。
 *
 * ⚠️ 两处「让位」不能忘：核心的 `vtExport` 与本文件那颗导出面板都叫「导出」，所以前者传
 * `toolbar: false`；`vtXlsx` 同理传 `toolbar: false`（入口由本文件给）。少任何一个，
 * 工具栏上就会并排出现两颗同名按钮 —— 这条是真浏览器冒烟时抓出来的。
 */

/* ==========================================================================
 * 1. 行的形状
 * ========================================================================== */

interface SpreadsheetRow extends Record<string, any> {
  id: number;
  /**
   * 逐格数据（类型 / 富文本 / 底色 / 对齐）。
   *
   * 只有表头行与「阶段小结」带用它 —— 那两处的外观是**内容本身的一部分**，不是能从值
   * 推出来的规则。10 万行明细一格都不存，见文件头注那条「数据只存值」。
   */
  _sheetCells?: Record<string, SpreadsheetCellData>;
  /** 阶段小结带那一行，用 `rowClass` 给底色 */
  _band?: boolean;
  /**
   * 公式原文（`{ J: '=I2-H2' }`），由 `vtFormula` 维护 —— 计算**结果**写回 `row[key]`，
   * 原文另存一份在这里。所以显示、复制、导出、条件格式全部零成本正确：它们读的还是值。
   *
   * 存在行上而不是只存在插件里，是为了让公式跟着数据走（复制、导出、`JSON.stringify`
   * 存草稿都带得上）。字段名是插件的默认值，可用 `formulaField` 改。
   */
  _formulas?: Record<string, string>;
}

/**
 * 单元格编辑的**撤销录制挂钩**。
 *
 * 为什么要这么一个模块级的中间人：列定义（`makeColumn`）必须在建表**之前**造好，
 * 而录制要用到表格实例（`table.recordChange`）—— 建表之后才有。于是 bootstrap 建完表
 * 把实现塞进来，卸载时清掉。画廊同时只挂一个案例，所以不存在两份互相打架。
 *
 * 撤销的**边界**也定在这里：`begin` 是编辑器打开的那一刻（=「变更前」），`commit` 是
 * 组件每次按键的写回。核心没有任何编辑事件（`renderEditor` 返回的控件由使用方自己写回
 * 行数据，核心根本不知道发生了什么），所以这条边界只能由使用方划 —— 这也正是 `vtUndo`
 * 把数据层做成「显式录制」而不是「自动捕获」的原因。
 */
let editRecorder: {
  /** 编辑器打开：记下这一格的「变更前」 */
  begin: (row: SpreadsheetRow, key: string) => void;
  /** 组件写回（每次按键都来）：更新「变更后」，并保证一次编辑只进历史一条 */
  commit: (row: SpreadsheetRow, key: string, value: unknown) => void;
} | null = null;

/** 库里也有一份同名函数，但没导出；表头行与小结带的富文本要用，只能自己留一个 */
function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ==========================================================================
 * 2. 表格坐标：A / B / … / Z / AA / …（电子表格特有，库里没有）
 * ========================================================================== */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function colIndexToKey(i: number): string {
  let name = '';
  let n = i;
  while (n >= 0) {
    name = CHARS[n % 26] + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

/* ==========================================================================
 * 3. 规模与列语义
 * ========================================================================== */

/** 总行数。改这一个数就能压不同量级 —— 生成开销与它线性相关 */
const ROW_COUNT = 100_000;
/** 周计划列数（52 周 = 一年） */
const WEEK_COUNT = 52;
/** 每 40 行一条「阶段小结」横向合并带 */
const BAND_EVERY = 40;
/** 同一模块纵向合并的行数 */
const MODULE_SPAN = 4;
/** 每行填多少个连续周的工时 */
const WEEK_SPAN = 14;
/** 第 0 行是表头行（语义名 + W1~W52），明细从第 1 行开始 */
const HEADER_ROW = 0;
const DATA_START = 1;
/** 逾期判定的基准日（写死，截图与文档里的数字才稳定） */
const TODAY = '2026-08-14';

type Role =
  | 'text' | 'num' | 'delta' | 'progress' | 'status' | 'priority' | 'owner' | 'check' | 'due' | 'week';

const SEMANTIC_COLS: {
  title: string;
  width: number;
  role: Role;
  align?: 'left' | 'center' | 'right';
}[] = [
  { title: '工单号', width: 130, role: 'text' },
  { title: '模块', width: 150, role: 'text' },
  { title: '子任务', width: 230, role: 'text' },
  { title: '负责人', width: 130, role: 'owner' },
  { title: '状态', width: 110, role: 'status' },
  { title: '优先级', width: 96, role: 'priority' },
  { title: '进度', width: 110, role: 'progress', align: 'right' },
  { title: '预计工时', width: 100, role: 'num', align: 'right' },
  { title: '实际工时', width: 100, role: 'num', align: 'right' },
  { title: '偏差', width: 90, role: 'delta', align: 'right' },
  { title: '验收', width: 76, role: 'check', align: 'center' },
  { title: '截止日期', width: 120, role: 'due' },
  { title: '备注', width: 200, role: 'text' },
];

const COL_COUNT = SEMANTIC_COLS.length + WEEK_COUNT;

/** 列 key → 语义角色；建一次，渲染时只查 */
const ROLES = new Map<string, Role>(
  Array.from({ length: COL_COUNT }, (_, i) => [
    colIndexToKey(i),
    (SEMANTIC_COLS[i]?.role ?? 'week') as Role,
  ]),
);

const MODULES = [
  '账号中台', '交易链路', '风控引擎', '结算中心', '数据平台',
  '内容审核', '推荐系统', '客服工单', '开放平台', '基础架构',
];
const TASKS = [
  '接口联调', '灰度放量', '压测与回归', '埋点校验', '缓存改造',
  '限流降级', '索引重建', '批量迁移', '监控补齐', '文档同步',
  '权限收敛', '异常兜底',
];
const OWNERS = ['李炎杰', '余兴达', '马小波', '罗小龙', '曾伟杰', '马国涛', '万明悦', '贾小铭'];
const STATUS = ['待开始', '进行中', '待验收', '已完成', '已阻塞'];
const PRIORITY = ['P0', 'P1', 'P2', 'P3'];
const NOTES = ['依赖上游接口', '需产品二次确认', '与安全评审并行', '灰度需报备', '复用去年方案'];

/**
 * 状态 / 优先级 / 负责人的候选集 —— 直接喂给内置组件（`VtSelect` / `VtPerson`）。
 *
 * 配色写 `var(--vt-*)` 而不是字面色值：胶囊把它塞进 `--vt-cell-option-color`，
 * 底色由 CSS 那边 `color-mix` 派生，换主题自动跟随。
 */
const STATUS_OPTIONS: VtSelectOption[] = [
  { value: '待开始', label: '待开始', color: 'var(--vt-text-secondary)' },
  { value: '进行中', label: '进行中', color: 'var(--vt-color-primary)' },
  { value: '待验收', label: '待验收', color: 'var(--vt-color-warning)' },
  { value: '已完成', label: '已完成', color: 'var(--vt-color-success)' },
  { value: '已阻塞', label: '已阻塞', color: 'var(--vt-color-danger)' },
];
const PRIORITY_OPTIONS: VtSelectOption[] = [
  { value: 'P0', label: 'P0', color: 'var(--vt-color-danger)' },
  { value: 'P1', label: 'P1', color: 'var(--vt-color-warning)' },
  { value: 'P2', label: 'P2', color: 'var(--vt-color-primary)' },
  { value: 'P3', label: 'P3', color: 'var(--vt-text-secondary)' },
];
const OWNER_OPTIONS: VtPersonOption[] = OWNERS.map((name) => ({ value: name, label: name }));

/**
 * 纯值 → 内置渲染器认识的单元格数据。
 *
 * 只给**没有对应单元格组件**的列用（文本 / 数字 / 周计划），语义列一律走真正的组件
 * （见 `makeColumn`）。只在渲染时构造，所以 650 万格里一格都不用真的存。
 */
function deriveCell(role: Role, value: unknown): SpreadsheetCellData {
  switch (role) {
    case 'num':
    case 'delta':
    case 'week':
      return { type: 'number', value: value as number };
    default:
      return { type: 'text', value: value as string };
  }
}

/**
 * 条件格式：热力图 / 偏差红绿 / 逾期红字。
 *
 * 这一层库里没有也不该有（那是条件格式引擎）。都走 `color-mix` + `--vt-*` 令牌，
 * 所以暗色主题下自动跟随。
 */
function deriveStyle(role: Role, value: unknown): string {
  switch (role) {
    // 进度列不在这里画数据条 —— 那是内置 `VtProgress` 的活，见 `makeColumn`
    case 'week': {
      const h = Number(value) || 0;
      if (h <= 0) return '';
      // 热力图：工时越多底色越重（8h 以上算满）。上限压在 45% —— 再深，格子里的数字就读不清了
      const pct = Math.min(45, Math.round((h / 8) * 45));
      return `background-color:color-mix(in srgb, var(--vt-color-primary) ${pct}%, transparent)`;
    }
    case 'delta': {
      const d = Number(value) || 0;
      if (d > 0) return 'color:var(--vt-color-danger)';
      if (d < 0) return 'color:var(--vt-color-success)';
      return 'color:var(--vt-text-secondary)';
    }
    case 'due':
      return String(value ?? '') && String(value) < TODAY ? 'color:var(--vt-color-danger)' : '';
    default:
      return '';
  }
}

/* ==========================================================================
 * 4. 造表
 * ========================================================================== */

interface Sheet {
  columns: VirtTableColumn<SpreadsheetRow>[];
  list: SpreadsheetRow[];
  merges: MergeCell[];
  cellStyle: (col: VirtTableColumn<SpreadsheetRow>, row: SpreadsheetRow) => string;
  /** 真正存了逐格数据的单元格数量（用来说明「稀疏」有多稀疏） */
  storedCells: number;
  /** 写了公式的格数（「偏差」那一列，每条明细一格） */
  formulaCells: number;
}

/**
 * 参与公式的列，**顺序即列字母**。
 *
 * 这里给的是**全部 65 列**，不是「只有数字列」—— 因为这个案例的列 key 本来就是 A…BM，
 * 全给一份之后「列字母 = 列标题 = 列 key」三者对齐，公式里写 `I2` 指的就是表头上那个 I。
 * 只挑数字列的话字母会按数组下标重排（`H` 变成 `A`），公式栏里的 `I2` 就没人看得懂了。
 *
 * 序号列（`__index`，`type: 'index'`）不在里面：功能列不承载数据，不该占用列字母。
 */
const FORMULA_COLS: string[] = Array.from({ length: COL_COUNT }, (_, i) => colIndexToKey(i));

/** 公式里用到的三列：H 预计工时、I 实际工时、J 偏差（= I - H） */
const KEY_PLANNED = colIndexToKey(7);
const KEY_ACTUAL = colIndexToKey(8);
const KEY_DELTA = colIndexToKey(9);

/** 行对象 + 列 key → A1 引用。`row.id` 就是数据下标（造数时是 `{ id: r }`），行号从 1 起 */
const refOf = (row: SpreadsheetRow, key: string): string => `${key}${row.id + 1}`;

/**
 * 一列 = 一个**内置单元格组件** + 一层「逐格数据优先」的包装。
 *
 * 语义列各用自己的组件（下拉 / 勾选框 / 日历 / 数字 / 人员 / 进度条），剩下的（工单号、
 * 子任务、备注、以及 `addColumns` 追出来的列）用 `VtInput`。demo 里没有一行自己拼的
 * 控件或标签 HTML —— 外观、编辑器、锁高契约全部来自组件。
 *
 * 两处组合值得单独说：
 * - **进度列 = `VtNumberInput` 的编辑器 + `VtProgress` 的渲染**。两个都是内置组件，
 *   取各自最合适的那一半：既能像数字一样改，又显示成进度条（原来是自己在 `cellStyle`
 *   里拿 `linear-gradient` 画数据条）。
 * - **`withStoredCell`**：表头行与小结带存了逐格数据（富文本 + 底色），它们必须优先，
 *   否则 `VtSelect` 会把表头那格的「状态」两个字也画成一枚胶囊。
 */
function makeColumn(colIdx: number): VirtTableColumn<SpreadsheetRow> {
  const key = colIndexToKey(colIdx);
  const semantic = SEMANTIC_COLS[colIdx];
  const role = (semantic?.role ?? 'week') as Role;

  /** 组件的公共参数：列标当表头（语义名在第 0 行那条表头里），宽度/对齐按语义 */
  const base = {
    key,
    title: key,
    width: semantic?.width ?? 62,
    align: semantic?.align ?? (role === 'week' ? 'center' : 'left'),
    resizable: true,
    minWidth: 48,
    /**
     * 编辑写回后把这一格的逐格数据丢掉，让它重新走「纯值 + 组件渲染」那条路。
     *
     * 刻意不在这里 `forceUpdate()`：组件每次按键都 `commitValue`，而编辑期间格子被浮层
     * 盖着，逐键重绘整帧是纯浪费；浮层关闭时 `vtCellEditor` 自己会刷。
     */
    onChange: (value: unknown, row: SpreadsheetRow) => {
      if (row._sheetCells) delete row._sheetCells[key];
      // 撤销录制 + 让依赖这一格的公式增量重算（都在 bootstrap 里，见 `editRecorder`）
      editRecorder?.commit(row, key, value);
    },
  };

  const col: VirtTableColumn<SpreadsheetRow> = (() => {
    switch (role) {
      case 'status':
        return VtSelect<SpreadsheetRow>({ ...base, options: STATUS_OPTIONS, display: 'tag' });
      case 'priority':
        return VtSelect<SpreadsheetRow>({ ...base, options: PRIORITY_OPTIONS, display: 'tag' });
      case 'owner':
        return VtPerson<SpreadsheetRow>({ ...base, options: OWNER_OPTIONS, clearable: true });
      case 'check':
        // 「直接可点」的组件：点一下就切，不走编辑浮层（布尔值没有可撤销的中间态）
        return VtCheckbox<SpreadsheetRow>({ ...base });
      case 'due':
        return VtDatePicker<SpreadsheetRow>({ ...base });
      case 'progress':
        return {
          ...VtNumberInput<SpreadsheetRow>({ ...base, min: 0, max: 100 }),
          render: VtProgress<SpreadsheetRow>({ ...base }).render,
        };
      case 'num':
      case 'delta':
      case 'week':
        return VtNumberInput<SpreadsheetRow>({ ...base });
      default:
        return VtInput<SpreadsheetRow>({ ...base });
    }
  })();

  /*
   * 编辑器打开的那一刻记下「变更前」—— 撤销要的就是这个值。
   * 只包**有编辑器**的列；`VtCheckbox` 那种「点一下就切」的没有编辑器，
   * 它的变更前在 `commit` 里按布尔取反补出来（见 bootstrap 里的 `editRecorder`）。
   */
  const innerEditor = col.renderEditor;
  if (innerEditor) {
    col.renderEditor = (ctx) => {
      editRecorder?.begin(ctx.row, key);
      return innerEditor(ctx);
    };
  }

  /** 逐格数据优先；没有逐格数据也没有值的格子直接留空（别让组件画出一个 0% 的条） */
  const inner = col.render;
  col.render = (ctx) => {
    const stored = ctx.row._sheetCells?.[ctx.column.key];
    if (stored) return renderSpreadsheetCellHtml(stored);
    const value = ctx.row[ctx.column.key];
    if (value === undefined || value === '' || value === null) return '';
    if (inner) return inner(ctx);
    return renderSpreadsheetCellHtml(deriveCell(role, value));
  };

  return col;
}

function buildSheet(): Sheet {
  let storedCells = 0;
  const setCell = (row: SpreadsheetRow, key: string, cell: SpreadsheetCellData): void => {
    setSpreadsheetCellData(row, key, cell);
    storedCells += 1;
  };

  const columns: VirtTableColumn<SpreadsheetRow>[] = [
    { key: '__index', title: '', width: 56, type: 'index', fixed: 'left', align: 'center' },
    ...Array.from({ length: COL_COUNT }, (_, i) => makeColumn(i)),
  ];
  // 行对象刻意稀疏：不预填 65 个空键
  const list: SpreadsheetRow[] = Array.from({ length: ROW_COUNT }, (_, r) => ({ id: r }));
  const merges: MergeCell[] = [];

  // ---- 4.1 表头行（第 0 行）：语义名 + W1~W52 ----
  // 底色写表格自己的令牌而不是字面色值：`bgColor` 最终进内联 `background-color`，
  // 写死 `#eef2ff` 在暗色主题下就是一条刺眼的亮带。用 `--vt-header-group-bg`
  // （表头分组底色）：同色系、比真表头深一档，暗色自动跟随。
  const headerRow = list[HEADER_ROW]!;
  const headerTitle = (text: string): SpreadsheetCellData => ({
    type: 'rich-text',
    value: text,
    richTextHtml: `<span style="font-weight:700">${escapeHtml(text)}</span>`,
    bgColor: 'var(--vt-header-group-bg)',
    align: 'center',
  });
  SEMANTIC_COLS.forEach((c, i) => setCell(headerRow, colIndexToKey(i), headerTitle(c.title)));
  for (let w = 0; w < WEEK_COUNT; w++) {
    setCell(headerRow, colIndexToKey(SEMANTIC_COLS.length + w), headerTitle(`W${w + 1}`));
  }

  // ---- 4.2 10 万行明细 ----
  const weekKey = (w: number) => colIndexToKey(SEMANTIC_COLS.length + w);
  const K = SEMANTIC_COLS.map((_, i) => colIndexToKey(i));
  let seq = 0;
  let bandHours = 0;
  let formulaCells = 0;

  for (let r = DATA_START; r < ROW_COUNT; r++) {
    const pos = (r - DATA_START) % BAND_EVERY;
    const row = list[r]!;

    // 小结带放在每段的**最后一行**：它总结的是上面那 39 行，放段首就变成「总结还没发生的事」
    if (pos === BAND_EVERY - 1) {
      row._band = true;
      const seg = Math.floor((r - DATA_START) / BAND_EVERY) + 1;
      const text = `阶段小结 · 第 ${seg} 期`;
      setCell(row, K[0], {
        type: 'rich-text',
        value: `${text} · 本期累计 ${bandHours} 人时`,
        richTextHtml:
          `<span style="font-weight:700">${escapeHtml(text)}</span>` +
          `<span style="opacity:.6;margin-left:10px">本期累计 ${bandHours} 人时</span>`,
        // 必须和 style.css 里 `.sheet-band > .vt-td` 用同一个令牌 —— 这格的底色来自
        // 内联 `bgColor`、右边 52 个周列来自那条 CSS 规则，色值不一致小结行就断成两截
        bgColor: 'var(--vt-group-bg)',
      });
      bandHours = 0;
      continue;
    }

    const i = seq++;
    const segIndex = Math.floor((r - DATA_START) / BAND_EVERY);
    const groupInSeg = Math.floor(pos / MODULE_SPAN);
    const planned = 8 + (i % 5) * 4;
    const actual = planned + ((i % 7) - 3);
    row[K[0]] = `WO-${100000 + i}`;
    // 模块按「段内第几组」取，而不是按行号 —— 每段 39 行不是 4 的整数倍，
    // 按行号取会让一个合并组跨到下一个模块名上
    row[K[1]] = MODULES[(segIndex * 3 + groupInSeg) % MODULES.length];
    row[K[2]] = `${TASKS[i % TASKS.length]} v${1 + (i % 9)}.${i % 5}`;
    row[K[3]] = OWNERS[(i * 3) % OWNERS.length];
    row[K[4]] = STATUS[i % STATUS.length];
    row[K[5]] = PRIORITY[Math.floor(i / 2) % PRIORITY.length];
    row[K[6]] = (i * 37) % 101;
    row[K[7]] = planned;
    row[K[8]] = actual;
    /*
     * 偏差**写公式**，不写值：`=I{n}-H{n}`（实际工时 - 预计工时，A1 的行号 = 数据下标 + 1）。
     *
     * 这一列本来就是「算出来的」，之前是造数时算一遍存下来 —— 改了实际工时它就过期。
     * 交给 `vtFormula` 之后：装载时算一遍写回 `row[J]`（所以红绿条件格式、复制、导出
     * 全部照旧），之后任何一次改动只**增量重算**依赖它的那几格。
     */
    row[K[9]] = `=${K[8]}${r + 1}-${K[7]}${r + 1}`;
    formulaCells += 1;
    row[K[10]] = i % 3 === 0;
    row[K[11]] = dueDate(i);
    if (i % 11 === 0) row[K[12]] = NOTES[Math.floor(i / 11) % NOTES.length];

    /*
     * 周计划：连续 14 周有工时，起点随行缓慢平移 —— 横向滚起来是一条斜的热力带。
     * 14 而不是 6：只填 6 周时任意一屏（约 20 列）里有大半行是空的，看着像没做完。
     */
    const start = (i * 3) % (WEEK_COUNT - WEEK_SPAN);
    for (let w = 0; w < WEEK_SPAN; w++) {
      const h = 2 + ((i + w) % 7);
      row[weekKey(start + w)] = h;
      bandHours += h;
    }

    // 同模块纵向合并（模块列是第 2 列 —— 合并坐标系不含固定列，所以 colIndex = 1）。
    // 段内位置 0/4/8/… 起一组，最后一组被小结带截短成 3 行
    if (pos % MODULE_SPAN === 0) {
      const span = Math.min(MODULE_SPAN, BAND_EVERY - 1 - pos);
      if (span > 1) merges.push({ rowIndex: r, colIndex: 1, rowspan: span, colspan: 1 });
    }
  }

  // 阶段小结带的横向合并（语义列全跨），位置与上面的 `pos === BAND_EVERY - 1` 对齐
  for (let r = DATA_START + BAND_EVERY - 1; r < ROW_COUNT; r += BAND_EVERY) {
    merges.push({ rowIndex: r, colIndex: 0, rowspan: 1, colspan: SEMANTIC_COLS.length });
  }

  const cellStyle = (col: VirtTableColumn<SpreadsheetRow>, row: SpreadsheetRow): string => {
    const stored = row._sheetCells?.[col.key];
    if (stored) {
      // 逐格样式：表头行与小结带
      const parts: string[] = [];
      if (stored.bgColor) parts.push(`background-color:${stored.bgColor}`);
      if (stored.align) parts.push(`text-align:${stored.align}`);
      if (stored.vAlign) parts.push(`vertical-align:${stored.vAlign}`);
      return parts.join(';');
    }
    const value = row[col.key];
    if (value === undefined || value === null || value === '') return '';
    return deriveStyle(ROLES.get(col.key) ?? 'text', value);
  };

  return { columns, list, merges, cellStyle, storedCells, formulaCells };
}

/**
 * 截止日期：在基准日前后 210 天里**打散**，于是「逾期红字」与正常日期混在一起。
 *
 * 步长取 37（与 210 互质）而不是 7 —— 用 7 的话相邻行的日期是连续递增的，前十几行
 * 会整齐地全部逾期，看着像排过序的假数据。
 */
function dueDate(i: number): string {
  const base = Date.UTC(2026, 4, 1); // 2026-05-01
  const d = new Date(base + ((i * 37) % 210) * 86400000);
  return d.toISOString().slice(0, 10);
}

/* ==========================================================================
 * 5. 浮动图片（现场平面图批注）—— **付费插件**
 *
 * 电子表格里那种「贴在纸上、可以随手挪」的图：`vtFloatingImage` 把它摆在**全表内容
 * 坐标系**里（x 从内容左缘算，y 从第一行上缘算），横滚纵滚都跟着内容走，改列宽、排序、
 * 筛选都不会把它挪走 —— 它锚在像素坐标上，不锚在某一格。
 *
 * 它**不在本仓库**：核心（MIT）在这里，付费插件在私有仓库 `virt-table-pro`
 * （`@virt-table-pro/floating-image`）。这个案例通过**授权**的方式把它跑起来 ——
 * 密钥在 `docs/apps/pro-kit/demo-license.ts`（**两个案例共用一份**：许可是模块级单例，各案例各设
 * 一把会在切换时互相覆盖）。它是域名绑定的，换域名只会出现未授权角标 + 一行 warn，
 * **功能一点都不降级**（pro 仓库第六条）。
 *
 * 演示区域里**不写**付费说明 —— 那一块在案例文档页上（`docs/demos/spreadsheet.md` 的
 * 「本案例中涉及企业版功能」），紧跟在这个 demo 下面。
 * ========================================================================== */


/** 图用 data URI 生成，免得 demo 依赖外网（真实项目直接给 URL） */
const FLOATING_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#1d4ed8"/><stop offset="1" stop-color="#0f172a"/>' +
    '</linearGradient>' +
    '<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">' +
    '<path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.22"/></pattern></defs>' +
    '<rect width="520" height="300" rx="10" fill="url(#g)"/>' +
    '<rect width="520" height="300" rx="10" fill="url(#grid)"/>' +
    '<rect x="60" y="70" width="180" height="120" fill="none" stroke="#ffffff" ' +
    'stroke-width="3" stroke-dasharray="10 6"/>' +
    '<circle cx="360" cy="130" r="46" fill="none" stroke="#fbbf24" stroke-width="4"/>' +
    '<text x="34" y="46" font-size="26" font-family="sans-serif" fill="#ffffff">' +
    '现场平面图 · 拖我移动</text>' +
    '<text x="34" y="268" font-size="18" font-family="sans-serif" fill="#ffffff" ' +
    'opacity="0.8">A 区改造范围（虚线） · 配电房（黄圈）</text></svg>',
)}`;

/** 起始位置与尺寸：落在第一屏里，且不压住左边的语义列 */
const FLOATING_START = { x: 560, y: 120, width: 300 };
const FLOATING_ID = 'site-plan';

/* ==========================================================================
 * 6. 统计探针（内联插件）—— 这个案例的「性能证据」就靠它
 * ========================================================================== */

interface StatsSample {
  /** 常驻的行 DOM 数 */
  trs: number;
  /** 常驻的单元格 DOM 数 */
  tds: number;
  /** 滚动中的帧率；停下来是 null */
  fps: number | null;
  /** 本轮滚动里最长的一帧间隔（ms） */
  worstMs: number;
}

/**
 * 只做一件事：把「DOM 里到底有多少行/多少格」和「滚动时的帧率」报出来。
 *
 * 写成插件而不是在 demo 里 setInterval：`onRendered` 是整帧渲染完成的准确时机
 * （`_patch` 末尾），此刻数 DOM 才不会数到半帧。帧率用 rAF 间隔算，只在滚动期间跑，
 * 停止滚动 400ms 后自动歇 —— 空转的 rAF 本身就会污染它要测的东西。
 */
function vtSheetStats(report: (s: StatsSample) => void): VirtTablePlugin<SpreadsheetRow> {
  return {
    name: 'demoSheetStats',
    setup(ctx: PluginContext<SpreadsheetRow>) {
      let raf = 0;
      let stopAt = 0;
      let markTime = 0;
      let markFrames = 0;
      let last = 0;
      let worst = 0;

      const count = (): { trs: number; tds: number } => {
        const rows = ctx.tbodyEl.children;
        let tds = 0;
        for (let i = 0; i < rows.length; i++) tds += rows[i]!.children.length;
        return { trs: rows.length, tds };
      };

      const tick = (now: number): void => {
        if (last) {
          const dt = now - last;
          if (dt > worst) worst = dt;
          markFrames += 1;
          // 每 10 帧报一次：逐帧报会让数字抖得没法读
          if (markFrames >= 10) {
            report({ ...count(), fps: Math.round((markFrames * 1000) / (now - markTime)), worstMs: Math.round(worst) });
            markTime = now;
            markFrames = 0;
          }
        }
        last = now;
        if (now < stopAt) {
          raf = requestAnimationFrame(tick);
        } else {
          raf = 0;
          last = 0;
          report({ ...count(), fps: null, worstMs: Math.round(worst) });
        }
      };

      /**
       * 钩子走 `ctx.on(...)` 注册 —— `PluginHandle` 上没有 `hooks` 字段，
       * 返回一个 `{ hooks }` 对象会被静默忽略（我第一版就是这么写的，统计条一直空白）。
       */
      ctx.on('onMounted', () => report({ ...count(), fps: null, worstMs: 0 }));
      ctx.on('onRendered', () => {
        // 不在滚动中时也要跟上：跳转 / 编辑 / 合并都会换掉行 DOM
        if (!raf) report({ ...count(), fps: null, worstMs: Math.round(worst) });
      });
      ctx.on('onScroll', () => {
        stopAt = performance.now() + 400;
        if (raf) return;
        worst = 0;
        markTime = performance.now();
        markFrames = 0;
        raf = requestAnimationFrame(tick);
      });

      return {
        destroy: () => {
          if (raf) cancelAnimationFrame(raf);
        },
      };
    },
  };
}

/* ==========================================================================
 * 7. demo
 * ========================================================================== */

export function bootstrapDemoSpreadsheet(root: HTMLElement): () => void {
  // 授权：整个应用设一次即可（付费插件在 setup 里各自校验，见上面那段说明）
  applyProDemoLicense(setLicenseKey);

  const tBuild = performance.now();
  const sheet = buildSheet();
  const buildMs = Math.round(performance.now() - tBuild);
  let mountMs = 0;
  let currentColCount = COL_COUNT;
  let tableRef: VirtTable<SpreadsheetRow> | null = null;
  let setStatusFn: ((text: string) => void) | null = null;
  /**
   * 「导出选区为真 xlsx」的前向引用。
   *
   * 与 `setStatusFn` 同一个模式、同一个原因：右键菜单的 provider 必须在
   * `new VirtTable(...)` **之前**造好（它是 options 的一部分），而这个动作要用到表格实例。
   * 建表之后把实现塞进来。
   */
  let exportXlsxSelectionFn: (() => void) | null = null;

  /**
   * 剪贴板：合并区的读写直接落在表格上（`getMerges`/`setMerges`），
   * demo 不再自己存一份 —— 少一份状态就少一处能不同步的地方。
   */
  const baseClipboardHooks = createSpreadsheetClipboardHandlers<SpreadsheetRow>({
    columns: sheet.columns,
    getMerges: () => tableRef?.getMerges() ?? [],
    setMerges: (next) => tableRef?.setMerges(next),
    createRow: (idx) => ({ id: idx }),
    mergeColumnOffset: 1,
    addColumns: (count) => {
      const added: VirtTableColumn<SpreadsheetRow>[] = [];
      for (let i = 0; i < count; i++) {
        const col = makeColumn(currentColCount + i);
        added.push(col);
        sheet.columns.push(col);
      }
      currentColCount += count;
      tableRef?.setColumns(sheet.columns);
      return added;
    },
  });

  /** 一行的浅拷贝，但把两张 map 也拷一层 —— 粘贴是就地改它们，共享引用的话快照会跟着变 */
  const cloneRow = (row: SpreadsheetRow): SpreadsheetRow => ({
    ...row,
    ...(row._sheetCells ? { _sheetCells: { ...row._sheetCells } } : null),
    ...(row._formulas ? { _formulas: { ...row._formulas } } : null),
  });

  /** 还原：**就地**改回去（`list` 里存的是行对象的引用，换对象表格就看不见了） */
  const restoreRow = (row: SpreadsheetRow, snap: SpreadsheetRow): void => {
    for (const k of Object.keys(row)) if (!(k in snap)) delete row[k];
    Object.assign(row, snap);
  };

  /**
   * 粘贴：按**受影响的整行**拍快照，而不是逐格记。
   *
   * 粘贴一次会动一片矩形区域、可能顺手新增列、还会带进来合并区 —— 逐格记要把这三样
   * 分别对齐，整行快照一把全覆盖，代价只有「受影响行数 × 一行几十个键」。
   * 撤销的粒度由使用方定，这就是最省心的那一档。
   */
  const clipboardHooks = {
    ...baseClipboardHooks,
    onPaste: (ctx: Parameters<typeof baseClipboardHooks.onPaste>[0]) => {
      const table = tableRef;
      const payload = ctx.payload as { rowCount?: number } | null;
      const startRow = ctx.selection.startRow;
      const count = Math.max(1, payload?.rowCount ?? 1);
      const rowsOf = (): SpreadsheetRow[] =>
        Array.from({ length: count }, (_, i) => sheet.list[startRow + i]).filter(
          (r): r is SpreadsheetRow => !!r,
        );
      const targets = rowsOf();
      const before = targets.map(cloneRow);
      const mergesBefore = table?.getMerges() ?? [];

      const ok = baseClipboardHooks.onPaste(ctx);
      if (!ok || !table) return ok;

      const after = rowsOf().map(cloneRow);
      const mergesAfter = table.getMerges();
      const replay = (snaps: SpreadsheetRow[], merges: MergeCell[]) => () => {
        targets.forEach((row, i) => snaps[i] && restoreRow(row, snaps[i]!));
        table.setMerges(merges);
        // 粘进来的可能就是公式原文，也可能改掉了别人依赖的格 —— 全量重算最省事
        table.recalculate?.();
        table.forceUpdate();
      };
      table.recordChange?.({
        label: `粘贴 ${count} 行`,
        undo: replay(before, mergesBefore),
        redo: replay(after, mergesAfter),
      });
      return ok;
    },
  };

  root.innerHTML = `
  <div class="virt-table-controls">
    <button class="virt-table-btn" id="jumpMid">跳到第 5 万行</button>
    <button class="virt-table-btn" id="jumpEnd">跳到第 10 万行</button>
    <button class="virt-table-btn" id="jumpTop">回到顶部</button>
    <span class="demo-note">双击编辑（验收列点一下即切）· 方向键/Tab 移动 · 框选后 Ctrl/Cmd+C 复制 · 右键合并 · Ctrl/Cmd+F 搜索</span>
  </div>
  <!-- 浮动图片的配置：x/y 是全表内容坐标，与拖拽/缩放/旋转双向绑定（手势一动这些框就跟着变） -->
  <div class="virt-table-controls">
    <label>浮动图 x <input id="imgX" type="number" step="20" value="${FLOATING_START.x}" style="width:80px" /></label>
    <label>y <input id="imgY" type="number" step="20" value="${FLOATING_START.y}" style="width:80px" /></label>
    <label>宽 <input id="imgW" type="number" step="20" min="40" value="${FLOATING_START.width}" style="width:80px" /></label>
    <label>角度 <input id="imgR" type="number" step="15" value="0" style="width:80px" /></label>
    <label><input id="imgLock" type="checkbox" /> 锁定（指针事件穿透）</label>
    <button class="virt-table-btn" id="imgReset">回到起始位置</button>
    <span class="demo-note">拖动移动（拖到边缘自动滚动）· 悬停出把手：四角缩放 / 顶部旋转（Shift 等比、吸附 15°）· 点一下看大图（可下载）</span>
  </div>
  <!--
    公式栏 + 撤销/重做。公式栏是 Excel 里那条 fx：左边显示当前格的 A1 坐标，右边写公式。
    为什么需要它：65 列每一列都已经有自己的单元格组件（数字框、日历、胶囊下拉），
    公式插件不会去覆盖别人的编辑器，所以格子里双击进的是那些组件 —— 写公式的入口就该
    另开一个，正好也是电子表格用户最熟的那个位置。
  -->
  <div class="virt-table-controls">
    <span class="demo-note">fx <b id="fxRef">—</b></span>
    <input id="fxInput" type="text" placeholder="点一格，再写公式（如 =SUM(N2:BM2)），回车生效" style="width:300px" />
    <button class="virt-table-btn" id="fxApply">写入</button>
    <span class="demo-note">偏差列整列是公式 <code>=I{n}-H{n}</code>（左上角蓝三角）· 点公式格会框出它引用的格 · 撤销/重做在表格上方的工具栏里（Ctrl/Cmd+Z 也行）</span>
  </div>
  <div id="stats" class="status-text"></div>
  <div id="status" class="status-text"></div>
  <!-- 高度走 --demo-stage-h：桌面 760px，窄屏由 .demo-stage 收到一屏内（见 style.css） -->
  <div style="--demo-stage-h:760px;" class="demo-container demo-stage" id="virtTableContainer"></div>
`;

  const container = root.querySelector('#virtTableContainer') as HTMLElement;
  const statsEl = root.querySelector('#stats') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;
  // 浮动图片的三个坐标框 —— 建表**之前**取好：插件的 onChange 闭包要用它们回显
  const xInput = root.querySelector('#imgX') as HTMLInputElement;
  const yInput = root.querySelector('#imgY') as HTMLInputElement;
  const wInput = root.querySelector('#imgW') as HTMLInputElement;
  const rInput = root.querySelector('#imgR') as HTMLInputElement;
  const lockInput = root.querySelector('#imgLock') as HTMLInputElement;
  // 公式栏 —— 同样在建表之前取好：插件的回调闭包要用
  const fxRefEl = root.querySelector('#fxRef') as HTMLElement;
  const fxInput = root.querySelector('#fxInput') as HTMLInputElement;

  /** 建表期间那一轮全量重算不该抢状态栏（见 `vtFormula` 的 `onRecalculated`） */
  let mounted = false;
  /** 统计条里报的公式条数。桩模式下会被清零 —— 那时格里躺的是纯值，没有一条公式在跑 */
  let formulaCount = sheet.formulaCells;

  const setStatus = (text: string) => {
    statusEl.textContent = text;
  };
  setStatusFn = setStatus;

  const n = (v: number) => v.toLocaleString('en-US');
  const timing = () => `造数 ${buildMs}ms + 建表 ${mountMs}ms`;
  const renderStats = (s: StatsSample) => {
    statsEl.textContent =
      `${n(ROW_COUNT)} 行 × ${COL_COUNT} 列 = ${n(ROW_COUNT * COL_COUNT)} 格 · ` +
      `合并区 ${n(sheet.merges.length)} · 逐格数据只存了 ${n(sheet.storedCells)} 格 · ` +
      (formulaCount ? `公式 ${n(formulaCount)} 条 · ` : '') +
      `${timing()} · DOM 里常驻 ${s.trs} 行 / ${n(s.tds)} 格` +
      (s.fps !== null
        ? ` · 滚动中 ${s.fps} fps（最长一帧 ${s.worstMs}ms）`
        : s.worstMs
          ? ` · 上轮滚动最长一帧 ${s.worstMs}ms`
          : '');
  };

  /* ==========================================================================
   * 公式（付费插件 vtFormula）
   * ========================================================================== */

  /** 当前格的 A1 坐标，由插件的 `onActiveCellChange` 喂过来 */
  let activeRef: string | null = null;

  /**
   * 写一格的**输入**。
   *
   * 走公式插件的 `setCellFormula`：它认得 `=` 开头（存成公式）与其余（当字面值，
   * 并把这一格原来的公式删掉，与 Excel 里「把公式改成常数」一致），写完做**增量重算**
   * —— 只算依赖这一格的那几条，不是全表 9.7 万条。
   *
   * 布尔（验收列）与空值不走这条路：`String(true)` 会被当成字面量 `'true'` 存成字符串，
   * 勾选框就再也认不出它了。付费包缺席（桩）时也退回直接写行数据。
   */
  const writeCell = (row: SpreadsheetRow, key: string, value: unknown): void => {
    if (row._sheetCells) delete row._sheetCells[key];
    if (typeof value === 'boolean' || value === undefined || value === null || value === '') {
      row[key] = value;
      return;
    }
    if (!tableRef?.setCellFormula?.(refOf(row, key), String(value))) row[key] = value;
  };

  /** 撤销/重做里用的「写一格 + 立刻看得见」 */
  const applyCell = (row: SpreadsheetRow, key: string, value: unknown): void => {
    writeCell(row, key, value);
    tableRef?.forceUpdate();
  };

  /** `'J2'` → 那一行与列 key。插件里有一份 `parseA1` 但不导出，公式栏只需要这么点 */
  const splitRef = (ref: string): { row: SpreadsheetRow | undefined; key: string } => {
    const m = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!m) return { row: undefined, key: '' };
    return { row: sheet.list[Number(m[2]) - 1], key: m[1]! };
  };

  /** 公式栏跟着当前格走：公式格显示**原文**，普通格显示当前值（与 Excel 的编辑栏一致） */
  const syncFx = (ref: string | null): void => {
    activeRef = ref;
    fxRefEl.textContent = ref ?? '—';
    if (!ref) {
      fxInput.value = '';
      return;
    }
    const formula = tableRef?.getCellFormula?.(ref);
    if (formula) {
      fxInput.value = formula;
      return;
    }
    /*
     * 逐格数据那两处（表头行、阶段小结带）显示**纯文本**。
     * 不这么分流的话表头那格会把富文本 HTML 原样吐进输入框（`row[key]` 存的是显示文本，
     * 而显示文本对 rich-text 来说就是那串 `<span>`）—— 看着像是公式栏坏了。
     */
    const { row, key } = splitRef(ref);
    const stored = row?._sheetCells?.[key];
    fxInput.value = stored
      ? String(stored.value ?? '')
      : String(tableRef?.getCellValue?.(ref) ?? '');
  };

  /** 公式栏 → 表格。撤销录一条（撤销要还原的是**原文**，不是算出来的结果） */
  const applyFx = (): void => {
    const table = tableRef;
    if (!table) return;
    if (!activeRef) {
      setStatus('先点一格，公式栏左边会显示它的 A1 坐标，然后再写');
      return;
    }
    const ref = activeRef;
    const text = fxInput.value;
    const before = table.getCellFormula?.(ref) ?? String(table.getCellValue?.(ref) ?? '');
    if (table.setCellFormula?.(ref, text) === undefined) {
      setStatus('公式插件不在：付费包缺席，走的是 pro-kit 下的桩');
      return;
    }
    table.forceUpdate();
    const errors = table.getSheetErrors?.() ?? [];
    const dependents = table.getCellDependents?.(ref) ?? [];
    setStatus(
      `${ref} ← ${text || '（清空）'}` +
        (dependents.length ? ` · 有 ${dependents.length} 格引用了它，已跟着重算` : '') +
        ` · 全表公式错误 ${errors.length} 处`,
    );
    table.recordChange?.({
      label: `公式 ${ref}`,
      undo: () => {
        table.setCellFormula?.(ref, before);
        table.forceUpdate();
        if (activeRef === ref) syncFx(ref);
      },
      redo: () => {
        table.setCellFormula?.(ref, text);
        table.forceUpdate();
        if (activeRef === ref) syncFx(ref);
      },
    });
  };

  /** 右键菜单：合并/取消合并 + 两个走内置 API 的动作 */
  const contextMenuProvider = (
    ctx: ContextMenuContext<SpreadsheetRow>,
  ): ContextMenuItem[] | null => {
    const table = tableRef;
    const sel = ctx.selection;
    if (!table || !sel) return null;

    // 几何交给核心：它顺带处理固定列偏移与自动合并段，返回的坐标仍是选区坐标系
    const expanded: CellSelectionRange = table.expandSelectionForMerges(sel);
    const offset = table.leftFixedCount;
    const startCol = Math.max(expanded.startCol - offset, 0);
    const endCol = expanded.endCol - offset;
    if (endCol < 0) return null;

    const rowspan = expanded.endRow - expanded.startRow + 1;
    const colspan = endCol - startCol + 1;
    const merges = table.getMerges();
    const overlapping = merges.filter(
      (m) =>
        m.rowIndex <= expanded.endRow &&
        m.rowIndex + m.rowspan - 1 >= expanded.startRow &&
        m.colIndex <= endCol &&
        m.colIndex + m.colspan - 1 >= startCol,
    );

    const items: ContextMenuItem[] = [];

    if (rowspan > 1 || colspan > 1) {
      items.push({
        label: `合并单元格 (${rowspan} × ${colspan})`,
        action: () => {
          const kept = merges.filter((m) => !overlapping.includes(m));
          kept.push({ rowIndex: expanded.startRow, colIndex: startCol, rowspan, colspan });
          table.setMerges(kept);
          table.clearCellSelection();
          /*
           * 合并区整份进历史。`merges` 是 `getMerges()` 的返回值（核心给的是副本），
           * 所以直接留着当「变更前」就行 —— 不用再拷一遍，也不怕表格后面改它。
           */
          table.recordChange?.({
            label: `合并 ${rowspan}×${colspan}`,
            undo: () => table.setMerges(merges),
            redo: () => table.setMerges(kept),
          });
          setStatusFn?.(
            `已合并：行 ${expanded.startRow}~${expanded.endRow}，列 ${colIndexToKey(startCol)}~${colIndexToKey(endCol)}`,
          );
        },
      });
    }

    if (overlapping.length > 0) {
      items.push({
        label: `取消合并 (${overlapping.length} 个)`,
        action: () => {
          const removed = new Set(overlapping);
          const kept = merges.filter((m) => !removed.has(m));
          table.setMerges(kept);
          table.clearCellSelection();
          table.recordChange?.({
            label: `取消合并 ${overlapping.length} 个`,
            undo: () => table.setMerges(merges),
            redo: () => table.setMerges(kept),
          });
          setStatusFn?.(`已取消 ${overlapping.length} 个合并区域`);
        },
      });
    }

    items.push({
      label: '清空选区内容',
      action: () => {
        const cols = table.getVisibleColumns();
        /**
         * 逐格快照：值 + 逐格数据 + **公式原文**三样都要留。
         *
         * 公式那一样最容易漏：只删 `row[key]` 的话引擎下一轮又把结果算回来，
         * 看起来就是「清空对偏差列不起作用」。
         */
        const snap: {
          row: SpreadsheetRow;
          key: string;
          value: unknown;
          stored?: SpreadsheetCellData;
          formula?: string;
        }[] = [];
        for (let r = expanded.startRow; r <= expanded.endRow; r++) {
          const row = sheet.list[r];
          if (!row) continue;
          for (let c = expanded.startCol; c <= expanded.endCol; c++) {
            const key = cols[c]?.key;
            if (!key || key === '__index') continue;
            const stored = row._sheetCells?.[key];
            const formula = row._formulas?.[key];
            if (row[key] === undefined && !stored && !formula) continue;
            snap.push({ row, key, value: row[key], stored, formula });
          }
        }

        const clear = (): void => {
          for (const c of snap) {
            if (c.row._sheetCells) delete c.row._sheetCells[c.key];
            if (c.row._formulas) delete c.row._formulas[c.key];
            delete c.row[c.key];
          }
          table.recalculate?.();
          table.forceUpdate();
        };
        const restore = (): void => {
          for (const c of snap) {
            if (c.value === undefined) delete c.row[c.key];
            else c.row[c.key] = c.value;
            if (c.stored) (c.row._sheetCells ??= {})[c.key] = c.stored;
            if (c.formula) (c.row._formulas ??= {})[c.key] = c.formula;
          }
          table.recalculate?.();
          table.forceUpdate();
        };

        clear();
        table.recordChange?.({ label: `清空 ${snap.length} 格`, undo: restore, redo: clear });
        setStatusFn?.(`已清空 ${snap.length} 格（含公式原文；Ctrl/Cmd+Z 可撤销）`);
      },
    });

    items.push({
      label: '导出选区为 CSV',
      action: () => {
        // vtExport 的内置能力，scope 走选区
        table.exportCsv({ filename: '选区.csv', scope: 'selection' });
        setStatusFn?.('已导出选区（列头按当前列序）');
      },
    });

    /*
     * 同一块选区的另一条出路：**真 xlsx**（付费 `vtXlsx`）。
     * 与上面那条 CSV 的差别不在「格式更高级」，而在收到文件的人能拿它干什么 ——
     * 数字是数字（能再排序、能进公式）、列宽与对齐在、Excel 打开不弹格式警告。
     *
     * 付费包缺席（桩档）时这个方法运行时不存在，所以整条菜单项不放出来 ——
     * 放一条点了没反应的菜单比没有更糟。
     */
    if (table.exportXlsx) {
      items.push({
        label: '导出选区为真 xlsx',
        action: () => exportXlsxSelectionFn?.(),
      });
    }

    return items;
  };

  const table = new VirtTable<SpreadsheetRow>(container, {
    list: sheet.list,
    columns: sheet.columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    colBuffer: 2,
    merges: sheet.merges,
    border: true,
    cellStyle: sheet.cellStyle,
    rowClass: (row) => (row._band ? 'sheet-band' : ''),
    plugins: [
      vtCellSelection(),
      vtCellEditor({ trigger: 'dblclick' }),
      vtKeyboardNav(),
      vtContextMenu<SpreadsheetRow>(contextMenuProvider),
      vtClipboard<SpreadsheetRow>(clipboardHooks),
      vtSearch<SpreadsheetRow>(),
      /*
       * 核心的导出（CSV / 伪装 .xls / 打印）。
       *
       * `toolbar: false` 是必须的：本文件另注册了一颗「导出」面板（真 xlsx + PDF 排版 +
       * 全表 CSV），两颗都放出来的话工具栏上会**并排出现两个「导出」**——
       * 它们的 key 不同（`export` / `exportXlsx`）所以核心不会拒绝，只是看着莫名其妙。
       * 这一条正是 `vtXlsx` 文档里那条建议：同时装时把入口留给一颗。
       *
       * 插件本身仍然要装 —— 本文件那颗面板里的「全表 → CSV」用的就是它的 `exportCsv()`。
       */
      vtExport<SpreadsheetRow>({ toolbar: false }),
      /**
       * 工具栏。它**一颗按钮都不自带**（要哪颗装哪个插件），所以这里就是一条空货架 ——
       * 撤销/重做那两颗由本文件在建表之后 `registerToolbarItem()` 注册。
       *
       * 这个案例恰好只想要那两颗：字段配置 / 筛选 / 分组 / 排序 里有三个与它冲突 ——
       * A1 记法要求**行号绝对**，一排序/筛选，`=I2-H2` 指的就不是原来那两格了
       * （`vtFormula` 装载时检测到排序/筛选会 warn）。不装那几个插件就没有那几颗按钮，
       * 不必再去关掉什么。
       */
      vtToolbar<SpreadsheetRow>(),
      /**
       * 单元格公式。`columns` 显式给全 65 列（见 `FORMULA_COLS`）：列字母就钉死了，
       * 与表头上的 A…BM 一一对应。
       *
       * `editor: false` 是刻意的 —— 每一列都已经有自己的单元格组件（数字框、日历、
       * 胶囊下拉），插件本来也不会去覆盖别人的 `renderEditor`，写死 false 是把这件事
       * 说明白：**这个案例里写公式的入口是上面那条 fx 栏**，不是格子里的编辑器。
       */
      vtFormula<SpreadsheetRow>({
        columns: FORMULA_COLS,
        editor: false,
        onActiveCellChange: syncFx,
        onRecalculated: ({ changed, errors }) => {
          // 装载时那一轮（9.7 万格）不报：它不是用户的动作，报出来只会把首屏那句话冲掉
          if (!mounted) return;
          setStatus(
            `增量重算：写回 ${changed} 格` + (errors ? ` · ${errors} 处公式出错` : '') +
              ' —— 只算依赖被改那格的公式，不是全表 9.7 万条',
          );
        },
      }),
      /**
       * 撤销 / 重做。查询状态（列宽/列序/显隐）插件自动入栈；**数据**变更由这个文件在
       * 四处写回点各录一条：单元格编辑（`editRecorder`）、清空选区、合并/取消合并、粘贴。
       * 核心没有编辑事件，插件猜不出来 —— 所以这一半是使用方的活。
       */
      vtUndo<SpreadsheetRow>({
        limit: 100,
        /*
         * 只让工具栏重算一次，**不在这里往按钮上写状态**：两颗按钮的 `disabled` / `title`
         * 是**取值函数**，刷新时现读撤销栈（见下面 registerToolbarItem）。于是历史状态只有
         * 一份真源（插件里那个栈），不必在这儿维护一份平行的副本。
         *
         * `mounted` 守着 TDZ：`onChange` 在插件的 `onMounted` 里就会被调一次，而那时
         * `new VirtTable(...)` 还没返回、`table` 还在 TDZ 里。那一次不用刷 ——
         * 按钮是建表之后才注册的，注册时它们自己会读一遍当前状态。
         */
        onChange: () => {
          if (mounted) table.refreshToolbar();
        },
      }),
      /**
       * 浮动图片。四个交互全开：拖动移动（拖到边缘自动滚动）、四角把手缩放（Shift 等比）、
       * 顶部把手旋转（Shift 吸附 15°）、点一下打开查看器（工具栏带下载）。
       *
       * `onChange` 在手势过程中每次指针移动都报（`done: false`），所以顶部那几个框能实时
       * 回显；松手补一次 `done: true`，真实项目在那一刻落库就够了。
       */
      vtFloatingImage<SpreadsheetRow>({
        images: [
          {
            id: FLOATING_ID,
            src: FLOATING_SRC,
            ...FLOATING_START,
            alt: '现场平面图（可拖动）',
          },
        ],
        resizable: true,
        rotatable: true,
        viewer: true,
        downloadable: true,
        onChange: (img, { action, done }) => {
          xInput.value = String(Math.round(img.x));
          yInput.value = String(Math.round(img.y));
          wInput.value = String(Math.round(img.width));
          rInput.value = String(Math.round(img.rotate ?? 0));
          if (!done) return;
          const what =
            action === 'move' ? '移动' : action === 'resize' ? '缩放' : '旋转';
          setStatusFn?.(
            `浮动图${what}结束：x=${Math.round(img.x)} / y=${Math.round(img.y)} / ` +
              `宽 ${Math.round(img.width)}px / ${Math.round(img.rotate ?? 0)}° —— ` +
              'x/y 是全表内容坐标（x 从内容左缘算、含冻结列，y 从第一行上缘算），横滚纵滚都跟着内容走',
          );
        },
      }),
      /**
       * 真 xlsx 导出。`toolbar: false` —— 入口由本文件那颗「导出」面板给（见
       * `registerToolbarItem('exportXlsx')`），免得与核心 `vtExport` 那颗并排出现两个「导出」。
       *
       * `freeze` 冻住表头一行；`numberFormats` 只给三个工时列，其余列是文本或日期。
       */
      vtXlsx<SpreadsheetRow>({
        toolbar: false,
        sheetName: '工程排期',
        freeze: { rows: 1 },
        numberFormats: {
          [KEY_PLANNED]: '#,##0.0',
          [KEY_ACTUAL]: '#,##0.0',
          [KEY_DELTA]: '#,##0.0;[Red]-#,##0.0',
        },
      }),
      /**
       * 透视表。**装上但不开** —— `vtPivot()` 不配 `rows` 也不配 `values` 时完全让路
       * （行一条不动、列一列不换），所以它对这个案例的默认形态零影响。
       * 打开的入口是工具栏那颗「透视」按钮里的面板。
       */
      vtPivot<SpreadsheetRow>(),
      vtSheetStats(renderStats),
    ],
  });

  mountMs = Math.round(performance.now() - tBuild) - buildMs;
  tableRef = table;
  mounted = true;

  /*
   * 桩模式（同级目录没有付费包）下把偏差列填回纯值。
   *
   * 不这么做的话那一列会露出 65 列里唯一一列 `=I2-H2` 的原文 —— 公式插件不在，
   * 没人把它算成数。判据用「实例上有没有 recalculate」：付费包装上了才有这个方法。
   */
  if (!table.recalculate) {
    for (const row of sheet.list) {
      const raw = row[KEY_DELTA];
      if (typeof raw !== 'string' || !raw.startsWith('=')) continue;
      row[KEY_DELTA] = (Number(row[KEY_ACTUAL]) || 0) - (Number(row[KEY_PLANNED]) || 0);
    }
    formulaCount = 0;
    table.forceUpdate();
  }

  /* ==========================================================================
   * 撤销录制：单元格编辑
   *
   * 边界由这里定：`begin`（编辑器打开）记「变更前」，`commit`（组件每次按键的写回）
   * 更新「变更后」。一次编辑只进历史**一条** —— 逐键记的话按十下键要按十次撤销才回到
   * 原样，那不是用户心里的一步。
   * ========================================================================== */
  type EditSession = {
    row: SpreadsheetRow;
    key: string;
    /** 编辑器打开时的值 */
    before: unknown;
    /** 打开时这一格的公式原文（有的话撤销要还原它，而不是算出来的结果） */
    beforeFormula: string | null;
    /** 最后一次写回的值：同一次编辑里一直被覆盖，`redo` 读的就是它 */
    after: unknown;
    /** 已经进历史了？ */
    recorded: boolean;
  };
  let session: EditSession | null = null;

  editRecorder = {
    begin: (row, key) => {
      session = {
        row,
        key,
        before: row[key],
        beforeFormula: table.getCellFormula?.(refOf(row, key)) ?? null,
        after: row[key],
        recorded: false,
      };
    },
    commit: (row, key, value) => {
      // 没走过 `begin` 的只有 `VtCheckbox`（点一下就切，不开编辑器）——
      // 布尔的「变更前」就是取反，不用去猜
      if (!session || session.row !== row || session.key !== key) {
        session = {
          row,
          key,
          before: typeof value === 'boolean' ? !value : row[key],
          beforeFormula: null,
          after: value,
          recorded: false,
        };
      }
      const s = session;
      s.after = value;
      // 让依赖这一格的公式跟着走（增量）。刻意不 forceUpdate：编辑期间格子被浮层盖着，
      // 逐键重绘整帧是纯浪费，浮层关闭时 `vtCellEditor` 会刷一次，偏差列的新值那时露出来
      writeCell(row, key, value);
      if (s.recorded) return;
      s.recorded = true;
      const ref = refOf(row, key);
      const undoTo = s.beforeFormula ?? s.before;
      table.recordChange?.({
        label: `编辑 ${ref}`,
        undo: () => applyCell(row, key, undoTo),
        // 读 `s.after` 而不是当时这次的 value：重做要回到这次编辑**最后**那个值
        redo: () => applyCell(row, key, s.after),
      });
    },
  };

  const listeners: (() => void)[] = [];
  const on = (id: string, handler: () => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };
  /** 表单项走 change（不是 input）：拖着数字框上下调时不必每一步都改图 */
  const onChangeOf = (el: HTMLElement, handler: () => void) => {
    el.addEventListener('change', handler);
    listeners.push(() => el.removeEventListener('change', handler));
  };
  on('jumpMid', () => {
    table.scrollToIndex(50_000);
    setStatus('跳到第 5 万行 —— 位置是算出来的，不是滚过去的：中间那 5 万行从没进过 DOM');
  });
  on('jumpEnd', () => {
    table.scrollToIndex(ROW_COUNT - 1);
    setStatus('跳到第 10 万行');
  });
  on('jumpTop', () => {
    table.scrollToTop();
    setStatus('回到顶部：第 0 行是表头行（逐格富文本 + 底色，走 _sheetCells）');
  });

  /* ---- 公式栏与撤销按钮 ---- */
  on('fxApply', applyFx);
  const onFxKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') applyFx();
    // Esc 放弃这次输入，回到格子里现在的东西 —— 与编辑浮层里的 Esc 同一个意思
    if (e.key === 'Escape') syncFx(activeRef);
  };
  fxInput.addEventListener('keydown', onFxKey);
  listeners.push(() => fxInput.removeEventListener('keydown', onFxKey));
  /*
   * 撤销 / 重做进**工具栏**。
   *
   * `disabled` 与 `title` 都是取值函数：工具栏每次 `refreshToolbar()` 现读撤销栈，
   * 所以这里不保存任何历史状态的副本（`vtUndo` 的 `onChange` 只负责触发那次刷新）。
   * `title` 直接用栈顶标签 —— 「按下去会退回什么」在按之前就该看得见。
   *
   * 付费包缺席（桩档）时 `canUndo` / `getHistory` 这些方法**运行时不存在**，所以一律
   * `?.`：两颗按钮会一直是禁用态，点不动，而不是抛在读者脸上。
   */
  const undoItems: Array<() => void> = [
    table.registerToolbarItem({
      key: 'undo',
      label: '撤销',
      icon: iconHtml(UNDO_PATHS),
      order: 10,
      disabled: () => !table.canUndo?.(),
      title: () => {
        const h = table.getHistory?.();
        return h?.canUndo ? `撤销：${h.labels.undo[0]}` : '没有可撤销的操作';
      },
      onClick: () => {
        table.undo?.();
        syncFx(activeRef);
        setStatus('已撤销（焦点在表格里时 Ctrl/Cmd+Z 也行）');
      },
    }),
    table.registerToolbarItem({
      key: 'redo',
      label: '重做',
      icon: iconHtml(REDO_PATHS),
      order: 20,
      disabled: () => !table.canRedo?.(),
      title: () => {
        const h = table.getHistory?.();
        return h?.canRedo ? `重做：${h.labels.redo[0]}` : '没有可重做的操作';
      },
      onClick: () => {
        table.redo?.();
        syncFx(activeRef);
        setStatus('已重做（Shift+Ctrl/Cmd+Z 或 Ctrl+Y）');
      },
    }),
  ];
  listeners.push(...undoItems);

  /* ==========================================================================
   * 导出（付费插件 vtXlsx）—— 入口刻意**不给「导出全表 xlsx」**
   *
   * 65 列 × 10 万行 = 650 万格。真 xlsx 是 zip 里的 XML，每一格至少 30 字节 ——
   * 全表导出会先在内存里拼出几百 MB 的字符串再去压缩，那不是「慢」，是把标签页挂死。
   * 所以这个案例给的是两条**有界**的路，它们恰好覆盖真实需求：
   *
   *   · **导出选区** —— 「把这块给对方看」，大小由用户框出来的范围决定
   *   · **导出透视结果** —— 「把十万行的汇总给对方看」，透视后只有几十行
   *
   * 这也是这两个插件放在一起才成立的那个故事：先透视再导出。
   * CSV 那条留着（核心 `vtExport` 的能力）：它是流式拼文本，全表导也只是几十 MB 的纯文本。
   * ========================================================================== */

  /** 选区里有多少格（拿来做导出前的体量提示） */
  const selectionCellCount = (): number => {
    const sel = table.getCellSelection?.();
    if (!sel) return 0;
    return (sel.endRow - sel.startRow + 1) * (sel.endCol - sel.startCol + 1);
  };

  const exportXlsxSelection = (): void => {
    if (!table.exportXlsx) {
      setStatus('付费插件未装载，xlsx 导出不可用（CSV 仍然可以）');
      return;
    }
    const cells = selectionCellCount();
    if (cells === 0) {
      setStatus('先框选一块区域再导 xlsx —— 全表 650 万格不适合走 xlsx，见「导出」面板里的说明');
      return;
    }
    void table.exportXlsx({ selectionOnly: true, filename: '选区.xlsx' });
    setStatus(
      `已导出选区为**真 xlsx**（${cells.toLocaleString('zh-CN')} 格）—— ` +
        'zip + OOXML，不是 HTML 伪装的 .xls：数字是数字、列宽与对齐都在，Excel 打开不弹格式警告',
    );
  };

  // 右键菜单那条（provider 在建表之前造，见 `exportXlsxSelectionFn` 的注释）
  exportXlsxSelectionFn = exportXlsxSelection;

  const exportXlsxPivot = (): void => {
    if (!table.exportXlsx) {
      setStatus('付费插件未装载，xlsx 导出不可用（CSV 仍然可以）');
      return;
    }
    if (!isPivoting()) {
      setStatus('先在「透视」面板里开启透视，再导它的结果 —— 那时全表只有几十行');
      return;
    }
    const r = table.getPivotResult?.();
    void table.exportXlsx({
      filename: '透视汇总.xlsx',
      sheetName: '汇总',
      freeze: { rows: 1 },
      autoFilter: true,
      // 合计行写成活 SUBTOTAL：收到文件的人筛一下，合计自己跟着变
      liveSummary: true,
    });
    setStatus(
      `已导出透视结果为真 xlsx：${r?.rows.length ?? 0} 行 × 多级分组表头都还原了 —— ` +
        `${(r?.sourceCount ?? 0).toLocaleString('zh-CN')} 条明细的汇总，这才是适合走 xlsx 的体量`,
    );
  };

  listeners.push(
    table.registerToolbarItem({
      key: 'exportXlsx',
      label: '导出',
      order: 40,
      side: 'right',
      icon:
        '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 4v10M8.5 10.5 12 14l3.5-3.5M5 18h14"/></svg>',
      panel: (p) => {
        p.ui.title('导出');
        const cells = selectionCellCount();
        p.ui.hint(
          cells > 0
            ? `当前选区 ${cells.toLocaleString('zh-CN')} 格`
            : '全表 650 万格不适合走 xlsx —— 先框一块，或者先透视',
        );
        const rows: Array<[string, () => void]> = [
          ['选区 → 真 xlsx', exportXlsxSelection],
          ['透视结果 → 真 xlsx', exportXlsxPivot],
          [
            '打印 / PDF（分页 + 每页重复表头）',
            () => {
              if (!table.exportPdf) {
                setStatus('付费插件未装载，PDF 排版不可用');
                return;
              }
              void table.exportPdf({
                title: isPivoting() ? '工程排期 · 汇总' : '工程排期 · 明细',
                landscape: true,
                fitWidth: true,
                footNote: '由 virt-table 导出',
                // 明细太宽太长，只打选区；透视结果整张打
                selectionOnly: !isPivoting(),
              });
              setStatus(
                '已排版并唤起打印 —— 在对话框里选「另存为 PDF」。' +
                  '每页会重复表头（虚拟滚动的 DOM 里只有一屏行，浏览器原生打印结构上打不全）',
              );
            },
          ],
          [
            '全表 → CSV（流式文本，体量没问题）',
            () => {
              table.exportCsv({ filename: '工程排期.csv' });
              setStatus('已导出全表 CSV —— 纯文本流式拼接，650 万格也扛得住');
            },
          ],
        ];
        for (const [label, run] of rows) {
          p.el.appendChild(
            p.ui.button(label, 'plain', () => {
              p.close();
              run();
            }),
          );
        }
        p.resize();
      },
    }),
  );

  /* ==========================================================================
   * 透视（付费插件 vtPivot）—— 面板 UI 由**使用方**做
   *
   * 插件 v1 刻意只给声明式配置 + `setPivotConfig()`，不带面板。这一段就是「自己做那个
   * 面板」的完整样子：三个下拉 + 两颗按钮，用的是**核心的面板基元**（`p.ui.*`），
   * 所以外观与「撤销/重做」那两颗、与列头筛选下拉是同一套。
   *
   * ## 三件这个案例特有的事
   *
   * 1. **要 `filter` 掉非明细行。** 第 0 行是表头行、每 40 行一条「阶段小结」带 ——
   *    它们的「模块」格里放的是标题文字，直接聚合会多出「阶段小结」这种假维度取值。
   * 2. **合并区由插件自己收拾。** 这张表有 2.7 万个合并区，坐标按十万行明细算的；
   *    透视出 40 行汇总时那份坐标毫无意义。`vtPivot` 在开启时存一份并清空、关掉时还回去，
   *    这里一行都不用写（那正是为它在核心补 `setMerges` 白名单的原因）。
   * 3. **公式与透视互不相干。** 偏差列（`=I{n}-H{n}`）在透视模式下压根不存在 ——
   *    列被换掉了。切回明细时公式原文还在行上（存在 `row._formulas`），照旧生效。
   * ========================================================================== */

  /** 可当维度的列：都是取值有重复的语义列（逐行唯一的工单号/子任务不能当维度） */
  const DIM_FIELDS: Array<{ value: string; label: string }> = [
    { value: colIndexToKey(1), label: '模块' },
    { value: colIndexToKey(4), label: '状态' },
    { value: colIndexToKey(5), label: '优先级' },
    { value: colIndexToKey(3), label: '负责人' },
  ];

  /** 可当值的聚合。key 是「列字母:聚合」，`buildPivot()` 再拆开 */
  const VALUE_CHOICES: Array<{ value: string; label: string }> = [
    { value: `${KEY_ACTUAL}:sum`, label: '实际工时 求和' },
    { value: `${KEY_PLANNED}:sum`, label: '预计工时 求和' },
    { value: `${KEY_DELTA}:sum`, label: '偏差 求和' },
    { value: 'A:count', label: '工单数' },
    { value: `${KEY_ACTUAL}:avg`, label: '实际工时 均值' },
  ];

  /** 面板里三个下拉的当前选择（面板关掉再打开时要记得住） */
  let pivotRowField = DIM_FIELDS[0].value;
  let pivotColField = '';
  let pivotValueKey = VALUE_CHOICES[0].value;

  const labelOf = (list: Array<{ value: string; label: string }>, v: string): string =>
    list.find((o) => o.value === v)?.label ?? v;

  /** 三个下拉的当前选择 → 一份 `PivotOptions` */
  const buildPivot = (): PivotOptions<SpreadsheetRow> => {
    const [field, agg] = pivotValueKey.split(':') as [string, 'sum' | 'avg' | 'count'];
    return {
      rows: [pivotRowField],
      ...(pivotColField ? { columns: [pivotColField] } : {}),
      values: [
        { field, agg, title: labelOf(VALUE_CHOICES, pivotValueKey) },
        { field: 'A', agg: 'count', title: '工单数' },
      ],
      dimTitle: labelOf(DIM_FIELDS, pivotRowField),
      dimWidth: 220,
      valueWidth: 130,
      /*
       * 只统计**明细行**：第 0 行是表头行（`id === HEADER_ROW`），每 40 行一条小结带
       * （`_band`）。不筛掉的话会多出「阶段小结」这种假维度取值，而那正是
       * 「源数据级的条件只能放 filter」那条约定要解决的场景 ——
       * 列头筛选在透视模式下筛的是透视结果，筛不到明细。
       */
      filter: (row) => row.id !== HEADER_ROW && !row._band,
      // 工时带一位小数，工单数是整数 —— 两种一起显示时不做千分位反而更好读
      formatValue: (v) =>
        typeof v === 'number'
          ? v.toLocaleString('zh-CN', { maximumFractionDigits: 1 })
          : '',
    };
  };

  /** 现在是透视模式吗（`getPivotConfig()` 是唯一真源，demo 不留平行状态） */
  const isPivoting = (): boolean => Boolean(table.getPivotConfig?.());

  const applyPivot = (): void => {
    const t0 = performance.now();
    table.setPivotConfig?.(buildPivot());
    const ms = Math.round(performance.now() - t0);
    const r = table.getPivotResult?.();
    table.refreshToolbar();
    setStatus(
      `透视：${labelOf(DIM_FIELDS, pivotRowField)}` +
        (pivotColField ? ` × ${labelOf(DIM_FIELDS, pivotColField)}` : '') +
        ` → ${labelOf(VALUE_CHOICES, pivotValueKey)} · ` +
        `${(r?.sourceCount ?? 0).toLocaleString('zh-CN')} 条明细聚合成 ${r?.rows.length ?? 0} 行，` +
        `耗时 ${ms}ms —— 折叠展开与分组表头都是核心的，2.7 万个合并区已由插件自己收起`,
    );
  };

  const closePivot = (): void => {
    table.setPivotConfig?.(null);
    table.refreshToolbar();
    setStatus(
      '已退回明细视图：65 列、10 万行、2.7 万个合并区与整列公式都回来了 —— ' +
        '透视是可逆的，装了它不等于失去原来那张表',
    );
  };

  listeners.push(
    table.registerToolbarItem({
      key: 'pivot',
      label: '透视',
      order: 30,
      icon:
        '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M4 4h16v16H4zM4 9h16M9 9v11"/></svg>',
      // 徽标：开着透视时显示「开」，于是不必点开面板也知道当前在哪个视图
      badge: () => (isPivoting() ? '开' : ''),
      panel: (p) => {
        p.ui.title('透视');
        // 付费包缺席（桩档）时这些方法运行时不存在 —— 说清楚，而不是给一个点不动的面板
        if (!table.setPivotConfig) {
          p.ui.empty('付费插件未装载，透视不可用');
          p.resize();
          return;
        }
        p.ui.hint('把 10 万行明细聚合成一张交叉表。排序/筛选会作用在结果上');

        p.ui.row(
          '行维度',
          p.ui.select({
            options: DIM_FIELDS,
            value: pivotRowField,
            placeholder: '选一列',
            emptyText: '没有可用的列',
            onChange: (v) => {
              pivotRowField = v;
              if (isPivoting()) applyPivot();
            },
          }).el,
        );

        p.ui.row(
          '列维度',
          p.ui.select({
            options: [{ value: '', label: '（不交叉）' }, ...DIM_FIELDS],
            value: pivotColField,
            placeholder: '（不交叉）',
            emptyText: '没有可用的列',
            onChange: (v) => {
              pivotColField = v;
              if (isPivoting()) applyPivot();
            },
          }).el,
        );

        p.ui.row(
          '值',
          p.ui.select({
            options: VALUE_CHOICES,
            value: pivotValueKey,
            placeholder: '选一个',
            emptyText: '没有可用的聚合',
            onChange: (v) => {
              pivotValueKey = v;
              if (isPivoting()) applyPivot();
            },
          }).el,
        );

        const foot = p.ui.footer();
        if (isPivoting()) {
          foot.appendChild(
            p.ui.button('退回明细', 'plain', () => {
              closePivot();
              p.close();
            }),
          );
        }
        foot.appendChild(
          p.ui.button(isPivoting() ? '重新透视' : '开始透视', 'primary', () => {
            applyPivot();
            p.close();
          }),
        );
        p.resize();
      },
    }),
  );


  /*
   * 三个坐标框 → 图。反向（拖拽 → 框）在插件的 `onChange` 里，两条路都只改
   * **同一份状态**（插件里那张图的配置），demo 自己不留一份平行的 x/y。
   */
  const applyFloatingConf = () => {
    const x = Math.max(0, Number(xInput.value) || 0);
    const y = Math.max(0, Number(yInput.value) || 0);
    const width = Math.max(40, Number(wInput.value) || FLOATING_START.width);
    const rotate = Number(rInput.value) || 0;
    /*
     * `height: undefined` 是刻意的：拖过四角把手之后配置里会留下一个算出来的 height，
     * 而这个框只给了宽 —— 不清掉高度就会把图拉变形。清掉之后高度重新跟图片自身比例走。
     */
    /*
     * 可选调用：付费包缺席时（桩生效）这些方法根本不存在。
     * 返回 undefined 也没关系 —— 下面那行状态文字照样能说清当前配置。
     */
    table.updateFloatingImage?.(FLOATING_ID, {
      x, y, width, rotate, height: undefined, locked: lockInput.checked,
    });
    setStatus(
      `浮动图：x=${x} / y=${y} / 宽 ${width}px / ${rotate}°` +
        (lockInput.checked
          ? ' · 已锁定：一切交互关掉且指针事件穿透，底下的格子照常框选与编辑'
          : ' · 可交互：图片那块区域会吃掉点击（要点底下的格子先挪开或锁定）'),
    );
  };
  onChangeOf(xInput, applyFloatingConf);
  onChangeOf(yInput, applyFloatingConf);
  onChangeOf(wInput, applyFloatingConf);
  onChangeOf(rInput, applyFloatingConf);
  onChangeOf(lockInput, applyFloatingConf);
  on('imgReset', () => {
    xInput.value = String(FLOATING_START.x);
    yInput.value = String(FLOATING_START.y);
    wInput.value = String(FLOATING_START.width);
    rInput.value = '0';
    applyFloatingConf();
  });

  setStatus(
    '每一列都是内置单元格组件：负责人 VtPerson、状态/优先级 VtSelect（胶囊）、进度 VtProgress、' +
      '验收 VtCheckbox（点一下就切）、截止日期 VtDatePicker、工时与周计划 VtNumberInput；' +
      '热力图/偏差红绿/逾期红字是 cellStyle 按值派生，不占存储；' +
      '偏差列整列是公式（=I{n}-H{n}），改实际工时它跟着变，Ctrl/Cmd+Z 可撤销',
  );

  return () => {
    table.destroy();
    // 模块级挂钩必须还回去：留着的话下一次挂载的列会往已经销毁的表格上录历史
    editRecorder = null;
    exportXlsxSelectionFn = null;
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
