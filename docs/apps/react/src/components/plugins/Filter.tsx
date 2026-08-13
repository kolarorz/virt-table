import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef,
  vtColumnFilter,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
const levels = ['P5', 'P6', 'P7', 'P8'];
const cities = ['北京', '上海', '杭州', '深圳'];

type FilterRow = {
  id: number;
  name: string;
  department: string;
  level: string;
  city: string;
  score: number;
};

const list: FilterRow[] = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  name: faker.person.fullName(),
  department: departments[i % departments.length]!,
  level: levels[i % levels.length]!,
  city: cities[i % cities.length]!,
  score: Math.floor(Math.random() * 100),
}));

const columns: ReactTableColumn<FilterRow>[] = [
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
    filterMethod: (filterValue: unknown, row: FilterRow) => {
      const v = filterValue as number;
      if (v === -1) return row.score < 60;
      return row.score >= v;
    },
  },
];

export default function FilterTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState(
    `列筛选：${list.length} 行（无筛选，点击表头筛选图标）`,
  );
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 列筛选</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          onClick={() => {
            tableRef.current?.clearAllFilters();
            setStatus(`列筛选：${list.length} 行（已清除全部筛选）`);
          }}
        >
          清除全部筛选
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            plugins: [vtColumnFilter()],
            estimatedSize: 40,
            buffer: 4,
            border: true,
            onFilterChange: (filters) => {
              const t = tableRef.current?.getTable() as
                | { core: { state: { renderTotal: number } } }
                | null
                | undefined;
              const renderTotal = t?.core?.state?.renderTotal ?? list.length;
              const keys = Object.keys(filters);
              if (keys.length === 0) {
                setStatus(`列筛选：${list.length} 行（无筛选）`);
              } else {
                const desc = keys
                  .map((k) => {
                    const v = filters[k] as unknown[];
                    return `${k}: ${v.join(',')}`;
                  })
                  .join('；');
                setStatus(`筛选条件 ${desc}，结果 ${renderTotal} 行`);
              }
            },
          }}
        />
      </div>
    </div>
  );
}
