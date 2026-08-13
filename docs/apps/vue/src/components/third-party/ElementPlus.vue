<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Element Plus：直接渲染组件 vs 渲染 / 交互分离</h3>

    <div class="ep-note">
      <p>
        <strong>同一张表、同一批数据、同一组第三方组件</strong>，只有单元格的渲染方式不同。
        切换模式后点「滚动压测」，两次结果会并排留在下面的对比表里。
      </p>
      <ul>
        <li>
          <strong>分离渲染</strong>（默认，推荐）：<code>render</code> 返回静态轻 DOM
          （<b>复用 el-* 官方类名</b>，不是手写模仿），只有点中的那一格由
          <code>renderEditor</code> 挂真实组件到编辑浮层 —— 全表同时只有 1 个实例。
        </li>
        <li>
          <strong>直接渲染</strong>（对照）：<code>render</code> 直接返回真实 Element Plus 组件。
          每个可见单元格都是一个活组件实例，行进出视口就是一轮 mount / unmount。
        </li>
      </ul>
    </div>

    <div class="virt-table-controls">
      <button
        type="button"
        class="virt-table-btn ep-mode-btn"
        :class="{ 'is-active': mode === 'split' }"
        :disabled="running"
        @click="switchMode('split')"
      >
        分离渲染（推荐）
      </button>
      <button
        type="button"
        class="virt-table-btn ep-mode-btn"
        :class="{ 'is-active': mode === 'inline' }"
        :disabled="running"
        @click="switchMode('inline')"
      >
        直接渲染组件（对照）
      </button>

      <span class="ep-sep" />

      <button
        type="button"
        class="virt-table-btn virt-table-btn-primary"
        :disabled="running"
        @click="runBenchmark"
      >
        {{ running ? '压测中…' : '滚动压测' }}
      </button>
      <button
        type="button"
        class="virt-table-btn"
        :disabled="running"
        @click="resetAll"
      >
        清空结果
      </button>
      <button
        type="button"
        class="virt-table-btn virt-table-btn-warning"
        :disabled="running"
        @click="scrollRandom"
      >
        随机滚动
      </button>
    </div>

    <div class="status-text">{{ status }}</div>

    <div class="ep-live">
      <span>当前模式：<b>{{ MODE_LABEL[mode] }}</b></span>
      <span>render 调用：<b>{{ stats.renderCalls }}</b></span>
      <span>组件挂载：<b>{{ stats.mounts }}</b></span>
      <span>组件卸载：<b>{{ stats.unmounts }}</b></span>
      <span>存活实例：<b>{{ stats.mounts - stats.unmounts }}</b></span>
    </div>

    <table v-if="results.inline || results.split" class="ep-result">
      <thead>
        <tr>
          <th>模式</th>
          <th>平均 FPS</th>
          <th>p95 帧时间</th>
          <th>最长帧</th>
          <th>掉帧数 (&gt;16.7ms)</th>
          <th>render 调用</th>
          <th>组件挂载</th>
          <th>组件卸载</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="key in (['split', 'inline'] as Mode[])" :key="key">
          <td>{{ MODE_LABEL[key] }}</td>
          <template v-if="results[key]">
            <td :class="fpsClass(results[key]!.avgFps)">{{ results[key]!.avgFps }}</td>
            <td>{{ results[key]!.p95 }} ms</td>
            <td>{{ results[key]!.max }} ms</td>
            <td>{{ results[key]!.longFrames }} / {{ results[key]!.frames }}</td>
            <td>{{ results[key]!.renderCalls }}</td>
            <td>{{ results[key]!.mounts }}</td>
            <td>{{ results[key]!.unmounts }}</td>
          </template>
          <td v-else colspan="7" class="ep-result-empty">未测试</td>
        </tr>
      </tbody>
    </table>

    <div style="width: 100%; height: 600px" class="demo-container">
      <VirtTableVue
        :key="mode"
        ref="tableRef"
        :columns="columns"
        :options="options"
      />
    </div>

    <h4 class="ep-compare-title">外观对照：真实组件 vs 查看态轻 DOM</h4>
    <p class="ep-compare-desc">
      左列是真实 Element Plus 组件，右列是查看态的静态 DOM。右列没有手写任何「仿 el」样式，
      用的就是 <code>el-input__wrapper</code> / <code>el-radio-button__inner</code> /
      <code>el-select__wrapper</code> 这些官方类名，所以两列的圆角、边框、配色来自同一份
      CSS 变量 —— 换主题、开暗色、升版本都会一起变。
    </p>
    <div class="ep-compare">
      <div class="ep-compare-col">
        <div class="ep-compare-label">真实组件（交互态）</div>
        <div class="ep-compare-cell"><ElInput v-model="sample.name" size="small" /></div>
        <div class="ep-compare-cell">
          <ElRadioGroup v-model="sample.gender" size="small">
            <ElRadioButton v-for="o in genderOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </ElRadioButton>
          </ElRadioGroup>
        </div>
        <div class="ep-compare-cell">
          <ElSelect
            v-model="sample.skills"
            size="small"
            multiple
            collapse-tags
            :max-collapse-tags="1"
            style="width: 100%"
          >
            <ElOption v-for="s in skillOptions" :key="s" :label="s" :value="s" />
          </ElSelect>
        </div>
        <div class="ep-compare-cell">
          <ElTimePicker
            v-model="sample.workTime"
            size="small"
            format="HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </div>
        <div class="ep-compare-cell">
          <ElSelect v-model="sample.status" size="small" style="width: 100%">
            <ElOption v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </div>
        <div class="ep-compare-cell">
          <ElCheckboxGroup v-model="sample.skills" size="small">
            <ElCheckboxButton v-for="s in quickOptions" :key="s" :value="s">
              {{ s }}
            </ElCheckboxButton>
          </ElCheckboxGroup>
        </div>
      </div>

      <div class="ep-compare-col">
        <div class="ep-compare-label">查看态轻 DOM（零组件实例）</div>
        <div class="ep-compare-cell" v-html="epInput(sample.name, '请输入姓名')" />
        <div class="ep-compare-cell" v-html="epRadioGroup(genderOptions, sample.gender)" />
        <div
          class="ep-compare-cell"
          v-html="epSelectTags(sample.skills, '请选择技能')"
        />
        <div class="ep-compare-cell" v-html="epTimePicker(sample.workTime)" />
        <div
          class="ep-compare-cell"
          v-html="epSelectText(statusLabel(sample.status))"
        />
        <div
          class="ep-compare-cell"
          v-html="epCheckboxGroup(quickOptions, sample.skills)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
/**
 * 这个 demo 的用途是**对照**，不是组件覆盖度展示。
 *
 * 两套列定义共用同一批数据、同一批组件配置（都是 size=small），唯一的差别是单元格怎么渲染：
 *
 *   - `inlineColumns`：`render` 返回真实组件 VNode，没有 `renderEditor`（组件自己就能交互）
 *   - `splitColumns` ：`render` 返回静态轻 DOM 字符串（`ep-view.ts`，复用 el 官方类名），
 *                      `renderEditor` 才挂真实组件 —— 由 `vtCellEditor` 收进单个复用浮层
 *
 * 原示例里的 ElDropdown 列去掉了：它的触发器本来就是一个原生 button，
 * 放在这里没有区分度。换成 ElSelect 单选，六列全部是「真·第三方组件」。
 */
import { computed, defineComponent, onMounted, onUnmounted, reactive, ref, type VNode } from 'vue';
import { VirtTableVue, type VueTableColumn, vtCellEditor } from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';
import {
  ElCheckboxButton,
  ElCheckboxGroup,
  ElInput,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElTimePicker,
  type CheckboxGroupValueType,
} from 'element-plus';
import 'element-plus/dist/index.css';
import {
  epCheckboxGroup,
  epInput,
  epRadioGroup,
  epSelectTags,
  epSelectText,
  epTimePicker,
} from './ep-view';

type Mode = 'inline' | 'split';

const MODE_LABEL: Record<Mode, string> = {
  inline: '直接渲染组件',
  split: '分离渲染',
};

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  gender: string;
  skills: string[];
  workTime: string;
  status: string;
}

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
];
const skillOptions = ['Vue', 'React', 'TypeScript', 'Node.js', 'Rust'];
/** ElCheckboxGroup 那列只给三个短选项，避免换行把行高顶开、干扰两个模式的横向对比 */
const quickOptions = ['Vue', 'React', 'Rust'];
const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'done', label: '已完成' },
];

function statusLabel(v: unknown): string {
  return statusOptions.find((o) => o.value === v)?.label ?? '';
}
function skillLabels(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

// ---------------------------------------------------------------- 计数

const stats = reactive({ renderCalls: 0, mounts: 0, unmounts: 0 });

function resetStats(): void {
  stats.renderCalls = 0;
  stats.mounts = 0;
  stats.unmounts = 0;
}

/**
 * 只做一件事：数真实组件实例的挂载 / 卸载次数。
 *
 * 这是「不分离」代价最直接的读数 —— 滚一趟看它涨多少。分离模式下它基本不动，
 * 因为查看态是字符串，压根没有 Vue 实例。
 */
const CellProbe = defineComponent({
  name: 'CellProbe',
  setup(_props, { slots }) {
    onMounted(() => {
      stats.mounts += 1;
    });
    onUnmounted(() => {
      stats.unmounts += 1;
    });
    return () => slots.default?.();
  },
});

const stop = (e: Event) => e.stopPropagation();

/**
 * 直接渲染模式的单元格外壳。
 *
 * 三个事件都要挡住：组件的点击 / 双击落到表格上会触发单元格选中与编辑逻辑，
 * 和组件自己的交互打架（vanilla 侧给内置组件准备的 `stopCellInterference` 就是干这个）。
 * 代价是表格自身的单元格高亮在这个模式下等于废掉了 —— 也算「不分离」的一笔隐性开销。
 */
function inlineCell(node: VNode): VNode {
  stats.renderCalls += 1;
  return (
    <div class="ep-cell" onMousedown={stop} onClick={stop} onDblclick={stop}>
      <CellProbe>{{ default: () => node }}</CellProbe>
    </div>
  );
}

/** 分离模式的查看态外壳：纯字符串，走 `innerHTML`，不进 Vue 的挂载点表 */
function viewCell(html: string): string {
  stats.renderCalls += 1;
  return `<div class="ep-cell">${html}</div>`;
}

// ---------------------------------------------------------------- 写值

const tableRef = ref<VirtTableVueInstance | null>(null);

/**
 * 直接渲染模式：组件自己持有 DOM 状态，写回行数据就够，**不能** `forceUpdate`。
 * 一 forceUpdate 就重填整个视口，正在编辑的组件被销毁重建 —— 输入框当场失焦、
 * 打开的下拉当场关掉。这是这个模式的固有毛病，不是这里偷懒。
 */
function setInline(row: Row, key: string, val: unknown): void {
  row[key] = val;
}

/** 分离模式：查看态是静态 DOM，改完必须刷一次才看得到新值 */
function setSplit(row: Row, key: string, val: unknown): void {
  row[key] = val;
  tableRef.value?.forceUpdate();
}

/** 编辑浮层挂上来就聚焦；没暴露 `focus` 的组件自动跳过 */
const autofocus = {
  onVnodeMounted: (vnode: VNode) => {
    (vnode.component?.exposed as { focus?: () => void } | null)?.focus?.();
  },
};

// ---------------------------------------------------------------- 列定义

const inlineColumns: VueTableColumn<Row>[] = [
  {
    key: 'name',
    title: '姓名 (ElInput)',
    width: 170,
    render: ({ value, row }) =>
      inlineCell(
        <ElInput
          size='small'
          modelValue={value as string}
          onUpdate:modelValue={(v: string) => setInline(row, 'name', v)}
        />,
      ),
  },
  {
    key: 'gender',
    title: '单选 (ElRadioGroup)',
    width: 220,
    render: ({ value, row }) =>
      inlineCell(
        <ElRadioGroup
          size='small'
          modelValue={value as string}
          onUpdate:modelValue={(v: string | number | boolean | undefined) =>
            setInline(row, 'gender', v)
          }
        >
          {genderOptions.map((o) => (
            <ElRadioButton key={o.value} value={o.value}>
              {o.label}
            </ElRadioButton>
          ))}
        </ElRadioGroup>,
      ),
  },
  {
    key: 'skills',
    title: '多选 (ElSelect)',
    width: 250,
    render: ({ value, row }) =>
      inlineCell(
        <ElSelect
          size='small'
          modelValue={skillLabels(value)}
          onUpdate:modelValue={(next: string[]) => setInline(row, 'skills', next)}
          multiple
          collapseTags
          maxCollapseTags={1}
          clearable
          style='width:100%;'
        >
          {skillOptions.map((s) => (
            <ElOption key={s} label={s} value={s} />
          ))}
        </ElSelect>,
      ),
  },
  {
    key: 'workTime',
    title: '时间 (ElTimePicker)',
    width: 200,
    render: ({ value, row }) =>
      inlineCell(
        <ElTimePicker
          size='small'
          modelValue={value as string}
          onUpdate:modelValue={(next: string) => setInline(row, 'workTime', next)}
          style='width:100%;'
          format='HH:mm:ss'
          valueFormat='YYYY-MM-DD HH:mm:ss'
        />,
      ),
  },
  {
    key: 'status',
    title: '状态 (ElSelect)',
    width: 170,
    render: ({ value, row }) =>
      inlineCell(
        <ElSelect
          size='small'
          modelValue={value as string}
          onUpdate:modelValue={(next: string) => setInline(row, 'status', next)}
          style='width:100%;'
        >
          {statusOptions.map((o) => (
            <ElOption key={o.value} label={o.label} value={o.value} />
          ))}
        </ElSelect>,
      ),
  },
  {
    key: 'skillsQuick',
    title: '多选快捷 (ElCheckboxGroup)',
    width: 260,
    render: ({ row }) =>
      inlineCell(
        <ElCheckboxGroup
          size='small'
          modelValue={skillLabels(row.skills)}
          onUpdate:modelValue={(next: CheckboxGroupValueType) =>
            setInline(row, 'skills', next)
          }
        >
          {quickOptions.map((s) => (
            <ElCheckboxButton key={s} value={s}>
              {s}
            </ElCheckboxButton>
          ))}
        </ElCheckboxGroup>,
      ),
  },
];

const splitColumns: VueTableColumn<Row>[] = [
  {
    key: 'name',
    title: '姓名 (ElInput)',
    width: 170,
    render: ({ value }) => viewCell(epInput(value, '请输入姓名')),
    renderEditor: ({ value, row }) => (
      <ElInput
        {...autofocus}
        size='small'
        modelValue={value as string}
        onUpdate:modelValue={(v: string) => setSplit(row, 'name', v)}
      />
    ),
  },
  {
    key: 'gender',
    title: '单选 (ElRadioGroup)',
    width: 220,
    render: ({ value }) => viewCell(epRadioGroup(genderOptions, value)),
    renderEditor: ({ value, row }) => (
      <ElRadioGroup
        size='small'
        modelValue={value as string}
        onUpdate:modelValue={(v: string | number | boolean | undefined) =>
          setSplit(row, 'gender', v)
        }
      >
        {genderOptions.map((o) => (
          <ElRadioButton key={o.value} value={o.value}>
            {o.label}
          </ElRadioButton>
        ))}
      </ElRadioGroup>
    ),
  },
  {
    key: 'skills',
    title: '多选 (ElSelect)',
    width: 250,
    render: ({ value }) => viewCell(epSelectTags(skillLabels(value), '请选择技能')),
    renderEditor: ({ value, row }) => (
      <ElSelect
        {...autofocus}
        size='small'
        modelValue={skillLabels(value)}
        onUpdate:modelValue={(next: string[]) => setSplit(row, 'skills', next)}
        multiple
        collapseTags
        maxCollapseTags={1}
        clearable
        automaticDropdown
        style='width:100%;'
      >
        {skillOptions.map((s) => (
          <ElOption key={s} label={s} value={s} />
        ))}
      </ElSelect>
    ),
  },
  {
    key: 'workTime',
    title: '时间 (ElTimePicker)',
    width: 200,
    render: ({ value }) => viewCell(epTimePicker(value)),
    renderEditor: ({ value, row }) => (
      <ElTimePicker
        {...autofocus}
        size='small'
        modelValue={value as string}
        onUpdate:modelValue={(next: string) => setSplit(row, 'workTime', next)}
        style='width:100%;'
        format='HH:mm:ss'
        valueFormat='YYYY-MM-DD HH:mm:ss'
      />
    ),
  },
  {
    key: 'status',
    title: '状态 (ElSelect)',
    width: 170,
    render: ({ value }) => viewCell(epSelectText(statusLabel(value))),
    renderEditor: ({ value, row }) => (
      <ElSelect
        {...autofocus}
        size='small'
        modelValue={value as string}
        onUpdate:modelValue={(next: string) => setSplit(row, 'status', next)}
        automaticDropdown
        style='width:100%;'
      >
        {statusOptions.map((o) => (
          <ElOption key={o.value} label={o.label} value={o.value} />
        ))}
      </ElSelect>
    ),
  },
  {
    key: 'skillsQuick',
    title: '多选快捷 (ElCheckboxGroup)',
    width: 260,
    render: ({ row }) => viewCell(epCheckboxGroup(quickOptions, skillLabels(row.skills))),
    renderEditor: ({ row }) => (
      <ElCheckboxGroup
        size='small'
        modelValue={skillLabels(row.skills)}
        onUpdate:modelValue={(next: CheckboxGroupValueType) =>
          setSplit(row, 'skills', next)
        }
      >
        {quickOptions.map((s) => (
          <ElCheckboxButton key={s} value={s}>
            {s}
          </ElCheckboxButton>
        ))}
      </ElCheckboxGroup>
    ),
  },
];

// ---------------------------------------------------------------- 数据与配置

/** 行数给得多一点，压测才滚得开（240 帧 × 30px ≈ 7200px，远小于 2000 行的总高） */
const ROW_COUNT = 2000;
const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: faker.person.fullName(),
  gender: genderOptions[i % genderOptions.length]!.value,
  skills: skillOptions.slice(0, (i % skillOptions.length) + 1),
  workTime: `2025-01-01 ${String(9 + (i % 8)).padStart(2, '0')}:00:00`,
  status: statusOptions[i % statusOptions.length]!.value,
}));

/** 默认走分离渲染 —— 这是推荐用法，直接渲染那一档留着做对照 */
const mode = ref<Mode>('split');
const columns = computed(() => (mode.value === 'inline' ? inlineColumns : splitColumns));

/**
 * 两个模式的 options 完全一致（含插件），差别只在列 —— 对照才公平。
 * `vtCellEditor` 在直接渲染模式下没有 `renderEditor` 可用，等于空转，留着不影响结果。
 */
const options = computed(() => ({
  list,
  itemKey: 'id',
  // `chrome: false`：整表都是 Element Plus，组件自带边框与 focus 环，浮层不能再画一层
  // （否则两层框叠在一起、高度也对不上）。只有部分列用第三方组件时，改用列上的
  // `editorChrome: false` 单列声明即可，粒度更细
  plugins: [vtCellEditor({ chrome: false })],
  estimatedSize: 36,
  buffer: 4,
  border: true,
  textOverflow: 'ellipsis' as const,
  highlightSelectCell: true,
}));

const status = ref(
  `${ROW_COUNT} 行 × 6 列第三方组件，当前为默认的「分离渲染」。点单元格可编辑；` +
    `切到「直接渲染组件」后各点一次「滚动压测」即可对比。`,
);

// ---------------------------------------------------------------- 压测

interface Metrics {
  frames: number;
  avgFps: number;
  p95: number;
  max: number;
  longFrames: number;
  renderCalls: number;
  mounts: number;
  unmounts: number;
}

const results = reactive<Record<Mode, Metrics | null>>({ inline: null, split: null });
const running = ref(false);

/** 每帧滚动像素，约等于用力拖滚动条 */
const SCROLL_STEP_PX = 30;
/** 采样帧数，240 帧在 60fps 下约 4 秒 */
const BENCH_FRAMES = 240;

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const round1 = (n: number) => Math.round(n * 10) / 10;

async function runBenchmark(): Promise<void> {
  const t = tableRef.value;
  if (!t || running.value) return;

  running.value = true;
  status.value = `压测中：${MODE_LABEL[mode.value]}…`;

  t.scrollToTop();
  // 两帧空转，等回到顶部的那次重填结算完，别把它算进采样
  await nextFrame();
  await nextFrame();
  resetStats();

  const frames: number[] = [];
  let offset = 0;
  let last = performance.now();

  await new Promise<void>((resolve) => {
    function step() {
      const now = performance.now();
      frames.push(now - last);
      last = now;
      if (frames.length >= BENCH_FRAMES) {
        resolve();
        return;
      }
      offset += SCROLL_STEP_PX;
      t!.scrollToOffset(offset);
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  // 首帧是 rAF 自己的调度间隔，不含渲染成本
  const samples = frames.slice(1).sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);

  results[mode.value] = {
    frames: samples.length,
    avgFps: Math.round(1000 / (sum / samples.length)),
    p95: round1(samples[Math.floor(samples.length * 0.95)] ?? 0),
    max: round1(samples[samples.length - 1] ?? 0),
    longFrames: samples.filter((f) => f > 16.7).length,
    renderCalls: stats.renderCalls,
    mounts: stats.mounts,
    unmounts: stats.unmounts,
  };

  running.value = false;
  status.value = `压测完成：${MODE_LABEL[mode.value]}，平均 ${results[mode.value]!.avgFps} FPS`;
}

function switchMode(next: Mode): void {
  if (running.value || mode.value === next) return;
  mode.value = next;
  resetStats();
  status.value = `已切到「${MODE_LABEL[next]}」，表格已重建。`;
}

function resetAll(): void {
  results.inline = null;
  results.split = null;
  resetStats();
  status.value = '结果已清空。';
}

function scrollRandom(): void {
  tableRef.value?.scrollToIndex(Math.floor(Math.random() * ROW_COUNT));
}

function fpsClass(fps: number): string {
  if (fps >= 55) return 'ep-fps-good';
  if (fps >= 40) return 'ep-fps-warn';
  return 'ep-fps-bad';
}

// ---------------------------------------------------------------- 外观对照区的样本值

const sample = reactive({
  name: faker.person.fullName(),
  gender: 'female',
  skills: ['Vue', 'React'],
  workTime: '2025-01-01 09:30:00',
  status: 'processing',
});
</script>

<style>
/* 单元格外壳：两个模式共用，保证内边距一致，横向对比才公平。
   注意**不要再加水平 padding** —— 内边距统一由 `.vt-td` 的 `--vt-cell-padding-x` 提供
   （见核心 index.css 的注释），这里再补一层就是重复内缩，激活时内容会往左跳。 */
.ep-cell {
  display: flex;
  align-items: center;
  height: 100%;
}

/* 查看态里 <span> 顶替了 <input>，::placeholder 用不上，占位色自己给 —— 仍然用官方变量 */
.ep-view-ph {
  color: var(--el-text-color-placeholder);
}

.ep-note {
  margin: 8px 0 12px;
  padding: 10px 14px;
  border-left: 3px solid #165dff;
  border-radius: 4px;
  background: #f4f7ff;
  font-size: 13px;
  line-height: 1.7;
  color: #4e5969;
}
.ep-note p {
  margin: 0 0 6px;
}
.ep-note ul {
  margin: 0;
  padding-left: 18px;
}
.ep-note code {
  padding: 1px 4px;
  border-radius: 3px;
  background: #e8eeff;
  font-size: 12px;
}

.ep-mode-btn.is-active {
  border-color: #165dff;
  background: #165dff;
  color: #fff;
}
.ep-sep {
  display: inline-block;
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: #e5e6eb;
  vertical-align: middle;
}

.ep-live {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 4px;
  background: #f7f8fa;
  font-size: 12px;
  color: #4e5969;
}
.ep-live b {
  color: #1d2129;
  font-variant-numeric: tabular-nums;
}

.ep-result {
  width: 100%;
  margin: 8px 0 12px;
  border-collapse: collapse;
  font-size: 12px;
}
.ep-result th,
.ep-result td {
  padding: 6px 10px;
  border: 1px solid #e5e6eb;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ep-result th:first-child,
.ep-result td:first-child {
  text-align: left;
}
.ep-result th {
  background: #f7f8fa;
  color: #4e5969;
  font-weight: 500;
}
.ep-result-empty {
  text-align: center !important;
  color: #a8abb2;
}
.ep-fps-good {
  color: #22c55e;
  font-weight: 600;
}
.ep-fps-warn {
  color: #f59e0b;
  font-weight: 600;
}
.ep-fps-bad {
  color: #f53f3f;
  font-weight: 600;
}

.ep-compare-title {
  margin: 24px 0 6px;
  font-size: 14px;
}
.ep-compare-desc {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.7;
  color: #86909c;
}
.ep-compare-desc code {
  padding: 1px 4px;
  border-radius: 3px;
  background: #f2f3f5;
}
.ep-compare {
  display: flex;
  gap: 24px;
  padding: 16px;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  background: #fff;
}
.ep-compare-col {
  flex: 0 0 260px;
}
.ep-compare-label {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #4e5969;
}
.ep-compare-cell {
  display: flex;
  align-items: center;
  height: 40px;
  width: 240px;
}
</style>
