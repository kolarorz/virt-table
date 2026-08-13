import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

interface Row { id: number | string; name: string; qty: number; amount: number }

export function bootstrapTablePinned(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
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

  root.innerHTML = `
    <div class="demo-hint">首行冻结在表头下方、末行冻结在表尾上方，均不参与虚拟滚动，随横向滚动同步。</div>
    <div style="width:680px;height:460px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    pinnedTop,
    pinnedBottom,
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
