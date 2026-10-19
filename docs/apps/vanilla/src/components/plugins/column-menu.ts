import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtColumnFilter, vtColumnMenu } from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/column-menu.css';
import '@virt-table/vanilla/plugins/column-filter.css';

interface Row {
  id: number;
  name: string;
  dept: string;
  level: string;
  city: string;
  score: number;
}

const DEPTS = ['研发', '设计', '销售'];
const LEVELS = ['P5', 'P6', 'P7'];

/**
 * `vtColumnMenu` 示例。
 *
 * 一起装了 `vtColumnFilter` —— 菜单里的「筛选」是**让它**把面板开在菜单按钮上，
 * 不装的话那一项自己就不出现（示例底下那句状态文字说的就是这件事）。
 */
export function bootstrapTableColumnMenu(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    { key: 'name', title: '姓名', width: 150, sortable: true, resizable: true },
    {
      key: 'dept',
      title: '部门',
      width: 110,
      sortable: true,
      resizable: true,
      // 配了 filters 的列，菜单里才会出现「筛选」（判据与漏斗图标同一份）
      filters: DEPTS.map((d) => ({ label: d, value: d })),
    },
    { key: 'level', title: '级别', width: 100, sortable: true, resizable: true },
    { key: 'city', title: '城市', width: 140, resizable: true },
    { key: 'score', title: '绩效', width: 110, align: 'right', sortable: true, resizable: true },
    // 这一列刻意关掉菜单：演示 `disabled` 回调（「操作」这类列没什么可排可筛的）
    {
      key: 'op',
      title: '操作',
      width: 90,
      align: 'center',
      hideable: false,
      render: () => '<a href="javascript:void 0">编辑</a>',
    },
  ];

  const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: DEPTS[i % DEPTS.length]!,
    level: LEVELS[i % LEVELS.length]!,
    city: faker.location.city(),
    score: 60 + ((i * 7) % 41),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn virt-table-btn-primary" id="open">用 API 打开「部门」的菜单</button>
      <button class="virt-table-btn" id="reset">恢复列</button>
      <span class="demo-note" id="hint">每列表头右侧那颗 ☰ —— 排序 / 筛选 / 冻结 / 隐藏 / 自适应列宽 / 按此列分组</span>
    </div>
    <div style="width:820px;height:420px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;
  const hint = root.querySelector('#hint') as HTMLElement;

  /** 原始列配置的副本：「恢复列」要用它（表格会就地改 width / fixed / hidden） */
  const pristine = columns.map((c) => ({ ...c }));

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    fixedSize: true,
    border: true,
    stripe: true,
    // 多列排序：菜单里对第二列点「升序」时两列都留着（单列模式会顶掉上一列）
    sortMode: 'multiple',
    plugins: [
      /*
       * 状态文字挂在**核心的钩子**上刷，而不是在菜单的每一项里各写一遍 `describe()` ——
       * 那样加一项就会漏一处。菜单的动作最终都落在核心状态上（列结构 / 查询状态 / 分组），
       * 所以 `onColumnsChanged` + `onDataChanged` 两条就够覆盖全部六项。
       */
      {
        name: 'demoColumnMenuStatus',
        setup: (ctx) => {
          ctx.on('onColumnsChanged', () => describe());
          ctx.on('onDataChanged', () => describe());
        },
      },
      vtColumnMenu<Row>({
        // 「操作」列不挂 ☰
        disabled: (col) => col.key === 'op',
        // 追加一条自定义项，挂在内置条目之后
        extraItems: (col) => [
          {
            label: `复制列名「${col.title}」`,
            onClick: () => {
              void navigator.clipboard?.writeText(col.title);
              hint.textContent = `已复制列名：${col.title}`;
            },
          },
        ],
      }),
      // 菜单里的「筛选」靠它。不装这个插件时那一项不会出现
      vtColumnFilter<Row>(),
    ],
  });

  const describe = (): void => {
    const sort = table.getState().sort ?? [];
    const group = table.getGroupConfig();
    const hidden = table
      .getAllColumns()
      .filter((c) => c.hidden)
      .map((c) => c.title);
    const pinned = table
      .getAllColumns()
      .filter((c) => c.fixed)
      .map((c) => `${c.title}→${c.fixed}`);
    hint.textContent =
      `排序 ${sort.map((s) => `${s.colKey} ${s.order}`).join(' / ') || '无'}` +
      ` · 分组 ${group.map((g) => g.field).join(' / ') || '无'}` +
      ` · 冻结 ${pinned.join(' / ') || '无'}` +
      ` · 隐藏 ${hidden.join(' / ') || '无'}`;
  };

  const onOpen = (): void => {
    // 命令式入口：不点表头也能开（自己在别处放一颗按钮时用这条）
    table.openColumnMenu('dept');
  };
  const onReset = (): void => {
    table.setColumns(pristine.map((c) => ({ ...c })));
    table.setGroupConfig(null);
    table.setState({ version: 1, sort: [] });
    describe();
  };

  const openBtn = root.querySelector('#open') as HTMLButtonElement;
  const resetBtn = root.querySelector('#reset') as HTMLButtonElement;
  openBtn.addEventListener('click', onOpen);
  resetBtn.addEventListener('click', onReset);

  describe();

  return () => {
    openBtn.removeEventListener('click', onOpen);
    resetBtn.removeEventListener('click', onReset);
    table.destroy();
    root.innerHTML = '';
  };
}
