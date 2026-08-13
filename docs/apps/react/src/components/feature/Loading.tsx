import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  city: string;
}

function genList(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    city: faker.location.city(),
  }));
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 180 },
  { key: 'email', title: '邮箱', width: 260 },
  { key: 'city', title: '城市', width: 160 },
];

export default function LoadingTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // 首屏数据只造一次：`options` 里直接写 genList(500) 会在每次渲染时重造
  const list = React.useMemo(() => genList(500), []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 加载态</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={() => {
            tableRef.current?.setLoading(true);
            timerRef.current = setTimeout(() => tableRef.current?.setLoading(false), 1500);
          }}
        >
          显示加载态
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => {
            tableRef.current?.setLoading(true);
            timerRef.current = setTimeout(() => {
              tableRef.current?.setList(genList(500));
              tableRef.current?.setLoading(false);
            }, 1500);
          }}
        >
          模拟异步刷新数据 (1.5s)
        </button>
      </div>
      <div style={{ width: 720, height: 480 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            loadingText: '数据加载中...',
          }}
        />
      </div>
    </div>
  );
}
