// 中文 locale：这是一份中国公司的 HR 台账，混着英文名会很违和（头像取姓名末字，
// 英文名下会退化成 "r" / "." 这种没意义的字符）
import { fakerZH_CN as faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import {
  vtCellEditor,
  vtCellSelection,
  vtClipboard,
  vtColumnFilter,
  vtFieldConfig,
  vtExport,
  vtSearch,
} from '@virt-table/vanilla/plugins';
import {
  VtActions,
  VtDatePicker,
  VtInput,
  VtNumberInput,
  VtPerson,
  VtProgress,
  VtSelect,
  type VtSelectOption,
} from '@virt-table/vanilla/components';

/**
 * Demo · HR 人员与薪酬管理
 *
 * 这是一个**案例**而不是示例：目标是让人照着抄一个真实的 HR 后台，所以一张表上同时装了
 * 树形汇总、编辑校验、敏感字段脱敏、筛选、导出、搜索、选区复制。
 *
 * 三个值得单独说的设计：
 *
 * 1. **「部门 → 员工」用树形而不是 `groupConfig`。** 分组行是一整格 `colSpan=全列`
 *    （只有标题 + 计数徽标），画不出「这个部门的月度成本是多少」。树形的父行是**普通数据行**，
 *    每一列照常渲染，于是部门行能自己带汇总值 —— 这正是 HR 表最想要的「汇总 + 明细」。
 *    合计行也刚好对：`showSummary` 聚合的是 `collectLeaves()` 的结果（有 children 的行被
 *    排除在外），所以部门行不会被算进全公司合计里，不用手动扣。
 *
 * 2. **派生列不进编辑链路。** 月度人力成本 / 年度总包由基本工资与绩效系数算出来，
 *    改的是「因」不是「果」：编辑基本工资 → 重算该员工的派生字段 → 重算所在部门的汇总 →
 *    `setList()` 让合计行跟着走。这条链在 `applySalaryChange()` 里，只有一份。
 *
 * 3. **脱敏是渲染层的事，不是数据层的事。** `masked` 只被 `render` / `exportValue` 读，
 *    行数据始终是真值 —— 所以切回来不用重新取数，导出也自然跟着当前视图（脱敏时导出 `•`），
 *    不会出现「屏幕上打码、导出的 Excel 里全是明文」这种典型事故。
 *
 * 4. **能用内置单元格组件的列一律用组件**：`VtPerson`（姓名，纯展示形态自带头像胶囊）、
 *    `VtSelect`（职级 / 在职状态 / 工作地，胶囊或文本）、`VtInput`（职位）、
 *    `VtDatePicker`（入职日期）、`VtNumberInput`（薪资 / 绩效系数）、`VtProgress`（绩效评分）、
 *    `VtActions`（操作）。自写 `render` 只剩三类**组件确实没有**的东西：金额格式化（¥ + 千分位
 *    + 部门行的「合计/均值」前缀 + 脱敏）、证件号掩码、部门汇总行的标题样式。
 */

/** 企业侧社保 + 公积金综合比例（示意值，真实项目按城市与基数分段算） */
const INSURANCE_RATE = 0.36;

/** 年终奖月数（× 绩效系数），与月薪一起构成年度总包 */
const BONUS_MONTHS = 3;

const MASK = '••••••';

type Level = 'P4' | 'P5' | 'P6' | 'P7' | 'P8';

/** 职级薪酬带宽（月薪，元）—— 调薪校验就是拿它当红线 */
const LEVEL_BAND: Record<Level, { min: number; max: number }> = {
  P4: { min: 8000, max: 16000 },
  P5: { min: 14000, max: 26000 },
  P6: { min: 22000, max: 40000 },
  P7: { min: 35000, max: 62000 },
  P8: { min: 55000, max: 96000 },
};

const LEVELS = Object.keys(LEVEL_BAND) as Level[];

const LEVEL_OPTIONS: VtSelectOption[] = LEVELS.map((l) => ({ value: l, label: l }));

const STATUS_OPTIONS: VtSelectOption[] = [
  { value: 'active', label: '在职', variant: 'success' },
  { value: 'probation', label: '试用期', variant: 'warning' },
  { value: 'leaving', label: '待离职', variant: 'danger' },
];

const CITIES = ['北京', '上海', '杭州', '深圳', '成都', '西安'];

const DEPTS: { name: string; size: number; titles: string[] }[] = [
  { name: '研发中心', size: 1400, titles: ['前端工程师', '后端工程师', '测试工程师', '架构师'] },
  { name: '算法中心', size: 620, titles: ['算法工程师', '数据科学家'] },
  { name: '产品部', size: 380, titles: ['产品经理', '产品运营'] },
  { name: '设计中心', size: 240, titles: ['视觉设计师', '交互设计师'] },
  { name: '市场部', size: 460, titles: ['市场经理', '品牌策划', '渠道运营'] },
  { name: '销售部', size: 980, titles: ['大客户经理', '销售代表', '售前顾问'] },
  { name: '客户成功部', size: 520, titles: ['客户成功经理', '技术支持'] },
  { name: '财务部', size: 180, titles: ['会计', '财务分析师'] },
  { name: '人力资源部', size: 160, titles: ['HRBP', '招聘专员', '薪酬专员'] },
];

interface HrRow extends Record<string, any> {
  id: string;
  /** `dept` 是汇总行（有 children），`staff` 是员工明细 */
  rowType: 'dept' | 'staff';
  name: string;
  employeeId: string;
  level: Level | '';
  title: string;
  status: string;
  city: string;
  hireDate: string;
  /** 月基本工资；部门行存的是部门均值 */
  baseSalary: number;
  /** 绩效系数（0.5 ~ 2.0），决定年终奖月数的倍率 */
  bonusRate: number;
  /** 派生：月度人力成本（含企业侧社保公积金）。部门行存合计 */
  monthlyCost: number;
  /** 派生：年度总包。部门行存合计 */
  annualPackage: number;
  /** 绩效评分（0-100）。部门行存均值 */
  performance: number;
  /** 敏感：社保缴费基数 */
  socialBase: number;
  /** 敏感：证件号 */
  idNumber: string;
  headcount: number;
  children?: HrRow[];
}

const money = (n: number): string => `¥${Math.round(n).toLocaleString('en-US')}`;

const sum = (values: number[]): number => values.reduce((s, v) => s + (Number(v) || 0), 0);
const avg = (values: number[]): number => (values.length ? sum(values) / values.length : 0);

const escapeHtml = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 员工的派生字段：改了基本工资 / 绩效系数之后必须重算 */
function recalcStaff(row: HrRow): void {
  row.monthlyCost = row.baseSalary * (1 + INSURANCE_RATE);
  row.annualPackage = row.baseSalary * 12 + row.baseSalary * BONUS_MONTHS * row.bonusRate;
  // 社保基数在真实项目里有上下限封顶，这里按月薪的 0.6~1 倍取个示意值
  row.socialBase = Math.min(row.baseSalary, 35283);
}

/** 部门行的汇总：成本求和、薪资与绩效取均值 */
function recalcDept(dept: HrRow): void {
  const staff = dept.children ?? [];
  const n = staff.length || 1;
  dept.headcount = staff.length;
  dept.monthlyCost = staff.reduce((s, r) => s + r.monthlyCost, 0);
  dept.annualPackage = staff.reduce((s, r) => s + r.annualPackage, 0);
  dept.baseSalary = staff.reduce((s, r) => s + r.baseSalary, 0) / n;
  dept.performance = Math.round(staff.reduce((s, r) => s + r.performance, 0) / n);
  dept.socialBase = staff.reduce((s, r) => s + r.socialBase, 0);
}

function buildData(): HrRow[] {
  // 固定种子：案例每次打开都是同一份数据，截图与文档里的数字才对得上
  faker.seed(20260814);

  let seq = 0;
  return DEPTS.map((dept, di) => {
    const staff: HrRow[] = Array.from({ length: dept.size }, (_, i) => {
      const level = LEVELS[(i * 7 + di) % LEVELS.length];
      const band = LEVEL_BAND[level];
      const name = faker.person.fullName();
      const row: HrRow = {
        id: `s${seq}`,
        rowType: 'staff',
        name,
        employeeId: `E${String(10001 + seq).padStart(5, '0')}`,
        level,
        title: dept.titles[i % dept.titles.length],
        status: i % 23 === 0 ? 'probation' : i % 47 === 0 ? 'leaving' : 'active',
        city: CITIES[(i + di) % CITIES.length],
        hireDate: faker.date
          .between({ from: '2015-01-01', to: '2026-06-30' })
          .toISOString()
          .slice(0, 10),
        baseSalary:
          Math.round(faker.number.int({ min: band.min, max: band.max }) / 100) * 100,
        bonusRate: Number((0.8 + ((i % 8) * 0.1)).toFixed(1)),
        performance: faker.number.int({ min: 45, max: 99 }),
        monthlyCost: 0,
        annualPackage: 0,
        socialBase: 0,
        idNumber: `${faker.number.int({ min: 110101, max: 610113 })}${faker.date
          .between({ from: '1980-01-01', to: '2003-12-31' })
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '')}${faker.number.int({ min: 1000, max: 9999 })}`,
        headcount: 0,
      };
      recalcStaff(row);
      seq += 1;
      return row;
    });

    const deptRow: HrRow = {
      id: `d${di}`,
      rowType: 'dept',
      name: dept.name,
      employeeId: '',
      level: '',
      title: '',
      status: '',
      city: '',
      hireDate: '',
      baseSalary: 0,
      bonusRate: 0,
      monthlyCost: 0,
      annualPackage: 0,
      performance: 0,
      socialBase: 0,
      idNumber: '',
      headcount: 0,
      children: staff,
    };
    recalcDept(deptRow);
    return deptRow;
  });
}

export function bootstrapDemoHrPayroll(root: HTMLElement): () => void {
  const list = buildData();
  /** 薪酬/证件类字段是否打码。只被 render 与 exportValue 读，不碰行数据 */
  let masked = false;

  /**
   * 汇总行不可编辑：`disabled` 是列级开关，给不了「这一行不行」，所以在 renderEditor
   * 外面包一层。返回 `null` 时编辑浮层什么都不做（见 cell-editor 的 `content === null`）。
   */
  const staffOnly = (col: VirtTableColumn<HrRow>): VirtTableColumn<HrRow> => {
    const inner = col.renderEditor;
    if (!inner) return col;
    col.renderEditor = (ctx) => (ctx.row.rowType === 'dept' ? null : inner(ctx));
    return col;
  };

  /** 金额列的统一渲染：部门行给「合计/均值」前缀，脱敏时打码 */
  const moneyCell =
    (prefix: '合计' | '均值' | null) =>
    ({ value, row }: { value: unknown; row: HrRow }): string => {
      if (row.rowType === 'dept' && row.headcount === 0) return '';
      if (masked) return MASK;
      const text = money(Number(value) || 0);
      if (row.rowType === 'dept' && prefix) {
        return `<span style="opacity:.55;font-size:12px;margin-right:4px">${prefix}</span>${text}`;
      }
      return text;
    };

  /**
   * 姓名列的员工那一半交给内置 `VtPerson`（纯展示形态：不给 `options`，直接读行值）。
   *
   * 它自带头像胶囊 —— 没有头像图时按姓名派生稳定色 + 取末字，正好是这里要的效果，
   * 所以原来那段手写 `<img>` + data URI 头像连同 `avatarOf()` 一起删了（4940 个 data URI
   * 也不用再存）。部门行不是人，仍走自己的汇总渲染。
   */
  const personRender = VtPerson<HrRow>({ key: 'name', title: '', width: 240 }).render!;

  const columns: VirtTableColumn<HrRow>[] = [
    {
      key: 'name',
      title: '部门 / 姓名',
      width: 240,
      type: 'tree',
      fixed: 'left',
      render: (ctx) => {
        const { row } = ctx;
        if (row.rowType === 'dept') {
          return (
            `<span style="font-weight:600">${escapeHtml(row.name)}</span>` +
            `<span style="margin-left:8px;opacity:.55;font-size:12px">${row.headcount} 人</span>`
          );
        }
        return personRender(ctx);
      },
    },
    { key: 'employeeId', title: '工号', width: 110, fixed: 'left' },
    staffOnly(
      VtSelect<HrRow>({
        key: 'level',
        title: '职级',
        width: 96,
        options: LEVEL_OPTIONS,
        display: 'tag',
        filters: LEVELS.map((l) => ({ label: l, value: l })),
        filterMultiple: true,
        // 改职级 = 换带宽，原薪资可能立刻越界 —— 重新校验一次并刷新
        onChange: (_v, row) => applySalaryChange(row),
      }),
    ),
    staffOnly(
      VtInput<HrRow>({ key: 'title', title: '职位', width: 150, textOverflow: 'ellipsis' }),
    ),
    staffOnly(
      VtSelect<HrRow>({
        key: 'status',
        title: '在职状态',
        width: 110,
        options: STATUS_OPTIONS,
        display: 'tag',
        filters: STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
        filterMultiple: true,
      }),
    ),
    staffOnly(
      VtSelect<HrRow>({
        key: 'city',
        title: '工作地',
        width: 100,
        options: CITIES.map((c) => ({ value: c, label: c })),
        filters: CITIES.map((c) => ({ label: c, value: c })),
        filterMultiple: true,
      }),
    ),
    staffOnly(
      VtDatePicker<HrRow>({
        key: 'hireDate',
        title: '入职日期',
        width: 140,
        filterType: 'date-range',
      }),
    ),
    // 列序按「因 → 果」排：绩效评分 → 绩效系数（评分定系数）→ 月基本工资 →
    // 月度人力成本 → 年度总包（薪资定成本）。相邻的两列之间都能一眼看出关系
    {
      ...VtProgress<HrRow>({
        key: 'performance',
        title: '绩效评分',
        width: 150,
        thresholds: [
          { lte: 60, variant: 'danger' },
          { lte: 75, variant: 'warning' },
        ],
      }),
      sortable: true,
      summaryMethod: (values) => `均分 ${avg(values as number[]).toFixed(1)}`,
    },
    {
      ...staffOnly(
        VtNumberInput<HrRow>({
          key: 'bonusRate',
          title: '绩效系数',
          width: 110,
          step: 0.1,
          precision: 1,
          validator: (v, row) => {
            if (row.rowType === 'dept') return true;
            const n = Number(v);
            return n >= 0.5 && n <= 2 ? true : '绩效系数需在 0.5 ~ 2.0';
          },
          onChange: (_v, row) => applySalaryChange(row),
        }),
      ),
      align: 'right',
      render: ({ value, row }) =>
        row.rowType === 'dept' ? '' : `× ${Number(value).toFixed(1)}`,
    },
    {
      ...staffOnly(
        VtNumberInput<HrRow>({
          key: 'baseSalary',
          title: '月基本工资',
          width: 140,
          step: 500,
          validator: (v, row) => {
            if (row.rowType === 'dept') return true;
            const band = LEVEL_BAND[row.level as Level];
            const n = Number(v);
            if (!band) return true;
            if (!Number.isFinite(n)) return '请填写月基本工资';
            return n >= band.min && n <= band.max
              ? true
              : `${row.level} 的带宽是 ${money(band.min)} ~ ${money(band.max)}`;
          },
          onChange: (_v, row) => applySalaryChange(row),
        }),
      ),
      align: 'right',
      sortable: true,
      // 有 summaryMethod 就不用再配 summary：computeSummaryRow 里前者优先，两个都写只会让人猜
      summaryMethod: (values) =>
        masked ? MASK : `均值 ${money(avg(values as number[]))}`,
      render: moneyCell('均值'),
      exportValue: (row) => (masked ? MASK : row.baseSalary),
      filterType: 'number-range',
    },
    {
      key: 'monthlyCost',
      title: '月度人力成本',
      width: 150,
      align: 'right',
      sortable: true,
      summaryMethod: (values) => (masked ? MASK : money(sum(values as number[]))),
      render: moneyCell('合计'),
      exportValue: (row) => (masked ? MASK : Math.round(row.monthlyCost)),
    },
    {
      key: 'annualPackage',
      title: '年度总包',
      width: 150,
      align: 'right',
      sortable: true,
      summaryMethod: (values) => (masked ? MASK : money(sum(values as number[]))),
      render: moneyCell('合计'),
      exportValue: (row) => (masked ? MASK : Math.round(row.annualPackage)),
    },
    // 敏感字段：默认隐藏，需要的人自己在「字段配置」里打开；打开后仍受脱敏开关约束
    {
      key: 'socialBase',
      title: '社保基数',
      width: 130,
      align: 'right',
      hidden: true,
      render: moneyCell('合计'),
      exportValue: (row) => (masked ? MASK : Math.round(row.socialBase)),
    },
    {
      key: 'idNumber',
      title: '证件号',
      width: 190,
      hidden: true,
      render: ({ value, row }) => {
        if (row.rowType === 'dept') return '';
        const s = String(value ?? '');
        // 证件号即使不开脱敏也只给「前 6 + 后 4」，这是这类字段的默认体面
        const partial = `${s.slice(0, 6)}********${s.slice(-4)}`;
        return masked ? MASK : partial;
      },
      exportValue: (row) => (masked ? MASK : String(row.idNumber).replace(/^(.{6}).*(.{4})$/, '$1********$2')),
    },
    VtActions<HrRow>({
      key: 'ops',
      title: '操作',
      width: 170,
      fixed: 'right',
      align: 'center',
      items: [
        {
          text: '调薪 +5%',
          hidden: (row) => row.rowType === 'dept',
          onClick: (row) => {
            const band = LEVEL_BAND[row.level as Level];
            const next = Math.round((row.baseSalary * 1.05) / 100) * 100;
            if (band && next > band.max) {
              setStatus(`${row.name} 调薪后 ${money(next)} 超出 ${row.level} 带宽上限，已拦下`);
              return;
            }
            row.baseSalary = next;
            applySalaryChange(row);
            setStatus(`${row.name} 已调薪至 ${money(next)}`);
          },
        },
        {
          text: '转正',
          hidden: (row) => row.status !== 'probation',
          onClick: (row) => {
            row.status = 'active';
            refresh();
            setStatus(`${row.name} 已转正`);
          },
        },
        {
          text: '离职',
          variant: 'danger',
          hidden: (row) => row.rowType === 'dept' || row.status === 'leaving',
          confirm: '标记为待离职？该员工仍计入本月成本。',
          onClick: (row) => {
            row.status = 'leaving';
            refresh();
            setStatus(`${row.name} 已标记待离职`);
          },
        },
      ],
    }),
  ];

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn" id="collapse">只看部门汇总</button>
      <button class="virt-table-btn" id="expand">展开全部明细</button>
      <button class="virt-table-btn" id="mask">薪酬脱敏：关</button>
      <button class="virt-table-btn" id="panel">字段配置</button>
      <button class="virt-table-btn" id="excel">导出 Excel</button>
      <button class="virt-table-btn" id="check">校验全部</button>
      <span class="demo-note">点单元格可改职级 / 职位 / 工作地 / 入职日期 / 薪资 / 绩效系数；Ctrl/Cmd+F 搜索，框选后 Ctrl/Cmd+C 复制</span>
    </div>
    <div id="kpi" class="status-text"></div>
    <div id="status" class="status-text"></div>
    <!-- 高度走 --demo-stage-h：桌面 640px，窄屏由 .demo-stage 收到一屏内（见 style.css） -->
    <div style="--demo-stage-h:640px;" class="demo-container demo-stage" id="c"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const kpiEl = root.querySelector('#kpi') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;

  const setStatus = (text: string) => {
    statusEl.textContent = text;
  };

  const table = new VirtTable<HrRow>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    stripe: false,
    // 默认全展开：汇总与明细混在一起才说明得清「部门行是行、员工行也是行」，
    // 收起来只剩 9 行反而看不出这是一张 4940 行的表。工具栏第一颗按钮负责收回去
    defaultExpandAll: true,
    showSummary: true,
    summaryText: '全公司',
    highlightHoverRow: true,
    // 汇总行给一层更实的底色，一眼分得清「部门」和「人」
    rowClass: (row) => (row.rowType === 'dept' ? 'hr-dept-row' : ''),
    plugins: [
      vtCellEditor(),
      vtCellSelection(),
      vtClipboard(),
      vtColumnFilter(),
      vtFieldConfig(),
      vtExport(),
      vtSearch(),
    ],
  });

  /**
   * 编辑写回后的刷新。
   *
   * 走 `setList()` 而不是 `forceUpdate()`：合计行是在数据管线里算的
   * （`_rebuildData → _recomputeSummary`），`forceUpdate()` 只重画单元格，改完薪资
   * 底部的全公司合计不会动。
   *
   * 200ms 去抖是因为 `VtNumberInput` 每次按键都 `commitValue`，逐键重建管线既浪费
   * 又会让正在输入的那一格闪。
   */
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const refresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      table.setList(list);
      renderKpi();
    }, 200);
  };

  /** 改了「因」（薪资 / 系数 / 职级）之后，把「果」一路重算到部门与合计 */
  function applySalaryChange(row: HrRow): void {
    if (row.rowType !== 'staff') return;
    recalcStaff(row);
    const dept = list.find((d) => d.children?.includes(row));
    if (dept) recalcDept(dept);
    refresh();
  }

  function renderKpi(): void {
    const staff = list.flatMap((d) => d.children ?? []);
    const monthly = sum(staff.map((r) => r.monthlyCost));
    const annual = sum(staff.map((r) => r.annualPackage));
    const perf = avg(staff.map((r) => r.performance));
    const probation = staff.filter((r) => r.status === 'probation').length;
    kpiEl.textContent =
      `在编 ${staff.length.toLocaleString('en-US')} 人（试用期 ${probation}） · ` +
      `月度人力成本 ${masked ? MASK : money(monthly)} · ` +
      `年度总包 ${masked ? MASK : money(annual)} · 平均绩效 ${perf.toFixed(1)}`;
  }

  const listeners: (() => void)[] = [];
  const on = (id: string, handler: (e: MouseEvent) => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler as EventListener);
    listeners.push(() => el.removeEventListener('click', handler as EventListener));
  };

  on('expand', () => table.expandAll());
  on('collapse', () => table.collapseAll());
  on('mask', (e) => {
    masked = !masked;
    (e.currentTarget as HTMLElement).textContent = `薪酬脱敏：${masked ? '开' : '关'}`;
    // 脱敏改的是 render/summaryMethod 的输出，得让管线重算一遍合计行
    table.setList(list);
    renderKpi();
    setStatus(masked ? '薪酬与证件号已打码，导出同样是打码值' : '已恢复明文显示');
  });
  on('panel', (e) => table.toggleFieldConfig(e.currentTarget as HTMLElement));
  on('excel', () => {
    table.exportExcel({ filename: `人员薪酬台账${masked ? '（脱敏）' : ''}.xls` });
    setStatus('已导出当前视图（含筛选与排序结果）');
  });
  on('check', () => {
    const errors = table.validateAll();
    setStatus(
      errors.length
        ? `发现 ${errors.length} 处超带宽/非法值，例如 ${(errors[0].row as HrRow).name}：${errors[0].message}`
        : '全部薪酬数据在带宽内 ✓',
    );
  });

  renderKpi();
  setStatus(
    '部门行上的金额是该部门的合计（成本求和、薪资取均值），底部是全公司合计。' +
      '可编辑的列全部是内置单元格组件：VtPerson（姓名头像）、VtSelect（职级/状态/工作地）、' +
      'VtInput（职位）、VtDatePicker（入职日期）、VtNumberInput（薪资/系数）、VtProgress（绩效）、VtActions（操作）',
  );

  return () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
