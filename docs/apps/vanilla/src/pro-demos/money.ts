import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { moneyCell } from '../../../pro-kit/shared/money-cell';
import { AMOUNT_MAX, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 金额单元格 demo：把 `moneyCell()` 的每个选项各摆一列，一眼看全。
 *
 * 纯核心能力（`col.render` 返回 DOM 节点），**不装任何付费插件** —— 放进这个壳是因为
 * 它同样是「一个功能」，需要能独立看：调 `moneyCell` 的参数时不该被别的插件干扰。
 */
export const moneyDemo: ProDemo = {
  id: 'money',
  mount(host: DemoHost): DemoInstance {
    /** 掺几个空值，用来看占位符分支 */
    const rows = makeRows(500).map((r, i) =>
      i % 11 === 0 ? { ...r, blank: null } : { ...r, blank: r.amount },
    ) as Row[];

    const columns: VirtTableColumn<Row>[] = [
      { key: 'id', title: 'ID', width: 70, fixed: 'left', sortable: true },
      { key: 'name', title: '项目名称', width: 150, sortable: true, resizable: true },
      {
        key: 'amount',
        title: '默认（¥ · 2 位 · 带条）',
        width: 190,
        align: 'right',
        sortable: true,
        resizable: true,
        render: moneyCell<Row>({ max: AMOUNT_MAX }),
      },
      {
        key: 'amount',
        title: '$ · 0 位小数',
        width: 150,
        align: 'right',
        resizable: true,
        render: moneyCell<Row>({ currency: '$', decimals: 0, max: AMOUNT_MAX, locale: 'en-US' }),
      },
      {
        key: 'amount',
        title: '无占比条',
        width: 140,
        align: 'right',
        resizable: true,
        render: moneyCell<Row>(),
      },
      {
        key: 'blank',
        title: '含空值',
        width: 140,
        align: 'right',
        resizable: true,
        render: moneyCell<Row>({ max: AMOUNT_MAX }),
      },
    ];

    /*
     * ⚠️ 上面有两列 key 都是 `amount`。核心按 key 认列（`data-col-key`、状态里的
     * `columns[].key`），重复 key 在排序/列宽持久化这类按 key 寻址的路径上会互相串。
     * 这里只为并排对比渲染参数，所以第二个 amount 列刻意**不开 sortable**。
     * 真实业务里请给每列唯一 key。
     */

    const table = new VirtTable<Row>(host.tableEl, {
      list: rows,
      columns,
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
    });

    host.setStatus('500 行 · 同一字段 4 种渲染参数');
    Object.assign(window, { table });

    return { destroy: () => table.destroy() };
  },
};
