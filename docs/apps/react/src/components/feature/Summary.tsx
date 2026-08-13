import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  qty: number;
  price: number;
  total: number;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '商品', width: 200 },
  { key: 'qty', title: '数量', width: 140, align: 'right', summary: 'sum' },
  { key: 'price', title: '单价', width: 140, align: 'right', summary: 'avg' },
  {
    key: 'total',
    title: '小计',
    width: 160,
    align: 'right',
    summaryMethod: (values) =>
      '¥' + (values as number[]).reduce((a, b) => a + (b || 0), 0).toFixed(2),
  },
];

const list: Row[] = Array.from({ length: 800 }, (_, i) => {
  const qty = faker.number.int({ min: 1, max: 20 });
  const price = faker.number.int({ min: 5, max: 500 });
  return { id: i + 1, name: faker.commerce.productName(), qty, price, total: qty * price };
});

export default function SummaryTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 自动合计行</h3>
      <div className="demo-hint">
        底部合计行自动聚合：数量求和、单价求平均、小计自定义汇总。合计随筛选/排序动态更新。
      </div>
      <div style={{ width: 720, height: 480 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            showSummary: true,
            summaryText: '合计',
          }}
        />
      </div>
    </div>
  );
}
