# 撤销 / 重做

<ProPkgStatus pkg="@virt-table-pro/undo" status="shipped" css="none" />

<ProDemo pkg="@virt-table-pro/undo" example-id="pro-undo" />

<!--@include: @/.enterprise/undo/s0.md-->

```tsx
import { useState, useRef } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtUndo, type HistoryChangeInfo } from '@virt-table-pro/undo';

const EMPTY: HistoryChangeInfo = { canUndo: false, canRedo: false, labels: { undo: [], redo: [] } };

export function Table() {
  const tableRef = useRef<VirtTableRef>(null);
  // onChange 直接喂 setState —— 顺序问题在 React 里自然消失（首次回调时组件已存在）
  const [history, setHistory] = useState<HistoryChangeInfo>(EMPTY);

  return (
    <>
      <button
        disabled={!history.canUndo}
        title={history.canUndo ? `撤销：${history.labels.undo[0]}` : '没有可撤销的操作'}
        onClick={() => tableRef.current?.undo()}
      >
        撤销
      </button>
      <button disabled={!history.canRedo} onClick={() => tableRef.current?.redo()}>
        重做
      </button>
      <VirtTableReact
        ref={tableRef}
        columns={columns}
        options={{
          list: rows,
          itemKey: 'id',
          estimatedSize: 40,
          plugins: [vtUndo({ limit: 100, onChange: setHistory })],
        }}
      />
    </>
  );
}
```

<!--@include: @/.enterprise/undo/s1.md-->

```tsx
/*
 * 列定义常常是模块级常量（三端共用），拿不到组件里的 ref。playground 用一层「编辑通知桥」
 * 解开这个结：编辑器只喊一声「我改了什么」，组件订阅后翻译成 recordChange。
 * 真实项目里列定义通常就在持有 ref 的组件里，可以直接闭包引用，不需要这一层。
 */
useEffect(() => {
  onCellEdit(({ row, key, before, after, label }) => {
    tableRef.current?.recordChange({
      label,
      undo: () => {
        row[key] = before;
        tableRef.current?.forceUpdate();
      },
      redo: () => {
        row[key] = after;
        tableRef.current?.forceUpdate();
      },
    });
  });
  // **卸载必须取消订阅**：桥接只记一个监听者，不解绑会留下指向已销毁表格的闭包，
  // 而严格模式下 effect 还会跑两遍
  return () => onCellEdit(null);
}, []);
```

<!--@include: @/.enterprise/undo/s2.md-->
