import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { VtPerson, type VtPersonOption } from '@virt-table/vanilla/components';

export function bootstrapTableVtPerson(root: HTMLElement): () => void {
  const rowCount = 5000;

  // 头像用 data URI 生成，免得 demo 依赖外网图片（真实项目直接给 URL）
  const avatar = (bg: string, text: string): string =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
        `<rect width="40" height="40" fill="${bg}"/>` +
        `<text x="20" y="26" font-size="18" font-family="sans-serif" ` +
        `text-anchor="middle" fill="#ffffff">${text}</text></svg>`,
    )}`;

  const MEMBERS: VtPersonOption[] = [
    {
      value: 'u1',
      label: '张伟',
      desc: '技术部 · 前端',
      avatar: avatar('#2563eb', '伟'),
      email: 'zhangwei@example.com',
      phone: '138 0000 0001',
      fields: [{ label: '工号', value: 'E10086' }],
    },
    { value: 'u2', label: '李娜', desc: '产品部', email: 'lina@example.com' },
    {
      value: 'u3',
      label: '王强',
      desc: '技术部 · 后端',
      avatar: avatar('#10b981', '强'),
      phone: '138 0000 0003',
    },
    { value: 'u4', label: '刘洋', desc: '设计部' },
    { value: 'u5', label: 'John Doe', desc: 'QA', email: 'john.doe@example.com' },
    { value: 'u6', label: '欧阳明月', desc: '运营部 · 内容运营高级专员', phone: '138 0000 0006' },
    { value: 'u7', label: '陈冬', desc: '已离职', disabled: true },
  ];

  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    // 单人：选中即写回并关面板
    VtPerson({ key: 'owner', title: '负责人（单人）', width: 200, options: MEMBERS, clearable: true }),
    // 多人：勾选即时写回，超过 2 个折叠成 +N
    VtPerson({
      key: 'members',
      title: '参与人（多人，最多显示 2 个）',
      width: 280,
      options: MEMBERS,
      multiple: true,
      maxCount: 2,
    }),
    // 多人 + 只画头像（列窄时用，姓名进 title）
    VtPerson({
      key: 'reviewers',
      title: '评审人（只头像）',
      width: 160,
      options: MEMBERS,
      multiple: true,
      avatarOnly: true,
      maxCount: 4,
    }),
    // 多人 + 行数据里存逗号分隔字符串
    VtPerson({
      key: 'cc',
      title: '抄送（存字符串）',
      width: 220,
      options: MEMBERS,
      multiple: true,
      valueType: 'string',
    }),
    // 纯展示：不给 options，行值直接是 { name, avatar } 对象
    VtPerson({ key: 'creator', title: '创建人（纯展示）', width: 180 }),
  ];

  const pick = <T,>(arr: T[], i: number, n: number): T[] =>
    Array.from({ length: n }, (_, k) => arr[(i + k) % arr.length]!);

  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    owner: MEMBERS[i % MEMBERS.length]!.value,
    members: pick(MEMBERS, i, (i % 4) + 1).map((m) => m.value),
    reviewers: pick(MEMBERS, i + 2, (i % 3) + 1).map((m) => m.value),
    cc: pick(MEMBERS, i + 1, (i % 2) + 1)
      .map((m) => m.value)
      .join(','),
    creator: { id: `x${i % 3}`, name: ['赵敏', '孙悟空', 'Ada Lovelace'][i % 3]!, avatar: undefined },
  }));

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:1000px;height:600px;" class="demo-container" id="vtContainer"></div>
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
    'VtPerson：悬停在某个人身上 200ms 弹名片（头像放大 + 部门 + 邮箱/电话/工号），指针可以移进名片里划选复制；点单元格弹出选人面板（带搜索框，姓名/部门/标识都能搜；↑↓ 移动、Enter 选中）。编辑态的回显与常态是同一串胶囊。单人选完即关，多人勾选即时写回；没有头像图的人退到「姓名末字 + 稳定派生色」的色块；「陈冬」是 disabled 项，全选也跳过它';

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
