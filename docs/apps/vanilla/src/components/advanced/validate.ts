import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  vtCellEditor,
} from '@virt-table/vanilla/plugins';
import {
  VtInput,
  VtNumberInput,
} from '@virt-table/vanilla/components';

interface Row { id: number; name: string; age: number; email: string }

export function bootstrapTableValidate(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80 },
    VtInput<Row>({
      key: 'name',
      title: '姓名（必填）',
      width: 200,
      validator: (v) => (String(v ?? '').trim() ? true : '姓名不能为空'),
    }),
    VtNumberInput<Row>({
      key: 'age',
      title: '年龄（1-120）',
      width: 200,
      validator: (v) => {
        const n = Number(v);
        return n >= 1 && n <= 120 ? true : '年龄需在 1-120';
      },
    }),
    VtInput<Row>({
      key: 'email',
      title: '邮箱',
      width: 260,
      validator: (v) => (/^\S+@\S+\.\S+$/.test(String(v ?? '')) ? true : '邮箱格式不正确'),
    }),
  ];

  const list: Row[] = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    age: faker.number.int({ min: 18, max: 60 }),
    email: faker.internet.email(),
  }));
  // 故意放几条非法数据
  list[0].name = '';
  list[1].age = 999;
  list[2].email = 'not-an-email';

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="check">校验全部</button>
      <span id="out" class="demo-note">点击单元格编辑，非法值会标红</span>
    </div>
    <div style="width:760px;height:460px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    plugins: [vtCellEditor()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
  });

  (root.querySelector('#check') as HTMLButtonElement).onclick = () => {
    const errors = table.validateAll();
    const out = root.querySelector('#out') as HTMLElement;
    out.textContent = errors.length
      ? `发现 ${errors.length} 处错误，如 id=${(errors[0].row as Row).id}：${errors[0].message}`
      : '全部校验通过 ✓';
  };

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
