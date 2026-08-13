import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  type SortSpec,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  score: number;
  level: string;
}

const ROW_COUNT = 2000;
const LEVELS = ['S', 'A', 'B', 'C'];
const LEVEL_RANK: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };

const columns: ReactTableColumn<Row>[] = [
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
    sortMethod: (a, b) => LEVEL_RANK[a.level]! - LEVEL_RANK[b.level]!,
  },
];

const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 65 }),
  score: faker.number.int({ min: 0, max: 100 }),
  level: LEVELS[faker.number.int({ min: 0, max: 3 })]!,
}));

export default function SortTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [sortMode, setSortMode] = React.useState<'single' | 'multiple'>('multiple');
  const [sortState, setSortState] = React.useState<SortSpec[]>([]);

  const status = sortState.length
    ? `当前排序：${sortState.map((s, i) => `${i + 1}. ${s.colKey} ${s.order}`).join(' · ')}`
    : '当前排序：无';

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 列排序</h3>
      <div className="demo-hint">
        点击表头的排序图标切换 <b>升序 → 降序 → 取消</b>；多列模式下按住 <b>Shift</b>{' '}
        点击可叠加排序列（表头角标显示优先级）。「姓名」按本地化规则比较，「等级」按 S &gt; A &gt; B &gt; C
        业务顺序比较。
      </div>
      <div className="virt-table-controls">
        <label>
          排序模式
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as 'single' | 'multiple')}
          >
            <option value="multiple">multiple（多列）</option>
            <option value="single">single（单列）</option>
          </select>
        </label>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => tableRef.current?.sort('score', 'desc')}
        >
          按分数降序
        </button>
        <button type="button" className="virt-table-btn" onClick={() => tableRef.current?.clearSort()}>
          清除排序
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 660, height: 480 }} className="demo-container">
        {/* sortMode 是初始化选项，切换时靠 key 重建表格实例 */}
        <VirtTableReact
          key={sortMode}
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            sortMode,
            onSortChange: setSortState,
          }}
        />
      </div>
    </div>
  );
}
