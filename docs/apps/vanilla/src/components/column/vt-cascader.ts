import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { VtCascader, type VtCascaderOption } from '@virt-table/vanilla/components';

export function bootstrapTableVtCascader(root: HTMLElement): () => void {
  const rowCount = 5000;

  const AREA: VtCascaderOption[] = [
    {
      value: 'zj',
      label: '浙江',
      children: [
        {
          value: 'hz',
          label: '杭州',
          children: [
            { value: 'xh', label: '西湖区' },
            { value: 'bj', label: '滨江区' },
            { value: 'yh', label: '余杭区' },
          ],
        },
        {
          value: 'nb',
          label: '宁波',
          children: [
            { value: 'hs', label: '海曙区' },
            { value: 'yz', label: '鄞州区' },
          ],
        },
      ],
    },
    {
      value: 'js',
      label: '江苏',
      children: [
        {
          value: 'nj',
          label: '南京',
          children: [
            { value: 'xw', label: '玄武区' },
            { value: 'gl', label: '鼓楼区' },
          ],
        },
        { value: 'sz', label: '苏州', children: [{ value: 'gsq', label: '姑苏区' }] },
      ],
    },
    { value: 'sh', label: '上海', disabled: true, children: [{ value: 'pd', label: '浦东新区' }] },
  ];

  const CATEGORY: VtCascaderOption[] = [
    {
      value: 'digital',
      label: '数码',
      children: [
        { value: 'phone', label: '手机' },
        { value: 'pc', label: '电脑' },
      ],
    },
    {
      value: 'life',
      label: '生活',
      children: [
        { value: 'kitchen', label: '厨具' },
        { value: 'clean', label: '清洁' },
      ],
    },
  ];

  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    // 存整条路径（默认）
    VtCascader({ key: 'area', title: '区域（存路径）', width: 240, options: AREA, placeholder: '请选择区域' }),
    // 只存叶子值，展示时反查路径
    VtCascader({
      key: 'catId',
      title: '分类（只存叶子）',
      width: 220,
      options: CATEGORY,
      valueType: 'leaf',
      separator: ' > ',
    }),
    // 允许选中父级
    VtCascader({ key: 'area2', title: '区域（可选父级）', width: 240, options: AREA, checkStrictly: true }),
    VtCascader({ key: 'fixed', title: '只读', width: 200, options: AREA, disabled: true }),
  ];

  const PATHS = [
    ['zj', 'hz', 'xh'],
    ['zj', 'hz', 'bj'],
    ['zj', 'nb', 'yz'],
    ['js', 'nj', 'xw'],
    ['js', 'sz', 'gsq'],
  ];
  const LEAVES = ['phone', 'pc', 'kitchen', 'clean'];

  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    area: PATHS[i % PATHS.length],
    catId: LEAVES[i % LEAVES.length],
    area2: i % 3 === 0 ? ['zj'] : PATHS[i % PATHS.length],
    fixed: PATHS[(i + 1) % PATHS.length],
  }));

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:900px;height:600px;" class="demo-container" id="vtContainer"></div>
`;

  const container = root.querySelector('#vtContainer') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    plugins: [vtCellEditor()],
  });

  statusEl.textContent =
    'VtCascader：点单元格弹出多栏面板，点父级只展开下一栏、点叶子才写回并关闭。第 3 列 checkStrictly 允许选中父级；「上海」是 disabled 节点';

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
