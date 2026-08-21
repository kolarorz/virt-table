import { useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import type { VirtTableColumn } from '@virt-table/vanilla';
import { vtFormulaColumn } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';
import { AMOUNT_MAX, makeRows, type Row } from '../../../pro-kit/shared/data';
import { moneyCell } from '../../../pro-kit/shared/money-cell';
import type { ProDemoProps } from './shell';

/** 初始公式：税额 = 金额 6%，合计 = 金额 + 税额（引用另一个公式列） */
const INITIAL = {
  tax: 'ROUND(amount * 0.06, 2)',
  total: 'amount + tax',
  grade: 'IF(amount > 60000, "A", IF(amount > 30000, "B", "C"))',
} as const;

type FormulaKey = keyof typeof INITIAL;

/**
 * 公式**第一档**（计算列）demo（React 端）。
 *
 * 演示的重点是「结果写回了行数据」—— 所以税额/合计列**能排序**。纯 `col.render` 做不到这点：
 * 核心的管线比较的是 `row[key]`，render 只影响显示。
 */
export function FormulaColumnDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  const [rows, setRows] = useState(() => makeRows(1000));
  const [formulas, setFormulas] = useState<Record<FormulaKey, string>>({ ...INITIAL });
  const [bad, setBad] = useState<Record<string, boolean>>({});

  const [columns] = useState<VirtTableColumn<Row>[]>(() => [
    { key: 'id', title: 'ID', width: 70, fixed: 'left', sortable: true },
    { key: 'name', title: '项目名称', width: 150, sortable: true, resizable: true },
    {
      key: 'amount',
      title: '金额',
      width: 140,
      align: 'right',
      sortable: true,
      resizable: true,
      render: moneyCell<Row>({ max: AMOUNT_MAX }),
    },
    // 公式列照常自己定义 —— 插件只负责算与写回，不会凭空造列
    { key: 'tax', title: '税额（公式）', width: 130, align: 'right', sortable: true, resizable: true },
    {
      key: 'total',
      title: '合计（公式）',
      width: 150,
      align: 'right',
      sortable: true,
      resizable: true,
      render: moneyCell<Row>({ max: AMOUNT_MAX * 1.06 }),
    },
    { key: 'grade', title: '评级（公式）', width: 110, align: 'center', sortable: true },
  ]);

  const commit = (colKey: FormulaKey, expr: string): void => {
    const ok = tableRef.current?.setColumnFormula?.(colKey, expr) ?? false;
    const errors = tableRef.current?.getFormulaErrors?.() ?? {};
    setBad((prev) => ({ ...prev, [colKey]: !ok }));
    setStatus(
      ok
        ? `${colKey} 已重算：${expr}`
        : `${colKey} ${errors[colKey]?.code ?? '错误'} ${errors[colKey]?.detail ?? ''}`,
    );
  };

  return (
    <>
      <div className="pg-toolbar">
        <button
          className="pg-btn"
          onClick={() => {
            for (const row of rows) row.amount += 1000;
            // 改了源字段，公式列要跟上 —— 核心不知道行对象被改了
            const changed = tableRef.current?.recalculateFormulas?.() ?? 0;
            setStatus(`重算写回 ${changed} 格`);
          }}
        >
          金额全部 +1000
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            const next = makeRows(1000).map((r) => ({ ...r, amount: r.amount * 2 }));
            // 推荐用法：先算好再进表，管线第一次就用到真值
            tableRef.current?.evaluateFormulas?.(next);
            setRows(next);
            setStatus('已换数据（先 evaluateFormulas 再换 list）');
          }}
        >
          换一批数据
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            tableRef.current?.setColumnFormula?.('total', 'tax + 1');
            tableRef.current?.setColumnFormula?.('tax', 'total * 0.5');
            setFormulas((p) => ({ ...p, total: 'tax + 1', tax: 'total * 0.5' }));
            setStatus('tax 与 total 互相引用 → 两列都是 #CIRCULAR!');
          }}
        >
          制造循环引用
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            for (const [colKey, expr] of Object.entries(INITIAL)) {
              tableRef.current?.setColumnFormula?.(colKey, expr);
            }
            setFormulas({ ...INITIAL });
            setBad({});
            setStatus('已恢复初始公式');
          }}
        >
          恢复初始公式
        </button>
      </div>

      <div className="pg-table">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: rows,
            itemKey: 'id',
            estimatedSize: 40,
            fixedSize: true,
            stripe: true,
            border: true,
            plugins: [
              vtFormulaColumn<Row>({
                columns: { ...INITIAL },
                // 自定义函数：名字大小写不敏感
                functions: { TENTH: (args) => Number(args[0]) / 10 },
                onError: ({ colKey, code, detail }) => setStatus(`${colKey} ${code} ${detail}`),
              }),
            ],
          }}
        />
      </div>

      <div className="pg-aside">
        <div className="pg-aside-box pg-formula-box">
          {(Object.keys(INITIAL) as FormulaKey[]).map((colKey) => (
            <label className="pg-formula-line" key={colKey}>
              <span className="pg-formula-key">{colKey} =</span>
              <input
                className={`pg-formula-input${bad[colKey] ? ' pg-formula-input--bad' : ''}`}
                spellCheck={false}
                value={formulas[colKey]}
                onChange={(e) => setFormulas((p) => ({ ...p, [colKey]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit(colKey, formulas[colKey]);
                }}
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
