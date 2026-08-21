import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';

/**
 * 功能列：序号 / 勾选 / 单选 三种 `col.type` 同表并存。
 *
 * 刻意放在一张表上 —— 它们是同一件事的三种形态（接管层独占单元格），而勾选与单选
 * 各占一列、各有一套独立状态，同表并存正好说明「两者互不干扰」。
 * 原先是三个示例（index-col / checkbox / radio），一页只能挂一个 PlaygroundHost，
 * 所以合成这一个 demo。
 */
interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
  dept: string;
}

const ROW_COUNT = 1000;

export function bootstrapTableFeatureColumns(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: '__index', title: '#', width: 60, type: 'index', align: 'center' },
    { key: '__checkbox', title: '', width: 50, type: 'checkbox', align: 'center' },
    { key: '__radio', title: '当前', width: 60, type: 'radio', align: 'center' },
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 160 },
    { key: 'city', title: '城市', width: 160 },
    { key: 'dept', title: '部门', width: 200 },
  ];

  const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    city: faker.location.city(),
    dept: faker.commerce.department(),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="btnChecked">获取勾选行</button>
      <button class="virt-table-btn virt-table-btn-danger" id="btnClearCheck">清空勾选</button>
      <button class="virt-table-btn virt-table-btn-primary" id="btnRadio">获取当前行</button>
      <button class="virt-table-btn" id="btnClearRadio">清除当前行</button>
    </div>
    <div id="status" class="status-text" style="margin-bottom:8px;"></div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;
  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    onCheckChange: (checked, row) => {
      setStatus(
        `勾选：行 ${row.id} ${checked ? '选中' : '取消'}，共 ${table.getCheckedRows().length} 行`,
      );
    },
    onCheckAll: (checked) => {
      setStatus(checked ? `全选 ${table.getCheckedRows().length} 行` : '取消全选');
    },
    onRadioChange: (row) => {
      setStatus(`单选：当前行 ${row.name}（id=${row.id}）`);
    },
  });

  const handlers: Array<[HTMLElement, () => void]> = [
    [
      root.querySelector('#btnChecked') as HTMLElement,
      () => {
        const rows = table.getCheckedRows();
        setStatus(rows.length ? `勾选了 ${rows.length} 行：${rows.map((r) => r.id).join(', ')}` : '没有勾选任何行');
      },
    ],
    [
      root.querySelector('#btnClearCheck') as HTMLElement,
      () => {
        table.clearCheckedRows();
        setStatus('已清空勾选');
      },
    ],
    [
      root.querySelector('#btnRadio') as HTMLElement,
      () => {
        const r = table.getSelectedRadio();
        setStatus(r ? `当前行：${r.name}（id=${r.id}）` : '没有当前行');
      },
    ],
    [
      root.querySelector('#btnClearRadio') as HTMLElement,
      () => {
        table.setSelectedRadio(null);
        setStatus('已清除当前行');
      },
    ],
  ];
  handlers.forEach(([el, fn]) => el.addEventListener('click', fn));

  setStatus(`序号 / 勾选 / 单选 三种功能列同表：${ROW_COUNT} 行`);

  return () => {
    handlers.forEach(([el, fn]) => el.removeEventListener('click', fn));
    table.destroy();
    root.innerHTML = '';
  };
}
