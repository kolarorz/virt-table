import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtFormulaColumn } from '@virt-table-pro/formula';
import '@virt-table-pro/formula/index.css';
import { moneyCell } from '../../../pro-kit/shared/money-cell';
import { AMOUNT_MAX, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/** 初始公式：税额 = 金额 6%，合计 = 金额 + 税额（引用另一个公式列） */
const INITIAL = {
  tax: 'ROUND(amount * 0.06, 2)',
  total: 'amount + tax',
  grade: 'IF(amount > 60000, "A", IF(amount > 30000, "B", "C"))',
};

/**
 * 公式**第一档**（计算列）demo。
 *
 * 演示的重点是「结果写回了行数据」——所以税额/合计列**能排序**。纯 `col.render`
 * 做不到这点：核心的管线比较的是 `row[key]`，render 只影响显示。
 */
export const formulaDemo: ProDemo = {
  id: 'formula',
  mount(host: DemoHost): DemoInstance {
    const rows = makeRows(1000);

    const columns: VirtTableColumn<Row>[] = [
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
    ];

    const table = new VirtTable<Row>(host.tableEl, {
      list: rows,
      columns,
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
          onError: ({ colKey, code, detail }) => host.setStatus(`${colKey} ${code} ${detail}`),
        }),
      ],
    });

    // ---------- 公式编辑器 ----------

    const box = document.createElement('div');
    box.className = 'pg-aside-box pg-formula-box';
    host.asideEl.appendChild(box);

    for (const colKey of ['tax', 'total', 'grade'] as const) {
      const line = document.createElement('label');
      line.className = 'pg-formula-line';

      const label = document.createElement('span');
      label.className = 'pg-formula-key';
      label.textContent = `${colKey} =`;

      const input = document.createElement('input');
      input.className = 'pg-formula-input';
      input.value = table.getColumnFormula?.(colKey) ?? '';
      input.spellcheck = false;
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const ok = table.setColumnFormula?.(colKey, input.value);
        const errors = table.getFormulaErrors?.();
        input.classList.toggle('pg-formula-input--bad', !ok);
        host.setStatus(
          ok
            ? `${colKey} 已重算：${input.value}`
            : `${colKey} ${errors[colKey]?.code ?? '错误'} ${errors[colKey]?.detail ?? ''}`,
        );
      });

      line.append(label, input);
      box.appendChild(line);
    }

    host.button('金额全部 +1000', () => {
      for (const row of rows) row.amount += 1000;
      // 改了源字段，公式列要跟上 —— 核心不知道行对象被改了
      const changed = table.recalculateFormulas?.();
      host.setStatus(`重算写回 ${changed} 格`);
    });

    host.button('换一批数据', () => {
      const next = makeRows(1000).map((r) => ({ ...r, amount: r.amount * 2 }));
      // 推荐用法：先算好再进表，管线第一次就用到真值（见插件注释里的时序说明）
      table.evaluateFormulas?.(next);
      table.setList(next);
      rows.length = 0;
      rows.push(...next);
      host.setStatus('已换数据（先 evaluateFormulas 再 setList）');
    });

    host.button('制造循环引用', () => {
      table.setColumnFormula?.('total', 'tax + 1');
      table.setColumnFormula?.('tax', 'total * 0.5');
      host.setStatus('tax 与 total 互相引用 → 两列都是 #CIRCULAR!');
    });

    host.button('恢复初始公式', () => {
      for (const [colKey, expr] of Object.entries(INITIAL)) {
        table.setColumnFormula?.(colKey, expr);
      }
      for (const input of box.querySelectorAll<HTMLInputElement>('.pg-formula-input')) {
        input.classList.remove('pg-formula-input--bad');
      }
      const inputs = box.querySelectorAll<HTMLInputElement>('.pg-formula-input');
      (['tax', 'total', 'grade'] as const).forEach((k, i) => {
        inputs[i].value = INITIAL[k];
      });
      host.setStatus('已恢复初始公式');
    });

    host.setStatus('1000 行 · 3 个公式列');
    Object.assign(window, { table });

    return { destroy: () => table.destroy() };
  },
};
