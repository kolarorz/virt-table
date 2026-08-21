# 甘特图

<ProPkgStatus pkg="@virt-table-pro/gantt" status="partial" product="gantt" css="index.css" />

<ProDemo pkg="@virt-table-pro/gantt" example-id="pro-gantt" />

<!--@include: @/.enterprise/gantt/index/s0.md-->

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue } from '@virt-table/vue';
import type { VirtTablePluginApi } from '@virt-table/vanilla';
import { vtGantt } from '@virt-table-pro/gantt';
import '@virt-table-pro/gantt/index.css';

// Vue 端的 ref 类型要自己交叉一个 VirtTablePluginApi（运行时方法都在，只是类型到不了）
type TableInstance = VirtTablePluginApi & { forceUpdate(): void };
const ganttRef = ref<TableInstance | null>(null);

const columns = [
  { key: 'name', title: '任务', width: 220, type: 'tree' },
  { key: 'owner', title: '负责人', width: 90 },
];

const options = {
  list: tasks,
  itemKey: 'id',
  estimatedSize: 40,
  fixedSize: true,
  defaultExpandAll: true,
  plugins: [
    vtGantt<Task>({
      start: 'start',
      end: 'end',
      progress: 'progress',
      editable: { move: true, resize: true, create: true, marker: true },
      onChange: (e) => {
        // 插件**不写回**行数据，见「写回约定」
        const task = findTask(tasks, e.rowKey);
        if (!task) return;
        task.start = toISODate(e.start);
        task.end = toISODate(e.end);
        ganttRef.value?.refreshGantt();
      },
    }),
  ],
};
</script>

<template>
  <button @click="ganttRef?.setGanttZoom('week')">周视图</button>
  <VirtTableVue ref="ganttRef" :columns="columns" :options="options" />
</template>
```

<!--@include: @/.enterprise/gantt/index/s1.md-->
