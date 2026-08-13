<script setup lang="ts">
defineProps<{
  items: Array<{
    name: string;
    type: string;
    default?: string;
    description: string;
  }>;
}>();
</script>

<!--
  外观完全复用 styles/doc-table.css 的 `.vtd-table` —— 与 Markdown 表格同一份来源，
  所以这里不写任何样式。`tabindex="0"` 与 markdown.config 注入的表格保持一致：
  表格是 display:block + overflow-x:auto，靠它让键盘用户能聚焦并横向滚动。
-->
<template>
  <table class="vtd-table" tabindex="0">
    <thead>
      <tr>
        <th>属性</th>
        <th>类型</th>
        <th>默认值</th>
        <th>说明</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in items" :key="item.name">
        <td><code>{{ item.name }}</code></td>
        <td><code>{{ item.type }}</code></td>
        <td>{{ item.default || '-' }}</td>
        <td>{{ item.description }}</td>
      </tr>
    </tbody>
  </table>
</template>
