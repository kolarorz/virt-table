import { VirtTable } from '@virt-table/vanilla';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtXlsx } from '@virt-table-pro/xlsx';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 真 xlsx / PDF 导出 demo（Vanilla 端）：只装 `vtXlsx` 与核心的 `vtCellSelection`。
 *
 * 装 `vtCellSelection` 不是「依赖」—— `vtXlsx` 不 `requires` 任何插件，全表导出单独就能跑。
 * 装它是为了演示 `selectionOnly`：没有选区能力的话那一档只能告警并退回全表。
 *
 * ## 为什么开 `showSummary` 与两列自动合并
 *
 * 这个 demo 要证明的恰恰是「免费版导不出来的那些东西」，所以数据侧得先有那些东西：
 *
 *   · `showSummary` → 才有合计行可导，也才看得到 `liveSummary` 的活公式
 *   · 部门 / 城市两列 `mergeKey` → 才有合并单元格可还原（这是与 `.xls` 差别最大的一处）
 *   · `fixed: 'left'` 的 ID 列（来自 `makeColumns`）→ 顺带验合并的列坐标换算
 *     （核心的合并坐标只数非固定列，换算错了合并会整体左移一格）
 */
export const xlsxDemo: ProDemo = {
  id: 'xlsx',
  mount(host: DemoHost): DemoInstance {
    const rows = makeRows(300);

    const columns = makeColumns();
    // 相邻同值自动纵向合并。数据是按下标循环生成的，所以排序前这两列本来就是成段的
    for (const col of columns) {
      if (col.key === 'dept' || col.key === 'city') {
        col.mergeKey = true;
        col.summary = undefined;
      }
      if (col.key === 'amount') col.summary = 'sum';
    }

    const noteBox = document.createElement('div');
    noteBox.className = 'pg-aside-box';
    host.asideEl.appendChild(noteBox);

    let liveSummary = true;
    let selectionOnly = false;

    const table = new VirtTable<Row>(host.tableEl, {
      list: rows,
      columns,
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
          // 工具栏那颗按钮交给下面的手写按钮演示，免得同一个 demo 里两个入口
          toolbar: false,
        }),
        vtCellSelection(),
      ],
    });

    const describe = (): void => {
      const sel = table.getCellSelection?.();
      noteBox.textContent = [
        `冻结：表头 1 行 + 首列`,
        `合计行：${liveSummary ? '活公式 SUBTOTAL' : '死数字'}`,
        `范围：${selectionOnly ? (sel ? '当前选区' : '当前选区（还没框选）') : '全表 300 行'}`,
      ].join(' · ');
    };

    host.button('导出 xlsx', () => {
      void table.exportXlsx?.({ liveSummary, selectionOnly });
      host.setStatus(
        selectionOnly
          ? '已导出当前选区（没框选时会告警并退回全表）'
          : '已导出全表：合并单元格、列宽、数字格式、冻结窗格都在里面',
      );
    });

    host.button('导出多 sheet', () => {
      void table.exportXlsx?.({
        liveSummary,
        sheets: [
          { name: '明细' },
          // 换一份数据的 sheet 不带合并（合并坐标是按显示列表定义的，换了数据就不对应了）
          { name: '仅部门与金额', columns: ['dept', 'amount'], merges: false },
        ],
      });
      host.setStatus('已导出两张 sheet：明细（全列）+ 仅部门与金额');
    });

    host.button('打印 / PDF', () => {
      void table.exportPdf?.({
        title: '项目明细',
        landscape: true,
        footNote: '由 virt-table 导出',
        selectionOnly,
      });
      host.setStatus('已排版并唤起打印 —— 在对话框里选「另存为 PDF」');
    });

    host.button('看排版 HTML', () => {
      void (async () => {
        const html = await table.exportPdf?.({ title: '项目明细', htmlOnly: true });
        if (typeof html !== 'string') {
          host.setStatus('付费能力未装载，拿不到排版 HTML');
          return;
        }
        // 这条演示的是「服务端出 PDF 字节」那条路：拿到 HTML，交给 headless Chrome
        host.setStatus(
          `排版 HTML ${html.length} 字符，每页重复表头：${
            html.includes('table-header-group') ? '开' : '关'
          } —— 服务端出 PDF 就用这一份`,
        );
      })();
    });

    host.switch('合计行写成活公式', liveSummary, (checked) => {
      liveSummary = checked;
      describe();
    });

    host.switch('只导当前选区', selectionOnly, (checked) => {
      selectionOnly = checked;
      describe();
    });

    describe();
    Object.assign(window, { table });

    return { destroy: () => table.destroy() };
  },
};
