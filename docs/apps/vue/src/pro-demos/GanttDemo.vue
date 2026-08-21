<script setup lang="ts">
/**
 * 甘特图 demo（Vue 端）。
 *
 * **与 Vanilla / React 端是同一份配置**（`pro-kit/shared/gantt-demo.ts`）与同一套参数：
 * 固定三层树、3035 行。Vanilla 那一端直接用经典案例「项目管理 WBS」那个示例
 * （`demo-project-wbs`），所以三个框架页签看到的是同一张表 —— 切页签只换实现语言。
 *
 * 形态切换（扁平 / 分组 / 树形）**刻意去掉了**：三端要一致，而经典案例是「一份可以对着
 * 需求抄的完整应用」，不是形态矩阵。共享层仍然支持那三档（`ganttData(shape)`），
 * 只是当前没有 demo 在用。
 */
import { onMounted, ref, shallowRef } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import { vtGantt, type GanttZoom } from '@virt-table-pro/gantt';
import '@virt-table-pro/gantt/index.css';
import { makeGanttMarkers } from '../../../pro-kit/shared/gantt-data';
import {
  GANTT_INTRO,
  countBuckets,
  ganttInfoText,
  ganttTableConfig,
  importCnHolidays,
  restoreDemoHolidays,
  type GanttShape,
} from '../../../pro-kit/shared/gantt-demo';
import type { ProTableInstance } from './types';

const emit = defineEmits<{ status: [string] }>();

const tableRef = ref<ProTableInstance | null>(null);
const markers = makeGanttMarkers();
/** 固定三层树 —— 与经典案例「项目管理 WBS」一致（见文件头） */
const WBS_SHAPE: GanttShape = { group: false, tree: true };
const zoom = ref<GanttZoom>('day');
const info = ref('时间轴未就绪');

const makeConfig = (nextShape: GanttShape) =>
  ganttTableConfig({
    // 由这一端注入 —— pro-kit 里不能引付费包的运行时值
    vtGantt,
    shape: nextShape,
    // 与经典案例「项目管理 WBS」同一套参数：3035 行、固定三层树
    scale: { leavesPerPhase: 600, tasksPerModule: 100 },
    zoom: zoom.value,
    markers: makeGanttMarkers(),
    refresh: () => tableRef.value?.refreshGantt?.(),
    setStatus: (text) => emit('status', text),
    onZoom: (next) => (zoom.value = next),
    onInfo: renderInfo,
  });

/** 配置整体替换，不需要深响应 */
const config = shallowRef(makeConfig(WBS_SHAPE));

function renderInfo(): void {
  const api = tableRef.value;
  if (!api) return;
  info.value = ganttInfoText({
    shape: WBS_SHAPE,
    zoom: zoom.value,
    data: config.value.list,
    range: api.getGanttRange?.() ?? null,
    markerCount: api.getGanttMarkers?.().length ?? 0,
    bucketCount: countBuckets(),
    /*
     * `canReorderRows()` 是核心的**实例方法**，但框架封装的 ref 只转发了一份白名单，
     * 而那份白名单里没有它（React 的 Proxy 只回落到**插件** API，不回落核心方法）。
     * 所以这里做降级：拿不到就按形态推 —— 核心的规则是分组 / 树形 / 排序 / 筛选下一律不许换序。
     * 核心把 ref 的类型与转发收敛成「core 实例方法全量透出」之后，这段就能删掉
     * （已记进文档站的「核心侧的已知缺口」）。
     */
    canReorder:
      (api as unknown as { canReorderRows?: () => boolean }).canReorderRows?.() ??
      (!WBS_SHAPE.group && !WBS_SHAPE.tree),
  });
}

onMounted(() => {
  emit('status', GANTT_INTRO);
  renderInfo();
});

/**
 * 假期表是**使用方传进来的**（插件不内置任何国家的调休安排 —— 那是每年由政府发布、
 * 每年不同的数据）。这颗按钮就是「使用方该怎么接」的示例：国办发明电〔2025〕7 号的
 * 2026 年安排，连补班日一起。
 */
const cnImported = ref(false);
const toggleCnHolidays = (): void => {
  const api = tableRef.value;
  if (!api) return;
  cnImported.value = !cnImported.value;
  emit(
    'status',
    cnImported.value
      ? importCnHolidays(api as never)
      : restoreDemoHolidays(api as never),
  );
  renderInfo();
};

const toggleMarkers = (): void => {
  const api = tableRef.value;
  if (!api) return;
  const on = (api.getGanttMarkers?.().length ?? 0) > 0;
  api.setGanttMarkers?.(on ? [] : markers);
  emit(
    'status',
    on ? '已隐藏里程碑竖线' : `已显示 ${markers.length} 条里程碑竖线（hover 看名字）`,
  );
  renderInfo();
};
</script>

<template>
  <div class="pg-toolbar">
    <button class="pg-btn" @click="toggleCnHolidays">
      {{ cnImported ? '恢复示例假期' : '导入 2026 年中国法定节假日' }}
    </button>
    <button class="pg-btn" @click="toggleMarkers">里程碑竖线开关</button>
  </div>

  <div class="pg-table">
    <VirtTableVue
      ref="tableRef"
      :columns="config.columns"
      :options="{
        list: config.list,
        itemKey: 'id',
        estimatedSize: 40,
        fixedSize: config.fixedSize,
        groupConfig: config.groupConfig,
        border: true,
        stripe: false,
        defaultExpandAll: true,
        plugins: config.plugins,
      }"
    />
  </div>

  <div class="pg-aside">
    <!-- 信息行有两行（形态 + 能否换序），默认 white-space 会把 \n 吃掉 -->
    <div class="pg-aside-box" style="white-space: pre-line">{{ info }}</div>
  </div>
</template>
