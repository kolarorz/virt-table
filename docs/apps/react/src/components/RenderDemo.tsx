import React from 'react';
import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row {
  id: number;
  name: string;
  age: number;
  city: string;
  score: number;
  [k: string]: any;
}

function RatingBar({ value }: { value: number }) {
  const color = value >= 80 ? '#00b42a' : value >= 60 ? '#ff7d00' : '#f53f3f';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 6, background: '#f2f3f5', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color, minWidth: 28 }}>{value}</span>
    </div>
  );
}

function CityTag({ text }: { text: string }) {
  const colors: Record<string, string> = {
    '北京': '#165dff', '上海': '#0fc6c2', '杭州': '#7816ff',
    '深圳': '#ff7d00', '广州': '#00b42a',
  };
  const bg = colors[text] || '#86909c';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontSize: 12, color: '#fff', background: bg,
    }}>
      {text}
    </span>
  );
}

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  name: faker.person.fullName(),
  age: 20 + Math.floor(Math.random() * 40),
  city: ['北京', '上海', '杭州', '深圳', '广州'][i % 5]!,
  score: Math.floor(Math.random() * 100),
}));

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  {
    key: 'name',
    title: '姓名',
    width: 180,
    render: (value) => <span style={{ fontWeight: 500, color: '#1d2129' }}>{value}</span>,
  },
  { key: 'age', title: '年龄', width: 80 },
  {
    key: 'city',
    title: '城市',
    width: 120,
    render: (value) => <CityTag text={value} />,
  },
  {
    key: 'score',
    title: '分数',
    width: 160,
    render: (value) => <RatingBar value={value} />,
  },
];

export default function RenderDemo() {
  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 12px', color: '#1d2129' }}>React 组件渲染单元格</h3>
      <div style={{ color: '#86909c', fontSize: 13, marginBottom: 8 }}>
        render 返回 JSX，框架自动挂载/卸载
      </div>
      <div style={{ width: 800, height: 500, border: '1px solid #e5e6eb' }}>
        <VirtTableReact
          columns={columns}
          options={{ list, itemKey: 'id', minSize: 40, buffer: 4, border: true }}
        />
      </div>
    </div>
  );
}
