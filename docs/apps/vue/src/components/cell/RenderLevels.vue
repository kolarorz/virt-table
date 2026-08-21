<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 渲染粒度：表级 / 列级 / 单元格级</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="toggleTableLevel">
        ① 表级：text ⇄ rich-text（重建）
      </button>
      <button type="button" class="virt-table-btn" @click="addCellType">② 第 3 行分数：加单元格级 cellType</button>
      <button type="button" class="virt-table-btn" @click="addRender">③ 第 3 行分数：加单元格级 render</button>
      <button type="button" class="virt-table-btn" @click="clearScore">④ 第 3 行分数：清除（回落列级）</button>
      <button type="button" class="virt-table-btn" @click="pierce">⑤ 第 7 行勾选格：穿透成「锁」</button>
      <button type="button" class="virt-table-btn" @click="asTag">⑥ 第 5 行状态：装 asCell(VtTag)</button>
      <button type="button" class="virt-table-btn" @click="asReadonly">⑦ 第 5 行状态：连编辑器一起关掉</button>
      <button type="button" class="virt-table-btn" @click="resetAll">重置全部单元格级配置</button>
    </div>
    <div class="status-text">
      <b>表级</b> <code>options.cellType: '{{ tableLevel }}'</code> —— 「名称」「描述」两列什么都没配，吃的就是它；
      注意「描述」里的 <code>&lt;b&gt;重点&lt;/b&gt;</code>：<code>text</code> 原样显示、<code>rich-text</code> 才会加粗。
      <b>列级</b>：富文本/头像/标签是 <code>col.cellType</code>，分数是 <code>col.render</code>，状态是列级组件 <code>VtSelect</code>。
      <b>单元格级</b>：按钮 ②~⑦ 现场配，粒度更细的一律胜出。
    </div>
    <div class="status-text">
      <code>resolveCellRender('{{ SCORE_ROW }}', 'score')</code> → {{ describe(SCORE_ROW, 'score') }}<br />
      <code>resolveCellRender('{{ STATUS_ROW }}', 'status')</code> → {{ describe(STATUS_ROW, 'status') }}<br />
      <code>resolveCellRender('{{ SEL_ROW }}', 'sel')</code> → {{ describe(SEL_ROW, 'sel') }}<br />
      <span style="opacity: 0.7">
        注：<code>resolveCellRender()</code> 报的是<b>内容层</b>的结果。勾选列在<b>接管层</b>独占单元格，
        所以没配单元格级时它报 <code>cellType: '{{ tableLevel }}'</code>（表级兜底），屏幕上仍然是勾选框
        —— 两层是叠在一起的，不是同一条链。
      </span>
    </div>
    <div style="width: 1040px; height: 520px" class="demo-container">
      <!-- key 变了就重挂载 = 新建表格实例，这是切换表级 cellType 的唯一办法 -->
      <VirtTableVue :key="tableLevel" ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 内容来源的三个粒度：**表级 → 列级 → 单元格级**（Vue）。
 *
 * API 页（`/vue/api/cell` → vanilla）讲模型本身；这一页只回答「具体怎么配」，工具栏上每个按钮
 * 都是一次真实的配置动作，按完看单元格怎么变、再看状态栏里 `resolveCellRender()` 的结果。
 *
 * 两处 Vue 端特有的细节：
 *
 * 1. **表级 `cellType` 只能在建表时给**，所以切换它靠 `:key="tableLevel"` 让组件重挂载
 *    （新建一个表格实例）。重建之后单元格级配置也没了：它存在表格实例里，不在数据上。
 * 2. **`resolveCellRender()` 走 `ref.getTable()`**，适配层的 ref 刻意没有转发它 —— 它返回的是
 *    **包装之后**的配置（`render` 已被适配层包成「返回 DOM」的函数），不是你传进去的那个
 *    返回 VNode 的函数，直接暴露只会让人以为拿到的是自己那份。要查最终生效的配置就问底层实例。
 */
import { computed, h, ref } from 'vue';
import {
  VirtTableVue,
  type CellContentType,
  type VueCellRenderConfig,
  type VueTableColumn,
  vtCellEditor,
} from '@virt-table/vue';
import { VtSelect, VtTag, asCell, type VtSelectOption } from '@virt-table/vanilla/components';
import type { VirtTableVueInstance } from '../../virt-table-ref';

const STATUS: VtSelectOption[] = [
  { value: 'active', label: '活跃', variant: 'success' },
  { value: 'inactive', label: '停用', variant: 'danger' },
  { value: 'pending', label: '待审', variant: 'warning' },
];

const LOCK: VtSelectOption[] = [{ value: 'lock', label: '锁', variant: 'danger' }];
const TAG_COLORS = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#0891b2'];
const NAMES = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

/** 生成一个纯色方块当头像（避免 demo 依赖外部图片） */
function avatarUrl(i: number) {
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
const SCORE_ROW = '3';
const STATUS_ROW = '5';
const SEL_ROW = '7';

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  // 勾选列自己不读行值；这个字段是留给「穿透」那一格的 VtTag 读的
  sel: 'lock',
  name: NAMES[i % NAMES.length]!,
  // 值里带标签：表级 'text' 时原样显示，切成 'rich-text' 后才会加粗
  desc: `第 ${i} 项 <b>重点</b>`,
  html: `<b style="color:var(--vt-color-primary)">P${i % 4}</b> · <i>已评审</i>`,
  avatar: avatarUrl(i),
  tag: { label: `分类 ${i % 5}`, color: TAG_COLORS[i % TAG_COLORS.length] },
  score: 40 + ((i * 37) % 61),
  status: STATUS[i % STATUS.length]!.value,
}));

const columns: VueTableColumn[] = [
  // 功能列：独占单元格。列级配 render 会被忽略并告警，但**单元格级能穿透**（按钮 ⑤）
  { key: 'sel', title: '', width: 46, type: 'checkbox' },
  // ↓ 这两列什么都没配，吃的是表级 options.cellType
  { key: 'name', title: '名称（吃表级）', width: 130 },
  { key: 'desc', title: '描述（吃表级）', width: 210 },
  // ↓ 列级 cellType
  { key: 'html', title: '富文本（列级 cellType）', width: 190, cellType: 'rich-text' },
  { key: 'avatar', title: '头像（列级）', width: 100, cellType: 'image', align: 'center' },
  { key: 'tag', title: '标签（列级）', width: 130, cellType: 'option' },
  // ↓ 列级 render：拿来被单元格级抢（按钮 ②③）。这里刻意手写，被演示的就是这一档本身
  {
    key: 'score',
    title: '分数（列级 render）',
    width: 160,
    align: 'right',
    render: ({ value }) => `${value} 分`,
  },
  // ↓ 列级组件：组件不是优先级链上的一档，它就是列级 render + renderEditor
  VtSelect({ key: 'status', title: '状态（列级组件）', width: 150, options: STATUS, display: 'tag' }),
];

const tableRef = ref<VirtTableVueInstance | null>(null);
const tableLevel = ref<CellContentType>('text');
/** 自己记一份「按钮配过什么」，只为了状态栏能说清是哪一档在生效 */
const applied = ref<Record<string, string>>({});
/** 每次操作 +1，触发状态栏重算（resolveCellRender 是命令式查询，不是响应式数据） */
const tick = ref(0);

const options = computed(() => ({
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  textOverflow: 'ellipsis' as const,
  cellType: tableLevel.value,
  plugins: [vtCellEditor()],
}));

const set = (rowKey: string, colKey: string, config: VueCellRenderConfig | null, note: string) => {
  tableRef.value?.setCellRender(rowKey, colKey, config);
  const key = `${rowKey}/${colKey}`;
  if (config === null) delete applied.value[key];
  else applied.value[key] = note;
  tick.value += 1;
};

/**
 * `resolveCellRender()` 是核心唯一的权威答案（内容链 + `renderEditor` 的独立回落都算完了），
 * demo 自己推一遍优先级只会有第二份实现。`render` 与 `cellType` 最多只有一个有值。
 */
const describe = (rowKey: string, colKey: string): string => {
  void tick.value; // 每次操作后重算
  const r = tableRef.value?.getTable()?.resolveCellRender(rowKey, colKey);
  if (!r) return '—';
  const content = r.render
    ? 'render 函数'
    : r.cellType
      ? `cellType: '${r.cellType}'`
      : '默认取值 String(row[key])';
  const editor = r.renderEditor ? '有 renderEditor（点开进编辑态）' : '无 renderEditor（点开无反应）';
  const note = applied.value[`${rowKey}/${colKey}`];
  return `${content} · ${editor}${note ? ` ← ${note}` : '（未配单元格级，来自列级或表级）'}`;
};

const toggleTableLevel = () => {
  tableLevel.value = tableLevel.value === 'text' ? 'rich-text' : 'text';
  // 重挂载 = 新实例，单元格级配置随之清空
  applied.value = {};
  tick.value += 1;
};

// 单元格级 cellType 赢过列级 render（粒度优先）：「90 分」变回纯 90。
// 用 'number' 而不是 'option' —— option 只认标签字符串或 { label, color }，给数字会画空
const addCellType = () => set(SCORE_ROW, 'score', { cellType: 'number' }, "单元格级 cellType: 'number'");
// 同粒度内 render 更具体：又赢过刚才那个 cellType
const addRender = () =>
  set(
    SCORE_ROW,
    'score',
    { render: ({ value }) => h('b', null, `${value} 分（这一格自定义 VNode）`) },
    '单元格级 render（返回 VNode）',
  );
const clearScore = () => set(SCORE_ROW, 'score', null, '');
// 穿透功能列：勾选列里这一行不给勾选框。列级做不到（会被忽略并告警）
const pierce = () =>
  set(SEL_ROW, 'sel', asCell(VtTag, { options: LOCK }), '单元格级 asCell(VtTag)（穿透功能列）');
// 单元格级组件覆盖列级组件；注意状态栏仍报「有 renderEditor」——renderEditor 独立回落
const asTag = () => set(STATUS_ROW, 'status', asCell(VtTag, { options: STATUS }), '单元格级 asCell(VtTag)');
// 真只读：renderEditor 给一个返回 null 的函数（undefined 不算「没有」，只算「没配」）
const asReadonly = () =>
  set(
    STATUS_ROW,
    'status',
    { ...asCell(VtTag, { options: STATUS }), renderEditor: () => null },
    'asCell(VtTag) + renderEditor 返回 null —— 编辑器「在」，但打开时什么都不画',
  );

const resetAll = () => {
  tableRef.value?.setCellRenders([
    { rowKey: SCORE_ROW, colKey: 'score', config: null },
    { rowKey: STATUS_ROW, colKey: 'status', config: null },
    { rowKey: SEL_ROW, colKey: 'sel', config: null },
  ]);
  applied.value = {};
  tick.value += 1;
};
</script>
