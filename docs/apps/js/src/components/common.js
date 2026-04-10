import { faker } from '@faker-js/faker';
import { VirtTable } from '@virt-table/js';

export { faker, VirtTable };

export const COL_COUNT = 30;
export const ROW_COUNT = 1000;

export function makeColumns({ fixed = false, resizable = false } = {}) {
  return Array.from({ length: COL_COUNT }, (_, i) => {
    const col = { key: `extra_${i}`, title: `列 ${i}`, width: 200 };
    if (fixed) {
      if (i < 1) col.fixed = 'left';
      if (i >= COL_COUNT - 1) col.fixed = 'right';
    }
    if (resizable) col.resizable = true;
    return col;
  });
}

export const rows = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
  }
  return row;
});

export function createDemo(
  root,
  {
    title,
    columns,
    tableOptions = {},
    useMerges = false,
    mergesData = [],
    statusExtra = '',
    extraButtons = '',
  },
) {
  const hasMergeToggle = useMerges;

  root.innerHTML = `
  <div class="virt-table-controls">
    <button class="virt-table-btn virt-table-btn-primary" id="btnTop">滚动到顶部</button>
    <button class="virt-table-btn virt-table-btn-primary" id="btnBottom">滚动到底部</button>
    <button class="virt-table-btn virt-table-btn-warning" id="btnRandom">随机滚动</button>
    <button class="virt-table-btn virt-table-btn-success" id="btnScrollTo500">滚动到第500行</button>
      ${hasMergeToggle ? '<button class="virt-table-btn" id="btnToggleMerge" style="background:#8b5cf6;color:#fff;">切换合并单元格</button>' : ''}
      ${extraButtons}
  </div>
  <div id="status" class="status-text"></div>
  <div style="width: 800px; height: 600px; border: 1px solid #000;" class="virt-table-container" id="virtTableContainer"></div>
`;

  const container = root.querySelector('#virtTableContainer');
  const status = root.querySelector('#status');
  const listeners = [];
  let mergeEnabled = useMerges;

  const table = new VirtTable(container, {
    list: tableOptions.list ?? rows,
    columns,
    itemKey: 'id',
    itemPreSize: 40,
    buffer: 4,
    merges: useMerges ? mergesData : undefined,
    ...tableOptions,
  });

  const setStatus = (text) => {
    status.textContent = text;
  };
  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnTop', () => {
    table.scrollToTop();
    setStatus('已滚动到顶部');
  });
  on('btnBottom', () => {
    table.scrollToBottom();
    setStatus('已滚动到底部');
  });
  on('btnRandom', () => {
    const index = Math.floor(Math.random() * rows.length);
    table.scrollToIndex(index);
    setStatus(`随机滚动到第 ${index + 1} 行`);
  });
  on('btnScrollTo500', () => {
    table.scrollToIndex(499);
    setStatus('已滚动到第 500 行');
  });

  if (hasMergeToggle) {
    on('btnToggleMerge', () => {
      mergeEnabled = !mergeEnabled;
      table.setMerges(mergeEnabled ? mergesData : []);
      setStatus(mergeEnabled ? '合并单元格已启用' : '合并单元格已关闭');
    });
  }

  const listLen = (tableOptions.list ?? rows).length;
  setStatus(`${title}：${listLen} 行 × ${columns.length} 列${statusExtra}`);

  return {
    table,
    on,
    setStatus,
    cleanup: () => {
      table.destroy();
      listeners.forEach((off) => off());
      root.innerHTML = '';
    },
  };
}
