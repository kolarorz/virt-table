import { faker } from '@faker-js/faker';
import {
  VirtTable,
  type VirtTableColumn,
} from '@virt-table/vanilla';
import {
  vtContextMenu,
  type ContextMenuContext,
  type ContextMenuItem,
} from '@virt-table/vanilla/plugins';

interface Row { id: number; name: string; dept: string; score: number }

const depts = ['工程部', '设计部', '市场部', '财务部'];

const makeList = (): Row[] =>
  Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    score: faker.number.int({ min: 0, max: 100 }),
  }));

export function bootstrapTableContextMenu(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 200 },
    { key: 'dept', title: '部门', width: 160 },
    { key: 'score', title: '分数', width: 120, align: 'right' },
  ];

  let list = makeList();

  root.innerHTML = `
    <div class="demo-hint">
      在表格里<b>右键任意单元格</b>弹出菜单（无需先框选）。菜单项会拿到所在行/列的上下文。
    </div>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn" id="hide">hideContextMenu()</button>
      <button type="button" class="virt-table-btn" id="reset">重置数据</button>
    </div>
    <div class="status-text" id="status">右键任一单元格试试</div>
    <div style="width:760px;height:420px;" class="demo-container" id="c"></div>`;

  const container = root.querySelector('#c') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;
  const setStatus = (msg: string): void => { statusEl.textContent = msg; };

  /** 菜单项由所在单元格的上下文动态生成 */
  const contextMenuProvider = (ctx: ContextMenuContext<Row>): ContextMenuItem[] => [
    {
      label: `复制「${ctx.column.title}」的值`,
      action: () => {
        const value = String(ctx.row[ctx.column.key as keyof Row] ?? '');
        void navigator.clipboard?.writeText(value);
        setStatus(`已复制 ${ctx.column.title}=${value}（行 ${ctx.rowIndex + 1} / 列 ${ctx.colIndex + 1}）`);
      },
    },
    {
      label: `置顶第 ${ctx.rowIndex + 1} 行`,
      action: () => {
        list = [ctx.row, ...list.filter((r) => r.id !== ctx.row.id)];
        table.setList(list);
        setStatus(`已把 ${ctx.row.name} 置顶`);
      },
    },
    {
      divider: true,
      label: `删除 ${ctx.row.name}`,
      action: () => {
        list = list.filter((r) => r.id !== ctx.row.id);
        table.setList(list);
        setStatus(`已删除 ${ctx.row.name}，剩余 ${list.length} 行`);
      },
    },
    {
      // 禁用项：不可点击，点了也不会关闭菜单
      label: '仅高分行可用（分数 > 90）',
      disabled: ctx.row.score <= 90,
      action: () => setStatus(`${ctx.row.name} 分数 ${ctx.row.score}，触发了高分操作`),
    },
  ];

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    highlightHoverRow: true,
    plugins: [vtContextMenu<Row>(contextMenuProvider)],
  });

  // hideContextMenu 由插件通过 PluginHandle.api 注入，已自动挂到表格实例上
  const onHide = (): void => {
    table.hideContextMenu();
    setStatus('已调用 hideContextMenu()（插件注入的实例方法）');
  };
  const onReset = (): void => {
    list = makeList();
    table.setList(list);
    setStatus('数据已重置');
  };

  root.querySelector('#hide')!.addEventListener('click', onHide);
  root.querySelector('#reset')!.addEventListener('click', onReset);

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
