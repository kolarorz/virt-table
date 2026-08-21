# 甘特图

<ProPkgStatus pkg="@virt-table-pro/gantt" status="partial" product="gantt" css="index.css" />

<ProDemo pkg="@virt-table-pro/gantt" example-id="demo-project-wbs" />

<!--@include: @/.enterprise/gantt/index/s0.md-->

```ts
import { VirtTable } from '@virt-table/vanilla';
import { vtGantt } from '@virt-table-pro/gantt';
import '@virt-table-pro/gantt/index.css';

const table = new VirtTable<Task>(el, {
  list: tasks,
  itemKey: 'id',
  estimatedSize: 40,
  // 建议固定行高（甘特的行本来就该等高），见「内部机制 · 对宿主表格的要求」那页
  fixedSize: true,
  defaultExpandAll: true,
  columns: [
    // 任务列冻结在左侧 —— 这就是「左表格 + 右时间轴」的观感，但只有一个滚动容器
    { key: 'name', title: '任务', width: 220, type: 'tree' },
    { key: 'owner', title: '负责人', width: 90 },
  ],
  plugins: [
    vtGantt<Task>({
      start: 'start',
      end: 'end',
      progress: 'progress',
      markers: [{ date: '2026-09-01', label: 'v2.0 发布' }],
      editable: { move: true, resize: true, create: true, marker: true },
      onChange: (e) => {
        // 插件**不写回**行数据，见「交互 · 写回约定」那页
        const task = findTask(tasks, e.rowKey);
        if (!task) return;
        task.start = toISODate(e.start);
        task.end = toISODate(e.end);
        table.refreshGantt();
      },
    }),
  ],
});
```

<!--@include: @/.enterprise/gantt/index/s1.md-->
