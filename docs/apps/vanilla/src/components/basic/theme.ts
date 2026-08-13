import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

interface Row {
  id: number;
  name: string;
  email: string;
  city: string;
  score: number;
}

const ROW_COUNT = 1000;

export function bootstrapTableTheme(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80, fixed: 'left' },
    { key: 'name', title: '姓名', width: 160 },
    { key: 'email', title: '邮箱', width: 240 },
    { key: 'city', title: '城市', width: 160 },
    { key: 'score', title: '分数', width: 120, align: 'right' },
  ];

  const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    city: faker.location.city(),
    score: faker.number.int({ min: 0, max: 100 }),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="btnToggle">🌙 切换暗夜模式</button>
      <span id="themeLabel" class="demo-note">当前：亮色</span>
    </div>
    <div style="width:760px;height:520px;" class="demo-container" id="tableContainer"></div>`;
  const container = root.querySelector('#tableContainer') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    stripe: true,
    highlightHoverRow: true,
    theme: 'light',
  });

  let theme: 'light' | 'dark' = 'light';
  const btn = root.querySelector('#btnToggle') as HTMLButtonElement;
  const label = root.querySelector('#themeLabel') as HTMLElement;
  btn.onclick = () => {
    theme = theme === 'light' ? 'dark' : 'light';
    table.setTheme(theme);
    btn.textContent = theme === 'light' ? '🌙 切换暗夜模式' : '☀️ 切换亮色模式';
    label.textContent = theme === 'light' ? '当前：亮色' : '当前：暗色';
  };

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
