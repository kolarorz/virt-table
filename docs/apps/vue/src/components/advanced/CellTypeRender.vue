<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 行级 _cellRenders</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="scrollTop">滚动到顶部</button>
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="scrollBottom">滚动到底部</button>
      <button type="button" class="virt-table-btn virt-table-btn-warning" @click="scrollRandom">随机滚动</button>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 800px; height: 600px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="columns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn,
  vtCellEditor,
} from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

const statusOptions = [
  { value: 'active', label: '活跃', color: '#22c55e', bg: '#f0f9eb' },
  { value: 'inactive', label: '停用', color: '#ef4444', bg: '#fef2f2' },
  { value: 'pending', label: '待审', color: '#f59e0b', bg: '#fdf6ec' },
];

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeInputEditor(row: Record<string, unknown>, colKey: string) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = (row[colKey] as string) ?? '';
  input.style.cssText =
    'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
  input.addEventListener('input', () => {
    row[colKey] = input.value;
  });
  requestAnimationFrame(() => input.focus());
  return input;
}

function makeNumberEditor(row: Record<string, unknown>, colKey: string) {
  const input = document.createElement('input');
  input.type = 'number';
  input.value = (row[colKey] as string) ?? '';
  input.style.cssText =
    'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';
  input.addEventListener('input', () => {
    row[colKey] = input.value;
  });
  requestAnimationFrame(() => input.focus());
  return input;
}

function makeSelectEditor(
  row: Record<string, unknown>,
  colKey: string,
  optionsIn: { value: string; label: string }[],
) {
  const select = document.createElement('select');
  select.style.cssText =
    'width:100%;height:100%;border:none;outline:none;padding:0 8px;font-size:14px;box-sizing:border-box;background:#fff;';
  for (const opt of optionsIn) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === row[colKey]) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener('change', () => {
    row[colKey] = select.value;
  });
  requestAnimationFrame(() => select.focus());
  return select;
}

function renderStatusBadge(value: unknown) {
  const opt = statusOptions.find((o) => o.value === value);
  if (!opt) return escapeHtml(value);
  return `<span style="display:inline-flex;align-items:center;padding:0 8px;border-radius:12px;background:${opt.bg};color:${opt.color};font-size:12px;line-height:22px;">${escapeHtml(opt.label)}</span>`;
}

function renderProgress(value: unknown) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return `<div style="display:flex;align-items:center;gap:8px;padding:0 8px;">
    <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
    </div>
    <span style="font-size:12px;color:#666;min-width:36px;text-align:right;">${pct}%</span>
  </div>`;
}

const columns: VueTableColumn[] = [
  { key: 'name', title: '姓名', width: 150 },
  { key: 'score', title: '分数', width: 150 },
  { key: 'status', title: '状态', width: 150 },
  { key: 'progress', title: '进度', width: 200 },
  { key: 'remark', title: '备注', width: 200 },
];

const rowCount = 5000;
const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

const list: Record<string, unknown>[] = Array.from({ length: rowCount }, (_, i) => {
  const row: Record<string, unknown> = {
    id: i,
    name: names[i % names.length],
    score: Math.floor(Math.random() * 100),
    status: statusOptions[i % statusOptions.length]!.value,
    progress: Math.floor(Math.random() * 101),
    remark: `${faker.lorem.sentence()} (${i})`,
    _cellRenders: {} as Record<string, unknown>,
  };
  const cr = row._cellRenders as Record<string, { render: (ctx: { value: unknown }) => string; renderEditor?: (ctx: { row: unknown }) => HTMLElement }>;

  if (i % 5 === 0) {
    cr.name = {
      render: ({ value }) => `<b style="color:#1890ff;">${escapeHtml(value)}</b>`,
      renderEditor: ({ row: r }) => makeInputEditor(r as Record<string, unknown>, 'name'),
    };
  }
  if (i % 3 === 0) {
    cr.score = {
      render: ({ value }) => {
        const n = Number(value);
        const color = n >= 80 ? '#22c55e' : n >= 60 ? '#f59e0b' : '#ef4444';
        return `<span style="font-weight:bold;color:${color};">${n}</span>`;
      },
      renderEditor: ({ row: r }) => makeNumberEditor(r as Record<string, unknown>, 'score'),
    };
  }
  if (i % 4 === 0) {
    cr.status = {
      render: ({ value }) => renderStatusBadge(value),
      renderEditor: ({ row: r }) => makeSelectEditor(r as Record<string, unknown>, 'status', statusOptions),
    };
  }
  if (i % 2 === 0) {
    cr.progress = { render: ({ value }) => renderProgress(value) };
  }
  if (i % 6 === 0) {
    cr.remark = {
      render: ({ value }) => `<em style="color:#999;">${escapeHtml(value)}</em>`,
      renderEditor: ({ row: r }) => makeInputEditor(r as Record<string, unknown>, 'remark'),
    };
  }
  return row;
});

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref(
  `单元格独立渲染：${rowCount} 行 × ${columns.length} 列（不同行可配置不同的 render / renderEditor）`,
);

const options = {
  list,
  itemKey: 'id',
  plugins: [vtCellEditor()],
  estimatedSize: 40,
  buffer: 4,
  border: true,
  textOverflow: 'ellipsis' as const,
};

const scrollTop = () => {
  tableRef.value?.scrollToTop();
};

const scrollBottom = () => {
  tableRef.value?.scrollToBottom();
};

const scrollRandom = () => {
  const idx = Math.floor(Math.random() * rowCount);
  tableRef.value?.scrollToIndex(idx);
};
</script>
