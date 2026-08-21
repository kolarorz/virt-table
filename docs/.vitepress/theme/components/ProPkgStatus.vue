<script setup lang="ts">
/**
 * 付费插件页页头的状态条。
 *
 * 每页顶上要回答的三个问题是固定的：**这个包实现了没有**、**装它要不要引 CSS**、
 * **许可里的产品名叫什么**（`products: ['views']` 那个字符串）。写成组件是为了三样
 * 东西对齐：措辞、顺序、以及「占位包」那条醒目的提示。
 *
 * 与付费仓库里那份的唯一差异：**不显示源码路径**。那一行原来写的是
 * `packages/views/src` —— 付费仓库的目录结构，公开站上没有它的位置
 * （也不该让读者以为那个路径在本仓库里能找到）。
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 包名，如 `@virt-table-pro/views` */
    pkg: string;
    /** shipped = 已实现；partial = 一期能力已实现；placeholder = 占位包，装上只 warn */
    status?: 'shipped' | 'partial' | 'placeholder';
    /** 许可里的产品名(`assertLicensed('<product>')`)。省略则取包名后半段 */
    product?: string;
    /** 需要引的 CSS 子路径；`none` 表示这个包没有 CSS */
    css?: string;
  }>(),
  { status: 'shipped', product: '', css: '' },
);

const label: Record<NonNullable<typeof props.status>, string> = {
  shipped: '✅ 已发布',
  partial: '🟡 一期已发布',
  placeholder: '⬜ 规划中 · 尚未实现',
};

const product = computed(() => props.product || props.pkg.split('/')[1]);
</script>

<template>
  <div class="pro-pkg" :class="`pro-pkg--${props.status}`">
    <div class="pro-pkg-row">
      <code class="pro-pkg-name">{{ props.pkg }}</code>
      <span class="pro-pkg-badge">{{ label[props.status] }}</span>
    </div>
    <dl class="pro-pkg-grid">
      <dt>许可产品名</dt>
      <dd>
        <code>{{ product }}</code>
      </dd>
      <dt>样式</dt>
      <dd>
        <template v-if="props.css === 'none'">不需要引 CSS</template>
        <template v-else-if="props.css">
          <code>import '{{ props.pkg }}/{{ props.css }}'</code>
        </template>
        <template v-else>—</template>
      </dd>
    </dl>
    <p v-if="props.status === 'placeholder'" class="pro-pkg-warn">
      这个包目前是<b>占位骨架</b>：装上只会 <code>console.warn</code> 一次，不做任何事。
      下面写的是<b>计划中</b>的 API，以及在它发布之前用核心公开 API 怎么自己顶一下。
    </p>
  </div>
</template>

<style scoped>
.pro-pkg {
  margin: 0 0 24px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
}

.pro-pkg--placeholder {
  border-left-color: var(--vp-c-warning-1, #d97706);
}

.pro-pkg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pro-pkg-name {
  font-size: 14px;
  font-weight: 600;
}

.pro-pkg-badge {
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

.pro-pkg-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 14px;
  margin: 10px 0 0;
  font-size: 13px;
}

.pro-pkg-grid dt {
  color: var(--vp-c-text-3);
}

.pro-pkg-grid dd {
  margin: 0;
  color: var(--vp-c-text-2);
}

.pro-pkg-warn {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
</style>
