import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtCellEditor,
} from '@virt-table/react';
import { VtSelect, type VtSelectOption } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const TAGS = [
  { value: 'vip', label: 'VIP', variant: 'warning' as const },
  { value: 'new', label: '新客', variant: 'success' as const },
  { value: 'old', label: '老客', variant: 'primary' as const },
  { value: 'risk', label: '风险', variant: 'danger' as const },
  { value: 'ban', label: '黑名单', disabled: true },
];

const SKILLS = [
  { value: 'ts', label: 'TypeScript', variant: 'primary' as const },
  { value: 'vue', label: 'Vue', variant: 'success' as const },
  { value: 'react', label: 'React', variant: 'primary' as const },
  { value: 'node', label: 'Node', variant: 'success' as const },
  { value: 'rust', label: 'Rust', variant: 'warning' as const },
  { value: 'go', label: 'Go', variant: 'primary' as const },
  { value: 'py', label: 'Python', variant: 'warning' as const },
  { value: 'java', label: 'Java', variant: 'danger' as const },
];

const ROLES = [
  { value: 'admin', label: '管理员' },
  { value: 'editor', label: '编辑' },
  { value: 'viewer', label: '只读' },
];

/** 两种展示形态共用的列基础参数（`display` / `maxCount` 由 buildColumns 按模式补） */
interface SelectBase {
  key: string;
  title: string;
  width: number;
  options: VtSelectOption[];
  multiple?: boolean;
  valueType?: 'array' | 'string';
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/**
 * 多值选择就是 `VtSelect({ multiple: true })` —— 元数是参数，不是另一个组件。
 * `display` 同样只是参数：`'text'` 把选中的 label 用「、」拼起来，`'tag'` 画成彩色胶囊
 * （超出 `maxCount` 折叠成 `+N`）。切换它不碰任何行数据。
 */
const buildColumns = (mode: 'text' | 'tag'): ReactTableColumn[] => {
  /**
   * `maxCount`（折叠成 `+N`）只对 `display: 'tag'` 有意义 —— 文本模式按「、」全拼，
   * 没有「折叠」这回事。这不是约定俗成，而是**类型拦得住**：`VtSelectOptions` 用判别
   * 联合声明，`display: 'text'` 时传 `maxCount` 直接编译报错。所以这里显式分两支写。
   */
  const col = (base: SelectBase, maxCount?: number): ReactTableColumn =>
    mode === 'tag'
      ? VtSelect({ ...base, display: 'tag', maxCount })
      : VtSelect({ ...base, display: 'text' });

  return [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    // 数组值 + 折叠成 +N
    col({ key: 'tags', title: '标签（最多显示 2 个）', width: 250, options: TAGS, multiple: true }, 2),
    // 不折叠
    col({ key: 'tags2', title: '标签（不折叠）', width: 260, options: TAGS, multiple: true }, 0),
    // 行数据里存的是逗号分隔字符串
    col({
      key: 'roles',
      title: '角色（存字符串）',
      width: 210,
      options: ROLES,
      multiple: true,
      valueType: 'string',
    }),
    // 候选多 → 打开搜索框；↑↓ 移动、Enter 勾选
    col({
      key: 'skills',
      title: '技能（可搜索）',
      width: 240,
      options: SKILLS,
      multiple: true,
      searchable: true,
      searchPlaceholder: '搜索技能',
    }),
    col({ key: 'fixed', title: '只读', width: 160, options: TAGS, multiple: true, disabled: true }),
  ];
};

const pick = <T,>(arr: T[], i: number, n: number): T[] =>
  Array.from({ length: n }, (_, k) => arr[(i + k) % arr.length]!);

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  tags: pick(TAGS, i, (i % 4) + 1).map((t) => t.value),
  tags2: pick(TAGS, i + 1, (i % 3) + 1).map((t) => t.value),
  roles: pick(ROLES, i, (i % 2) + 1)
    .map((r) => r.value)
    .join(','),
  skills: pick(SKILLS, i, (i % 3) + 1).map((s) => s.value),
  fixed: [TAGS[i % TAGS.length]!.value],
}));

const initialColumns = buildColumns('text');
const plugins = [vtCellEditor()];

export default function VtMultiSelectTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [display, setDisplay] = React.useState<'text' | 'tag'>('text');

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtSelect 多选</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={() => {
            const next = display === 'text' ? 'tag' : 'text';
            setDisplay(next);
            tableRef.current?.setColumns(buildColumns(next));
          }}
        >
          {display === 'text' ? '🏷️ 一键切换标签样式' : '🔤 切回文本样式'}
        </button>
        <span className="demo-note">
          当前：display: '{display}'（{display === 'text' ? '纯文本' : '彩色胶囊'}）
        </span>
      </div>
      <div className="status-text">
        多值选择 = VtSelect(&#123; multiple: true &#125;)：点单元格弹出勾选面板，勾选即时写回、没有「确定」按钮；
        ↑↓ 移动、Enter 勾选；「技能」列开了 searchable；「黑名单」是 disabled 项，全选也跳过它；
        锚点右侧的「×」默认就有（一次清空全部选择，与面板底部那颗「清空」同效），激活后按
        Delete / Backspace 同效。
        点上面的按钮一键切成标签样式（display: 'tag'）—— 锚点回显与常态始终是同一串东西，标签模式下超出
        maxCount 折叠成 +N
      </div>
      <div style={{ width: 1150, height: 560 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={initialColumns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true, plugins }}
        />
      </div>
    </div>
  );
}
