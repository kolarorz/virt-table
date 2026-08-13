import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const COL_COUNT = 8;
const ROW_COUNT = 1000;

const columns: ReactTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
  key: `extra_${i}`,
  title: `列 ${i}`,
  width: 200,
}));

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
  }
  return row;
});

export default function ForceUpdateTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('空闲。将每秒更新前 4 列（extra_0～extra_3）并 forceUpdate。');
  const [running, setRunning] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = React.useRef(0);

  const tickUpdate = React.useCallback(() => {
    for (const row of list) {
      for (let c = 0; c < 4; c++) {
        row[`extra_${c}`] = faker.lorem.words(3);
      }
    }
    tickRef.current += 1;
    tableRef.current?.forceUpdate();
    setStatus(`自动更新中… tick=${tickRef.current}（已改 extra_0～extra_3）`);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 强制刷新（定时更新部分列）</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          disabled={running}
          onClick={() => {
            if (timerRef.current != null) return;
            setStatus('已启动定时器（每 1s）');
            setRunning(true);
            timerRef.current = setInterval(tickUpdate, 1000);
          }}
        >
          开始自动更新
        </button>
        <button
          type="button"
          disabled={!running}
          onClick={() => {
            if (timerRef.current == null) return;
            clearInterval(timerRef.current);
            timerRef.current = null;
            setRunning(false);
            setStatus('已停止自动更新');
          }}
        >
          停止自动更新
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true }}
        />
      </div>
    </div>
  );
}
