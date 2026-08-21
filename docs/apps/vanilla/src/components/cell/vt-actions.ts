import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { VtActions } from '@virt-table/vanilla/components';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  enabled: boolean;
  draft: boolean;
}

export function bootstrapTableVtActions(root: HTMLElement): () => void {
  let list: Row[] = Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    name: `条目 ${i}`,
    enabled: i % 2 === 0,
    draft: i % 3 === 0,
  }));

  let lastAction = '（未操作）';

  const columns: VirtTableColumn<Row>[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    { key: 'name', title: '名称', width: 200 },
    { key: 'state', title: '状态', width: 120, render: ({ row }) => (row.enabled ? '启用' : '停用') },
    VtActions<Row>({
      key: 'ops',
      title: '操作',
      width: 240,
      fixed: 'right',
      align: 'center',
      items: [
        // 只有草稿能编辑 —— disabled 写成函数，跟着行状态走
        {
          text: '编辑',
          disabled: (row) => !row.draft,
          onClick: (row) => {
            lastAction = `编辑 #${row.id}`;
            refresh();
          },
        },
        // 文案随行变化；停用/启用是同一个按钮的两面
        {
          text: (row) => (row.enabled ? '停用' : '启用'),
          onClick: (row) => {
            row.enabled = !row.enabled;
            lastAction = `${row.enabled ? '启用' : '停用'} #${row.id}`;
            table.forceUpdate();
            refresh();
          },
        },
        // 危险动作：语义色 + 二次确认
        {
          text: '删除',
          variant: 'danger',
          confirm: '删除后不可恢复，确定吗？',
          onClick: (row) => {
            list = list.filter((r) => r.id !== row.id);
            table.setList(list);
            lastAction = `删除 #${row.id}`;
            refresh();
          },
        },
      ],
    }),
  ];

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:800px;height:600px;" class="demo-container" id="vtContainer"></div>
`;

  const container = root.querySelector('#vtContainer') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
  });

  function refresh() {
    statusEl.textContent = `VtActions：text / disabled / hidden 都可写成 (row) => …；「删除」带二次确认气泡。剩余 ${list.length} 行 · 最近操作：${lastAction}`;
  }
  refresh();

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
