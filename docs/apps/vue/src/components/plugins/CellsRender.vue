<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue 单元格编辑</h3>
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

<script setup lang="tsx">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn,
  vtCellEditor,
} from '@virt-table/vue';
import { faker } from '@faker-js/faker';
import type { VirtTableVueInstance } from '../../virt-table-ref';

const colCount = 6;
const selectOptions = [
  { value: 'opt1', label: '选项 1' },
  { value: 'opt2', label: '选项 2' },
  { value: 'opt3', label: '选项 3' },
  { value: 'opt4', label: '选项 4' },
];

const editStyle =
  'width:100%;height:100%;border:none;outline:none;padding:0 12px;font-size:14px;box-sizing:border-box;';

const columns: VueTableColumn[] = [
  {
    key: 'input',
    title: 'Input',
    width: 200,
    renderEditor: ({ value, row, column: col }) => (
      <input
        type="text"
        value={(value as string) ?? ''}
        style={editStyle}
        onInput={(e: Event) => {
          (row as Record<string, unknown>)[col.key] = (e.target as HTMLInputElement).value;
        }}
      />
    ),
  },
  {
    key: 'number',
    title: 'Number',
    width: 160,
    renderEditor: ({ value, row, column: col }) => (
      <input
        type="number"
        value={(value as string) ?? ''}
        style={editStyle}
        onInput={(e: Event) => {
          (row as Record<string, unknown>)[col.key] = (e.target as HTMLInputElement).value;
        }}
      />
    ),
  },
  {
    key: 'select',
    title: 'Select',
    width: 180,
    render: ({ value }) => {
      const opt = selectOptions.find((o) => o.value === value);
      return opt ? opt.label : '请选择';
    },
    renderEditor: ({ value, row, column: col }) => (
      <select
        style="width:100%;height:100%;border:none;outline:none;padding:0 8px;font-size:14px;box-sizing:border-box;background:#fff;"
        onChange={(e: Event) => {
          (row as Record<string, unknown>)[col.key] = (e.target as HTMLSelectElement).value;
        }}
      >
        <option value="" disabled>请选择</option>
        {selectOptions.map((opt) => (
          <option value={opt.value} selected={opt.value === value} key={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
  },
  {
    key: 'date',
    title: 'Date',
    width: 180,
    renderEditor: ({ value, row, column: col }) => (
      <input
        type="date"
        value={(value as string) ?? ''}
        style={editStyle}
        onChange={(e: Event) => {
          (row as Record<string, unknown>)[col.key] = (e.target as HTMLInputElement).value;
        }}
      />
    ),
  },
  {
    key: 'checkbox',
    title: 'Checkbox',
    width: 120,
    render: ({ value }) => (value ? '✅ Yes' : '❌ No'),
    renderEditor: ({ value, row, column: col }) => (
      <label style="display:flex;align-items:center;gap:8px;padding:0 12px;height:100%;cursor:pointer;font-size:14px;">
        <input
          type="checkbox"
          checked={!!value}
          style="width:16px;height:16px;cursor:pointer;"
          onChange={(e: Event) => {
            (row as Record<string, unknown>)[col.key] = (e.target as HTMLInputElement).checked;
          }}
        />
        <span>{value ? 'Yes' : 'No'}</span>
      </label>
    ),
  },
  { key: 'readonly', title: 'Readonly', width: 200 },
];

const rowCount = 10000;
const list = Array.from({ length: rowCount }, (_, i) => ({
  id: i,
  input: `Row ${i}`,
  number: String(Math.floor(Math.random() * 1000)),
  select: selectOptions[i % selectOptions.length]!.value,
  date: '2025-01-01',
  checkbox: i % 3 === 0,
  readonly: `${faker.lorem.word()} ${i}`,
}));

const tableRef = ref<VirtTableVueInstance | null>(null);
const status = ref(
  `单元格编辑：${rowCount} 行 × ${colCount} 列（点击单元格进入编辑模式）`,
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
