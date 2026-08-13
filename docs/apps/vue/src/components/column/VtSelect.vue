<template>
  <div class="demo-wrapper">
    <h3 class="demo-title">Vue VtSelect 下拉选择</h3>
    <div class="virt-table-controls">
      <button type="button" class="virt-table-btn virt-table-btn-primary" @click="toggleDisplay">
        {{ display === 'text' ? '🏷️ 一键切换标签样式' : '🔤 切回文本样式' }}
      </button>
      <span class="demo-note">
        当前：display: '{{ display }}'（{{ display === 'text' ? '纯文本' : '彩色胶囊' }}）
      </span>
    </div>
    <div class="status-text">{{ status }}</div>
    <div style="width: 1030px; height: 560px" class="demo-container">
      <VirtTableVue ref="tableRef" :columns="initialColumns" :options="options" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTableVue, type VueTableColumn, vtCellEditor } from '@virt-table/vue';
import { VtSelect, type VtSelectOption } from '@virt-table/vanilla/components';
import type { VirtTableVueInstance } from '../../virt-table-ref';

const ROW_COUNT = 5000;

const statusOptions = [
  { value: 'active', label: '活跃', variant: 'success' as const },
  { value: 'inactive', label: '停用', variant: 'default' as const },
  { value: 'pending', label: '待审核', variant: 'warning' as const },
];

const deptOptions = [
  { value: 'eng', label: '工程部', variant: 'primary' as const },
  { value: 'design', label: '设计部', variant: 'success' as const },
  { value: 'product', label: '产品部', variant: 'warning' as const },
  { value: 'hr', label: '人事部', variant: 'danger' as const },
  { value: 'finance', label: '财务部', variant: 'default' as const },
];

const levelOptions = [
  { value: 1, label: '初级' },
  { value: 2, label: '中级' },
  { value: 3, label: '高级' },
  { value: 4, label: '专家' },
];

const cityOptions = [
  { value: 'hz', label: '杭州' },
  { value: 'nb', label: '宁波' },
  { value: 'sh', label: '上海' },
  { value: 'bj', label: '北京' },
  { value: 'gz', label: '广州' },
  { value: 'sz', label: '深圳' },
  { value: 'cd', label: '成都' },
  { value: 'wh', label: '武汉' },
  { value: 'xa', label: '西安' },
  { value: 'nj', label: '南京' },
];

/** 两种展示形态共用的列基础参数（`display` 由 buildColumns 按模式补） */
interface SelectBase {
  key: string;
  title: string;
  width: number;
  options: VtSelectOption[];
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/**
 * 列定义按当前的展示形态生成。
 *
 * `display` 只是 `VtSelect` 的一个参数（`'text'` | `'tag'`）：**同一列、同一份数据、同一套
 * 选择逻辑**，切换它只换「选中的值画成什么样」—— 这正是「样式是参数、不是组件名」的意思。
 */
const buildColumns = (mode: 'text' | 'tag'): VueTableColumn[] => {
  const col = (base: SelectBase): VueTableColumn =>
    mode === 'tag' ? VtSelect({ ...base, display: 'tag' }) : VtSelect({ ...base, display: 'text' });

  return [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    col({ key: 'status', title: '状态', width: 160, options: statusOptions, placeholder: '请选择状态' }),
    col({ key: 'dept', title: '部门', width: 180, options: deptOptions, placeholder: '请选择部门', clearable: true }),
    col({ key: 'level', title: '级别', width: 160, options: levelOptions, placeholder: '请选择级别', clearable: true }),
    // 候选多时打开搜索框（默认关：3~8 项的枚举列多一行搜索框是噪音）
    col({
      key: 'city',
      title: '城市（可搜索）',
      width: 190,
      options: cityOptions,
      placeholder: '请选择城市',
      searchable: true,
      searchPlaceholder: '搜索城市',
      clearable: true,
    }),
    col({ key: 'fixed', title: '只读', width: 160, options: statusOptions, disabled: true }),
  ];
};

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  status: statusOptions[i % statusOptions.length]!.value,
  dept: deptOptions[i % deptOptions.length]!.value,
  level: levelOptions[i % levelOptions.length]!.value,
  city: cityOptions[i % cityOptions.length]!.value,
  fixed: statusOptions[i % statusOptions.length]!.value,
}));

const initialColumns = buildColumns('text');

const options = {
  list,
  itemKey: 'id',
  estimatedSize: 40,
  buffer: 4,
  border: true,
  textOverflow: 'ellipsis' as const,
  // 编辑态走 renderEditor，必须装 vtCellEditor 才会被触发
  plugins: [vtCellEditor()],
};

const tableRef = ref<VirtTableVueInstance | null>(null);
const display = ref<'text' | 'tag'>('text');

const toggleDisplay = () => {
  display.value = display.value === 'text' ? 'tag' : 'text';
  // 只换列定义：行数据一个字节都不动
  tableRef.value?.setColumns(buildColumns(display.value));
};

const status = `VtSelect 单值选择：${ROW_COUNT} 行。编辑态是自绘面板（复用列头筛选那套皮肤，跟暗色主题），不是原生 <select> —— 后者的下拉列表由操作系统渲染，吃不到 --vt-* 令牌。↑↓ 选、Enter 确认、Esc 关闭、clearable 时控件右侧一个 ×；「城市」列开了 searchable（默认关）。点上面的按钮可以一键把这些列切成标签样式（display: 'tag'）—— 同一份数据、同一套选择逻辑，只换画法`;
</script>
