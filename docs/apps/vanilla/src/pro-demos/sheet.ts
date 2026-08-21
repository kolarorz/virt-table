import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor, vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtFormula } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';
import { makeSheet, SHEET_COLS, type SheetRow } from '../../../pro-kit/shared/sheet-data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 单元格公式 demo（**第二档**），电子表格形态。
 *
 * 与「公式 · 计算列」那个 demo 的区别是**数据形状**：那边列是字段（金额、部门），
 * 一条公式管一整列；这边列是坐标（A/B/C），每一格独立，公式写在格里。
 *
 * 这里刻意**不开排序/筛选**：A1 记法的行号绑的是数据下标，视图一重排公式就指到
 * 别的行上（插件装载时会 warn）。这不是偷懒，是第二档的设计决策，见 refs.ts 文件头。
 */
export const sheetDemo: ProDemo = {
  id: 'sheet',
  mount(host: DemoHost): DemoInstance {
    const rows = makeSheet();

    /**
     * 列定义：一个行号列（冻结）+ 7 个字母列。
     *
     * 行号列用 `type: 'index'` 会显示**展示序号**，而 A1 的行号要的是**数据下标**——
     * 这里没有排序所以两者一致，但用 `row.id` 明确表达「这是数据行号」更不容易误会。
     */
    const columns: VirtTableColumn<SheetRow>[] = [
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
          // 数字右对齐、文本左对齐：交给单元格自己判断，与 Excel 的默认行为一致
          align: 'left',
        }),
      ),
    ];

    const table = new VirtTable<SheetRow>(host.tableEl, {
      list: rows,
      columns,
      itemKey: 'id',
      estimatedSize: 32,
      fixedSize: true,
      border: true,
      plugins: [
        vtFormula<SheetRow>({
          // 显式给一份：以后在最左边插列也不会让列字母集体错位
          columns: [...SHEET_COLS],
          onRecalculated: ({ changed, errors }) =>
            host.setStatus(`重算 ${changed} 格${errors ? ` · ${errors} 处错误` : ''}`),
          // 当前格由插件报出来（它同时负责把引用框出来）
          onActiveCellChange: (ref) => showRef(ref),
        }),
        vtCellEditor({ trigger: 'dblclick' }),
        // 框选与公式无关，装在一起是为了顺手验证两个插件互不干扰
        vtCellSelection(),
      ],
    });

    // ---------- 公式栏（Excel 的 fx 栏）----------

    const bar = document.createElement('div');
    bar.className = 'pg-sheet-bar';
    const refLabel = document.createElement('span');
    refLabel.className = 'pg-sheet-ref';
    refLabel.textContent = '—';
    const fx = document.createElement('input');
    fx.className = 'pg-sheet-fx';
    fx.placeholder = '选中一格后在这里写公式，回车提交（如 =B2*C2）';
    fx.spellcheck = false;
    bar.append(refLabel, fx);
    host.asideEl.appendChild(bar);

    /** 当前公式栏对准的格 */
    let currentRef: string | null = null;

    const showRef = (ref: string | null): void => {
      currentRef = ref;
      refLabel.textContent = ref ?? '—';
      if (!ref) {
        fx.value = '';
        return;
      }
      const formula = table.getCellFormula?.(ref);
      const value = table.getCellValue?.(ref);
      fx.value = formula ?? (value == null ? '' : String(value));
    };

    /*
     * 公式栏的「当前格」来自插件的 `onActiveCellChange`（上面 options 里接的），
     * **不走 `getActiveCell()`** —— 这个 demo 同时装了 `vtCellSelection`，
     * 而 `vtCellEditor` 检测到框选时默认不设激活态（两者共用同一份「当前单元格」，
     * 否则会叠出两层框），于是核心那个 API 一直是 null。
     */

    fx.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !currentRef) return;
      table.setCellFormula?.(currentRef, fx.value);
      showRef(currentRef);
    });

    // ---------- 按钮 ----------

    host.button('把 F2 填到 F3:F11', () => {
      const filled = table.fillFormula?.('F2', 'F3:F11');
      host.setStatus(`填了 ${filled} 格 —— D2→D3… 跟着走，$E$2 不动`);
    });

    host.button('制造循环引用', () => {
      table.setCellFormula?.('A16', '=B16+1');
      table.setCellFormula?.('B16', '=A16+1');
      host.setStatus('A16 与 B16 互引 → 两格 #CIRCULAR!');
    });

    host.button('解开循环', () => {
      table.setCellFormula?.('B16', '100');
      host.setStatus(`A16 现在是 ${String(table.getCellValue?.('A16'))}`);
    });

    host.button('各种错误值', () => {
      table.setCellFormula?.('A17', '=1/0');
      table.setCellFormula?.('B17', '=NOPE()');
      table.setCellFormula?.('C17', '=A99');
      table.setCellFormula?.('D17', '=1+');
      table.setCellFormula?.('E17', '=D2:D3');
      host.setStatus('第 17 行：#DIV/0! / #NAME? / #REF! / #SYNTAX! / #VALUE!');
    });

    host.button('追踪引用', () => {
      const ref = currentRef ?? 'B2';
      const deps = table.getCellDependents?.(ref);
      host.setStatus(deps.length ? `${ref} 被这些格引用：${deps.join(' ')}` : `没有格子引用 ${ref}`);
    });

    host.button('列出错误', () => {
      const errors = table.getSheetErrors?.();
      host.setStatus(
        errors.length
          ? errors.map((e) => `${e.id} ${e.code}`).join(' · ')
          : '当前没有出错的格',
      );
      if (errors.length) console.table(errors);
    });

    host.setStatus(`${rows.length} 行 × ${SHEET_COLS.length} 列 · 双击格子编辑`);
    Object.assign(window, { table });

    return { destroy: () => table.destroy() };
  },
};
