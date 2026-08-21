import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

interface Row { id: number; name: string; email: string; city: string }

function genList(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    city: faker.location.city(),
  }));
}

export function bootstrapTableLoading(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 180 },
    { key: 'email', title: '邮箱', width: 260 },
    { key: 'city', title: '城市', width: 160 },
  ];

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="btnShow">显示加载态</button>
      <button class="virt-table-btn" id="btnReload">模拟异步刷新数据 (1.5s)</button>
    </div>
    <div style="width:720px;height:480px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list: genList(500),
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    loadingText: '数据加载中...',
  });

  const q = (id: string) => root.querySelector(id) as HTMLButtonElement;
  q('#btnShow').onclick = () => {
    table.setLoading(true);
    setTimeout(() => table.setLoading(false), 1500);
  };
  q('#btnReload').onclick = () => {
    table.setLoading(true);
    setTimeout(() => {
      table.setList(genList(500));
      table.setLoading(false);
    }, 1500);
  };

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
