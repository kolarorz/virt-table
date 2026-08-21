<script setup lang="ts">
/**
 * 小图标（Vue 端的外壳）。**path 数据来自 `shared/icons.ts`，三端共用一份** ——
 * 这里只负责把它包成模板，不做设计。
 */
import { ICON_SVG_ATTRS } from '../../../pro-kit/shared/icons';

defineProps<{ paths: string[] }>();
</script>

<template>
  <svg
    :viewBox="ICON_SVG_ATTRS.viewBox"
    :width="ICON_SVG_ATTRS.width"
    :height="ICON_SVG_ATTRS.height"
    :fill="ICON_SVG_ATTRS.fill"
    :stroke="ICON_SVG_ATTRS.stroke"
    :stroke-width="ICON_SVG_ATTRS.strokeWidth"
    :stroke-linecap="ICON_SVG_ATTRS.strokeLinecap"
    :stroke-linejoin="ICON_SVG_ATTRS.strokeLinejoin"
    aria-hidden="true"
  >
    <path v-for="d in paths" :key="d" :d="d" />
  </svg>
</template>
