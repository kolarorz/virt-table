import { faker } from '@faker-js/faker';
import {
  VirtTable,
} from '@virt-table/vanilla';
import {
  vtColumnFilter,
} from '@virt-table/vanilla/plugins';
import {
  VtFilterBuilder,
} from '@virt-table/vanilla/components';

/**
 * 高级筛选（筛选管理器）：表格外部的 AND/OR 条件构建器。
 * 同时保留表头快捷筛选（城市列），两者是 AND 关系。
 */
export function bootstrapTableFilterBuilder(root: HTMLElement): () => void {
  const departments = ['工程部', '设计部', '市场部', '财务部', '人事部'];
  const levels = ['P5', 'P6', 'P7', 'P8'];
  const cities = ['北京', '上海', '杭州', '深圳'];

  const list = Array.from({ length: 2000 }, (_, i) => ({
    id: i,
    name: faker.person.fullName(),
    department: departments[i % departments.length],
    level: levels[i % levels.length],
    city: cities[i % cities.length],
    score: Math.floor(Math.random() * 100),
    hiredAt: faker.date.between({ from: '2019-01-01', to: '2025-06-30' }).toISOString().slice(0, 10),
  }));

  const columns = [
    { key: 'name', title: '姓名', width: 180, filterType: 'text' as const },
    {
      key: 'department',
      title: '部门',
      width: 130,
      filters: departments.map((d) => ({ label: d, value: d })),
    },
    {
      key: 'level',
      title: '级别',
      width: 100,
      filters: levels.map((l) => ({ label: l, value: l })),
    },
    {
      // 表头快捷筛选（枚举勾选）与高级筛选并存
      key: 'city',
      title: '城市',
      width: 110,
      filters: cities.map((c) => ({ label: c, value: c })),
    },
    { key: 'score', title: '分数', width: 100, filterType: 'number-range' as const, summary: 'avg' as const },
    { key: 'hiredAt', title: '入职日期', width: 140, filterType: 'date-range' as const },
  ];

  root.innerHTML = `
    <div class="virt-table-controls">
      <label>
        <input type="checkbox" id="cbAuto" /> 即时应用（autoApply）
      </label>
      <button class="virt-table-btn virt-table-btn-primary" id="btnPreset">载入示例条件</button>
      <span class="demo-note">下面的条件构建器在表格外部 · 与表头「城市」筛选是「且」关系</span>
    </div>
    <div id="filterBar" style="margin-bottom:10px;max-width:900px;"></div>
    <div id="status" class="status-text"></div>
    <div style="width:900px;height:520px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;
  const listeners: (() => void)[] = [];

  const table = new VirtTable(container, {
    plugins: [vtColumnFilter()],
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    showSummary: true,
    summaryText: '平均',
    onFilterModelChange: () => updateStatus(),
    onFilterChange: () => updateStatus(),
  });

  function updateStatus(): void {
    const rendered = (table.core.state as unknown as { renderTotal?: number }).renderTotal ?? list.length;
    const model = table.getFilterModel();
    const headerFilters = Object.keys(table.getActiveFilters());
    status.textContent =
      `结果 ${rendered} / ${list.length} 行 · 高级筛选：${model ? '已启用' : '未启用'}` +
      (headerFilters.length ? ` · 表头筛选：${headerFilters.join('、')}` : '');
  }

  let builder = new VtFilterBuilder({
    el: root.querySelector('#filterBar') as HTMLElement,
    table,
    autoApply: false,
    onApply: () => updateStatus(),
  });

  updateStatus();

  // 切换即时应用：重建实例（构造项变化）
  const cbAuto = root.querySelector('#cbAuto') as HTMLInputElement;
  const onToggleAuto = () => {
    const model = builder.getModel();
    builder.destroy();
    builder = new VtFilterBuilder({
      el: root.querySelector('#filterBar') as HTMLElement,
      table,
      model,
      autoApply: cbAuto.checked,
      onApply: () => updateStatus(),
    });
  };
  cbAuto.addEventListener('change', onToggleAuto);
  listeners.push(() => cbAuto.removeEventListener('change', onToggleAuto));

  // 预设：分数 ≥ 80 且（部门属于工程部/设计部 或 级别为 P8）
  const btnPreset = root.querySelector('#btnPreset') as HTMLElement;
  const onPreset = () => {
    builder.setModel({
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
    builder.apply();
  };
  btnPreset.addEventListener('click', onPreset);
  listeners.push(() => btnPreset.removeEventListener('click', onPreset));

  return () => {
    builder.destroy();
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
