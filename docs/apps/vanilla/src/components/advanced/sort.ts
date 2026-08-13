import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type SortSpec,
  type VirtTableColumn,
} from '@virt-table/vanilla';

interface Row {
  id: number;
  name: string;
  age: number;
  score: number;
  level: string;
}

const ROW_COUNT = 2000;
const LEVELS = ['S', 'A', 'B', 'C'];
const LEVEL_RANK: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };

export function bootstrapTableSort(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80, sortable: true, defaultSort: 'asc' },
    {
      key: 'name',
      title: '姓名',
      width: 180,
      sortable: true,
      // 自定义比较器：按中文/英文本地化规则比较
      sortMethod: (a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'),
    },
    { key: 'age', title: '年龄', width: 100, sortable: true },
    { key: 'score', title: '分数', width: 100, sortable: true },
    {
      key: 'level',
      title: '等级',
      width: 100,
      sortable: true,
      // 自定义比较器：按业务顺序 S > A > B > C，而不是字典序
      sortMethod: (a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level],
    },
  ];

  const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    age: faker.number.int({ min: 18, max: 65 }),
    score: faker.number.int({ min: 0, max: 100 }),
    level: LEVELS[faker.number.int({ min: 0, max: 3 })],
  }));

  root.innerHTML = `
    <div class="demo-hint">
      点击表头的排序图标切换 <b>升序 → 降序 → 取消</b>；多列模式下按住 <b>Shift</b> 点击可叠加排序列（表头角标显示优先级）。
      「姓名」按本地化规则比较，「等级」按 S &gt; A &gt; B &gt; C 业务顺序比较。
    </div>
    <div class="virt-table-controls">
      <label>
        排序模式
        <select id="mode">
          <option value="multiple">multiple（多列）</option>
          <option value="single">single（单列）</option>
        </select>
      </label>
      <button class="virt-table-btn" id="btnScore">按分数降序</button>
      <button class="virt-table-btn" id="btnClear">清除排序</button>
      <span id="state" class="demo-note"></span>
    </div>
    <div style="width:660px;height:480px;" class="demo-container" id="c"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const stateEl = root.querySelector('#state') as HTMLElement;
  const modeEl = root.querySelector('#mode') as HTMLSelectElement;

  const renderState = (state: SortSpec[]) => {
    stateEl.textContent = state.length
      ? `当前排序：${state.map((s, i) => `${i + 1}. ${s.colKey} ${s.order}`).join(' · ')}`
      : '当前排序：无';
  };

  // sortMode 为初始化选项，切换时重建实例
  let table: VirtTable<Row>;
  const create = (sortMode: 'single' | 'multiple') => {
    table = new VirtTable<Row>(container, {
      list,
      columns,
      itemKey: 'id',
      estimatedSize: 40,
      buffer: 6,
      border: true,
      sortMode,
      onSortChange: renderState,
    });
    renderState(table.getSortState());
  };
  create('multiple');

  modeEl.onchange = () => {
    table.destroy();
    create(modeEl.value as 'single' | 'multiple');
  };
  (root.querySelector('#btnScore') as HTMLButtonElement).onclick = () =>
    table.sort('score', 'desc');
  (root.querySelector('#btnClear') as HTMLButtonElement).onclick = () =>
    table.clearSort();

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
