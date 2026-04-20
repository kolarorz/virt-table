import { createDemo, faker } from '../common.js';

export function bootstrapTableFilter(root) {
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
      filters: cities.map((c, i) => ({ label: c, value: c, checked: i === 0 })),
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
      filterMethod: (filterValue, row) => {
        if (filterValue === -1) return row.score < 60;
        return row.score >= filterValue;
      },
    },
  ];

  const { table, setStatus, cleanup } = createDemo(root, {
    title: '列筛选',
    columns,
    tableOptions: {
      list,
      border: true,
      onFilterChange: (filters) => {
        const keys = Object.keys(filters);
        if (keys.length === 0) {
          setStatus(`列筛选：${list.length} 行（无筛选）`);
        } else {
          const desc = keys.map((k) => `${k}: ${filters[k].join(',')}`).join('；');
          setStatus(`筛选条件 ${desc}，结果 ${table.core.state.renderTotal} 行`);
        }
      },
    },
    extraButtons:
      '<button class="virt-table-btn" id="btnClearFilter" style="background:#ef4444;color:#fff;">清除全部筛选</button>',
    statusExtra: '（点击表头筛选图标）',
  });

  const { on } = { on: (id, handler) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
  }};

  on('btnClearFilter', () => {
    table.clearAllFilters();
    setStatus(`列筛选：${list.length} 行（已清除全部筛选）`);
  });

  return cleanup;
}
