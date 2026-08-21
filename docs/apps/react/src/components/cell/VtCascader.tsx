import { VirtTableReact, type ReactTableColumn, vtCellEditor } from '@virt-table/react';
import { VtCascader, type VtCascaderOption } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

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

const columns: ReactTableColumn[] = [
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

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  area: PATHS[i % PATHS.length]!,
  catId: LEAVES[i % LEAVES.length]!,
  area2: i % 3 === 0 ? ['zj'] : PATHS[i % PATHS.length]!,
  fixed: PATHS[(i + 1) % PATHS.length]!,
}));

const plugins = [vtCellEditor()];

export default function VtCascaderTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtCascader 级联选择</h3>
      <div className="status-text">
        VtCascader：点单元格弹出多栏面板，点父级只展开下一栏、点叶子才写回并关闭。第 3 列
        checkStrictly 允许选中父级；「上海」是 disabled 节点。锚点右侧的「×」默认就有（面板里只能
        换选别的节点，没有「选回空」这一项），激活后按 Delete / Backspace 同效；清空写回的形状跟着
        valueType 走：存路径的写 []、只存叶子的写空串
      </div>
      <div style={{ width: 900, height: 600 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true, plugins }}
        />
      </div>
    </div>
  );
}
