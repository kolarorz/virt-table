import { VirtTableReact, type ReactTableColumn, vtCellEditor } from '@virt-table/react';
import { VtTextarea } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const columns: ReactTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '名称', width: 160 },
  VtTextarea({ key: 'remark', title: '备注', width: 260, placeholder: '点一下写点什么…' }),
  VtTextarea({
    key: 'desc',
    title: '描述（最多长到 12 行 / 限 200 字）',
    width: 300,
    maxRows: 12,
    maxLength: 200,
  }),
  VtTextarea({ key: 'fixed', title: '只读', width: 200, disabled: true }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `条目 ${i}`,
  remark: i % 3 === 0 ? `这是一段比较长的备注文本，用来演示单元格里的截断显示，行号 ${i}` : '',
  desc: `多行描述第一行 ${i}\n第二行\n第三行`,
  fixed: `只读内容 ${i}`,
}));

const plugins = [vtCellEditor()];

export default function VtTextareaTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtTextarea 多行文本</h3>
      <div className="status-text">
        VtTextarea：点单元格进入编辑，编辑框直接盖住单元格 —— 宽度与单元格一致、初始等高，
        随输入一行行长高（到 maxRows 或容器下缘封顶后内部滚动）。滚到底部几行试试，长高时会自动上移，不会被容器裁掉
      </div>
      <div style={{ width: 900, height: 600 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 4,
            border: true,
            textOverflow: 'tooltip',
            plugins,
          }}
        />
      </div>
    </div>
  );
}
