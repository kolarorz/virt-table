import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

interface Row { id: number; name: string; age: number; city: string }

export function bootstrapTableAria(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
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

  root.innerHTML = `
    <div class="demo-hint">
      表格自动输出 ARIA 语义，便于屏幕阅读器识别。点击「检查」查看实际属性。
    </div>
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="check">检查 ARIA 属性</button>
      <span id="out" class="demo-note"></span>
    </div>
    <div style="width:680px;height:420px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
  });

  (root.querySelector('#check') as HTMLButtonElement).onclick = () => {
    const grid = container.querySelector('[role="grid"]');
    const th = container.querySelector('[role="columnheader"]');
    const cell = container.querySelector('[role="gridcell"]');
    const out = root.querySelector('#out') as HTMLElement;
    out.textContent =
      `grid: aria-rowcount=${grid?.getAttribute('aria-rowcount')}, ` +
      `aria-colcount=${grid?.getAttribute('aria-colcount')} · ` +
      `columnheader aria-sort=${th?.getAttribute('aria-sort')} · ` +
      `gridcell role=${cell?.getAttribute('role')}`;
  };

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
