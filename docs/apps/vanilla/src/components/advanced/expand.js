import { createDemo, faker } from '../common.js';

export function bootstrapTableExpand(root) {
  const expandRows = Array.from({ length: 100 }, (_, i) => {
    const row = { id: i };
    for (let c = 0; c < 6; c++) {
      row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(3)}`;
    }
    return row;
  });
  const cols = [
    {
      key: '__expand',
      title: '',
      width: 50,
      type: 'expand',
      expandRender: (_col, row) => {
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

  const { table, on, setStatus, cleanup } = createDemo(root, {
    title: '展开行',
    columns: cols,
    tableOptions: { list: expandRows },
    extraButtons:
      '<button class="virt-table-btn" id="btnExpandAll" style="background:#10b981;color:#fff;">全部展开</button><button class="virt-table-btn" id="btnCollapseAll" style="background:#6b7280;color:#fff;">全部收起</button>',
  });

  on('btnExpandAll', () => {
    table.expandAll();
    setStatus('全部展开');
  });
  on('btnCollapseAll', () => {
    table.collapseAll();
    setStatus('全部收起');
  });

  return cleanup;
}
