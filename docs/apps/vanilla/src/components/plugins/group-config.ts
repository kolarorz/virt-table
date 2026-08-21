import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtGroupConfig } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/group-config.css';

interface Row {
  id: number;
  name: string;
  dept: string;
  level: string;
  city: string;
}

const DEPTS = ['研发', '设计', '销售'];
const LEVELS = ['P5', 'P6', 'P7'];

export function bootstrapTableGroupConfig(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'name', title: '姓名', width: 150 },
    { key: 'dept', title: '部门', width: 110 },
    { key: 'level', title: '级别', width: 100 },
    { key: 'city', title: '城市', width: 130 },
  ];

  const list: Row[] = Array.from({ length: 300 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: DEPTS[i % DEPTS.length]!,
    level: LEVELS[i % LEVELS.length]!,
    city: faker.location.city(),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="group">分组</button>
      <button class="virt-table-btn" id="clear">清除分组</button>
      <span class="demo-note" id="hint">候选列是推断出来的：取值种类少、有重复的那些</span>
    </div>
    <div style="width:760px;height:420px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;
  const hint = root.querySelector('#hint') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    // 没装 vtToolbar：面板由下面那颗按钮唤出
    plugins: [vtGroupConfig()],
  });

  const sync = (): void => {
    const levels = table.getGroupConfig();
    hint.textContent = levels.length
      ? `${levels.length} 级分组：${levels.map((g) => g.field).join(' → ')}`
      : '候选列是推断出来的：取值种类少、有重复的那些';
  };

  (root.querySelector('#group') as HTMLButtonElement).onclick = (e) => {
    table.toggleGroupConfig(e.currentTarget as HTMLElement);
  };
  (root.querySelector('#clear') as HTMLButtonElement).onclick = () => {
    // 面板落地走的也是这条（`setGroupConfig`），所以两个入口是同一份状态
    table.setGroupConfig([]);
    sync();
  };
  // 面板里改完分组会重建数据，这里顺手把提示刷一下
  container.addEventListener('pointerup', () => setTimeout(sync, 0));

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
