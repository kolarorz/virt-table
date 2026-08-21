import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number | string;
  name: string;
  qty: number;
  amount: number;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 120 },
  { key: 'name', title: '名称', width: 220 },
  { key: 'qty', title: '数量', width: 160, align: 'right' },
  { key: 'amount', title: '金额', width: 160, align: 'right' },
];

const list: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: faker.commerce.productName(),
  qty: faker.number.int({ min: 1, max: 100 }),
  amount: faker.number.int({ min: 100, max: 9999 }),
}));

const pinnedTop: Row[] = [{ id: '★', name: '【置顶】重点商品', qty: 999, amount: 99999 }];
const pinnedBottom: Row[] = [{ id: '∑', name: '【置底】统计说明', qty: 0, amount: 0 }];

export default function PinnedTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 固定行 pinned</h3>
      <div className="demo-hint">
        首行冻结在表头下方、末行冻结在表尾上方，均不参与虚拟滚动，随横向滚动同步。
      </div>
      <div style={{ width: 680, height: 460 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            pinnedTop,
            pinnedBottom,
          }}
        />
      </div>
    </div>
  );
}
