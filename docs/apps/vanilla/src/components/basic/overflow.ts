import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/vanilla';

/** 两种溢出处理交替，方便横向对比；列多于容器宽度，顺带能看到贴右边时浮层的夹取 */
const MODES = ['ellipsis', 'tooltip'] as const;
const MODE_DESC: Record<(typeof MODES)[number], string> = {
  ellipsis: '仅省略号',
  tooltip: '省略号 + 自绘浮层（悬停 150ms）',
};
const COL_COUNT = 6;
const ROW_COUNT = 1000;

export function bootstrapTableOverflow(root: HTMLElement): () => void {
  const columns = Array.from({ length: COL_COUNT }, (_, i) => {
    const mode = MODES[i % MODES.length];
    return {
      key: `col_${i}`,
      title: `列 ${i} · ${mode}`,
      width: 220,
      // 列级覆盖全局的 textOverflow
      textOverflow: mode,
    };
  });

  const list = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Record<string, any> = { id: i };
    for (let c = 0; c < COL_COUNT; c++) {
      // 掺一些短文本：没被裁掉的单元格不该弹浮层
      row[`col_${c}`] = c % 2 === 1 && i % 4 === 0 ? '短' : faker.lorem.sentences(3);
    }
    return row;
  });

  root.innerHTML = `
    <div class="status-text">${MODES.map((m) => `<code>${m}</code> ${MODE_DESC[m]}`).join('　·　')}</div>
    <div style="width:800px;height:600px;" class="demo-container" id="tableContainer"></div>
  `;
  const container = root.querySelector('#tableContainer') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    textOverflow: 'ellipsis',
    border: true,
  });

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
