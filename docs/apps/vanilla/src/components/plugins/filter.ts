import { faker } from '@faker-js/faker';
import {
  VirtTable,
} from '@virt-table/vanilla';
import {
  vtColumnFilter,
} from '@virt-table/vanilla/plugins';

export function bootstrapTableFilter(root: HTMLElement): () => void {
  const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
  const levels = ['P5', 'P6', 'P7', 'P8'];
  const cities = ['北京', '上海', '杭州', '深圳'];

  const list = Array.from({ length: 500 }, (_, i) => ({
    id: i,
    name: faker.person.fullName(),
    department: departments[i % departments.length],
    level: levels[i % levels.length],
    city: cities[i % cities.length],
    score: Math.floor(Math.random() * 100),
  }));

  const columns = [
    { key: 'name', title: '姓名', width: 180 },
    {
      key: 'department',
      title: '部门',
      width: 140,
      filters: departments.map((d) => ({ label: d, value: d })),
      filterMultiple: true,
    },
    {
      key: 'level',
      title: '级别',
      width: 100,
      filters: levels.map((l) => ({ label: l, value: l })),
      filterMultiple: false,
    },
    {
      key: 'city',
      title: '城市',
      width: 120,
      filters: cities.map((c) => ({ label: c, value: c })),
    },
    {
      key: 'score',
      title: '分数',
      width: 120,
      filters: [
        { label: '≥ 80 优秀', value: 80 },
        { label: '≥ 60 及格', value: 60 },
        { label: '< 60 不及格', value: -1 },
      ],
      filterMultiple: false,
      filterMethod: (filterValue: number, row: { score: number }) => {
        if (filterValue === -1) return row.score < 60;
        return row.score >= filterValue;
      },
    },
  ];

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn" id="btnClearFilter">清除全部筛选</button>
    </div>
    <div id="status" class="status-text"></div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;
  const listeners: (() => void)[] = [];

  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const table = new VirtTable(container, {
    plugins: [vtColumnFilter()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    onFilterChange: (filters) => {
      const keys = Object.keys(filters);
      if (keys.length === 0) {
        setStatus(`列筛选：${list.length} 行（无筛选）`);
      } else {
        const desc = keys.map((k) => `${k}: ${filters[k].join(',')}`).join('；');
        const renderTotal = (table.core.state as any).renderTotal ?? list.length;
        setStatus(`筛选条件 ${desc}，结果 ${renderTotal} 行`);
      }
    },
  });

  setStatus(`列筛选：${list.length} 行（点击表头筛选图标）`);

  const btnClearFilter = root.querySelector('#btnClearFilter')!;
  const onClearFilter = () => {
    table.clearAllFilters();
    setStatus(`列筛选：${list.length} 行（已清除全部筛选）`);
  };
  btnClearFilter.addEventListener('click', onClearFilter);
  listeners.push(() => btnClearFilter.removeEventListener('click', onClearFilter));

  return () => {
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
