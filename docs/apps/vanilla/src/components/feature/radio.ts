import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

interface Row { id: number; name: string; city: string }

export function bootstrapTableRadio(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'radio', title: '', width: 50, type: 'radio', fixed: 'left' },
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 220 },
    { key: 'city', title: '城市', width: 220 },
  ];

  const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    city: faker.location.city(),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="get">获取当前选中</button>
      <button class="virt-table-btn" id="clear">清除</button>
      <span id="out" class="demo-note">未选中</span>
    </div>
    <div style="width:620px;height:480px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const out = root.querySelector('#out') as HTMLElement;
  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    onRadioChange: (row) => { out.textContent = `选中：${row.name}`; },
  });

  (root.querySelector('#get') as HTMLButtonElement).onclick = () => {
    const r = table.getSelectedRadio();
    out.textContent = r ? `当前：${r.name}（id=${r.id}）` : '未选中';
  };
  (root.querySelector('#clear') as HTMLButtonElement).onclick = () => {
    table.setSelectedRadio(null);
    out.textContent = '未选中';
  };

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
