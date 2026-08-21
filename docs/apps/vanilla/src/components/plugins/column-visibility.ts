import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtFieldConfig } from '@virt-table/vanilla/plugins';

interface Row { id: number; name: string; age: number; city: string; job: string; email: string }

export function bootstrapTableColumnVisibility(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80, hideable: false },
    { key: 'name', title: '姓名', width: 160 },
    { key: 'age', title: '年龄', width: 120 },
    { key: 'city', title: '城市', width: 160 },
    { key: 'job', title: '职位', width: 200 },
    { key: 'email', title: '邮箱', width: 240, hidden: true },
  ];

  const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    age: faker.number.int({ min: 18, max: 60 }),
    city: faker.location.city(),
    job: faker.person.jobTitle(),
    email: faker.internet.email(),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="panel">字段配置</button>
      <button class="virt-table-btn" id="hideJob">隐藏「职位」</button>
      <button class="virt-table-btn" id="showEmail">显示「邮箱」</button>
      <span class="demo-note">ID 列不可隐藏；邮箱列默认隐藏</span>
    </div>
    <div style="width:760px;height:460px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    plugins: [vtFieldConfig()],
  });

  (root.querySelector('#panel') as HTMLButtonElement).onclick = (e) =>
    table.toggleFieldConfig(e.currentTarget as HTMLElement);
  (root.querySelector('#hideJob') as HTMLButtonElement).onclick = () =>
    table.setColumnVisible('job', false);
  (root.querySelector('#showEmail') as HTMLButtonElement).onclick = () =>
    table.setColumnVisible('email', true);

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
