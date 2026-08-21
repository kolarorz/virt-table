import { useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import type { VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor, vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtFormula } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';
import { makeSheet, SHEET_COLS, type SheetRow } from '../../../pro-kit/shared/sheet-data';
import type { ProDemoProps } from './shell';

/**
 * 单元格公式 demo（**第二档**，React 端），电子表格形态。
 *
 * 与计算列那个 demo 的区别是**数据形状**：那边列是字段（金额、部门），一条公式管一整列；
 * 这边列是坐标（A/B/C），每一格独立，公式写在格里。
 *
 * 这里刻意**不开排序/筛选**：A1 记法的行号绑的是数据下标，视图一重排公式就指到别的行上
 * （插件装载时会 warn）。这不是偷懒，是第二档的设计决策。
 */
export function SheetDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  const [rows] = useState(() => makeSheet());
  /** 公式栏当前对准的格。用 ref 而不是 state：它只在事件里读，不参与渲染 */
  const currentRef = useRef<string | null>(null);
  const [refLabel, setRefLabel] = useState('—');
  const [fx, setFx] = useState('');

  const showRef = (ref: string | null): void => {
    currentRef.current = ref;
    setRefLabel(ref ?? '—');
    if (!ref) {
      setFx('');
      return;
    }
    // 公式格显示原文，字面格显示值 —— 与编辑态里看到的东西一致
    const formula = tableRef.current?.getCellFormula?.(ref);
    setFx(formula ?? String(tableRef.current?.getCellValue?.(ref) ?? ''));
  };

  const [columns] = useState<VirtTableColumn<SheetRow>[]>(() => [
    {
      key: 'id',
      title: '',
      width: 44,
      fixed: 'left',
      align: 'center',
      // 行号列不参与公式（它是坐标而不是数据），下面 vtFormula 的 columns 里也不含它
      render: ({ row }) => {
        const el = document.createElement('span');
        el.className = 'pg-sheet-rownum';
        el.textContent = String(row.id);
        return el;
      },
    },
    ...SHEET_COLS.map(
      (letter): VirtTableColumn<SheetRow> => ({
        key: letter,
        title: letter,
        width: letter === 'A' ? 140 : 110,
        resizable: true,
        align: 'left',
      }),
    ),
  ]);

  return (
    <>
      <div className="pg-toolbar">
        <button
          className="pg-btn"
          onClick={() => {
            const filled = tableRef.current?.fillFormula?.('F2', 'F3:F11') ?? 0;
            setStatus(`填了 ${filled} 格 —— D2→D3… 跟着走，$E$2 不动`);
          }}
        >
          把 F2 填到 F3:F11
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            tableRef.current?.setCellFormula?.('A16', '=B16+1');
            tableRef.current?.setCellFormula?.('B16', '=A16+1');
            setStatus('A16 与 B16 互引 → 两格 #CIRCULAR!');
          }}
        >
          制造循环引用
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            tableRef.current?.setCellFormula?.('B16', '100');
            setStatus(`A16 现在是 ${String(tableRef.current?.getCellValue?.('A16'))}`);
          }}
        >
          解开循环
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            tableRef.current?.setCellFormula?.('A17', '=1/0');
            tableRef.current?.setCellFormula?.('B17', '=NOPE()');
            tableRef.current?.setCellFormula?.('C17', '=A99');
            tableRef.current?.setCellFormula?.('D17', '=1+');
            tableRef.current?.setCellFormula?.('E17', '=D2:D3');
            setStatus('第 17 行：#DIV/0! / #NAME? / #REF! / #SYNTAX! / #VALUE!');
          }}
        >
          各种错误值
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            const ref = currentRef.current ?? 'B2';
            const deps = tableRef.current?.getCellDependents?.(ref) ?? [];
            setStatus(deps.length ? `${ref} 被这些格引用：${deps.join(' ')}` : `没有格子引用 ${ref}`);
          }}
        >
          追踪引用
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            const errors = tableRef.current?.getSheetErrors?.() ?? [];
            setStatus(
              errors.length ? errors.map((e) => `${e.id} ${e.code}`).join(' · ') : '当前没有出错的格',
            );
            if (errors.length) console.table(errors);
          }}
        >
          列出错误
        </button>
      </div>

      <div className="pg-table">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: rows,
            itemKey: 'id',
            estimatedSize: 32,
            fixedSize: true,
            border: true,
            plugins: [
              vtFormula<SheetRow>({
                // 显式给一份：以后在最左边插列也不会让列字母集体错位
                columns: [...SHEET_COLS],
                onRecalculated: ({ changed, errors }) =>
                  setStatus(`重算 ${changed} 格${errors ? ` · ${errors} 处错误` : ''}`),
                // 当前格由插件报出来（它同时负责把引用框出来）
                onActiveCellChange: (ref) => showRef(ref),
              }),
              vtCellEditor({ trigger: 'dblclick' }),
              // 框选与公式无关，装在一起是为了顺手验证两个插件互不干扰
              vtCellSelection(),
            ],
          }}
        />
      </div>

      <div className="pg-aside">
        {/* 公式栏（Excel 的 fx 栏）。当前格来自插件的 onActiveCellChange —— 装了框选之后
            核心的 getActiveCell() 一直是 null，那个回调是唯一可靠的「当前格」来源 */}
        <div className="pg-sheet-bar">
          <span className="pg-sheet-ref">{refLabel}</span>
          <input
            className="pg-sheet-fx"
            placeholder="选中一格后在这里写公式，回车提交（如 =B2*C2）"
            spellCheck={false}
            value={fx}
            onChange={(e) => setFx(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !currentRef.current) return;
              tableRef.current?.setCellFormula?.(currentRef.current, fx);
              showRef(currentRef.current);
            }}
          />
        </div>
      </div>
    </>
  );
}
