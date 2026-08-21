import { faker } from '@faker-js/faker';
import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import {
  vtToolbar,
  vtToolbarPanels,
  vtSearch,
  vtExport,
} from '@virt-table/vanilla/plugins';
import '@virt-table/vanilla/plugins/toolbar.css';
import '@virt-table/vanilla/plugins/search.css';

interface Row {
  id: number;
  name: string;
  dept: string;
  city: string;
  level: string;
  salary: number;
  hiredAt: string;
}

const DEPTS = ['研发', '设计', '销售', '客服'];
const LEVELS = ['P4', 'P5', 'P6', 'P7'];

export function bootstrapTableToolbar(root: HTMLElement): () => void {
  const columns: VirtTableColumn<Row>[] = [
    /*
     * 两条「勾不掉」的机制放在一起对照：
     * - `hideable: false`（下面的「入职日期」）= **压根不出现在面板里**；
     * - `canToggleColumn`（ID）= 出现但**置灰 + 说明原因**。这里传给 `vtToolbar`（它会转给自带的
     *   字段配置那一项）；显式装 `vtFieldConfig({ canToggleColumn })` 是等价写法。
     * 前者适合「这列与用户无关」，后者适合「有原因不能藏，而用户该知道原因」。
     */
    { key: 'id', title: 'ID', width: 80, sortable: true },
    { key: 'name', title: '姓名', width: 140 },
    { key: 'dept', title: '部门', width: 110 },
    { key: 'city', title: '城市', width: 130 },
    { key: 'level', title: '级别', width: 100, sortable: true },
    { key: 'salary', title: '月薪', width: 120, align: 'right', sortable: true },
    { key: 'hiredAt', title: '入职日期', width: 130, hideable: false },
  ];

  const list: Row[] = Array.from({ length: 600 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: DEPTS[i % DEPTS.length]!,
    city: faker.location.city(),
    level: LEVELS[i % LEVELS.length]!,
    salary: faker.number.int({ min: 8, max: 60 }) * 1000,
    hiredAt: faker.date.past({ years: 6 }).toISOString().slice(0, 10),
  }));

  root.innerHTML = `
    <div class="virt-table-controls">
      <button class="virt-table-btn" id="own">我自己的按钮：打开「排序」面板</button>
      <span class="demo-note">
        四颗面板来自 vtToolbarPanels()；「刷新」是本页 register 进去的；ID 列不许勾掉
      </span>
    </div>
    <div style="width:860px;height:460px;" class="demo-container" id="c"></div>`;
  const container = root.querySelector('#c') as HTMLElement;

  const table = new VirtTable<Row>(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 6,
    border: true,
    // 多列排序：工具栏的「排序」面板因此能叠第二条规则
    sortMode: 'multiple',
    plugins: [
      /*
       * 工具栏。没给 `mount`，所以它自己在 `.vt-root` 外面包一层纵向 flex ——
       * 按钮条在上、表格吃掉剩下的高度。
       */
      /*
       * 工具栏**一颗按钮都不自带** —— 它只提供摆放。要哪颗就装哪个插件，下面这些都是贡献方。
       */
      vtToolbar<Row>(),
      /*
       * 四个面板（字段配置 / 筛选 / 分组 / 排序）的一行写法。等价于把那四个插件挨个写出来 ——
       * 要给某个面板传选项就传在这里，像下面的 `canToggleColumn`。
       *
       * 「ID 不许勾掉」这条约束由知道原因的一方给：核心自己只拦「最后一列」。
       */
      ...vtToolbarPanels<Row>({
        fieldConfig: {
          canToggleColumn: (col) => (col.key === 'id' ? 'ID 列是行标识，不能隐藏' : true),
        },
      }),
      // 这两个也一样自己注册按钮（搜索 / 导出），工具栏不必认识它们
      vtSearch<Row>(),
      vtExport<Row>(),
    ],
  });

  /*
   * 使用方不写插件也能加一项：`registerToolbarItem` 返回反注册函数。
   * 这里放一颗动作型按钮（点一下就干活，没有浮层）。
   */
  let n = 0;
  const off = table.registerToolbarItem({
    key: 'reload',
    label: '刷新',
    side: 'right',
    icon:
      '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>',
    // 徽标现读：刷新过几次就显示几
    badge: () => n || null,
    onClick: () => {
      n += 1;
      table.setList(list.slice().reverse());
      table.refreshToolbar();
    },
  });

  // 自己放按钮开面板（`bar: false` 时这就是唯一的入口）
  (root.querySelector('#own') as HTMLButtonElement).onclick = (e) =>
    table.toggleToolbarPanel('sort', e.currentTarget as HTMLElement);

  return () => {
    off();
    table.destroy();
    root.innerHTML = '';
  };
}
