import React from 'react';
import {
  VirtTableReact,
  VirtFilterBuilderReact,
  type ReactTableColumn,
  type VirtTableRef,
  type FilterModel,
  type VirtFilterBuilderHandle,
  vtColumnFilter,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
const levels = ['P5', 'P6', 'P7', 'P8'];
const cities = ['北京', '上海', '杭州', '深圳'];

type Row = {
  id: number;
  name: string;
  department: string;
  level: string;
  city: string;
  score: number;
  hiredAt: string;
};

const list: Row[] = Array.from({ length: 2000 }, (_, i) => ({
  id: i,
  name: faker.person.fullName(),
  department: departments[i % departments.length]!,
  level: levels[i % levels.length]!,
  city: cities[i % cities.length]!,
  score: Math.floor(Math.random() * 100),
  hiredAt: faker.date.between({ from: '2019-01-01', to: '2025-06-30' }).toISOString().slice(0, 10),
}));

const columns: ReactTableColumn<Row>[] = [
  { key: 'name', title: '姓名', width: 180, filterType: 'text' },
  {
    key: 'department',
    title: '部门',
    width: 130,
    filters: departments.map((d) => ({ label: d, value: d })),
  },
  { key: 'level', title: '级别', width: 100, filters: levels.map((l) => ({ label: l, value: l })) },
  {
    // 表头快捷筛选与高级筛选并存（AND）
    key: 'city',
    title: '城市',
    width: 110,
    filters: cities.map((c) => ({ label: c, value: c })),
  },
  { key: 'score', title: '分数', width: 100, filterType: 'number-range' },
  { key: 'hiredAt', title: '入职日期', width: 140, filterType: 'date-range' },
];

export default function FilterBuilderTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const builderRef = React.useRef<VirtFilterBuilderHandle | null>(null);
  const [ready, setReady] = React.useState(false);
  const [autoApply, setAutoApply] = React.useState(false);
  const [model, setModel] = React.useState<FilterModel>(null);
  const [applyTick, setApplyTick] = React.useState(0);
  const [status, setStatus] = React.useState('');

  const updateStatus = React.useCallback(() => {
    const t = tableRef.current?.getTable() as
      | { core: { state: { renderTotal: number } } }
      | null
      | undefined;
    const rendered = t?.core?.state?.renderTotal ?? list.length;
    const headerFilters = Object.keys(tableRef.current?.getActiveFilters() ?? {});
    setStatus(
      `结果 ${rendered} / ${list.length} 行 · 高级筛选：` +
        `${tableRef.current?.getFilterModel() ? '已启用' : '未启用'}` +
        (headerFilters.length ? ` · 表头筛选：${headerFilters.join('、')}` : ''),
    );
  }, []);

  // 表格挂载后构建器才能拿到实例（取列 + 应用筛选）
  React.useEffect(() => {
    setReady(true);
    updateStatus();
  }, [updateStatus]);

  // 预设条件写入构建器后再应用（子组件的同步 effect 先于本 effect 执行）
  React.useEffect(() => {
    if (applyTick > 0) builderRef.current?.apply();
  }, [applyTick]);

  function loadPreset(): void {
    setApplyTick((t) => t + 1);
    setModel({
      kind: 'group',
      logic: 'and',
      children: [
        { kind: 'condition', colKey: 'score', operator: 'gte', value: 80 },
        {
          kind: 'group',
          logic: 'or',
          children: [
            { kind: 'condition', colKey: 'department', operator: 'in', value: ['工程部', '设计部'] },
            { kind: 'condition', colKey: 'level', operator: 'eq', value: 'P8' },
          ],
        },
      ],
    });
  }

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 高级筛选（筛选管理器）</h3>
      <div className="virt-table-controls">
        <label>
          <input
            type="checkbox"
            checked={autoApply}
            onChange={(e) => setAutoApply(e.target.checked)}
          />
          即时应用
        </label>
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={loadPreset}
        >
          载入示例条件
        </button>
      </div>
      {/* 条件构建器渲染在表格之外 */}
      {ready && (
        <VirtFilterBuilderReact
          ref={builderRef}
          tableRef={tableRef}
          value={model}
          autoApply={autoApply}
          style={{ maxWidth: 900, marginBottom: 10 }}
          onChange={setModel}
          onApply={updateStatus}
        />
      )}
      <div className="status-text">{status}</div>
      <div style={{ width: 900, height: 520 }} className="demo-container">
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
            onFilterChange: updateStatus,
            onFilterModelChange: updateStatus,
          }}
        />
      </div>
    </div>
  );
}
