import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtToolbar,
  vtToolbarPanels,
  vtSearch,
  vtExport,
} from '@virt-table/react';
import '@virt-table/vanilla/plugins/toolbar.css';
import '@virt-table/vanilla/plugins/search.css';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
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

const columns: ReactTableColumn<Row>[] = [
  /*
   * 两条「勾不掉」的机制放在一起对照：
   * - `hideable: false`（下面的「入职日期」）= **压根不出现在面板里**；
   * - `canToggleColumn`（ID）= 出现但**置灰 + 说明原因**。它是**字段配置那个插件**的选项，
   *   传在 `vtToolbarPanels({ fieldConfig })` 里，或者显式装 `vtFieldConfig({ canToggleColumn })`。
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

export default function ToolbarTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  // plugins 只在 mount 时读一次，别每次渲染新建数组
  const plugins = React.useMemo(
    () => [
      // 工具栏一颗按钮都不自带：要哪颗就装哪个插件，下面这些都是贡献方
      vtToolbar<Row>(),
      /*
       * 四个面板（字段配置 / 筛选 / 分组 / 排序）的一行写法，等价于把那四个插件挨个写出来。
       * 要给某个面板传选项就传在这里 —— 「ID 不许勾掉」这条约束由知道原因的一方给
       * （核心自己只拦「最后一列」）。
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
    [],
  );

  /*
   * 使用方不写插件也能加一项。`registerToolbarItem` 返回反注册函数，所以这里放在
   * effect 里注册、在清理函数里撤掉 —— React 的严格模式会挂载两次，不撤会得到两颗。
   */
  React.useEffect(() => tableRef.current?.registerToolbarItem({
    key: 'hello',
    label: '打个招呼',
    side: 'right',
    onClick: () => window.alert('这颗按钮是使用方 register 进去的'),
  }), []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 工具栏</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          // 面板要贴着触发按钮定位，所以把按钮本身作为 anchor 传进去
          onClick={(e) => tableRef.current?.toggleToolbarPanel('sort', e.currentTarget)}
        >
          我自己的按钮：打开「排序」面板
        </button>
        <span className="demo-note">
          工具栏自带四颗；搜索 / 导出由各自的插件注册；ID 列不许勾掉
        </span>
      </div>
      <div style={{ width: 860, height: 460 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            // 多列排序：工具栏的「排序」面板因此能叠第二条规则
            sortMode: 'multiple',
            plugins,
          }}
        />
      </div>
    </div>
  );
}
