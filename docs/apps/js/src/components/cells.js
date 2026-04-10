import { VirtTable } from '@virt-table/js';

export function bootstrapTableCells(root) {
  const colCount = 6;

  const selectOptions = [
    { value: 'opt1', label: '选项 1' },
    { value: 'opt2', label: '选项 2' },
    { value: 'opt3', label: '选项 3' },
    { value: 'opt4', label: '选项 4' },
  ];

  const columns = [
    {
      key: 'input',
      title: 'Input',
      width: 200,
      cellCoverRender: (value, row, _ri, col) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value ?? '';
        input.style.cssText = 'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
        input.addEventListener('input', () => { row[col.key] = input.value; });
        requestAnimationFrame(() => input.focus());
        return input;
      },
    },
    {
      key: 'number',
      title: 'Number',
      width: 160,
      cellCoverRender: (value, row, _ri, col) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = value ?? '';
        input.style.cssText = 'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
        input.addEventListener('input', () => { row[col.key] = input.value; });
        requestAnimationFrame(() => input.focus());
        return input;
      },
    },
    {
      key: 'select',
      title: 'Select',
      width: 180,
      render: (value) => {
        const opt = selectOptions.find((o) => o.value === value);
        return opt ? opt.label : '请选择';
      },
      cellCoverRender: (value, row, _ri, col) => {
        const select = document.createElement('select');
        select.style.cssText = 'width:100%;height:100%;border:none;outline:none;padding:0 8px;font-size:14px;box-sizing:border-box;background:#fff;';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '请选择';
        placeholder.disabled = true;
        select.appendChild(placeholder);
        for (const opt of selectOptions) {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          if (opt.value === value) o.selected = true;
          select.appendChild(o);
        }
        select.addEventListener('change', () => { row[col.key] = select.value; });
        requestAnimationFrame(() => select.focus());
        return select;
      },
    },
    {
      key: 'date',
      title: 'Date',
      width: 180,
      cellCoverRender: (value, row, _ri, col) => {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = value ?? '';
        input.style.cssText = 'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
        input.addEventListener('change', () => { row[col.key] = input.value; });
        requestAnimationFrame(() => input.focus());
        return input;
      },
    },
    {
      key: 'checkbox',
      title: 'Checkbox',
      width: 120,
      render: (value) => value ? '✅ Yes' : '❌ No',
      cellCoverRender: (value, row, _ri, col) => {
        const wrap = document.createElement('label');
        wrap.style.cssText = 'display:flex;align-items:center;gap:8px;padding:0 12px;height:100%;cursor:pointer;font-size:14px;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!value;
        cb.style.cssText = 'width:16px;height:16px;cursor:pointer;';
        const span = document.createElement('span');
        span.textContent = value ? 'Yes' : 'No';
        cb.addEventListener('change', () => {
          row[col.key] = cb.checked;
          span.textContent = cb.checked ? 'Yes' : 'No';
        });
        wrap.appendChild(cb);
        wrap.appendChild(span);
        return wrap;
      },
    },
    {
      key: 'readonly',
      title: 'Readonly',
      width: 200,
    },
  ];

  const rowCount = 10000;
  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    input: `Row ${i}`,
    number: String(Math.floor(Math.random() * 1000)),
    select: selectOptions[i % selectOptions.length].value,
    date: '2025-01-01',
    checkbox: i % 3 === 0,
    readonly: `只读 ${i}`,
  }));

  root.innerHTML = `
  <div class="virt-table-controls">
    <button class="virt-table-btn virt-table-btn-primary" id="btnTop">滚动到顶部</button>
    <button class="virt-table-btn virt-table-btn-primary" id="btnBottom">滚动到底部</button>
    <button class="virt-table-btn virt-table-btn-warning" id="btnRandom">随机滚动</button>
  </div>
  <div id="status" class="status-text"></div>
  <div style="width: 800px; height: 600px; border: 1px solid #000;" class="virt-table-container" id="virtTableContainer"></div>
`;

  const container = root.querySelector('#virtTableContainer');
  const status = root.querySelector('#status');
  const listeners = [];

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    itemPreSize: 40,
    buffer: 4,
    border: true,
    textOverflow: 'ellipsis',
  });

  status.textContent = `单元格编辑：${rowCount} 行 × ${colCount} 列（点击单元格进入编辑模式）`;

  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnTop', () => table.scrollToTop());
  on('btnBottom', () => table.scrollToBottom());
  on('btnRandom', () => {
    const idx = Math.floor(Math.random() * rowCount);
    table.scrollToIndex(idx);
  });

  return () => {
    table.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
