<script setup lang="ts">
/**
 * 「AI 场景」页的主体：三个场景卡片 + 一块随选择切换的在线 demo。
 *
 * 为什么是切换而不是三个 demo 并排：这三个 demo 分别造 10 万 / 5 万行数据，
 * 三个 qiankun 实例同时挂载会让首屏卡住好几秒 —— 而这页是给第一次来的人看的。
 * `PlaygroundHost` 自己 watch 了 exampleId，换 id 即卸载重挂，同时只有一个实例活着。
 */
import { computed, ref } from 'vue';
import { withBase } from 'vitepress';

type FrameworkKind = 'vanilla' | 'vue' | 'react';

const props = withDefaults(defineProps<{ framework?: FrameworkKind }>(), {
  framework: 'vanilla',
});

/** demo id 的前缀：vanilla 侧历史上用 `table-`，框架侧用框架名 */
const ID_PREFIX: Record<FrameworkKind, string> = {
  vanilla: 'table',
  vue: 'vue',
  react: 'react',
};

interface Scenario {
  /** 同时用作 demo id 后缀与完整示例的页面 slug */
  key: 'ai-query' | 'ai-column' | 'ai-stream';
  icon: string;
  name: string;
  /** 卡片上的一句话 */
  tagline: string;
  /** 展开后的卖点，每条一行 */
  points: string[];
  /** demo 下方的操作提示 */
  hint: string;
}

const SCENARIOS: Scenario[] = [
  {
    key: 'ai-stream',
    icon: '🌊',
    name: '流式表格',
    tagline: 'agent 边跑边吐，表格边收边长',
    points: [
      '初始**没有任何列配置**，列是首批数据到达时推断出来的（类型、标题、宽度、对齐都算出来）',
      '吃任何 `AsyncIterable`：SSE、`ReadableStream`、异步生成器都行',
      '一次灌 2 万行也不掉帧（按帧分批落地）；往上滚脱离底部跟随，滚回底部自动恢复',
    ],
    hint: '点「开始接收」看列自己长出来，再点「灌 2 万行」压一压。',
  },
  {
    key: 'ai-column',
    icon: '✨',
    name: 'AI 列',
    tagline: '5 万行的表，只为你看得见的行付钱',
    points: [
      '一列的值由模型从同行其他列算出来，逐 token 写进单元格',
      '**只有滚到的行才会触发调用** —— 全量跑一遍是 5 万次请求，虚拟化让它变成「二十来次 × 你实际看过的屏数」',
      '滚走时未完成的请求自动 abort，右侧计数器实时显示 已调用 / 在途 / 已取消',
    ],
    hint: '往下滚几屏，盯着计数器看它涨多少 —— 那就是你真实要付的钱。',
  },
  {
    key: 'ai-query',
    icon: '💬',
    name: '自然语言查询',
    tagline: '一句话筛出 10 万行里要的那几行',
    points: [
      '说人话即可：「华东区销售额超过 500 万的客户」→ 筛选 + 排序 + 列显隐一次到位',
      '模型只负责产出 JSON，插件负责**校验纠错**：填错枚举值、数字写成字符串、幻觉出不存在的列，都能在落地前救回来',
      '结果经一次 `setState()` 落地，可一键撤销回上一个视图',
    ],
    hint: '点上方预设句子，或按 Cmd/Ctrl + K 自己输入。',
  },
];

// 默认选中**第一张卡**，不写死某个 key：调整 SCENARIOS 顺序时不用记得同步改这里
const active = ref<Scenario['key']>(SCENARIOS[0]!.key);
const activeScenario = computed(
  () => SCENARIOS.find((s) => s.key === active.value) ?? SCENARIOS[0]!,
);
const activeExampleId = computed(
  () => `${ID_PREFIX[props.framework]}-${activeScenario.value.key}`,
);
const fullExampleHref = computed(() =>
  withBase(`/${props.framework}/examples/ai/${activeScenario.value.key}`),
);
</script>

<template>
  <div class="ai-scenarios">
    <div class="ai-cards">
      <button
        v-for="s in SCENARIOS"
        :key="s.key"
        type="button"
        class="ai-card"
        :class="{ 'is-active': s.key === active }"
        :aria-pressed="s.key === active"
        @click="active = s.key"
      >
        <span class="ai-card-icon" aria-hidden="true">{{ s.icon }}</span>
        <span class="ai-card-body">
          <span class="ai-card-name">{{ s.name }}</span>
          <span class="ai-card-tagline">{{ s.tagline }}</span>
        </span>
      </button>
    </div>

    <div class="ai-panel">
      <ul class="ai-points">
        <li v-for="(p, i) in activeScenario.points" :key="i" class="ai-point" v-html="p" />
      </ul>

      <p class="ai-hint">
        <span class="ai-hint-tag">试一试</span>
        {{ activeScenario.hint }}
      </p>

      <!-- 同时只有这一个实例活着：换场景即卸载重挂 -->
      <PlaygroundHost :framework="props.framework" :example-id="activeExampleId" />

      <p class="ai-more">
        <a :href="fullExampleHref">查看完整示例与接真实模型的写法 →</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
/*
 * 全部走 class 选择器：scoped 会给选择器补 [data-v-xxx]，而 demo 内部的 DOM
 * 由 qiankun 同文档挂载、拿不到这个属性，所以天然不会被命中。
 * 但仍然不写任何裸元素后代选择器 —— PlaygroundHost 的根节点会继承父组件的
 * scope id，`.ai-panel div` 之类是会漏进 demo 外壳的。
 */
.ai-scenarios {
  margin: 24px 0 0;
}

.ai-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.ai-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--vtd-border);
  border-radius: var(--vtd-radius-lg);
  background: var(--vtd-bg-elevated);
  transition:
    border-color var(--vtd-transition-fast) var(--vtd-ease),
    background var(--vtd-transition-fast) var(--vtd-ease),
    box-shadow var(--vtd-transition-fast) var(--vtd-ease),
    transform var(--vtd-transition-fast) var(--vtd-ease);
}

.ai-card:hover {
  border-color: var(--vtd-primary-border);
  box-shadow: var(--vtd-shadow-sm);
  transform: translateY(-1px);
}

.ai-card.is-active {
  border-color: var(--vtd-primary);
  background: var(--vtd-primary-softer);
  box-shadow: var(--vtd-shadow-md);
}

.ai-card-icon {
  font-size: 22px;
  line-height: 1.2;
  flex-shrink: 0;
}

.ai-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ai-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--vtd-text);
}

.ai-card.is-active .ai-card-name {
  color: var(--vtd-primary);
}

.ai-card-tagline {
  font-size: 13px;
  line-height: 1.5;
  color: var(--vtd-text-2);
}

.ai-panel {
  margin-top: 20px;
}

.ai-points {
  margin: 0;
  padding: 16px 18px 16px 34px;
  list-style: disc;
  border: 1px solid var(--vtd-border-light);
  border-radius: var(--vtd-radius-lg);
  background: var(--vtd-bg-soft);
}

.ai-point {
  margin: 0;
  padding: 3px 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vtd-text-2);
}

.ai-hint {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 16px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vtd-text-2);
}

.ai-hint-tag {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: var(--vtd-radius-full);
  background: var(--vtd-primary-soft);
  color: var(--vtd-primary);
  font-size: 12px;
  font-weight: 600;
}

.ai-more {
  margin: 12px 0 0;
  font-size: 14px;
}
</style>
