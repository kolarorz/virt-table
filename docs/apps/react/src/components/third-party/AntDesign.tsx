import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtCellEditor,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';
import { Radio, Select, TimePicker, Dropdown, Checkbox } from 'antd';

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
];
const skillOptions = ['Vue', 'React', 'TypeScript', 'Node.js', 'Rust'];
const statusOptions = [
  { value: 'pending', label: '待处理', color: 'gold' },
  { value: 'processing', label: '处理中', color: 'blue' },
  { value: 'done', label: '已完成', color: 'green' },
];

function escapeHtml(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function formatStatus(v: unknown) {
  return statusOptions.find((o) => o.value === v)?.label ?? '-';
}
function renderInputLike(text: unknown) {
  return `<div class="vt-ad-input-like">${escapeHtml(text || '-')}</div>`;
}
function renderSkillsLike(value: unknown) {
  if (!Array.isArray(value) || value.length === 0)
    return '<div class="vt-ad-input-like is-placeholder">请选择技能</div>';
  const visible = value.slice(0, 2);
  const hidden = value.length - visible.length;
  const tags = visible
    .map((i) => `<span class="vt-ad-tag-lite">${escapeHtml(i)}</span>`)
    .join('');
  const more =
    hidden > 0 ? `<span class="vt-ad-tag-lite is-muted">+${hidden}</span>` : '';
  return `<span class="vt-ad-tag-wrap">${tags}${more}</span>`;
}
function renderStatusLike(v: unknown) {
  const opt = statusOptions.find((o) => o.value === v);
  if (!opt) return escapeHtml(v);
  const colorMap: Record<string, [string, string]> = {
    gold: ['#faad14', '#fffbe6'],
    blue: ['#1677ff', '#e6f4ff'],
    green: ['#52c41a', '#f6ffed'],
  };
  const [c, bg] = colorMap[opt.color] ?? ['#86909c', '#f4f4f5'];
  return `<span class="vt-ad-status" style="--c:${c};--bg:${bg};">${escapeHtml(opt.label)}</span>`;
}

const rowCount = 300;

export default function AntDesign() {
  const tableRef = React.useRef<VirtTableRef>(null);

  const setCellValue = (
    row: Record<string, unknown>,
    key: string,
    val: unknown,
  ) => {
    row[key] = val;
    tableRef.current?.forceUpdate();
  };

  const columns: ReactTableColumn[] = [
    {
      key: 'name',
      title: '姓名',
      width: 170,
      render: ({ value }) =>
        `<div class="cell-wrapper">${renderInputLike(value)}</div>`,
    },
    {
      key: 'gender',
      title: '单选 (Radio.Group)',
      width: 240,
      render: ({ value }) => {
        const label =
          genderOptions.find((o) => o.value === value)?.label ?? '-';
        return `<div class="cell-wrapper"><span class="vt-ad-radio-active">${escapeHtml(label)}</span></div>`;
      },
      renderEditor: ({ value, row, column: col }) => (
        <Radio.Group
          value={value as string}
          onChange={(e) =>
            setCellValue(
              row as Record<string, unknown>,
              col.key,
              e.target.value,
            )
          }
          optionType='button'
          buttonStyle='solid'
          size='small'
          options={genderOptions}
        />
      ),
    },
    {
      key: 'skills',
      title: '多选 (Select)',
      width: 260,
      render: ({ value }) =>
        `<div class="cell-wrapper">${renderSkillsLike(value)}</div>`,
      renderEditor: ({ value, row, column: col }) => (
        <Select
          mode='multiple'
          value={Array.isArray(value) ? [...value] : []}
          onChange={(next) =>
            setCellValue(row as Record<string, unknown>, col.key, next)
          }
          style={{ width: '100%' }}
          maxTagCount={2}
          allowClear
          options={skillOptions.map((s) => ({ label: s, value: s }))}
        />
      ),
    },
    {
      key: 'workTime',
      title: '时间选择器 (TimePicker)',
      width: 220,
      render: ({ value }) =>
        `<div class="cell-wrapper">${renderInputLike(value)}</div>`,
      renderEditor: ({ row, column: col }) => (
        <TimePicker
          style={{ width: '100%' }}
          format='HH:mm:ss'
          onChange={(_time, timeString) =>
            setCellValue(row as Record<string, unknown>, col.key, timeString)
          }
          ref={(el) => {
            if (el) setTimeout(() => (el as any).focus?.(), 0);
          }}
        />
      ),
    },
    {
      key: 'status',
      title: '下拉菜单 (Dropdown)',
      width: 180,
      render: ({ value }) =>
        `<div class="cell-wrapper">${renderStatusLike(value)}</div>`,
      renderEditor: ({ value, row, column: col }) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: statusOptions.map((o) => ({ key: o.value, label: o.label })),
            onClick: ({ key }) =>
              setCellValue(row as Record<string, unknown>, col.key, key),
          }}
        >
          <button
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              background: '#fff',
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {formatStatus(value)}
          </button>
        </Dropdown>
      ),
    },
    {
      key: 'skillsQuickEdit',
      title: '多选快捷 (Checkbox.Group)',
      width: 280,
      render: ({ row }) =>
        `<div class="cell-wrapper">${renderSkillsLike((row as Record<string, unknown>).skills)}</div>`,
      renderEditor: ({ row }) => (
        <Checkbox.Group
          value={
            Array.isArray((row as Record<string, unknown>).skills)
              ? [...((row as Record<string, unknown>).skills as string[])]
              : []
          }
          onChange={(next) =>
            setCellValue(row as Record<string, unknown>, 'skills', next)
          }
          options={skillOptions}
        />
      ),
    },
  ];

  const list = React.useMemo(
    () =>
      Array.from({ length: rowCount }, (_, i) => ({
        id: i,
        name: faker.person.fullName(),
        gender: genderOptions[i % genderOptions.length]!.value,
        skills: skillOptions.slice(0, (i % skillOptions.length) + 1),
        workTime: `2025-01-01 ${String(9 + (i % 8)).padStart(2, '0')}:00:00`,
        status: statusOptions[i % statusOptions.length]!.value,
      })),
    [],
  );

  return (
    <div className='demo-wrapper'>
      <style>{`
        .cell-wrapper { padding: 0 8px; }
        .vt-ad-input-like {
          display: inline-flex; align-items: center; max-width: 100%; min-height: 24px;
          padding: 0 8px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fff;
          color: rgba(0,0,0,0.88); font-size: 12px; line-height: 22px; box-sizing: border-box;
        }
        .vt-ad-input-like.is-placeholder { color: rgba(0,0,0,0.25); }
        .vt-ad-tag-wrap { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; overflow: hidden; }
        .vt-ad-tag-lite {
          display: inline-flex; align-items: center; max-width: 110px; padding: 0 6px;
          border: 1px solid #91caff; border-radius: 4px; background: #e6f4ff; color: #1677ff;
          font-size: 12px; line-height: 20px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;
        }
        .vt-ad-tag-lite.is-muted { border-color: #d9d9d9; background: #fafafa; color: rgba(0,0,0,0.45); }
        .vt-ad-radio-active {
          display: inline-flex; align-items: center; padding: 0 8px; border: 1px solid #1677ff;
          border-radius: 6px; background: #e6f4ff; color: #1677ff; font-size: 12px; line-height: 22px;
        }
        .vt-ad-status {
          display: inline-flex; align-items: center; padding: 0 8px; border-radius: 12px;
          background: var(--bg); color: var(--c); font-size: 12px; line-height: 22px;
        }
      `}</style>
      <h3 className='demo-title'>React + Ant Design 单元格编辑</h3>
      <div className='virt-table-controls'>
        <button type='button' onClick={() => tableRef.current?.scrollToTop()}>
          滚动到顶部
        </button>
        <button
          type='button'
          onClick={() => tableRef.current?.scrollToBottom()}
        >
          滚动到底部
        </button>
        <button
          type='button'
          onClick={() => {
            const idx = Math.floor(Math.random() * rowCount);
            tableRef.current?.scrollToIndex(idx);
          }}
        >
          随机滚动
        </button>
      </div>
      <div className='status-text'>
        第三方组件库（Ant Design）：{rowCount} 行（点击单元格进行编辑）
      </div>
      <div style={{ width: '100%', height: 600 }} className='demo-container'>
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            plugins: [vtCellEditor()],
            estimatedSize: 30,
            buffer: 4,
            border: true,
            textOverflow: 'ellipsis',
            highlightSelectCell: true,
          }}
        />
      </div>
    </div>
  );
}
