import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';

export function bootstrapTableExpand(root: HTMLElement): () => void {
  const expandRows: Record<string, any>[] = Array.from({ length: 100 }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < 6; c++) {
      row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(3)}`;
    }
    return row;
  });

  const columns = [
    {
      key: '__expand',
      title: '',
      width: 50,
      type: 'expand' as const,
      renderExpandRow: ({ row }: { row: Record<string, any> }) => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:8px;line-height:1.6;';
        div.innerHTML =
          `<strong>行 ${row.id} 的详情</strong><br/>` +
          Object.keys(row)
            .filter((k) => k !== 'id' && !k.startsWith('_'))
            .map((k) => `${k}: ${row[k]}`)
            .join('<br/>');
        return div;
      },
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      key: `extra_${i}`,
      title: `列 ${i}`,
      width: 180,
    })),
  ];

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="btnExpandAll">全部展开</button>
      <button class="virt-table-btn" id="btnCollapseAll">全部收起</button>
    </div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;

  const container = root.querySelector('#tableContainer') as HTMLElement;
  const listeners: (() => void)[] = [];

  const table = new VirtTable(container, {
    list: expandRows,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
  });

  const on = (id: string, handler: () => void) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnExpandAll', () => table.expandAll());
  on('btnCollapseAll', () => table.collapseAll());

  return () => {
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
