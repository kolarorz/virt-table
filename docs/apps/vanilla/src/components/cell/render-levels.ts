import {
  VirtTable,
  type CellContentType,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { VtSelect, VtTag, asCell, type VtSelectOption } from '@virt-table/vanilla/components';

/**
 * 内容来源的三个粒度：**表级 → 列级 → 单元格级**，全在这一张表上。
 *
 * API 页（`/vanilla/api/cell`）讲的是模型本身（四层 × 粒度、为什么这么分）；
 * 这一页只回答「**具体怎么配**」，并且让优先级**当场看得见** —— 工具栏上的每个按钮都是
 * 一次真实的配置动作，按完看「分数」那一列第 3 行怎么变，再看状态栏里 `resolveCellRender()`
 * 报出来的最终结果。
 *
 * 三个粒度各自负责什么：
 *
 * | 粒度 | 配在哪 | 能给什么 | 本页哪一列 |
 * | --- | --- | --- | --- |
 * | 表级 | `options.cellType` | 只有 `cellType`（**刻意没有表级 `render`** —— 那等于所有列画得一样，真实需求是 `cellClass` / `cellStyle`） | 「名称」「描述」两列没配任何东西，吃的就是它 |
 * | 列级 | `col.cellType` / `col.render` / `col.renderEditor`（单元格组件就装在这一级） | 整列统一 | 「富文本」「头像」「标签」是列级 `cellType`；「分数」是列级 `render`；「状态」是列级组件 `VtSelect` |
 * | 单元格级 | `table.setCellRender(rowKey, colKey, cfg)` / `setCellRenders(entries)` | 就这一格，可穿透功能列 | 工具栏按钮现场配给第 3 / 5 / 7 行 |
 *
 * 两条容易踩的规则，这一页就是拿来验证它们的：
 *
 * 1. **粒度越细越优先；同粒度内 `render` 比 `cellType` 具体。** 所以「单元格级 `cellType`
 *    赢过列级 `render`」——「分数」列级配了 `render`（画成 `90 分`），给某一格配上
 *    `cellType: 'number'` 之后那一格变回纯 `90`：列上那个加后缀的 `render` 被整个跳过。
 *    反过来如果让列级 `render` 赢，你给一格配了 `cellType` 却毫无反应，无从解释。
 *    （顺带一个真实的坑：`cellType` 与**值的形状**必须配对 —— 给数字配 `'option'` 会画出
 *    空格子，因为 option 只认标签字符串或 `{ label, color }`。）
 * 2. **`renderEditor` 不在那条内容链上**，它自己一条（单元格级 > 列级），而且是**独立回落**：
 *    单元格级没给就照旧用列级的。所以「只改这一格的常态、编辑照旧」是可以的；反面就是按钮 ⑥
 *    的那个错配 —— 常态换成只读胶囊 `VtTag`，点开却还是列级 `VtSelect` 的下拉。要真封掉得像
 *    按钮 ⑦ 那样显式给一个返回 `null` 的 `renderEditor`（`undefined` 不算「没有」，只算「没配」）。
 *    装内置组件一律用 `asCell()`，它整对写入 `render` + `renderEditor`，配不出这种错配。
 *
 * 表级只能在建表时给，所以「切换表级兜底」那个按钮是**销毁重建**表格（真实项目里没人在运行时
 * 改它；这里重建一次是为了让 `text` 与 `rich-text` 的差别看得见 —— 看「描述」列里的 `<b>` 标签）。
 */

const STATUS: VtSelectOption[] = [
  { value: 'active', label: '活跃', variant: 'success' },
  { value: 'inactive', label: '停用', variant: 'danger' },
  { value: 'pending', label: '待审', variant: 'warning' },
];

const TAG_COLORS = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#0891b2'];
const NAMES = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

/** 生成一个纯色方块当头像（避免 demo 依赖外部图片） */
function avatarUrl(i: number): string {
  const hue = (i * 47) % 360;
  return (
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">` +
        `<rect width="48" height="48" rx="8" fill="hsl(${hue} 62% 55%)"/></svg>`,
    )
  );
}

const ROW_COUNT = 500;

/** 现场演示用的三格坐标（行 key 就是 id） */
const DEMO_SCORE_ROW = '3';
const DEMO_STATUS_ROW = '5';
const DEMO_SEL_ROW = '7';

export function bootstrapTableCellRenderLevels(root: HTMLElement): () => void {
  const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i,
    /**
     * 勾选列（`type: 'checkbox'`）自己不读行值，这个字段是留给**穿透**那一格的：
     * 穿透进去的 `VtTag` 读的是 `row[colKey]`，行上没有这个字段的话它只会画个空。
     */
    sel: 'lock',
    name: NAMES[i % NAMES.length],
    // 值里带标签：表级兜底是 'text' 时原样显示，切成 'rich-text' 后才会加粗
    desc: `第 ${i} 项 <b>重点</b>`,
    html: `<b style="color:var(--vt-color-primary)">P${i % 4}</b> · <i>已评审</i>`,
    avatar: avatarUrl(i),
    tag: { label: `分类 ${i % 5}`, color: TAG_COLORS[i % TAG_COLORS.length] },
    score: 40 + ((i * 37) % 61),
    status: STATUS[i % STATUS.length]!.value,
  }));

  type Row = (typeof list)[number];

  const columns: VirtTableColumn<Row>[] = [
    // 功能列：独占单元格。列级配 render 会被忽略并告警，但**单元格级能穿透**（见按钮 ⑤）
    { key: 'sel', title: '', width: 46, type: 'checkbox' },
    // ↓ 这两列什么都没配，吃的是表级 options.cellType
    { key: 'name', title: '名称（吃表级）', width: 130 },
    { key: 'desc', title: '描述（吃表级）', width: 210 },
    // ↓ 列级 cellType：三种内置内容类型
    { key: 'html', title: '富文本（列级 cellType）', width: 190, cellType: 'rich-text' },
    { key: 'avatar', title: '头像（列级）', width: 100, cellType: 'image', align: 'center' },
    { key: 'tag', title: '标签（列级）', width: 130, cellType: 'option' },
    // ↓ 列级 render：拿来被单元格级抢（按钮 ②③）。这里刻意手写，因为被演示的就是这一档本身
    {
      key: 'score',
      title: '分数（列级 render）',
      width: 160,
      align: 'right',
      render: ({ value }) => `${value} 分`,
    },
    // ↓ 列级组件：组件不是优先级链上的一档，它就是列级 render + renderEditor
    VtSelect<Row>({ key: 'status', title: '状态（列级组件）', width: 150, options: STATUS, display: 'tag' }),
  ];

  root.innerHTML = `
  <div class="virt-table-controls">
    <button class="virt-table-btn virt-table-btn-primary" id="lvTable">① 表级：text ⇄ rich-text（重建）</button>
    <button class="virt-table-btn" id="lvCellType">② 第 3 行分数：加单元格级 cellType</button>
    <button class="virt-table-btn" id="lvRender">③ 第 3 行分数：加单元格级 render</button>
    <button class="virt-table-btn" id="lvClear">④ 第 3 行分数：清除（回落列级）</button>
    <button class="virt-table-btn" id="lvPierce">⑤ 第 7 行勾选格：穿透成「锁」</button>
    <button class="virt-table-btn" id="lvAsCell">⑥ 第 5 行状态：装 asCell(VtTag)</button>
    <button class="virt-table-btn" id="lvReadonly">⑦ 第 5 行状态：连编辑器一起关掉</button>
    <button class="virt-table-btn" id="lvReset">重置全部单元格级配置</button>
  </div>
  <div id="level" class="status-text"></div>
  <div id="resolved" class="status-text"></div>
  <div style="width:1040px;height:520px;" class="demo-container" id="virtTableContainer"></div>
`;

  const container = root.querySelector('#virtTableContainer') as HTMLElement;
  const levelEl = root.querySelector('#level') as HTMLElement;
  const resolvedEl = root.querySelector('#resolved') as HTMLElement;

  /** 表级兜底。只能在建表时给，所以切换它要重建表格 */
  let tableLevel: CellContentType = 'text';
  let table: VirtTable<Row> | null = null;
  /** 自己记一份「按钮配过什么」，只为了状态栏能说清是哪一档在生效 */
  const applied = new Map<string, string>();

  const cellKey = (rowKey: string, colKey: string) => `${rowKey}/${colKey}`;

  /**
   * 状态栏第二行：`resolveCellRender()` 报出的**最终生效**配置。
   *
   * 它是核心唯一的权威答案（内容链 + `renderEditor` 的独立回落都在里面算完了），
   * demo 自己推一遍优先级只会有第二份实现。`render` 与 `cellType` 最多只有一个有值。
   */
  const describe = (rowKey: string, colKey: string): string => {
    const r = table?.resolveCellRender(rowKey, colKey);
    if (!r) return '—';
    const content = r.render
      ? 'render 函数'
      : r.cellType
        ? `cellType: '${r.cellType}'`
        : '默认取值 String(row[key])';
    const editor = r.renderEditor ? '有 renderEditor（点开进编辑态）' : '无 renderEditor（点开无反应）';
    const note = applied.get(cellKey(rowKey, colKey));
    return `${content} · ${editor}${note ? ` ← ${note}` : '（未配单元格级，来自列级或表级）'}`;
  };

  const renderStatus = () => {
    levelEl.innerHTML =
      `<b>表级</b> <code>options.cellType: '${tableLevel}'</code> —— 「名称」「描述」两列什么都没配，吃的就是它；` +
      `注意「描述」里的 <code>&lt;b&gt;重点&lt;/b&gt;</code>：<code>text</code> 原样显示、<code>rich-text</code> 才会加粗。` +
      `<b>列级</b>：富文本/头像/标签是 <code>col.cellType</code>，分数是 <code>col.render</code>，状态是列级组件 <code>VtSelect</code>。` +
      `<b>单元格级</b>：用按钮 ②~⑥ 现场配，粒度更细的一律胜出。`;
    resolvedEl.innerHTML =
      `<code>resolveCellRender('${DEMO_SCORE_ROW}', 'score')</code> → ${describe(DEMO_SCORE_ROW, 'score')}<br>` +
      `<code>resolveCellRender('${DEMO_STATUS_ROW}', 'status')</code> → ${describe(DEMO_STATUS_ROW, 'status')}<br>` +
      `<code>resolveCellRender('${DEMO_SEL_ROW}', 'sel')</code> → ${describe(DEMO_SEL_ROW, 'sel')}` +
      `<br><span style="opacity:.7">注：<code>resolveCellRender()</code> 报的是<b>内容层</b>的结果。` +
      `勾选列在<b>接管层</b>独占单元格，所以没配单元格级时它报 <code>cellType: '${tableLevel}'</code>（表级兜底），` +
      `屏幕上仍然是勾选框 —— 两层是叠在一起的，不是同一条链。</span>`;
  };

  /** 建表（表级 cellType 只能在这里给） */
  const mount = () => {
    table?.destroy();
    table = new VirtTable<Row>(container, {
      list,
      columns,
      itemKey: 'id',
      estimatedSize: 40,
      buffer: 4,
      border: true,
      textOverflow: 'ellipsis',
      // ← 表级兜底：没配 render / cellType 的列按它渲染
      cellType: tableLevel,
      plugins: [vtCellEditor()],
    });
    // 重建之后单元格级配置也没了 —— 它存在表格实例里，不在数据上
    applied.clear();
    renderStatus();
  };

  mount();

  const listeners: (() => void)[] = [];
  const on = (id: string, handler: () => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  const set = (rowKey: string, colKey: string, cfg: Parameters<VirtTable<Row>['setCellRender']>[2], note: string) => {
    table?.setCellRender(rowKey, colKey, cfg);
    if (cfg === null) applied.delete(cellKey(rowKey, colKey));
    else applied.set(cellKey(rowKey, colKey), note);
    renderStatus();
  };

  on('lvTable', () => {
    tableLevel = tableLevel === 'text' ? 'rich-text' : 'text';
    mount();
  });
  /*
   * 单元格级 `cellType` 赢过列级 `render`（粒度优先）：这一格的「90 分」变回纯数字 90 ——
   * 列上那个加后缀的 `render` 被整个跳过了。
   *
   * 这里用 `'number'` 而不是 `'option'`：`option` 期望的是标签字符串或 `{ label, color }`，
   * 给它一个数字会画出**空格子**（`asText` 取不到 label）—— 内容类型与值的形状必须配对。
   */
  on('lvCellType', () =>
    set(DEMO_SCORE_ROW, 'score', { cellType: 'number' }, "单元格级 cellType: 'number'"),
  );
  // 同粒度内 render 更具体：它又赢过刚才那个 cellType
  on('lvRender', () =>
    set(
      DEMO_SCORE_ROW,
      'score',
      { render: ({ value }) => `${value} 分（这一格自定义）` },
      '单元格级 render',
    ),
  );
  // 传 null 清除这一格的配置 → 回落到列级 render
  on('lvClear', () => set(DEMO_SCORE_ROW, 'score', null, ''));
  // 穿透功能列：勾选列里这一行不给勾选框。列级做不到（会被忽略并告警）
  on('lvPierce', () =>
    set(
      DEMO_SEL_ROW,
      'sel',
      asCell(VtTag, { options: [{ value: 'lock', label: '锁', variant: 'danger' }] }),
      '单元格级 asCell(VtTag)（穿透功能列）',
    ),
  );
  /*
   * 单元格级组件覆盖列级组件：列上是可选的 `VtSelect`，这一格换成只读的 `VtTag`
   * （两者胶囊外观完全一致 —— 共用 `createTagChip`）。
   *
   * ⚠️ 但状态栏会告诉你这一格**仍然「有 renderEditor」**：`VtTag` 不提供编辑器，而
   * `renderEditor` 是**独立回落**的（单元格级没有就找列级），于是这一格变成「常态是只读
   * 胶囊、点开却是列级 VtSelect 的下拉」。这正是那条独立回落的双刃剑 —— 按 ⑦ 把它封掉。
   */
  on('lvAsCell', () =>
    set(DEMO_STATUS_ROW, 'status', asCell(VtTag, { options: STATUS }), '单元格级 asCell(VtTag)'),
  );
  /*
   * 真正的只读：`renderEditor` 给一个返回 `null` 的函数 —— `vtCellEditor` 见到 `null`
   * 就什么都不做（见 cell-editor 的 `content === null`）。
   *
   * 注意不能写 `renderEditor: undefined`：那不是「没有编辑器」，而是「这一级没配」，
   * 于是照旧回落到列级。
   */
  on('lvReadonly', () =>
    set(
      DEMO_STATUS_ROW,
      'status',
      { ...asCell(VtTag, { options: STATUS }), renderEditor: () => null },
      'asCell(VtTag) + renderEditor 返回 null —— 编辑器「在」，但打开时什么都不画，于是真只读',
    ),
  );
  on('lvReset', () => {
    table?.setCellRenders([
      { rowKey: DEMO_SCORE_ROW, colKey: 'score', config: null },
      { rowKey: DEMO_STATUS_ROW, colKey: 'status', config: null },
      { rowKey: DEMO_SEL_ROW, colKey: 'sel', config: null },
    ]);
    applied.clear();
    renderStatus();
  });

  return () => {
    table?.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
