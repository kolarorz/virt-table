import { useMemo, useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtXlsx } from '@virt-table-pro/xlsx';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { ProDemoProps } from './shell';

/**
 * 真 xlsx / PDF 导出 demo（React 端）：`vtXlsx` + 核心的 `vtCellSelection`。
 *
 * 装 `vtCellSelection` 不是「依赖」—— `vtXlsx` 不 `requires` 任何插件，全表导出单独就能跑。
 * 装它是为了演示 `selectionOnly`：没有选区能力的话那一档只能告警并退回全表。
 *
 * 数据侧刻意开了 `showSummary` 与两列 `mergeKey` —— 这个 demo 要证明的正是
 * 「免费版那份 HTML 伪装的 `.xls` 导不出来的东西」，所以先得有合计行与合并单元格。
 */
export function XlsxDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  const [liveSummary, setLiveSummary] = useState(true);
  const [selectionOnly, setSelectionOnly] = useState(false);

  const [rows] = useState<Row[]>(() => makeRows(300));
  /*
   * 列定义必须 memo：`makeColumns()` 每次返回新对象，而表格会**就地改列对象**
   * （拖列宽直接写 `col.width`）。每次渲染换一份的话拖出来的宽度会被下一次渲染抹掉。
   */
  const columns = useMemo(() => {
    const cols = makeColumns();
    for (const col of cols) {
      // 相邻同值自动纵向合并：数据按下标循环生成，所以这两列本来就是成段的
      if (col.key === 'dept' || col.key === 'city') col.mergeKey = true;
      if (col.key === 'amount') col.summary = 'sum';
    }
    return cols;
  }, []);

  const options = useMemo(
    () => ({
      list: rows,
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
      showSummary: true,
      plugins: [
        vtXlsx({
          sheetName: '项目明细',
          freeze: { rows: 1, cols: 1 },
          numberFormats: { amount: '#,##0.00' },
          autoFilter: true,
          // 入口交给下面几颗手写按钮，免得同一个 demo 里两套入口
          toolbar: false,
        }),
        vtCellSelection(),
      ],
    }),
    [rows],
  );

  const note =
    `冻结：表头 1 行 + 首列 · 合计行：${liveSummary ? '活公式 SUBTOTAL' : '死数字'}` +
    ` · 范围：${selectionOnly ? '当前选区' : '全表 300 行'}`;

  return (
    <>
      <div className="pg-toolbar">
        <button
          className="pg-btn"
          onClick={() => {
            void tableRef.current?.exportXlsx?.({ liveSummary, selectionOnly });
            setStatus(
              selectionOnly
                ? '已导出当前选区（没框选时会告警并退回全表）'
                : '已导出全表：合并单元格、列宽、数字格式、冻结窗格都在里面',
            );
          }}
        >
          导出 xlsx
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            void tableRef.current?.exportXlsx?.({
              liveSummary,
              sheets: [
                { name: '明细' },
                // 换一份列的 sheet 关掉合并（合并坐标按显示列表定义，换了列就不对应了）
                { name: '仅部门与金额', columns: ['dept', 'amount'], merges: false },
              ],
            });
            setStatus('已导出两张 sheet：明细（全列）+ 仅部门与金额');
          }}
        >
          导出多 sheet
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            void tableRef.current?.exportPdf?.({
              title: '项目明细',
              landscape: true,
              footNote: '由 virt-table 导出',
              selectionOnly,
            });
            setStatus('已排版并唤起打印 —— 在对话框里选「另存为 PDF」');
          }}
        >
          打印 / PDF
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            // 演示「服务端出 PDF 字节」那条路：拿排好的 HTML，交给 headless Chrome
            void (async () => {
              const html = await tableRef.current?.exportPdf?.({
                title: '项目明细',
                htmlOnly: true,
              });
              if (typeof html !== 'string') {
                setStatus('付费能力未装载，拿不到排版 HTML');
                return;
              }
              setStatus(
                `排版 HTML ${html.length} 字符，每页重复表头：${
                  html.includes('table-header-group') ? '开' : '关'
                } —— 服务端出 PDF 就用这一份`,
              );
            })();
          }}
        >
          看排版 HTML
        </button>
        <label className="pg-switch">
          <input
            type="checkbox"
            checked={liveSummary}
            onChange={(e) => setLiveSummary(e.target.checked)}
          />
          合计行写成活公式
        </label>
        <label className="pg-switch">
          <input
            type="checkbox"
            checked={selectionOnly}
            onChange={(e) => setSelectionOnly(e.target.checked)}
          />
          只导当前选区
        </label>
      </div>

      <div className="pg-table">
        <VirtTableReact ref={tableRef} columns={columns} options={options} />
      </div>

      <div className="pg-aside">
        <div className="pg-aside-box">{note}</div>
      </div>
    </>
  );
}
