import React from 'react';
import { VirtTableReact, type ReactTableColumn } from '@virt-table/react';
import { VtSwitch } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `条目 ${i}`,
  enabled: i % 2 === 0,
  notify: i % 3 === 0,
  mode: i % 4 === 0 ? 'on' : 'off',
  locked: i % 5 === 0,
}));

export default function VtSwitchTable() {
  const [lastChange, setLastChange] = React.useState('（未操作）');
  // 计数要在写回后重算，用一个递增的 tick 触发重渲染
  const [, bump] = React.useReducer((x: number) => x + 1, 0);

  // 列在建表时被捕获一次，onChange 里只能碰 setState —— 所以列定义放进 useMemo
  const columns = React.useMemo<ReactTableColumn[]>(
    () => [
      { key: 'id', title: 'ID', width: 80, align: 'center' },
      { key: 'name', title: '名称', width: 160 },
      VtSwitch({
        key: 'enabled',
        title: '启用',
        width: 110,
        onChange: (v, row) => {
          setLastChange(`${(row as { name: string }).name} → ${v}`);
          bump();
        },
      }),
      // 带文案
      VtSwitch({ key: 'notify', title: '通知', width: 160, activeText: '已开启', inactiveText: '已关闭' }),
      // 字符串枚举
      VtSwitch({
        key: 'mode',
        title: '模式',
        width: 150,
        trueValue: 'on',
        falseValue: 'off',
        activeText: 'on',
        inactiveText: 'off',
      }),
      VtSwitch({ key: 'locked', title: '锁定（只读）', width: 130, disabled: true }),
    ],
    [],
  );

  const on = list.filter((r) => r.enabled).length;

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtSwitch 开关</h3>
      <div className="status-text">
        VtSwitch：点一下即写回，与 VtCheckbox 同一套值语义（trueValue / falseValue）。启用 {on} 行 ·
        最近一次 onChange：{lastChange}
      </div>
      <div style={{ width: 840, height: 600 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true }}
        />
      </div>
    </div>
  );
}
