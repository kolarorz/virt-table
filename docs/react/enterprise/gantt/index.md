# 甘特图

<ProPkgStatus pkg="@virt-table-pro/gantt" status="partial" product="gantt" css="index.css" />

<ProDemo pkg="@virt-table-pro/gantt" example-id="pro-gantt" />

<!--@include: @/.enterprise/gantt/index/s0.md-->

```tsx
import { useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtGantt, type GanttZoom } from '@virt-table-pro/gantt';
import '@virt-table-pro/gantt/index.css';

export function GanttTable() {
  const ganttRef = useRef<VirtTableRef>(null);

  return (
    <>
      {(['day', 'week', 'month', 'quarter'] as GanttZoom[]).map((z) => (
        <button key={z} onClick={() => ganttRef.current?.setGanttZoom(z)}>
          {z}
        </button>
      ))}
      <VirtTableReact
        ref={ganttRef}
        columns={[
          // 任务列冻结在左侧 —— 这就是「左表格 + 右时间轴」的观感，但只有一个滚动容器
          { key: 'name', title: '任务', width: 220, type: 'tree' },
          { key: 'owner', title: '负责人', width: 90 },
        ]}
        options={{
          list: tasks,
          itemKey: 'id',
          estimatedSize: 40,
          fixedSize: true,
          defaultExpandAll: true,
          plugins: [
            vtGantt({
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
                ganttRef.current?.refreshGantt();
              },
            }),
          ],
        }}
      />
    </>
  );
}
```

<!--@include: @/.enterprise/gantt/index/s1.md-->
