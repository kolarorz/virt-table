import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtRowHeightConfig, type RowHeightLevel } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/row-height-config.css';

interface Row {
  id: number;
  name: string;
  dept: string;
  city: string;
  email: string;
}

const DEPTS = ['研发', '设计', '销售', '客服'];

export function bootstrapTableRowHeight(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 70 },
    { key: 'name', title: '姓名', width: 150 },
    { key: 'dept', title: '部门', width: 110 },
    { key: 'city', title: '城市', width: 130 },
    { key: 'email', title: '邮箱', width: 220 },
  ];

  const list: Row[] = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: DEPTS[i % DEPTS.length]!,
    city: faker.location.city(),
    email: faker.internet.email(),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="rh">行高</button>
      <span class="demo-note" id="hint"></span>
    </div>
    <div style="width:820px;height:420px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;
  const hint = root.querySelector('#hint') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    /*
     * **必须固定行高**：三档改的是「每行多高」，而不定高模式下那件事由内容决定，
     * `estimatedSize` 只是未测量行的估算值 —— 那时插件会直说原因，不给三档。
     */
    fixedSize: true,
    plugins: [
      vtRowHeightConfig({
        // 存下来就能下次开表时当 `value` 传回来
        onChange: (level: RowHeightLevel, px: number) => {
          hint.textContent = `当前：${level}（每行 ${px}px），密度类与行高一起换`;
        },
      }),
    ],
  });

  hint.textContent = `当前：default（每行 ${table.getRowHeight()}px）`;
  (root.querySelector('#rh') as HTMLButtonElement).onclick = (e) =>
    table.toggleRowHeightConfig(e.currentTarget as HTMLElement);

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
