import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  zhCN,
  enUS,
  vtColumnFilter,
  vtSearch,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

/**
 * 国际化示例：点「中文 / English」切换语言，
 * 空数据文案、合计行标签、表头排序提示、列头筛选下拉、全文搜索框
 * 均随 ref 上的 `setLocale()` 即时切换。
 */
interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  qty: number;
  price: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, sortable: true },
  { key: 'name', title: '姓名', width: 200, sortable: true },
  {
    key: 'dept',
    title: '部门',
    width: 160,
    filters: depts.map((d) => ({ label: d, value: d })),
    filterMultiple: true,
  },
  { key: 'qty', title: '数量', width: 140, align: 'right', summary: 'sum' },
  { key: 'price', title: '单价', width: 140, align: 'right', summary: 'avg' },
];

const genList = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    qty: faker.number.int({ min: 1, max: 20 }),
    price: faker.number.int({ min: 5, max: 500 }),
  }));

export default function I18nTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [lang, setLang] = React.useState<'zh' | 'en'>('zh');
  const [empty, setEmpty] = React.useState(false);
  const list = React.useMemo(() => genList(500), []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 国际化 i18n</h3>
      <div className="demo-hint">
        点下方按钮切换语言：空数据文案、合计行、排序提示、列头筛选下拉、搜索框（按 Ctrl/Cmd+F
        打开）一并切换。
      </div>
      <div className="virt-table-controls">
        <button
          type="button"
          className={`virt-table-btn${lang === 'zh' ? ' virt-table-btn-primary' : ''}`}
          onClick={() => {
            setLang('zh');
            tableRef.current?.setLocale(zhCN);
          }}
        >
          中文
        </button>
        <button
          type="button"
          className={`virt-table-btn${lang === 'en' ? ' virt-table-btn-primary' : ''}`}
          onClick={() => {
            setLang('en');
            tableRef.current?.setLocale(enUS);
          }}
        >
          English
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => {
            const next = !empty;
            setEmpty(next);
            tableRef.current?.setList(next ? [] : genList(500));
          }}
        >
          切换空数据
        </button>
      </div>
      <div style={{ width: 760, height: 460 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            showSummary: true,
            plugins: [vtColumnFilter(), vtSearch()],
            // locale 缺省即 zhCN；这里显式写出以示意
            locale: zhCN,
          }}
        />
      </div>
    </div>
  );
}
