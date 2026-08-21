import React from 'react';
import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  city: string;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 200, sortable: true },
  { key: 'age', title: '年龄', width: 140, sortable: true },
  { key: 'city', title: '城市', width: 200 },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 60 }),
  city: faker.location.city(),
}));

export default function AriaTable() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [out, setOut] = React.useState('');

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 无障碍 ARIA</h3>
      <div className="demo-hint">
        表格自动输出 ARIA 语义，便于屏幕阅读器识别。点击「检查」查看实际属性。
      </div>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const grid = container.querySelector('[role="grid"]');
            const th = container.querySelector('[role="columnheader"]');
            const cell = container.querySelector('[role="gridcell"]');
            setOut(
              `grid: aria-rowcount=${grid?.getAttribute('aria-rowcount')}, ` +
                `aria-colcount=${grid?.getAttribute('aria-colcount')} · ` +
                `columnheader aria-sort=${th?.getAttribute('aria-sort')} · ` +
                `gridcell role=${cell?.getAttribute('role')}`,
            );
          }}
        >
          检查 ARIA 属性
        </button>
        <span className="demo-note">{out}</span>
      </div>
      <div ref={containerRef} style={{ width: 680, height: 420 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 6, border: true }}
        />
      </div>
    </div>
  );
}
