import { VirtTable } from '@virt-table/vanilla';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtStatusBar } from '@virt-table-pro/status-bar';
import '@virt-table-pro/status-bar/index.css';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 金额格式化。
 *
 * 用 `Intl.NumberFormat` 而不是 `¥${v.toLocaleString()}` —— 后者在负数上会拼出
 * `¥-87,355`，而中文的正确写法是 `-¥87,355`（符号在货币记号之前）。
 * 这个 demo 的数据每 9 行掺一个负数，所以「最小」那一项一定会踩到。
 */
const CNY = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

/**
 * 状态栏 demo（Vanilla 端）：装 `vtStatusBar` + 核心的 `vtCellSelection`。
 *
 * 框选那件事必须**亲手拖**才有感觉，所以 demo 的主要内容不是按钮，而是一句
 * 「在金额列上拖一片」。按钮留给那些拖不出来的事：
 *
 *   · 程序化设置选区（证明 API 与拖选走同一条路）
 *   · 选一片**文字**（求和那几项会整项消失，而不是显示 0 —— 这是最容易写错的一处）
 *   · 筛掉一半（「总行数」不跟着变，「当前」才变）
 *
 * 用 `pro-kit` 的共享数据（2000 行，金额每 9 行掺一个负数），所以求和是真会出现负号的。
 */
export const statusBarDemo: ProDemo = {
  id: 'status-bar',
  mount(host: DemoHost): DemoInstance {
    const rows = makeRows();

    const noteBox = document.createElement('div');
    noteBox.className = 'pg-aside-box';
    host.asideEl.appendChild(noteBox);

    const table = new VirtTable<Row>(host.tableEl, {
      list: rows,
      columns: makeColumns(),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
      plugins: [
        vtCellSelection(),
        vtStatusBar<Row>({
          aggregates: ['count', 'sum', 'avg', 'min', 'max'],
          counts: ['total', 'filtered', 'checked', 'selectedRows'],
          /*
           * 选区只覆盖金额那一列时才加「¥」—— 跨列时不同列的单位不一样，
           * 一律加会把「3 个部门名 + 2 个金额」的计数也标上货币符号。
           */
          format: (v, kind, { columnKeys }) =>
            columnKeys.length === 1 && columnKeys[0] === 'amount' && kind !== 'count'
              ? CNY.format(v)
              : v.toLocaleString('zh-CN', { maximumFractionDigits: 4 }),
          // 追加一条自定义项：选区占当前行数的比例
          items: (s) => [
            {
              key: 'ratio',
              label: '选中占比',
              value:
                s.filtered && s.selectedRows
                  ? `${((s.selectedRows / s.filtered) * 100).toFixed(1)}%`
                  : '',
              side: 'left',
            },
          ],
        }),
      ],
    });

    /** 金额列在 leaf 列里的下标 —— 别写死数字，列定义改了就会指错 */
    const amountCol = (): number =>
      table.getLeafColumns().findIndex((c) => c.key === 'amount');
    const nameCol = (): number => table.getLeafColumns().findIndex((c) => c.key === 'name');

    const describe = (): void => {
      const s = table.getStatusBarSummary?.();
      if (!s) return;
      noteBox.innerHTML =
        '<p><b>在金额列上按住拖一片</b> —— 底下那条会跟着变。任意一项<b>点一下即复制</b>' +
        '（复制出去的是 <code>3500</code> 而不是 <code>3,500</code>：贴到别处还要继续算）。</p>' +
        `<p>当前选区：${
          s.range
            ? `${s.selectedRows} 行 × ${s.columnKeys.length} 列（${s.columnKeys.join(' / ')}）`
            : '无'
        }</p>` +
        `<p>能当数字的格子 ${s.selection.numericCount} / ${s.selection.count}` +
        `　去重取值 ${s.selection.distinct}</p>`;
    };

    host.button('选中金额列前 100 行', () => {
      const col = amountCol();
      table.setCellSelection({ startRow: 0, startCol: col, endRow: 99, endCol: col });
      describe();
      host.setStatus('程序化设置的选区与拖选走同一条路，条上照常更新');
    });

    host.button('选一片「名称」（文字）', () => {
      const col = nameCol();
      table.setCellSelection({ startRow: 0, startCol: col, endRow: 49, endCol: col });
      describe();
      host.setStatus(
        '求和 / 平均 / 极值整项消失了 —— 不是显示 0。「求和 0」会被读成「这一列加起来是零」',
      );
    });

    host.button('跨列选（名称 + 金额 + 状态）', () => {
      table.setCellSelection({ startRow: 0, startCol: nameCol(), endRow: 19, endCol: amountCol() + 1 });
      describe();
      host.setStatus('跨列时只有能当数字的格进聚合，货币符号也不加了（列的单位不一样）');
    });

    host.button('只看「已完成」', () => {
      table.setColumnFilter('status', ['已完成']);
      describe();
      host.setStatus('「当前」跟着变，「总行数」不变 —— 后者读的是筛选前的源数据行数');
    });

    host.button('清筛选与选区', () => {
      table.setColumnFilter('status', []);
      table.clearCellSelection();
      describe();
      host.setStatus('');
    });

    host.switch('显示状态栏', true, (checked) => {
      table.showStatusBar?.(checked);
    });

    /*
     * 拖选结束后也要刷这段旁注。状态栏自己走 `cellSelection.subscribe`
     * （多消费者，装几个都不会互相抢），demo 这边再订一份就行 ——
     * 不能去占 `vtCellSelection({ onChange })`，那是**单槽位**的。
     */
    const onUp = (): void => describe();
    host.tableEl.addEventListener('pointerup', onUp);

    describe();

    return {
      destroy: () => {
        host.tableEl.removeEventListener('pointerup', onUp);
        table.destroy();
      },
    };
  },
};
