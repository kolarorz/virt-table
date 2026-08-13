import { VirtTableReact, type ReactTableColumn, vtCellEditor } from '@virt-table/react';
import { VtAutocomplete } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const CITIES = [
  '杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水',
  '南京', '苏州', '无锡', '常州', '南通', '扬州', '镇江', '泰州', '徐州',
].map((label, i) => ({ value: `c${i}`, label }));

const USERS = Array.from({ length: 200 }, (_, i) => ({
  value: `u${i}`,
  label: `用户 ${i}`,
}));

const columns: ReactTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  // 同步源：debounce 给 0，输入即过滤
  VtAutocomplete({
    key: 'city',
    title: '城市（同步）',
    width: 200,
    debounce: 0,
    emit: 'label',
    placeholder: '输入或从建议中选',
    fetchSuggestions: (q) => CITIES.filter((c) => c.label.includes(q)),
  }),
  // 异步源：模拟接口延迟，靠 debounce 压请求数
  VtAutocomplete({
    key: 'owner',
    title: '负责人（异步 300ms 防抖）',
    width: 240,
    debounce: 300,
    emit: 'label',
    fetchSuggestions: (q) =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(USERS.filter((u) => u.label.includes(q)).slice(0, 20));
        }, 200);
      }),
  }),
  // 聚焦不自动弹（要输入才给建议）
  VtAutocomplete({
    key: 'keyword',
    title: '关键词（不自动弹）',
    width: 220,
    debounce: 0,
    triggerOnFocus: false,
    emptyText: '没有匹配的关键词',
    fetchSuggestions: (q) => (q ? CITIES.filter((c) => c.label.startsWith(q)) : []),
  }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  city: CITIES[i % CITIES.length]!.label,
  owner: USERS[i % USERS.length]!.label,
  keyword: '',
}));

const plugins = [vtCellEditor()];

export default function VtAutocompleteTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtAutocomplete 输入建议</h3>
      <div className="status-text">
        VtAutocomplete：点单元格进入编辑，↓/↑ 移动高亮、Enter 选中、Esc
        关闭。自由输入也会写回（不强制从建议里选）；异步源按 seq 丢弃后到的慢请求
      </div>
      <div style={{ width: 840, height: 600 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true, plugins }}
        />
      </div>
    </div>
  );
}
